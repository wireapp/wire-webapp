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

import React from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';

export interface UserInputProps {
  errorMessage?: string;
  isError?: boolean;
  label: string;
  name: string;
  onCancel: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  value: string;
}

const TextInput: React.FC<UserInputProps> = ({
  errorMessage,
  isError,
  label,
  name,
  onCancel,
  onChange,
  placeholder,
  value,
}: UserInputProps) => {
  const isFilled = Boolean(value);

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
          '&::placeholder': {
            color: 'var(--text-input-placeholder)',
          },
          '&:hover': {
            borderColor: 'var(--text-input-border-hover)',
          },
          '&:focus, &:active': {
            '& + label': {
              color: 'var(--blue-500)',
            },
            borderColor: 'var(--blue-500)',
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
          background: 'var(--text-input-background)',
          border: '1px solid',
          borderColor: isError ? 'var(--text-input-alert) !important' : 'var(--text-input-border)',
          borderRadius: 12,
          color: 'var(--text-input-color)',
          outline: 'none',
          padding: '12px 16px',
          width: '100%',
        }}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <label
        className="label-medium"
        css={{
          color: isError && 'var(--text-input-alert) !important',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 2,
        }}
        htmlFor={name}
      >
        {label}
      </label>
      {isFilled && (
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
    </div>
  );
};

export default TextInput;

registerReactComponent<UserInputProps>('text-input', {
  component: TextInput,
  template: '<div data-bind="react: {label, name, onChange, placeholder, value: ko.unwrap(value)}"></div>',
});
