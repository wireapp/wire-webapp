/* eslint-disable sort-keys-fix/sort-keys-fix */
/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import {CheckIcon, COLOR} from '@wireapp/react-ui-kit';

export interface UserInputProps {
  disabled?: boolean;
  errorMessage?: string;
  isError?: boolean;
  isSuccess?: boolean;
  label: string;
  name: string;
  onCancel: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onSuccessDismissed?: () => void;
  placeholder: string;
  value: string;
}

const SUCCESS_DISMISS_TIMEOUT = 2500;

const TextInput: React.FC<UserInputProps> = ({
  disabled,
  errorMessage,
  isError,
  isSuccess,
  label,
  name,
  onCancel,
  onChange,
  onSuccessDismissed,
  placeholder,
  value,
}: UserInputProps) => {
  const isFilled = Boolean(value);

  useEffect(() => {
    if (isSuccess && onSuccessDismissed) {
      setTimeout(() => {
        onSuccessDismissed();
      }, SUCCESS_DISMISS_TIMEOUT);
    }
  }, [isSuccess, onSuccessDismissed]);

  let changedColor = null;
  if (isError) {
    changedColor = 'var(--text-input-alert) !important';
  }
  if (isSuccess) {
    changedColor = 'var(--green-500) !important';
  }

  return (
    <div
      css={{display: 'flex', flexDirection: 'column-reverse', paddingBottom: 26, position: 'relative', width: '100%'}}
    >
      {isError && errorMessage && (
        <span
          className="label"
          css={{
            bottom: 4,
            color: 'var(--text-input-alert)',
            left: 0,
            lineHeight: '14px',
            position: 'absolute',
            textTransform: 'unset',
          }}
        >
          {errorMessage}
        </span>
      )}
      <input
        className="text-input"
        css={{
          '&[disabled]': {},
          '&::placeholder': {
            color: 'var(--text-input-placeholder)',
          },
          '&:hover': {
            borderColor: !disabled && 'var(--text-input-border-hover)',
          },
          '&:focus, &:active': {
            '& + label': {
              color: !disabled && 'var(--blue-500)',
            },
            borderColor: !disabled && 'var(--blue-500)',
          },
          '::placeholder': {
            // Chrome, Firefox, Opera, Safari 10.1+
            color: 'var(--text-input-placeholder)',
            opacity: 1, // Firefox
          },
          ':-ms-input-placeholder': {
            // Internet Explorer 10-11
            color: 'var(--text-input-placeholder)',
          },
          '::-ms-input-placeholder': {
            // Microsoft Edge
            color: 'var(--text-input-placeholder)',
          },
          background: disabled ? 'var(--text-input-disabled)' : 'var(--text-input-background)',
          border: '1px solid',
          borderColor: changedColor || 'var(--text-input-border)',
          borderRadius: 12,
          color: 'var(--text-input-color)',
          outline: 'none',
          padding: '12px 16px',
          width: '100%',
        }}
        disabled={disabled}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <label
        className="label-medium"
        css={{
          color: changedColor || 'var(--text-input-label)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 2,
        }}
        htmlFor={name}
      >
        {label}
      </label>
      {isFilled && !isSuccess && (
        <button
          css={{
            alignItems: 'center',
            background: 'var(--text-input-color)',
            border: 'none',
            borderRadius: '50%',
            bottom: 42,
            display: 'flex',
            height: 16,
            justifyContent: 'center',
            margin: 0,
            padding: 0,
            position: 'absolute',
            right: 16,
            width: 16,
          }}
          onClick={onCancel}
        >
          <Icon.Close css={{fill: 'var(--text-input-background)', height: 8, width: 8}} />
        </button>
      )}
      {isSuccess && (
        <CheckIcon
          css={{
            fill: changedColor,
            alignItems: 'center',
            bottom: 42,
            height: 16,
            margin: 0,
            padding: 0,
            position: 'absolute',
            right: 16,
            width: 16,
          }}
          color={COLOR.TEXT}
        />
      )}
    </div>
  );
};

export default TextInput;

registerReactComponent<UserInputProps>('text-input', {
  component: TextInput,
  template: '<div data-bind="react: {label, name, onChange, placeholder, value: ko.unwrap(value)}"></div>',
});
