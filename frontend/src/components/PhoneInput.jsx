import React, { useState, useEffect } from 'react';

export default function PhoneInput({ value, onChange, className, placeholder = "Телефон" }) {
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (value && !value.startsWith('+7') && value.trim() !== '') {
      setIsCustom(true);
    }
  }, []);

  const handlePhoneChange = (e) => {
    let input = e.target.value;
    if (isCustom) {
      onChange(input);
      return;
    }

    const digits = input.replace(/\D/g, '');
    
    if (digits.length === 0) {
      onChange('');
      return;
    }

    let formatted = '+7';
    let contentDigits = digits;
    
    if (digits.startsWith('7')) {
      contentDigits = digits.slice(1);
    } else if (digits.startsWith('8')) {
      contentDigits = digits.slice(1);
    }

    if (contentDigits.length > 0) {
      formatted += ' (' + contentDigits.substring(0, 3);
    }
    if (contentDigits.length >= 4) {
      formatted += ') ' + contentDigits.substring(3, 6);
    }
    if (contentDigits.length >= 7) {
      formatted += '-' + contentDigits.substring(6, 8);
    }
    if (contentDigits.length >= 9) {
      formatted += '-' + contentDigits.substring(8, 10);
    }

    onChange(formatted);
  };

  return (
    <div className="phone-input-wrapper" style={{ margin: '10px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          type="tel"
          className={className}
          placeholder={placeholder}
          value={value || ''}
          onChange={handlePhoneChange}
          style={className ? undefined : { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
        />
        <label style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={isCustom} 
            onChange={(e) => setIsCustom(e.target.checked)} 
            style={{ marginRight: '6px' }}
          />
          Другой формат (не РФ)
        </label>
      </div>
    </div>
  );
}
