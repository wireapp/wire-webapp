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
import {ROUTE} from '../route';
import AccountForm from '../component/AccountForm';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as AuthActionCreator from '../module/action/creator/AuthActionCreator';
import * as AuthAction from '../module/action/AuthAction';
import Page from './Page';

class CreatePersonalAccount extends React.PureComponent {
  componentDidMount() {
    const {params, url} = this.props.match;

    const isInvite = url.startsWith(ROUTE.INVITE);
    if (isInvite) {
      const hasInvitationCode = !!params.invitationCode;
      if (hasInvitationCode) {
        return this.props
          .getInvitationFromCode(params.invitationCode)
          .then(() => this.props.enterPersonalInvitationCreationFlow())
          .catch(() => this.props.enterPersonalCreationFlow());
      }

      return this.props.enterGenericInviteCreationFlow();
    }

    this.props.enterPersonalCreationFlow();
  }

  createAccount = () => {
    const {account, history, doRegisterPersonal, match} = this.props;
    doRegisterPersonal({...account, invitation_code: match.params.invitationCode})
      .then(() => history.push(ROUTE.CHOOSE_HANDLE))
      .catch(error => console.error('Failed to create personal account from invite', error));
  };

  handleSubmit = () => {
    if (this.props.isPersonalInvitationFlow) {
      this.createAccount();
    } else {
      this.props.history.push(ROUTE.VERIFY);
    }
  };

  render() {
    const {
      isPersonalFlow,
      intl: {formatMessage: _},
    } = this.props;
    const pageContent = (
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
      >
        <H1 center>{_(createPersonalAccountStrings.headLine)}</H1>
        <AccountForm onSubmit={this.handleSubmit} submitText={_(createPersonalAccountStrings.submitButton)} />
      </ContainerXS>
    );
    return (
      <Page>
        {isPersonalFlow ? (
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
    connect(
      state => ({
        account: AuthSelector.getAccount(state),
        currentFlow: AuthSelector.getCurrentFlow(state),
        isPersonalFlow: AuthSelector.isPersonalFlow(state),
        isPersonalInvitationFlow: AuthSelector.isPersonalInvitationFlow(state),
      }),
      {
        ...AuthAction,
        ...AuthActionCreator,
      }
    )(CreatePersonalAccount)
  )
);
