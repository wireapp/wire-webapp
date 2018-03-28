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

import * as TrackingAction from '../module/action/TrackingAction';
import {H1, Text, Link, ContainerXS, CodeInput, ErrorMessage} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {Link as RRLink} from 'react-router-dom';
import {parseError} from '../util/errorUtil';
import {verifyStrings} from '../../strings';
import {withRouter} from 'react-router';
import * as AuthAction from '../module/action/AuthAction';
import {REGISTER_FLOW} from '../module/selector/AuthSelector';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as UserAction from '../module/action/UserAction';
import Page from './Page';
import React from 'react';
import {ROUTE} from '../route';

const changeEmailRedirect = {
  [REGISTER_FLOW.PERSONAL]: ROUTE.CREATE_ACCOUNT,
  [REGISTER_FLOW.GENERIC_INVITATION]: ROUTE.CREATE_ACCOUNT,
  [REGISTER_FLOW.TEAM]: ROUTE.CREATE_TEAM_ACCOUNT,
};

const Verify = ({account, authError, history, currentFlow, intl: {formatMessage: _}, ...connected}) => {
  const createAccount = email_code => {
    switch (currentFlow) {
      case REGISTER_FLOW.TEAM: {
        connected
          .doRegisterTeam({...account, email_code})
          .then(() => {
            connected.trackEvent({name: TrackingAction.EVENT_NAME.TEAM.CREATED});
            connected.trackEvent({name: TrackingAction.EVENT_NAME.TEAM.VERIFIED});
          })
          .then(() => history.push(ROUTE.INITIAL_INVITE))
          .catch(error => console.error('Failed to create team account', error));
        break;
      }
      case REGISTER_FLOW.PERSONAL:
      case REGISTER_FLOW.GENERIC_INVITATION: {
        connected
          .doRegisterPersonal({...account, email_code})
          .then(() => {
            const context = TrackingAction.FLOW_TO_CONTEXT[currentFlow];
            connected.trackNameWithContext(TrackingAction.EVENT_NAME.PERSONAL.CREATED, context);
            connected.trackNameWithContext(TrackingAction.EVENT_NAME.PERSONAL.VERIFIED, context);
          })
          .then(() => history.push(ROUTE.CHOOSE_HANDLE))
          .catch(error => console.error('Failed to create personal account', error));
      }
    }
  };

  const resendCode = event => {
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
          <Text data-uie-name="label-with-email">
            <FormattedHTMLMessage {...verifyStrings.subhead} values={{email: account.email}} />
          </Text>
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
      state => ({
        account: AuthSelector.getAccount(state),
        authError: AuthSelector.getError(state),
        currentFlow: AuthSelector.getCurrentFlow(state),
      }),
      {...AuthAction, ...TrackingAction, ...UserAction}
    )(Verify)
  )
);
