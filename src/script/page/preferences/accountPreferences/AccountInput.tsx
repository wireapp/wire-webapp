import Icon from 'Components/Icon';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {MotionDuration} from 'src/script/motion/MotionDuration';

interface StyledInputProps {
  isDone?: boolean;
  label: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  value: string;
}

function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

export const useInputDone = () => {
  const [isDone, setIsDone] = useState(false);
  const isMounted = useIsMounted();

  const done = () => {
    if (isMounted()) {
      setIsDone(true);
    }
    setTimeout(() => {
      if (isMounted()) {
        setIsDone(false);
      }
    }, MotionDuration.X_LONG * 2);
  };

  return {done, isDone};
};

const AccountInput: React.FC<StyledInputProps> = ({label, value, readOnly, onChange, isDone = false}) => {
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
      {isDone ? (
        <Icon.AnimatedCheck data-uie-name="enter-username-icon-check" />
      ) : (
        <Icon.Edit data-uie-name="enter-username-icon" />
      )}
    </div>
  );
};

export default AccountInput;
