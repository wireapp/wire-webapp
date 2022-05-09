/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import React, {useEffect, useState, useRef} from 'react';
import Icon from 'Components/Icon';
import useIsMounted from 'Util/useIsMounted';
import {MotionDuration} from '../../../../../motion/MotionDuration';
import TextInput from 'Components/TextInput';

interface AccountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  allowedChars?: string;
  'data-uie-name'?: string;
  forceLowerCase?: boolean;
  isDone?: boolean;
  label: string;
  fieldName: string;
  labelUie?: string;
  maxLength?: number;
  onValueChange?: (value: string) => void;
  prefix?: string;
  readOnly?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  suffix?: string;
  value: string;
  valueUie?: string;
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

const AccountInput: React.FC<AccountInputProps> = ({
  label,
  fieldName,
  value,
  readOnly,
  onValueChange,
  isDone = false,
  prefix,
  suffix,
  setIsEditing: setIsEditingExternal,
  forceLowerCase = false,
  maxLength,
  allowedChars,
  labelUie,
  valueUie,
  ...rest
}) => {
  const textInputRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (textInputRef.current && !textInputRef.current.contains(event.target)) {
        setInput(value);
        setIsEditingExternal?.(false);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [textInputRef]);

  const updateInput = (value: string) => {
    if (allowedChars) {
      value = value.replace(new RegExp(`[^${allowedChars}]`, 'g'), '');
    }
    if (forceLowerCase) {
      value = value.toLowerCase();
    }
    if (maxLength) {
      value = value.substring(0, maxLength);
    }
    setInput(value);
  };

  const iconUiePrefix = rest['data-uie-name'] ?? 'account-input';

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: 56,
        marginBottom: 40,
        padding: 8,
        width: 280,
      }}
    >
      {!isEditing && (
        <>
          <label
            className="label preferences-label"
            css={{
              lineHeight: '14px',
              marginBottom: 16,
              position: 'relative',
            }}
            data-uie-name={labelUie}
            htmlFor={valueUie}
          >
            {label}

            {!readOnly && (
              <button
                type="button"
                css={{
                  background: 'transparent',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  position: 'absolute',
                  svg: {marginLeft: 8},
                  top: '-1px',
                }}
                onClick={() => {
                  setIsEditingExternal?.(true);
                  setIsEditing(true);
                }}
                data-uie-name={`go-edit-${fieldName}`}
              >
                {isDone ? (
                  <Icon.AnimatedCheck
                    css={{path: {stroke: 'var(--foreground)'}}}
                    data-uie-name={`${iconUiePrefix}-icon-check`}
                  />
                ) : (
                  <Icon.Edit
                    css={{fill: 'var(--foreground)'}}
                    className="edit-icon"
                    data-uie-name={`${iconUiePrefix}-icon`}
                  />
                )}
              </button>
            )}
          </label>

          <div css={{alignItems: 'center', display: 'flex', lineHeight: '1.38', width: '100%'}}>
            <span data-uie-name={`${fieldName}-display`} className="ellipsis">
              {[prefix, input, suffix].filter(Boolean).join('')}
            </span>
          </div>
        </>
      )}

      {isEditing && (
        <TextInput
          uieName={`enter-${fieldName}-input`}
          label={label}
          name={valueUie}
          value={input}
          onChange={({target}) => updateInput(target.value)}
          onCancel={() => updateInput('')}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onValueChange?.(input);
              (event.target as HTMLInputElement).blur();
            }
          }}
          onBlur={() => {
            setInput(value);
            setIsEditingExternal?.(false);
            setIsEditing(false);
          }}
          ref={textInputRef}
        />
      )}
    </div>
  );
};

export default AccountInput;
