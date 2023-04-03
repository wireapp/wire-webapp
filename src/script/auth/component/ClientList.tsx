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

import React from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/index';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {UrlUtil} from '@wireapp/commons';
import {ContainerXS, Loading} from '@wireapp/react-ui-kit';

import {getLogger} from 'Util/Logger';

import {ClientItem} from './ClientItem';

import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import * as LocalStorageAction from '../module/action/LocalStorageAction';
import {bindActionCreators, RootState} from '../module/reducer';
import {getEntropy} from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY, ROUTE} from '../route';

const logger = getLogger('ClientList');

type Props = React.HTMLProps<HTMLDivElement>;
const ClientListComponent = ({
  clientError,
  isFetching,
  isNoPasswordSSO,
  permanentClients,
  entropy,
  doInitializeClient,
  doRemoveClient,
  getLocalStorage,
  resetAuthError,
  resetClientError,
  removeLocalStorage,
}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = React.useState(false);
  const isOauth = UrlUtil.hasURLParameter(QUERY_KEY.SCOPE);
  const [currentlySelectedClient, setCurrentlySelectedClient] = React.useState<string | null>(null);

  const setSelectedClient = (clientId: string) => {
    const isSelectedClient = currentlySelectedClient === clientId;

    const selectedClientId = isSelectedClient ? null : clientId;
    setCurrentlySelectedClient(selectedClientId);
    resetAuthError();
    resetClientError();
  };

  const removeClient = async (clientId: string, password?: string) => {
    try {
      const SFAcode = (await getLocalStorage(QUERY_KEY.CONVERSATION_CODE)) ?? undefined;
      setShowLoading(true);
      await doRemoveClient(clientId, password);
      const persist = await getLocalStorage(LocalStorageAction.LocalStorageKey.AUTH.PERSIST);
      await doInitializeClient(persist ? ClientType.PERMANENT : ClientType.TEMPORARY, password, SFAcode, entropy);
      removeLocalStorage(QUERY_KEY.CONVERSATION_CODE);
      removeLocalStorage(QUERY_KEY.JOIN_EXPIRES);

      if (isOauth) {
        return navigate(ROUTE.AUTHORIZE);
      }

      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      logger.error(error);
    } finally {
      setShowLoading(false);
    }
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
          clientError={isSelectedClient(client.id) ? clientError : undefined}
          key={client.id}
          onClick={() => setSelectedClient(client.id)}
          onClientRemoval={(password?: string) => removeClient(client.id, password)}
          requirePassword={!isNoPasswordSSO}
          selected={isSelectedClient(client.id)}
        />
      ))}
    </ContainerXS>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  clientError: ClientSelector.getError(state),
  entropy: getEntropy(state),
  isFetching: ClientSelector.isFetching(state),
  isNoPasswordSSO: SelfSelector.isNoPasswordSSO(state),
  permanentClients: ClientSelector.getPermanentClients(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doInitializeClient: ROOT_ACTIONS.clientAction.doInitializeClient,
      doRemoveClient: ROOT_ACTIONS.clientAction.doRemoveClient,
      getLocalStorage: ROOT_ACTIONS.localStorageAction.getLocalStorage,
      removeLocalStorage: ROOT_ACTIONS.localStorageAction.deleteLocalStorage,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
      resetClientError: ROOT_ACTIONS.clientAction.resetClientError,
    },
    dispatch,
  );

const ClientList = connect(mapStateToProps, mapDispatchToProps)(ClientListComponent);

export {ClientList};
