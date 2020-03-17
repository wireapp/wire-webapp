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

import {CodeInput, ContainerXS, H1, Link, Muted} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps} from 'react-router';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {getLogger} from 'Util/Logger';
import {verifyStrings} from '../../strings';
import RouterLink from '../component/RouterLink';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement>, RouteComponentProps<{}> {}

const changeEmailRedirect = {
  [AuthSelector.REGISTER_FLOW.PERSONAL]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.GENERIC_INVITATION]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.TEAM]: ROUTE.CREATE_TEAM_ACCOUNT,
};

const VerifyEmailCode = ({
  account,
  authError,
  currentFlow,
  doRegisterPersonal,
  doRegisterTeam,
  doSendActivationCode,
}: Props & ConnectedProps & DispatchProps) => {
  const {history} = useReactRouter();
  const {formatMessage: _} = useIntl();

  const logger = getLogger('Verify');
  const createAccount = async (email_code: string) => {
    switch (currentFlow) {
      case AuthSelector.REGISTER_FLOW.TEAM: {
        try {
          await doRegisterTeam({...account, email_code});
          history.push(ROUTE.SET_HANDLE);
        } catch (error) {
          logger.error('Failed to create team account', error);
        }
        break;
      }

      case AuthSelector.REGISTER_FLOW.PERSONAL:
      case AuthSelector.REGISTER_FLOW.GENERIC_INVITATION: {
        try {
          await doRegisterPersonal({...account, email_code});
          history.push(ROUTE.SET_HANDLE);
        } catch (error) {
          logger.error('Failed to create personal account', error);
        }
      }
    }
  };

  const resendCode = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      await doSendActivationCode(account.email);
    } catch (error) {
      logger.error('Failed to send email code', error);
    }
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
            <FormattedMessage
              {...verifyStrings.subhead}
              values={{
                email: account.email,
                newline: <br />,
              }}
            />
          </Muted>
          <CodeInput autoFocus style={{marginTop: 10}} onCodeComplete={createAccount} data-uie-name="enter-code" />
          {parseError(authError)}
        </div>
        <div>
          <Link onClick={resendCode} data-uie-name="do-resend-code">
            {_(verifyStrings.resendCode)}
          </Link>
          <RouterLink to={changeEmailRedirect[currentFlow]} style={{marginLeft: 35}} data-uie-name="go-change-email">
            {_(verifyStrings.changeEmail)}
          </RouterLink>
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  currentFlow: AuthSelector.getCurrentFlow(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doRegisterPersonal: ROOT_ACTIONS.authAction.doRegisterPersonal,
      doRegisterTeam: ROOT_ACTIONS.authAction.doRegisterTeam,
      doSendActivationCode: ROOT_ACTIONS.userAction.doSendActivationCode,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(VerifyEmailCode);
