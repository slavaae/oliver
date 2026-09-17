import React, { useState } from 'react';

const PRESETS = [
  "Не до конца убрано",
  "Прикрепи фото результата",
  "Сделай аккуратнее",
  "Проверь еще раз по списку"
];

export default function TaskReviewModal({ taskId, onSubmit, onClose }) {
  const [selectedChips, setSelectedChips] = useState([]);
  const [customText, setCustomText] = useState('');

  const toggleChip = (preset) => {
    if (selectedChips.includes(preset)) {
      setSelectedChips(selectedChips.filter((p) => p !== preset));
    } else {
      setSelectedChips([...selectedChips, preset]);
    }
  };

  const handleSend = () => {
    onSubmit(taskId, selectedChips, customText);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '500px',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Нужно доделать</h3>
        <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
          Выберите готовые замечания или напишите свое:
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {PRESETS.map((preset) => {
            const active = selectedChips.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => toggleChip(preset)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '16px',
                  border: active ? '2px solid #2563eb' : '1px solid #d1d5db',
                  backgroundColor: active ? '#eff6ff' : '#f9fafb',
                  color: active ? '#1d4ed8' : '#374151',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {preset}
              </button>
            );
          })}
        </div>

        <textarea
          rows={3}
          placeholder="Свой комментарий (необязательно)..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedChips.length === 0 && !customText.trim()}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: (selectedChips.length === 0 && !customText.trim()) ? '#cbd5e1' : '#f59e0b',
              color: '#fff',
              fontWeight: 600,
              cursor: (selectedChips.length === 0 && !customText.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
