/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {FormEvent} from 'react';

interface PasswordFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputPlaceholder: string;
  inputValue: string;
  onInputChange: (value: string) => void;
}

export const PasswordForm = ({onSubmit, inputPlaceholder, inputValue, onInputChange}: PasswordFormProps) => {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="modal_pswd" className="visually-hidden">
        {inputPlaceholder}
      </label>

      <input
        id="modal_pswd"
        className="modal__input"
        type="password"
        value={inputValue}
        placeholder={inputPlaceholder}
        onChange={event => onInputChange(event.target.value)}
      />
    </form>
  );
};
