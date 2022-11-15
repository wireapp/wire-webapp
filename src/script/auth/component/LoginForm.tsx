/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import React, {useRef, useState} from 'react';

import {LoginData} from '@wireapp/api-client/lib/auth';
import {useIntl} from 'react-intl';

import {Button, Input, Loading} from '@wireapp/react-ui-kit';

import {isValidEmail, isValidPhoneNumber, isValidUsername} from 'Util/ValidationUtil';

import {Config} from '../../Config';
import {loginStrings} from '../../strings';
import {ValidationError} from '../module/action/ValidationError';

interface LoginFormProps {
  isFetching: boolean;
  onSubmit: (loginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

const LoginForm = ({isFetching, onSubmit}: LoginFormProps) => {
  const {formatMessage: _} = useIntl();
  const emailInput = useRef<HTMLInputElement>();
  const passwordInput = useRef<HTMLInputElement>();
  const [validEmailInput, setValidEmailInput] = useState(true);
  const [validPasswordInput, setValidPasswordInput] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (isFetching) {
      return undefined;
    }
    emailInput.current.value = emailInput.current.value.trim();
    const validationErrors: Error[] = [];

    if (!emailInput.current.checkValidity()) {
      validationErrors.push(
        ValidationError.handleValidationState(emailInput.current.name, emailInput.current.validity),
      );
    }
    setValidEmailInput(emailInput.current.validity.valid);
    if (!passwordInput.current.checkValidity()) {
      validationErrors.push(
        ValidationError.handleValidationState(passwordInput.current.name, passwordInput.current.validity),
      );
    }
    const loginData: Partial<LoginData> = {password};
    setValidPasswordInput(passwordInput.current.validity.valid);
    const localEmail = email.trim();
    if (isValidEmail(localEmail)) {
      loginData.email = localEmail;
    } else if (isValidUsername(localEmail.toLowerCase())) {
      loginData.handle = localEmail.replace('@', '').toLowerCase();
    } else if (Config.getConfig().FEATURE.ENABLE_PHONE_LOGIN && isValidPhoneNumber(localEmail)) {
      loginData.phone = localEmail;
    }
    onSubmit(loginData, validationErrors);
  };

  return (
    <div>
      <Input
        id="email"
        name="email"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setEmail(event.target.value);
          setValidEmailInput(true);
        }}
        ref={emailInput}
        markInvalid={!validEmailInput}
        value={email}
        autoComplete="username email"
        placeholder={_(loginStrings.emailPlaceholder)}
        maxLength={128}
        type="text"
        required
        data-uie-name="enter-email"
      />
      <Input
        id="password-login"
        name="password-login"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setPassword(event.target.value);
          setValidPasswordInput(true);
        }}
        ref={passwordInput}
        markInvalid={!validPasswordInput}
        value={password}
        autoComplete="section-login password"
        type="password"
        placeholder={_(loginStrings.passwordPlaceholder)}
        pattern={'.{1,1024}'}
        required
        data-uie-name="enter-password"
      />

      {isFetching ? (
        <Loading size={32} />
      ) : (
        <Button
          block
          type="submit"
          disabled={!email || !password}
          formNoValidate
          onClick={handleSubmit}
          aria-label={_(loginStrings.headline)}
          data-uie-name="do-sign-in"
        >
          {_(loginStrings.headline)}
        </Button>
      )}
    </div>
  );
};

export {LoginForm};
