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

import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {ContainerXS, Loading} from '@wireapp/react-ui-kit';
import React from 'react';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {getLogger} from 'Util/Logger';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import * as LocalStorageAction from '../module/action/LocalStorageAction';
import {RootState, bindActionCreators} from '../module/reducer';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {pathWithParams} from '../util/urlUtil';
import ClientItem from './ClientItem';

const logger = getLogger('ClientList');

interface Props extends React.HTMLProps<HTMLDivElement> {}
const ClientList = ({
  clientError,
  isFetching,
  isSSOUser,
  permanentClients,
  doInitializeClient,
  doRemoveClient,
  getLocalStorage,
  resetAuthError,
}: Props & ConnectedProps & DispatchProps) => {
  const {history} = useReactRouter();
  const [showLoading, setShowLoading] = React.useState(false);
  const [loadingTimeoutId, setLoadingTimeoutId] = React.useState();
  const [currentlySelectedClient, setCurrentlySelectedClient] = React.useState();

  React.useEffect(() => resetLoadingSpinner);

  const resetLoadingSpinner = () => {
    window.clearTimeout(loadingTimeoutId);
    setShowLoading(false);
  };

  const setSelectedClient = (clientId: string) => {
    const isSelectedClient = currentlySelectedClient === clientId;
    clientId = isSelectedClient ? null : clientId;
    setCurrentlySelectedClient(clientId);
    resetAuthError();
  };

  const removeClient = (clientId: string, password?: string) => {
    setShowLoading(true);
    return Promise.resolve()
      .then(() => doRemoveClient(clientId, password))
      .then(() => {
        const persist = getLocalStorage(LocalStorageAction.LocalStorageKey.AUTH.PERSIST);
        return doInitializeClient(persist ? ClientType.PERMANENT : ClientType.TEMPORARY, password);
      })
      .then(() => {
        setLoadingTimeoutId(window.setTimeout(resetLoadingSpinner, 1000));
        setShowLoading(true);
      })
      .then(() => window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          history.push(ROUTE.HISTORY_INFO);
        } else {
          resetLoadingSpinner();
          logger.error(error);
        }
      });
  };

  const isSelectedClient = (clientId: string) => clientId === currentlySelectedClient;

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
          client={client}
          clientError={isSelectedClient(client.id) && clientError}
          key={client.id}
          onClick={() => setSelectedClient(client.id)}
          onClientRemoval={(password?: string) => removeClient(client.id, password)}
          requirePassword={!isSSOUser}
          selected={isSelectedClient(client.id)}
        />
      ))}
    </ContainerXS>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  clientError: ClientSelector.getError(state),
  isFetching: ClientSelector.isFetching(state),
  isSSOUser: SelfSelector.isSSOUser(state),
  permanentClients: ClientSelector.getPermanentClients(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doInitializeClient: ROOT_ACTIONS.clientAction.doInitializeClient,
      doRemoveClient: ROOT_ACTIONS.clientAction.doRemoveClient,
      getLocalStorage: ROOT_ACTIONS.localStorageAction.getLocalStorage,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ClientList);
