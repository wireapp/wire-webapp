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

import {H1, Link, COLOR, ArrowIcon, Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit';
import {createPersonalAccountStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Link as RRLink} from 'react-router-dom';
import {withRouter} from 'react-router';
import React from 'react';
import ROUTE from '../route';
import AccountForm from '../component/AccountForm';
import {trackNameWithContext, EVENT_CONTEXT, EVENT_NAME, FLOW_TO_CONTEXT} from '../module/action/TrackingAction';
import {getAccount, getCurrentFlow, REGISTER_FLOW} from '../module/selector/AuthSelector';
import * as AuthActionCreator from '../module/action/creator/AuthActionCreator';
import * as AuthAction from '../module/action/AuthAction';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';

class CreatePersonalAccount extends React.PureComponent {
  componentDidMount() {
    const {match} = this.props;
    if (match.path === ROUTE.CREATE_ACCOUNT) {
      this.props.enterPersonalCreationFlow();
    } else if (match.path === ROUTE.INVITE) {
      this.props.enterGenericInviteCreationFlow();
    } else {
      this.props.enterPersonalInvitationCreationFlow();
      this.invitationCode = match.params.invitationCode;
      this.props.getInvitationFromCode(this.invitationCode);
    }
  }

  createAccount = () => {
    this.props
      .doRegisterPersonal({...this.props.account, invitation_code: this.invitationCode})
      .then(() => {
        this.props.trackNameWithContext(EVENT_NAME.PERSONAL.CREATED, EVENT_CONTEXT.PERSONAL_INVITE);
        this.props.trackNameWithContext(EVENT_NAME.PERSONAL.VERIFIED, EVENT_CONTEXT.PERSONAL_INVITE);
      })
      .then(() => {
        const link = document.createElement('a');
        link.href = pathWithParams(ROUTE.LOGIN, 'reason=registration');
        document.body.appendChild(link); // workaround for Firefox
        link.click();
      })
      .catch(error => console.error('Failed to create personal account', error));
  };

  handleBeforeSubmit = () => {
    const context = FLOW_TO_CONTEXT[this.props.currentFlow];
    this.props.trackNameWithContext(EVENT_NAME.PERSONAL.ENTERED_ACCOUNT_DATA, context);
  };

  handleSubmit = () => {
    if (this.props.currentFlow === REGISTER_FLOW.PERSONAL_INVITATION) {
      this.createAccount();
    } else {
      this.props.history.push(ROUTE.VERIFY);
    }
  };

  render() {
    const {currentFlow, intl: {formatMessage: _}} = this.props;
    const pageContent = (
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
      >
        <H1 center>{_(createPersonalAccountStrings.headLine)}</H1>
        <AccountForm
          disableEmail={currentFlow === REGISTER_FLOW.PERSONAL_INVITATION}
          beforeSubmit={this.handleBeforeSubmit}
          onSubmit={this.handleSubmit}
          submitText={_(createPersonalAccountStrings.submitButton)}
        />
      </ContainerXS>
    );
    return (
      <Page>
        {currentFlow === REGISTER_FLOW.PERSONAL ? (
          <Container centerText verticalCenter style={{width: '100%'}}>
            <Columns>
              <Column style={{display: 'flex'}}>
                <div style={{margin: 'auto'}}>
                  <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-index">
                    <ArrowIcon direction="left" color={COLOR.GRAY} />
                  </Link>
                </div>
              </Column>
              <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>{pageContent}</Column>
              <Column />
            </Columns>
          </Container>
        ) : (
          pageContent
        )}
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(state => ({account: getAccount(state), currentFlow: getCurrentFlow(state)}), {
      trackNameWithContext,
      ...AuthAction,
      ...AuthActionCreator,
    })(CreatePersonalAccount)
  )
);
