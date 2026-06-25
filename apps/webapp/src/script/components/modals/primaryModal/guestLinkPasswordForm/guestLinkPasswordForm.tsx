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

import {PasswordGeneratorButton} from 'Components/passwordGeneratorButton';
import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

import {errorMessageStyles} from './guestLinkPasswordForm.styles';

interface GuestLinkPasswordFormProps {
  readonly translate: Translate;
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
  translate,
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
        translate={translate}
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
          placeholder={translate('modalGuestLinkJoinPlaceholder')}
          label={translate('modalGuestLinkJoinLabel')}
          helperText={translate('modalGuestLinkJoinHelperText', {
            minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
          })}
          id="modal_pswd"
          className="modal__input"
          type="password"
          showTogglePasswordLabel={translate('showTogglePasswordLabel')}
          hideTogglePasswordLabel={translate('hideTogglePasswordLabel')}
          autoComplete="off"
          value={passwordValue}
          ref={passwordValueRef}
          onChange={event => onPasswordValueChange(event.currentTarget.value)}
          pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
          markInvalid={isPasswordInputMarkInvalid}
          error={isPasswordInputMarkInvalid ? <GuestLinkPasswordModalErrorMessage translate={translate} /> : undefined}
        />
        <Input
          name="guest-link-password-confirm"
          data-uie-name="guest-link-password-confirm"
          required
          placeholder={translate('modalGuestLinkJoinConfirmPlaceholder')}
          label={translate('modalGuestLinkJoinConfirmLabel')}
          className="modal__input"
          type="password"
          showTogglePasswordLabel={translate('showTogglePasswordLabel')}
          hideTogglePasswordLabel={translate('hideTogglePasswordLabel')}
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

interface GuestLinkPasswordModalErrorMessageProps {
  readonly translate: Translate;
}

const GuestLinkPasswordModalErrorMessage = ({translate}: GuestLinkPasswordModalErrorMessageProps) => {
  return (
    <ErrorMessage data-uie-name="primary-modals-error-message" css={errorMessageStyles}>
      {translate('modalGuestLinkJoinHelperText', {
        minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
      })}
    </ErrorMessage>
  );
};
