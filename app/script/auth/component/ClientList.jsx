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

import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {injectIntl} from 'react-intl';
import React from 'react';
import * as ClientAction from '../module/action/ClientAction';
import ClientItem from '../component/ClientItem';
import * as ClientSelector from '../module/selector/ClientSelector';
import {connect} from 'react-redux';

class ClientList extends React.Component {
  state = {
    clients: [],
  };

  render() {
    const {clients} = this.props;
    return (
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-around'}}
      >
        {clients.map(client => (
          <ClientItem key={client.id} name={client.model} fingerprint={client.id} created={client.time} />
        ))}
      </ContainerXS>
    );
  }
}

export default injectIntl(
  connect(
    state => ({
      clients: ClientSelector.getClients(state),
      isFetching: ClientSelector.isFetching(state),
    }),
    {...ClientAction}
  )(ClientList)
);
