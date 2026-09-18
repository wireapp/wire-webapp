/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ValidationUtil} from '@wireapp/commons';
import {ErrorMessage, Input} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

import {errorMessageStyles} from './PasswordFields.styles';

export interface PasswordFieldsProps {
  readonly translate: Translate;
  required?: boolean;
  passwordError?: React.ReactNode;
  passwordConfirmationError?: React.ReactNode;
  passwordValue: string;
  passwordValueRef: React.RefObject<HTMLInputElement | null>;
  onPasswordValueChange: (value: string) => void;
  isPasswordInputMarkInvalid: boolean;
  passwordConfirmationValue: string;
  onPasswordConfirmationChange: (value: string) => void;
  isPasswordConfirmationMarkInvalid: boolean;
}

export const PasswordFields = ({
  translate,
  required = true,
  passwordError,
  passwordConfirmationError,
  passwordValue,
  passwordValueRef,
  onPasswordValueChange,
  isPasswordInputMarkInvalid,
  passwordConfirmationValue,
  onPasswordConfirmationChange,
  isPasswordConfirmationMarkInvalid,
}: PasswordFieldsProps) => (
  <>
    <Input
      name="guest-link-password"
      data-uie-name="guest-link-password"
      required={required}
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
      error={
        isPasswordInputMarkInvalid ? (
          <PasswordFieldsErrorMessage translate={translate} message={passwordError} />
        ) : undefined
      }
    />
    <Input
      name="guest-link-password-confirm"
      data-uie-name="guest-link-password-confirm"
      required={required}
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
      error={
        isPasswordConfirmationMarkInvalid ? (
          <PasswordFieldsErrorMessage translate={translate} message={passwordConfirmationError} />
        ) : undefined
      }
    />
  </>
);

const PasswordFieldsErrorMessage = ({
  translate,
  message,
}: {translate: PasswordFieldsProps['translate']; message?: React.ReactNode}) => (
  <ErrorMessage data-uie-name="primary-modals-error-message" css={errorMessageStyles}>
    {message ??
      translate('modalGuestLinkJoinHelperText', {
        minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
      })}
  </ErrorMessage>
);
