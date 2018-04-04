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

import {ContainerXS, Loading} from '@wireapp/react-ui-kit';
import {injectIntl} from 'react-intl';
import React from 'react';
import * as ClientAction from '../module/action/ClientAction';
import {resetError} from '../module/action/creator/ClientActionCreator';
import * as LocalStorageAction from '../module/action/LocalStorageAction';
import ClientItem from '../component/ClientItem';
import * as ClientSelector from '../module/selector/ClientSelector';
import {connect} from 'react-redux';
import EXTERNAL_ROUTE from '../externalRoute';
import {ROUTE} from '../route';
import BackendError from '../module/action/BackendError';
import {withRouter} from 'react-router';

class ClientList extends React.Component {
  state = {
    currentlySelectedClient: null,
    showLoading: false,
  };

  constructor(props) {
    super(props);
    this.loadingTimeout = 0;
  }

  componentWillUnmount() {
    this.resetLoadingSpinner();
  }

  setSelectedClient = clientId => {
    const isSelectedClient = this.state.currentlySelectedClient === clientId;
    clientId = isSelectedClient ? null : clientId;
    this.setState({...this.state, currentlySelectedClient: clientId});
    this.props.resetError();
  };

  removeClient = (clientId, password) => {
    this.setState({showLoading: true});
    this.loadingTimeout = window.setTimeout(this.resetLoadingSpinner.bind(this), 1000);
    return Promise.resolve()
      .then(() => this.props.doRemoveClient(clientId, password))
      .then(() => {
        const persist = this.props.getLocalStorage(LocalStorageAction.LocalStorageKey.AUTH.PERSIST);
        return this.props.doInitializeClient(persist, password);
      })
      .then(() => window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          this.props.history.push(ROUTE.HISTORY_INFO);
        }
      });
  };

  resetLoadingSpinner() {
    window.clearTimeout(this.loadingTimeout);
    this.setState({showLoading: false});
  }

  isSelectedClient = clientId => clientId === this.state.currentlySelectedClient;

  render() {
    const {isFetching, permanentClients} = this.props;
    const {showLoading} = this.state;

    return isFetching || showLoading ? (
      <ContainerXS centerText verticalCenter style={{justifyContent: 'center'}}>
        <Loading />
      </ContainerXS>
    ) : (
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-around'}}
      >
        {permanentClients.map(client => (
          <ClientItem
            key={client.id}
            selected={this.isSelectedClient(client.id)}
            client={client}
            clientError={this.isSelectedClient(client.id) && this.props.clientError}
            onClick={event => this.setSelectedClient(client.id)}
            onClientRemoval={password => this.removeClient(client.id, password)}
          />
        ))}
      </ContainerXS>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        clientError: ClientSelector.getError(state),
        isFetching: ClientSelector.isFetching(state),
        permanentClients: ClientSelector.getPermanentClients(state),
      }),
      {...ClientAction, ...LocalStorageAction, resetError}
    )(ClientList)
  )
);
