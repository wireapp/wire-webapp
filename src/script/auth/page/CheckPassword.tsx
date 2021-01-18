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
import {BackendErrorLabel} from '@wireapp/api-client/src/http';
import {
  ArrowIcon,
  ContainerXS,
  Form,
  H1,
  Input,
  InputSubmitCombo,
  Link,
  Loading,
  RoundIconButton,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {loginStrings, phoneLoginStrings} from '../../strings';
import Exception from '../component/Exception';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot} from '../module/action';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import * as UrlUtil from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const CheckPassword = ({loginData, doLogin, resetAuthError, isFetching}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();

  const passwordInput = useRef<HTMLInputElement>();

  const [error, setError] = useState(null);
  const [password, setPassword] = useState<string | null>(null);
  const [validPasswordInput, setValidPasswordInput] = useState(true);

  useEffect(() => {
    if (!loginData.phone) {
      history.push(ROUTE.LOGIN_PHONE);
    }
  }, []);

  const handleLogin = async () => {
    let validationError: Error;

    if (!passwordInput.current.checkValidity()) {
      validationError = ValidationError.handleValidationState(
        passwordInput.current.name,
        passwordInput.current.validity,
      );
    }
    setValidPasswordInput(passwordInput.current.validity.valid);
    try {
      if (validationError) {
        throw validationError;
      }
      const login: LoginData = {clientType: loginData.clientType, password, phone: loginData.phone};
      await doLogin(login);
      return history.push(ROUTE.HISTORY_INFO);
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error);
        return;
      }
      switch (error.label) {
        case BackendErrorLabel.TOO_MANY_CLIENTS: {
          resetAuthError();
          history.push(ROUTE.CLIENTS);
          break;
        }
        case BackendErrorLabel.INVALID_CREDENTIALS:
        case LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE:
        case BackendErrorLabel.BAD_REQUEST: {
          setError(error);
          return;
        }
        default: {
          setError(error);
          throw error;
        }
      }
    }
  };

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <H1 center>{_(phoneLoginStrings.verifyPasswordHeadline)}</H1>
        <Form style={{marginTop: 30}} data-uie-name="login">
          <InputSubmitCombo>
            <Input
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              tabIndex={1}
              type="password"
              name="password-login"
              autoComplete="section-login password"
              placeholder={_(loginStrings.passwordPlaceholder)}
              pattern={'.{1,1024}'}
              data-uie-name="enter-password"
              required
              autoFocus
              ref={passwordInput}
              markInvalid={!validPasswordInput}
              value={password}
            />
            {isFetching ? (
              <Loading size={32} />
            ) : (
              <RoundIconButton
                style={{marginLeft: 16}}
                tabIndex={2}
                type="submit"
                formNoValidate
                onClick={handleLogin}
                disabled={isFetching || !password}
                showLoading={isFetching}
                data-uie-name="do-sign-in"
              >
                <ArrowIcon />
              </RoundIconButton>
            )}
          </InputSubmitCombo>
          <Exception errors={[error]} />
        </Form>
        <Link
          center
          onClick={() => UrlUtil.openTab(EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET)}
          data-uie-name="go-forgot-password"
        >
          {_(loginStrings.forgotPassword)}
        </Link>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
  loginData: AuthSelector.getLoginData(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doLogin: actionRoot.authAction.doLogin,
      resetAuthError: actionRoot.authAction.resetAuthError,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(CheckPassword);
