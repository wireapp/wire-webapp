/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {H1, Muted, Link, ContainerXS, CodeInput, ErrorMessage} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage, InjectedIntlProps} from 'react-intl';
import {Link as RRLink} from 'react-router-dom';
import {parseError} from '../util/errorUtil';
import {verifyStrings} from '../../strings';
import {withRouter, RouteComponentProps} from 'react-router';
import {REGISTER_FLOW} from '../module/selector/AuthSelector';
import * as AuthSelector from '../module/selector/AuthSelector';
import Page from './Page';
import * as React from 'react';
import {ROUTE} from '../route';
import {ThunkDispatch} from 'redux-thunk';
import {RootState, Api} from '../module/reducer';
import {AnyAction} from 'redux';
import ROOT_ACTIONS from '../module/action/';
import {RegisterData} from '@wireapp/api-client/dist/commonjs/auth';

interface Props extends React.HTMLAttributes<HTMLDivElement>, RouteComponentProps<{}> {}

interface ConnectedProps {
  account: RegisterData;
  authError: Error;
  currentFlow: string;
}

interface DispatchProps {
  doRegisterTeam: (registrationData: RegisterData) => Promise<void>;
  doRegisterPersonal: (registrationData: RegisterData) => Promise<void>;
  doSendActivationCode: (code: string) => Promise<void>;
}

const changeEmailRedirect = {
  [REGISTER_FLOW.PERSONAL]: ROUTE.CREATE_ACCOUNT,
  [REGISTER_FLOW.GENERIC_INVITATION]: ROUTE.CREATE_ACCOUNT,
  [REGISTER_FLOW.TEAM]: ROUTE.CREATE_TEAM_ACCOUNT,
};

const Verify: React.SFC<Props & ConnectedProps & DispatchProps & InjectedIntlProps> = ({
  account,
  authError,
  history,
  currentFlow,
  intl: {formatMessage: _},
  ...connected
}) => {
  const createAccount = (email_code: string) => {
    switch (currentFlow) {
      case REGISTER_FLOW.TEAM: {
        connected
          .doRegisterTeam({...account, email_code})
          .then(() => history.push(ROUTE.CHOOSE_HANDLE))
          .catch(error => console.error('Failed to create team account', error));
        break;
      }

      case REGISTER_FLOW.PERSONAL:
      case REGISTER_FLOW.GENERIC_INVITATION: {
        connected
          .doRegisterPersonal({...account, email_code})
          .then(() => history.push(ROUTE.CHOOSE_HANDLE))
          .catch(error => console.error('Failed to create personal account', error));
      }
    }
  };

  const resendCode = (event: React.MouseEvent) => {
    event.preventDefault();
    return connected
      .doSendActivationCode(account.email)
      .catch(error => console.error('Failed to send email code', error));
  };
  return (
    <Page hasAccountData>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <div>
          <H1 center>{_(verifyStrings.headline)}</H1>
          <Muted data-uie-name="label-with-email">
            <FormattedHTMLMessage {...verifyStrings.subhead} values={{email: account.email}} />
          </Muted>
          <CodeInput autoFocus style={{marginTop: 10}} onCodeComplete={createAccount} data-uie-name="enter-code" />
          <ErrorMessage data-uie-name="error-message">{parseError(authError)}</ErrorMessage>
        </div>
        <div>
          <Link onClick={resendCode} data-uie-name="do-resend-code">
            {_(verifyStrings.resendCode)}
          </Link>
          <Link
            to={changeEmailRedirect[currentFlow]}
            component={RRLink}
            style={{marginLeft: 35}}
            data-uie-name="go-change-email"
          >
            {_(verifyStrings.changeEmail)}
          </Link>
        </div>
      </ContainerXS>
    </Page>
  );
};

export default withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => ({
        account: AuthSelector.getAccount(state),
        authError: AuthSelector.getError(state),
        currentFlow: AuthSelector.getCurrentFlow(state),
      }),
      (dispatch: ThunkDispatch<RootState, Api, AnyAction>): DispatchProps => ({
        doRegisterTeam: (registrationData: RegisterData) =>
          dispatch(ROOT_ACTIONS.authAction.doRegisterTeam(registrationData)),
        doRegisterPersonal: (registrationData: RegisterData) =>
          dispatch(ROOT_ACTIONS.authAction.doRegisterPersonal(registrationData)),
        doSendActivationCode: (code: string) => dispatch(ROOT_ACTIONS.userAction.doSendActivationCode(code)),
      })
    )(Verify)
  )
);
