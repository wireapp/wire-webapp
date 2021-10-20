import React, {useState} from 'react';

interface StyledInputProps {
  disabled?: boolean;
  label: string;
  onChange?: (value: string) => void;
  value: string;
}

const AccountInput: React.FC<StyledInputProps> = ({label, value, disabled, onChange}) => {
  const [input, setInput] = useState(value);
  return (
    <div>
      <label>{label}</label>
      <input
        disabled={disabled}
        value={input}
        onChange={event => setInput(event.target.value)}
        onKeyPress={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
            onChange?.(input);
            event.preventDefault();
          }
        }}
      />
    </div>
  );
};

export default AccountInput;
