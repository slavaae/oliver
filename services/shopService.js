const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const db = getFirestore();

// Шаблоны замечаний для мамы
const REVIEW_PRESETS = [
  "Не до конца убрано",
  "Прикрепи фото результата",
  "Сделай аккуратнее",
  "Проверь еще раз по списку"
];

/**
 * 1. Отправка задачи на доработку родителем
 */
async function sendTaskForRevision(taskId, selectedPresets = [], customNote = '') {
  const taskRef = db.collection('tasks').doc(taskId);
  
  const comments = [...selectedPresets];
  if (customNote && customNote.trim()) {
    comments.push(customNote.trim());
  }

  const finalComment = comments.join('. ');

  await taskRef.update({
    status: 'needs_revision',
    reviewComment: finalComment,
    updatedAt: FieldValue.serverTimestamp()
  });

  return { success: true, comment: finalComment };
}

/**
 * 2. Запрос на покупку ребенком (Проверка лимитов + Холд монет)
 */
async function requestPurchase(childId, rewardId) {
  return await db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(childId);
    const rewardRef = db.collection('rewards').doc(rewardId);

    const [userDoc, rewardDoc] = await Promise.all([
      transaction.get(userRef),
      transaction.get(rewardRef)
    ]);

    if (!userDoc.exists || !rewardDoc.exists) {
      throw new Error('Пользователь или товар не найден');
    }

    const userData = userDoc.data();
    const rewardData = rewardDoc.data();

    if ((userData.balance || 0) < rewardData.price) {
      throw new Error('Недостаточно монет для покупки');
    }

    if (rewardData.stock !== null && rewardData.stock !== undefined) {
      if (rewardData.stock <= 0) {
        throw new Error('Товар закончился');
      }
    }

    if (rewardData.cooldownType && rewardData.cooldownType !== 'none') {
      const now = new Date();
      let periodStart = new Date();

      if (rewardData.cooldownType === 'weekly') {
        periodStart.setDate(now.getDate() - 7);
      } else if (rewardData.cooldownType === 'monthly') {
        periodStart.setMonth(now.getMonth() - 1);
      }

      const recentPurchasesQuery = await db.collection('purchases')
        .where('childId', '==', childId)
        .where('rewardId', '==', rewardId)
        .where('status', 'in', ['pending', 'completed'])
        .where('createdAt', '>=', Timestamp.fromDate(periodStart))
        .get();

      if (!recentPurchasesQuery.empty) {
        throw new Error(`Этот приз можно брать только 1 раз в ${rewardData.cooldownType === 'weekly' ? 'неделю' : 'месяц'}`);
      }
    }

    // Заморозка монет
    transaction.update(userRef, {
      balance: FieldValue.increment(-rewardData.price),
      heldBalance: FieldValue.increment(rewardData.price)
    });

    if (rewardData.stock !== null && rewardData.stock !== undefined) {
      transaction.update(rewardRef, {
        stock: FieldValue.increment(-1)
      });
    }

    const purchaseRef = db.collection('purchases').doc();
    transaction.set(purchaseRef, {
      childId,
      rewardId,
      rewardTitle: rewardData.title,
      price: rewardData.price,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      completedAt: null
    });

    return { purchaseId: purchaseRef.id, status: 'pending' };
  });
}

/**
 * 3. Подтверждение выдачи родителем
 */
async function completePurchase(purchaseId) {
  return await db.runTransaction(async (transaction) => {
    const purchaseRef = db.collection('purchases').doc(purchaseId);
    const purchaseDoc = await transaction.get(purchaseRef);

    if (!purchaseDoc.exists) throw new Error('Заявка не найдена');
    const pData = purchaseDoc.data();

    if (pData.status !== 'pending') {
      throw new Error('Заявка уже обработана');
    }

    const userRef = db.collection('users').doc(pData.childId);

    transaction.update(userRef, {
      heldBalance: FieldValue.increment(-pData.price)
    });

    transaction.update(purchaseRef, {
      status: 'completed',
      completedAt: FieldValue.serverTimestamp()
    });

    return { success: true, status: 'completed' };
  });
}

/**
 * 4. Отклонение покупки родителем (Возврат средств)
 */
async function cancelPurchase(purchaseId, rejectReason = '') {
  return await db.runTransaction(async (transaction) => {
    const purchaseRef = db.collection('purchases').doc(purchaseId);
    const purchaseDoc = await transaction.get(purchaseRef);

    if (!purchaseDoc.exists) throw new Error('Заявка не найдена');
    const pData = purchaseDoc.data();

    if (pData.status !== 'pending') {
      throw new Error('Заявка уже обработана');
    }

    const userRef = db.collection('users').doc(pData.childId);
    const rewardRef = db.collection('rewards').doc(pData.rewardId);

    // Разморозка и возврат на баланс
    transaction.update(userRef, {
      balance: FieldValue.increment(pData.price),
      heldBalance: FieldValue.increment(-pData.price)
    });

    if (rewardData && rewardData.stock !== null && rewardData.stock !== undefined) {
      transaction.update(rewardRef, {
        stock: FieldValue.increment(1)
      });
    }

    transaction.update(purchaseRef, {
      status: 'cancelled',
      rejectReason: rejectReason || '',
      completedAt: FieldValue.serverTimestamp()
    });

    return { success: true, status: 'cancelled' };
  });
}

module.exports = {
  REVIEW_PRESETS,
  sendTaskForRevision,
  requestPurchase,
  completePurchase,
  cancelPurchase
};
