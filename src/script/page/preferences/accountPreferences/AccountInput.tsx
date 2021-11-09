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

import React, {useEffect, useState} from 'react';
import Icon from 'Components/Icon';
import useIsMounted from 'Util/useIsMounted';
import {MotionDuration} from '../../../motion/MotionDuration';

interface AccountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isDone?: boolean;
  label: string;
  onValueChange?: (value: string) => void;
  prefix?: string;
  readOnly?: boolean;
  suffix?: string;
  value: string;
  setIsEditing?: (isEditing: boolean) => void;
  forceLowerCase?: boolean;
  maxLength?: number;
  allowedChars?: string;
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
  ...rest
}) => {
  const [input, setInput] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    setInput(value);
  }, [value]);

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
  return (
    <div
      css={{
        '.edit-icon': {
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
        },
        ':hover .edit-icon': {
          opacity: 1,
        },
        backgroundColor: isEditing ? 'white' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        height: 56,
        marginBottom: 8,

        padding: 8,

        svg: {marginLeft: 8},

        width: 280,
      }}
    >
      <label
        css={{
          color: 'var(--foreground)',
          fontSize: '12px',
          fontWeight: 'normal',
          lineHeight: '1.33',
          marginBottom: 2,
        }}
      >
        {label}
      </label>
      <div
        css={{
          position: 'relative',
        }}
      >
        <div css={{alignItems: 'center', display: 'flex', lineHeight: '1.38', position: 'absolute'}}>
          <span css={{borderBottom: readOnly || isEditing ? 'none' : '1px dashed var(--foreground)'}}>
            <span
              css={{
                opacity: isEditing ? 0.4 : 1,
              }}
            >
              {prefix}
            </span>
            <span css={{opacity: 0}}>{input}</span>
            <span
              css={{
                opacity: isEditing ? 0.4 : 1,
              }}
            >
              {suffix}
            </span>
          </span>
          {isDone ? (
            <Icon.AnimatedCheck css={{path: {stroke: 'var(--foreground)'}}} data-uie-name="enter-username-icon-check" />
          ) : (
            !readOnly &&
            !isEditing && (
              <Icon.Edit css={{fill: 'var(--foreground)'}} className="edit-icon" data-uie-name="enter-username-icon" />
            )
          )}
        </div>
        <div
          css={{
            alignItems: 'center',
            display: 'flex',
            lineHeight: '1.38',
            position: 'absolute',
            width: '100%',
          }}
        >
          <span css={{opacity: 0}}>{prefix}</span>
          <input
            css={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '16px',
              outline: 'none',
              width: '100%',
              padding: 0,
            }}
            readOnly={readOnly}
            value={input}
            onChange={({target}) => updateInput(target.value)}
            onKeyPress={event => {
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
            onFocus={() => {
              setIsEditingExternal?.(true);
              setIsEditing(true);
            }}
            spellCheck={false}
            {...rest}
          />
        </div>
      </div>
    </div>
  );
};

export default AccountInput;
