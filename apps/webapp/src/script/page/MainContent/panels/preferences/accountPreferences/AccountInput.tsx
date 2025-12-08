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

import {FC, InputHTMLAttributes, useEffect, useRef, useState} from 'react';

import {IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {TextInput} from 'Components/TextInput';
import {useIsMounted} from 'Util/useIsMounted';

import {MotionDuration} from '../../../../../motion/MotionDuration';
import {isEnterKey, isTabKey} from '../../../../../util/KeyboardUtil';

interface AccountInputProps extends InputHTMLAttributes<HTMLInputElement> {
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

const AccountInput: FC<AccountInputProps> = ({
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
  const inputWrapperRef = useRef<HTMLInputElement | null>(null);

  const [input, setInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (inputWrapperRef.current && !inputWrapperRef.current.contains(event.target)) {
        setInput(value);
        setIsEditingExternal?.(false);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        height: 100,
        padding: 8,
        width: 280,
      }}
    >
      {!isEditing && (
        <>
          <label
            className="label preferences-label"
            css={{
              alignItems: 'center',
              display: 'flex',
              height: 32,
              lineHeight: 'var(--line-height-small-plus)',
              position: 'relative',
            }}
            data-uie-name={labelUie}
            htmlFor={valueUie}
          >
            {label}

            {!readOnly && (
              <IconButton
                variant={IconButtonVariant.SECONDARY}
                css={{
                  margin: '0 0.5rem',
                }}
                data-uie-name={`go-edit-${fieldName}`}
                onClick={() => {
                  setIsEditingExternal?.(true);
                  setIsEditing(true);
                }}
              >
                {isDone ? (
                  <Icon.AnimatedCheckIcon
                    css={{path: {stroke: 'var(--foreground)'}}}
                    data-uie-name={`${iconUiePrefix}-icon-check`}
                  />
                ) : (
                  <Icon.EditIcon className="edit-icon" data-uie-name={`${iconUiePrefix}-icon`} />
                )}
              </IconButton>
            )}
          </label>

          <div css={{alignItems: 'center', display: 'flex', lineHeight: '1.38', width: '100%'}}>
            <span data-uie-name={valueUie ?? `${fieldName}-display`} className="ellipsis">
              {[prefix, input, suffix].filter(Boolean).join('')}
            </span>
          </div>
        </>
      )}

      {/* eslint jsx-a11y/no-autofocus : "off" */}
      {isEditing && (
        <TextInput
          autoFocus
          uieName={`enter-${fieldName}-input`}
          label={label}
          name={valueUie ? valueUie : fieldName}
          value={input}
          ref={inputWrapperRef}
          onChange={({target}) => updateInput(target.value)}
          onCancel={() => {
            updateInput('');
            setIsEditing(true);
          }}
          onKeyDown={event => {
            if (isEnterKey(event) && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onValueChange?.(input);
              (event.target as HTMLInputElement).blur();
              // on enter save changes and close the editable field
              setIsEditing(false);
            } else if (isTabKey(event) && !!!input) {
              // after clearing the input i.e field value is empty when user press tab,
              // revert to the last saved value, close the editable field and focus on the next field
              setInput(value);
              setIsEditing(false);
            }
          }}
          onBlur={() => {
            setInput(value);
            setIsEditingExternal?.(false);
          }}
          setIsEditing={setIsEditing}
        />
      )}
    </div>
  );
};

export {AccountInput};
