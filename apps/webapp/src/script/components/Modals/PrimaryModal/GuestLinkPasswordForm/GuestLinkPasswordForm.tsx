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

import {Form} from '@wireapp/react-ui-kit';

import {PasswordFields} from 'Components/PasswordFields/PasswordFields';
import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

interface GuestLinkPasswordFormProps {
  readonly translate: Translate;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGeneratePassword: (password: string) => void;
  passwordValue: string;
  passwordValueRef: React.RefObject<HTMLInputElement | null>;
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
        <PasswordFields
          translate={translate}
          passwordValue={passwordValue}
          passwordValueRef={passwordValueRef}
          onPasswordValueChange={onPasswordValueChange}
          isPasswordInputMarkInvalid={isPasswordInputMarkInvalid}
          passwordConfirmationValue={passwordConfirmationValue}
          onPasswordConfirmationChange={onPasswordConfirmationChange}
          isPasswordConfirmationMarkInvalid={isPasswordConfirmationMarkInvalid}
        />
      </Form>
    </>
  );
};
