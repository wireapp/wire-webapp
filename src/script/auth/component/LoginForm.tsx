import {LoginData} from '@wireapp/api-client/dist/commonjs/auth';
import {ICON_NAME, Input, InputBlock, InputSubmitCombo, Loading, RoundIconButton} from '@wireapp/react-ui-kit';
import React, {Dispatch, SetStateAction, useRef, useState} from 'react';
import {useIntl} from 'react-intl';

import {loginStrings} from '../../strings';
import {ValidationError} from '../module/action/ValidationError';

interface LoginFormProps {
  setValidationErrors: Dispatch<SetStateAction<Error[]>>;
  isFetching: boolean;
  onSubmit: (LoginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

const LoginForm = ({isFetching, setValidationErrors, onSubmit}: LoginFormProps) => {
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
    const loginData: Partial<LoginData> = {};
    setValidPasswordInput(passwordInput.current.validity.valid);
    setValidationErrors(validationErrors);
    onSubmit(loginData, validationErrors);
  };

  return (
    <InputBlock>
      <Input
        name="email"
        tabIndex={1}
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
      <InputSubmitCombo>
        <Input
          name="password-login"
          tabIndex={2}
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
          pattern={`.{1,1024}`}
          required
          data-uie-name="enter-password"
        />
        {isFetching ? (
          <Loading size={32} />
        ) : (
          <RoundIconButton
            style={{marginLeft: 16}}
            tabIndex={4}
            disabled={!email || !password}
            type="submit"
            formNoValidate
            icon={ICON_NAME.ARROW}
            onClick={handleSubmit}
            data-uie-name="do-sign-in"
          />
        )}
      </InputSubmitCombo>
    </InputBlock>
  );
};

export default LoginForm;
