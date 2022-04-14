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

export interface UserInputProps {
  label: string;
  name: string;
  onCancel: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  value: string;
}

const TextInput: React.FC<UserInputProps> = ({label, name, onChange, placeholder, value}: UserInputProps) => {
  return (
    <div css={{display: 'flex', flexDirection: 'column-reverse', width: '100%'}}>
      <input
        className="text-input"
        css={{
          '&::placeholder': {
            color: 'var(--text-input-placeholder)',
          },
          '&:focus, &:active': {
            '& + label': {
              color: 'var(--blue-500)',
            },
            borderColor: 'var(--blue-500)',
          },
          '&:hover': {
            borderColor: 'var(--text-input-border-hover)',
          },
          background: 'var(--text-input-background)',
          border: '1px solid',
          borderColor: 'var(--text-input-border)',
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
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 2,
        }}
        htmlFor={name}
      >
        {label}
      </label>
    </div>
  );
};

export default TextInput;

registerReactComponent<UserInputProps>('text-input', {
  component: TextInput,
  template: '<div data-bind="react: {label, name, onChange, placeholder, value: ko.unwrap(value)}"></div>',
});
