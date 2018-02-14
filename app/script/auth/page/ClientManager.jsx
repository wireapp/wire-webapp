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

import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {injectIntl} from 'react-intl';
import {parseError} from '../util/errorUtil';
import Page from './Page';
import React from 'react';
import * as ClientAction from '../module/action/ClientAction';
import ClientList from '../component/ClientList';
import * as AuthAction from '../module/action/AuthAction';
import * as ClientSelector from '../module/selector/ClientSelector';
import {connect} from 'react-redux';

class ClientManager extends React.Component {
  state = {
    clients: [],
    error: null,
  };

  logout = () => {
    this.props.doLogout();
  };

  render() {
    const {} = this.props;
    return (
      <Page>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: 428}}
        >
          <H1 center>{'Remove a device'}</H1>
          <Text center>{'Remove one of your other devices to start using Wire on this one.'}</Text>
          <ClientList clients={this.props.clients} />
          <ErrorMessage data-uie-name="error-message">{this.state.error && parseError(this.state.error)}</ErrorMessage>
          <Link onClick={this.logout} style={{alignSelf: 'center'}}>
            {'Log out'}
          </Link>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(
  connect(
    state => ({
      clients: ClientSelector.getClients(state),
      error: ClientSelector.getClientError(state),
      isFetching: ClientSelector.isFetching(state),
    }),
    {...AuthAction, ...ClientAction}
  )(ClientManager)
);
