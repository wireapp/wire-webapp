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

import React, {useEffect, useRef, useState} from 'react';

import {LoginData} from '@wireapp/api-client/lib/auth';
import {useSelector} from 'react-redux';

import {Button, Input, Loading} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {isValidEmail, isValidUsername} from 'Util/ValidationUtil';

import {ValidationError} from '../module/action/ValidationError';
import {RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';

interface LoginFormProps {
  isFetching: boolean;
  onSubmit: (loginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

const LoginForm = ({isFetching, onSubmit}: LoginFormProps) => {
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  const [validEmailInput, setValidEmailInput] = useState(true);
  const [validPasswordInput, setValidPasswordInput] = useState(true);
  const {email: defaultEmail} = useSelector((state: RootState) => AuthSelector.getAccount(state));

  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (isFetching) {
      return;
    }

    if (!emailInput.current || !passwordInput.current) {
      return;
    }

    emailInput.current.value = emailInput.current.value.trim();
    const validationErrors: Error[] = [];

    const isEmailValid = emailInput.current.checkValidity();
    if (!isEmailValid) {
      const emailValidationError = ValidationError.handleValidationState(
        emailInput.current.name,
        emailInput.current.validity,
      );
      if (emailValidationError) {
        validationErrors.push(emailValidationError);
      }
    }

    setValidEmailInput(emailInput.current.validity.valid);

    const isPasswordValid = passwordInput.current.checkValidity();

    if (!isPasswordValid) {
      const passwordValidationError = ValidationError.handleValidationState(
        passwordInput.current.name,
        passwordInput.current.validity,
      );
      if (passwordValidationError) {
        validationErrors.push(passwordValidationError);
      }
    }

    const loginData: Partial<LoginData> = {password};
    setValidPasswordInput(passwordInput.current.validity.valid);

    const localEmail = email.trim();

    if (isValidEmail(localEmail)) {
      loginData.email = localEmail;
    } else if (isValidUsername(localEmail.toLowerCase())) {
      loginData.handle = localEmail.replace('@', '').toLowerCase();
    }
    await onSubmit(loginData, validationErrors);
  };

  // When email is locked (second screen), move focus to password after render.
  useEffect(() => {
    if (!defaultEmail) {
      return;
    }

    const passwordField = passwordInput.current;
    if (!passwordField) {
      return;
    }

    const attemptPasswordFieldFocus = () => {
      const currentlyFocusedElement = document.activeElement as HTMLElement | null;
      const noElementHasFocus = !currentlyFocusedElement || currentlyFocusedElement === document.body;
      const focusIsOnDifferentElement = currentlyFocusedElement && currentlyFocusedElement !== passwordField;

      if (noElementHasFocus || focusIsOnDifferentElement) {
        passwordField.focus({preventScroll: true});

        // If autofill populated the field, position cursor at the end
        if (passwordField.value.length > 0) {
          passwordField.setSelectionRange(passwordField.value.length, passwordField.value.length);
        }
      }
    };

    // Strategy 1: Immediate attempt (works in most cases)
    attemptPasswordFieldFocus();

    // Strategy 2: Post-layout attempt (handles browser autofill timing)
    const animationFrameId = requestAnimationFrame(attemptPasswordFieldFocus);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [defaultEmail]);

  return (
    <div>
      <Input
        disabled={!!defaultEmail}
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
        placeholder={t('login.emailPlaceholder')}
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
        placeholder={t('login.passwordPlaceholder')}
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
          aria-label={t('login.headline')}
          data-uie-name="do-sign-in"
        >
          {t('login.headline')}
        </Button>
      )}
    </div>
  );
};

export {LoginForm};
