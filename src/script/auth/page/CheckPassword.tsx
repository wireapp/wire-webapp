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
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {
  ArrowIcon,
  ContainerXS,
  Form,
  H1,
  Input,
  InputBlock,
  InputSubmitCombo,
  Link,
  Loading,
  RoundIconButton,
} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {loginStrings, phoneLoginStrings} from '../../strings';
import {Exception} from '../component/Exception';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot} from '../module/action';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import * as UrlUtil from '../util/urlUtil';

type Props = React.HTMLProps<HTMLDivElement>;

function CheckPasswordComponent({
  loginData,
  doLogin,
  resetAuthError,
  isFetching,
}: Props & ConnectedProps & DispatchProps) {
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();

  const passwordInput = useRef<HTMLInputElement>();

  const [error, setError] = useState(null);
  const [password, setPassword] = useState<string>('');
  const [validPasswordInput, setValidPasswordInput] = useState(true);

  useEffect(() => {
    if (!loginData.phone) {
      navigate(ROUTE.LOGIN_PHONE);
    }
  }, []);

  const handleLogin = async (event: React.SyntheticEvent) => {
    let validationError: Error;
    event.preventDefault();

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
      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error);
        return;
      }
      switch (error.label) {
        case BackendErrorLabel.TOO_MANY_CLIENTS: {
          resetAuthError();
          navigate(ROUTE.CLIENTS);
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
  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value);

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <H1 center>{_(phoneLoginStrings.verifyPasswordHeadline)}</H1>
        <Form style={{marginTop: 30}} data-uie-name="login" onSubmit={handleLogin}>
          <InputBlock>
            <InputSubmitCombo>
              <Input
                id="password-login"
                onChange={onPasswordChange}
                type="password"
                name="password-login"
                autoComplete="section-login password"
                placeholder={_(loginStrings.passwordPlaceholder)}
                pattern=".{1,1024}"
                data-uie-name="enter-password"
                required
                ref={passwordInput}
                markInvalid={!validPasswordInput}
                value={password}
              />
              {isFetching ? (
                <Loading size={32} />
              ) : (
                <RoundIconButton
                  style={{marginLeft: 16}}
                  type="submit"
                  formNoValidate
                  onClick={handleLogin}
                  disabled={isFetching || !password}
                  data-uie-name="do-sign-in"
                >
                  <ArrowIcon />
                </RoundIconButton>
              )}
            </InputSubmitCombo>
          </InputBlock>
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
}

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

const CheckPassword = connect(mapStateToProps, mapDispatchToProps)(CheckPasswordComponent);

export {CheckPassword};
