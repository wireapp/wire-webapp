import React, {useState} from 'react';

interface StyledInputProps {
  label: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  value: string;
}

const AccountInput: React.FC<StyledInputProps> = ({label, value, readOnly, onChange}) => {
  const [input, setInput] = useState(value);
  return (
    <div>
      <label>{label}</label>
      <input
        readOnly={readOnly}
        value={input}
        onChange={event => setInput(event.target.value)}
        onKeyPress={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
            onChange?.(input);
            event.preventDefault();
          }
        }}
        onBlur={() => {
          setInput(value);
        }}
        spellCheck={false}
      />
    </div>
  );
};

export default AccountInput;
