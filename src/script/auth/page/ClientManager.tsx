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

import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {ContainerXS, H1, Link, Muted} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps} from 'react-router';
import {clientManagerStrings} from '../../strings';
import ClientList from '../component/ClientList';
import ROOT_ACTIONS from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
import {ROUTE} from '../route';
import Page from './Page';

interface Props extends React.HTMLAttributes<ClientManager>, RouteComponentProps {}

interface ConnectedProps {}

interface DispatchProps {
  doGetAllClients: () => Promise<RegisteredClient[]>;
  doLogout: () => Promise<void>;
}

interface State {}

class ClientManager extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  componentWillMount = () => this.props.doGetAllClients();

  logout = () =>
    this.props
      .doLogout()
      .catch(() => {})
      .then(() => this.props.history.push(ROUTE.LOGIN));

  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    return (
      <Page>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: 428}}
        >
          <H1 center style={{marginTop: '140px'}}>
            {_(clientManagerStrings.headline)}
          </H1>
          <Muted center style={{marginBottom: '42px'}} data-uie-name="status-device-limit-info">
            {_(clientManagerStrings.subhead)}
          </Muted>
          <ClientList />
          <Link
            onClick={this.logout}
            style={{alignSelf: 'center', margin: '48px 0 80px 0'}}
            data-uie-name="go-sign-out"
          >
            {_(clientManagerStrings.logout)}
          </Link>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => {
      return {};
    },
    (dispatch: ThunkDispatch): DispatchProps => {
      return {
        doGetAllClients: () => dispatch(ROOT_ACTIONS.clientAction.doGetAllClients()),
        doLogout: () => dispatch(ROOT_ACTIONS.authAction.doLogout()),
      };
    }
  )(ClientManager)
);
