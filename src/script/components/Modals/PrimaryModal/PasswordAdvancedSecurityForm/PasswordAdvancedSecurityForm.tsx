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

import type {ReactElement, ChangeEvent, FormEvent} from 'react';

import {Input} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

interface PasswordAdvancedSecurityFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputValue: string;
  inputPlaceholder: string;
  isInputInvalid: boolean;
  onInputChange: (value: string) => void;
  inputHelperText: string;
  error?: ReactElement;
}

export const PasswordAdvancedSecurityForm = ({
  onSubmit,
  inputValue,
  inputPlaceholder,
  isInputInvalid,
  onInputChange,
  inputHelperText,
  error,
}: PasswordAdvancedSecurityFormProps) => {
  return (
    <form onSubmit={onSubmit}>
      <Input
        id="modal_pswd_with_rules"
        type="password"
        togglePasswordBtnLabel={t('passwordToggleBtn')}
        value={inputValue}
        placeholder={inputPlaceholder}
        required
        data-uie-name="backup-password"
        markInvalid={isInputInvalid}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onInputChange(event.target.value);
        }}
        autoComplete="password"
        pattern=".{2,64}"
        helperText={inputHelperText}
        error={error}
      />
    </form>
  );
};
