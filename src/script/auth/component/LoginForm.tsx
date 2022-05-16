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

import {LoginData} from '@wireapp/api-client/src/auth';
import {css} from '@emotion/react';
import {Button, Input, Link, Loading, COLOR} from '@wireapp/react-ui-kit';
import React, {useRef, useState} from 'react';
import {useIntl} from 'react-intl';

import {isValidEmail, isValidPhoneNumber, isValidUsername} from 'Util/ValidationUtil';

import {Config} from '../../Config';
import {loginStrings} from '../../strings';
import {ValidationError} from '../module/action/ValidationError';
import {EXTERNAL_ROUTE} from '../externalRoute';

interface LoginFormProps {
  isFetching: boolean;
  onSubmit: (loginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

const inputContainer = css`
  display: flex;
  flex-direction: column;

  label {
    font-size: 14px;
    order: -1;
    text-align: left;
    margin-bottom: 2px;
  }

  input:focus + label {
    color: ${COLOR.BLUE};
  }
`;

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
      <div css={inputContainer}>
        <Input
          name="email"
          id="email"
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

        <label htmlFor="email">Email / username</label>
      </div>

      <div css={inputContainer}>
        <label htmlFor="password-login">Password</label>

        <Input
          name="password-login"
          id="password-login"
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
          style={{margin: '0 0 6px'}}
        />

        <Link
          href={EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET}
          target="_blank"
          fontSize="16px"
          bold={false}
          color={COLOR.BLUE}
          style={{textDecoration: 'underline'}}
          data-uie-name="go-forgot-password"
          textTransform="capitalize"
        >
          {_(loginStrings.forgotPassword)}
        </Link>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        block
        disabled={!email || !password}
        style={{
          alignItems: 'center',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '0',
          marginTop: '20px',
        }}
        aria-label={_(loginStrings.headline)}
        data-uie-name="do-sign-in"
      >
        {isFetching ? <Loading size={32} /> : _(loginStrings.headline)}
      </Button>
    </div>
  );
};

export default LoginForm;
