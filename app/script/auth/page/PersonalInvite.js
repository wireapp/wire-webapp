/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {connect} from 'react-redux';
import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {createAccountStrings} from '../../strings';
import {H1} from '@wireapp/react-ui-kit/Text';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import Page from './Page';
import React from 'react';
import ROUTE from '../route';
import AccountForm from '../component/AccountForm';
import {getURLParameter, pathWithParams} from '../util/urlUtil';
import {doRegisterPersonal, getInvitationFromCode} from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import {EVENT_NAME, trackEvent} from '../module/action/TrackingAction';
import {enterPersonalInvitationCreationFlow} from '../module/action/creator/AuthActionCreator';

class PersonalInvite extends React.PureComponent {
  componentDidMount() {
    this.invitation_code = getURLParameter('code');
    this.props.enterPersonalInvitationCreationFlow();
    this.props.getInvitationFromCode(this.invitation_code);
  }

  createAccount = () => {
    this.props
      .doRegisterPersonal({...this.props.account, invitation_code: this.invitation_code})
      .then(() => {
        this.props.trackEvent({attributes: {context: 'email'}, name: EVENT_NAME.PERSONAL.CREATED});
        this.props.trackEvent({name: EVENT_NAME.PERSONAL.VERIFIED});
      })
      .then(() => {
        const link = document.createElement('a');
        link.href = pathWithParams(ROUTE.LOGIN, 'reason=registration');
        document.body.appendChild(link); // workaround for Firefox
        link.click();
      })
      .catch(error => console.error('Failed to create personal account', error));
  };

  render() {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Page>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
        >
          <H1 center>{_(createAccountStrings.headLine)}</H1>
          <AccountForm disableEmail onSubmit={this.createAccount} submitText={_(createAccountStrings.submitButton)} />
        </ContainerXS>
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        account: AuthSelector.getAccount(state),
      }),
      {doRegisterPersonal, enterPersonalInvitationCreationFlow, getInvitationFromCode, trackEvent}
    )(PersonalInvite)
  )
);
