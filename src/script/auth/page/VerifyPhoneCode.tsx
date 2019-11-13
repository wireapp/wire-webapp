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

import {LoginData} from '@wireapp/api-client/dist/commonjs/auth';
import {CodeInput, ContainerXS, ErrorMessage, H1, Link} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {phoneLoginStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const VerifyPhoneCode = ({doLogin, resetAuthError, loginData}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const [error /*, setError*/] = useState();
  // const [validationError, setValidationError] = useState();
  const {history} = useReactRouter();

  useEffect(() => {
    if (!loginData.phone) {
      history.push(ROUTE.LOGIN_PHONE);
    }
  }, []);

  const resendCode = () => {};

  const handleLogin = async (code: string) => {
    // setValidationError(validationError);
    try {
      // if (validationError.length) {
      //   throw validationError[0];
      // }
      const login: LoginData = {clientType: loginData.clientType, phone: loginData.phone, code};

      await doLogin(login);

      return history.push(ROUTE.HISTORY_INFO);
    } catch (error) {
      if ((error as BackendError).label) {
        const backendError = error as BackendError;
        switch (backendError.label) {
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            resetAuthError();
            history.push(ROUTE.CLIENTS);
            break;
          }
          case BackendError.LABEL.INVALID_CREDENTIALS:
          case LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE: {
            break;
          }
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              backendError.label.endsWith(errorType),
            );
            if (!isValidationError) {
              throw backendError;
            }
          }
        }
      } else {
        throw error;
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
        <div>
          <H1 center>{_(phoneLoginStrings.verifyCodeDescription, {number: loginData.phone})}</H1>
          <CodeInput autoFocus style={{marginTop: 10}} onCodeComplete={handleLogin} data-uie-name="enter-code" />
          <ErrorMessage data-uie-name="error-message">{parseError(error)}</ErrorMessage>
        </div>
        <div>
          <Link onClick={resendCode} data-uie-name="do-resend-code">
            {_(phoneLoginStrings.verifyCodeResend)}
          </Link>
          <Link onClick={() => history.push(ROUTE.LOGIN_PHONE)} data-uie-name="go-change-phone">
            {_(phoneLoginStrings.verifyCodeChangePhone)}
          </Link>
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
  loginData: AuthSelector.getLoginData(state),
  loginError: AuthSelector.getError(state),
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(VerifyPhoneCode);
