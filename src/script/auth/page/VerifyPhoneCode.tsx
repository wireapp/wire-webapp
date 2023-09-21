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

import React, {useEffect, useState} from 'react';

import {LoginData} from '@wireapp/api-client/lib/auth';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {CodeInput, Column, Columns, ContainerXS, H1} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {phoneLoginStrings} from '../../strings';
import {LinkButton} from '../component/LinkButton';
import {RouterLink} from '../component/RouterLink';
import {actionRoot} from '../module/action';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';

type Props = React.HTMLProps<HTMLDivElement>;

function VerifyPhoneCodeComponent({
  doLogin,
  resetAuthError,
  loginData,
  doSendPhoneLoginCode,
}: Props & ConnectedProps & DispatchProps) {
  const {formatMessage: _} = useIntl();
  const [error, setError] = useState<ValidationError | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loginData.phone) {
      navigate(ROUTE.LOGIN_PHONE);
    }
  }, []);

  const resendCode = async () => {
    try {
      await doSendPhoneLoginCode({phone: loginData.phone});
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error);
      } else if (error.hasOwnProperty('label')) {
        switch (error.label) {
          case BackendErrorLabel.PASSWORD_EXISTS: {
            return navigate(ROUTE.CHECK_PASSWORD);
          }
          default: {
            setError(error);
            throw error;
          }
        }
      } else {
        throw error;
      }
    }
  };

  const handleLogin = async (code: string) => {
    try {
      const login: LoginData = {clientType: loginData.clientType, code, phone: loginData.phone};
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
          return navigate(ROUTE.CLIENTS);
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
        css
      >
        <div>
          <H1 center>{_(phoneLoginStrings.verifyCodeDescription, {number: loginData.phone})}</H1>
          <CodeInput style={{marginTop: 10}} onCodeComplete={handleLogin} data-uie-name="enter-code" />
          {parseError(error)}
        </div>
        <Columns>
          <Column>
            <LinkButton onClick={resendCode} data-uie-name="do-resend-code">
              {_(phoneLoginStrings.verifyCodeResend)}
            </LinkButton>
          </Column>
          <Column>
            <RouterLink to={ROUTE.LOGIN_PHONE} data-uie-name="go-change-phone">
              {_(phoneLoginStrings.verifyCodeChangePhone)}
            </RouterLink>
          </Column>
        </Columns>
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
      doSendPhoneLoginCode: actionRoot.authAction.doSendPhoneLoginCode,
      resetAuthError: actionRoot.authAction.resetAuthError,
    },
    dispatch,
  );

const VerifyPhoneCode = connect(mapStateToProps, mapDispatchToProps)(VerifyPhoneCodeComponent);

export {VerifyPhoneCode};
