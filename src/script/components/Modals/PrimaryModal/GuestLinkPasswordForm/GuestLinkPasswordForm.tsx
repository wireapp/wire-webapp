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

import {ValidationUtil} from '@wireapp/commons';
import {Form, Input, ErrorMessage} from '@wireapp/react-ui-kit';

import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {errorMessageStyles} from './GuestLinkPasswordForm.styles';

interface GuestLinkPasswordFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGeneratePassword: (password: string) => void;
  passwordValue: string;
  passwordValueRef: React.RefObject<HTMLInputElement>;
  onPasswordValueChange: (value: string) => void;
  isPasswordInputMarkInvalid: boolean;
  passwordConfirmationValue: string;
  onPasswordConfirmationChange: (value: string) => void;
  isPasswordConfirmationMarkInvalid: boolean;
}

export const GuestLinkPasswordForm = ({
  onSubmit,
  onGeneratePassword,
  passwordValue,
  passwordValueRef,
  onPasswordValueChange,
  isPasswordInputMarkInvalid,
  passwordConfirmationValue,
  onPasswordConfirmationChange,
  isPasswordConfirmationMarkInvalid,
}: GuestLinkPasswordFormProps) => {
  return (
    <>
      <PasswordGeneratorButton
        passwordLength={Config.getConfig().MINIMUM_PASSWORD_LENGTH}
        onGeneratePassword={onGeneratePassword}
      />
      <Form
        name="guest-password-link-form"
        data-uie-name="guest-password-link-form"
        onSubmit={onSubmit}
        autoComplete="off"
      >
        <Input
          name="guest-link-password"
          data-uie-name="guest-link-password"
          required
          placeholder={t('modalGuestLinkJoinPlaceholder')}
          label={t('modalGuestLinkJoinLabel')}
          helperText={t('modalGuestLinkJoinHelperText', {
            minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
          })}
          id="modal_pswd"
          className="modal__input"
          type="password"
          autoComplete="off"
          value={passwordValue}
          ref={passwordValueRef}
          onChange={event => onPasswordValueChange(event.currentTarget.value)}
          pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
          markInvalid={isPasswordInputMarkInvalid}
          error={isPasswordInputMarkInvalid ? <GuestLinkPasswordModalErrorMessage /> : undefined}
        />
        <Input
          name="guest-link-password-confirm"
          data-uie-name="guest-link-password-confirm"
          required
          placeholder={t('modalGuestLinkJoinConfirmPlaceholder')}
          label={t('modalGuestLinkJoinConfirmLabel')}
          className="modal__input"
          type="password"
          id="modal_pswd_confirmation"
          autoComplete="off"
          value={passwordConfirmationValue}
          onChange={event => onPasswordConfirmationChange(event.currentTarget.value)}
          markInvalid={isPasswordConfirmationMarkInvalid}
        />
      </Form>
    </>
  );
};

const GuestLinkPasswordModalErrorMessage = () => {
  return (
    <ErrorMessage data-uie-name="primary-modals-error-message" css={errorMessageStyles}>
      {t('modalGuestLinkJoinHelperText', {
        minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
      })}
    </ErrorMessage>
  );
};
