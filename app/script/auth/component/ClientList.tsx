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
import {injectIntl, InjectedIntlProps} from 'react-intl';
import * as React from 'react';
import * as LocalStorageAction from '../module/action/LocalStorageAction';
import ClientItem from './ClientItem';
import * as ClientSelector from '../module/selector/ClientSelector';
import {connect} from 'react-redux';
import {ROUTE} from '../route';
import BackendError from '../module/action/BackendError';
import {withRouter, RouteComponentProps} from 'react-router';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {pathWithParams} from '../util/urlUtil';
import EXTERNAL_ROUTE from '../externalRoute';
import {RootState, Api} from '../module/reducer';
import ROOT_ACTIONS from '../module/action/';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';

export interface Props extends React.HTMLAttributes<HTMLDivElement>, RouteComponentProps {}

interface ConnectedProps {
  clientError: Error;
  isFetching: boolean;
  permanentClients: RegisteredClient[];
}

interface DispatchProps {
  resetAuthError: () => Promise<void>;
  doRemoveClient: (clientId: string, password: string) => Promise<void>;
  getLocalStorage: (key: string) => Promise<string | boolean | number>;
  doInitializeClient: (clientType: ClientType, password?: string) => Promise<void>;
}

interface State {
  currentlySelectedClient: number;
  showLoading: boolean;
  loadingTimeoutId: number;
}

class ClientList extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  state = {
    currentlySelectedClient: null,
    showLoading: false,
    loadingTimeoutId: undefined,
  };

  componentWillUnmount() {
    this.resetLoadingSpinner();
  }

  setSelectedClient = clientId => {
    const isSelectedClient = this.state.currentlySelectedClient === clientId;
    clientId = isSelectedClient ? null : clientId;
    this.setState({...this.state, currentlySelectedClient: clientId});
    this.props.resetAuthError();
  };

  removeClient = (clientId: string, password: string) => {
    this.setState({showLoading: true, loadingTimeoutId: window.setTimeout(this.resetLoadingSpinner.bind(this), 1000)});
    return Promise.resolve()
      .then(() => this.props.doRemoveClient(clientId, password))
      .then(() => {
        const persist = this.props.getLocalStorage(LocalStorageAction.LocalStorageKey.AUTH.PERSIST);
        return this.props.doInitializeClient(persist ? ClientType.PERMANENT : ClientType.TEMPORARY, password);
      })
      .then(() => window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          this.props.history.push(ROUTE.HISTORY_INFO);
        }
      });
  };

  resetLoadingSpinner() {
    if (this.state.loadingTimeoutId) {
      window.clearTimeout(this.state.loadingTimeoutId);
    }
    this.setState({showLoading: false, loadingTimeoutId: undefined});
  }

  isSelectedClient = (clientId: string) => clientId === this.state.currentlySelectedClient;

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
            onClick={() => this.setSelectedClient(client.id)}
            onClientRemoval={(password: string) => this.removeClient(client.id, password)}
          />
        ))}
      </ContainerXS>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => ({
        clientError: ClientSelector.getError(state),
        isFetching: ClientSelector.isFetching(state),
        permanentClients: ClientSelector.getPermanentClients(state),
      }),
      (dispatch: ThunkDispatch<RootState, Api, AnyAction>): DispatchProps => ({
        resetAuthError: () => dispatch(ROOT_ACTIONS.authAction.resetAuthError()),
        doRemoveClient: (clientId: string, password: string) =>
          dispatch(ROOT_ACTIONS.clientAction.doRemoveClient(clientId, password)),
        getLocalStorage: (key: string) => dispatch(ROOT_ACTIONS.localStorageAction.getLocalStorage(key)),
        doInitializeClient: (clientType: ClientType, password?: string) =>
          dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(clientType, password)),
      })
    )(ClientList)
  )
);
