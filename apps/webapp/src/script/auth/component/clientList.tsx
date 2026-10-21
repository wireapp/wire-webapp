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

import {HTMLProps, useEffect, useState, type FunctionComponent} from 'react';

import {isBoolean, isString} from '@sindresorhus/is';
import {ClientType} from '@wireapp/api-client/lib/client/index';
import type {RegisteredClient} from '@wireapp/api-client/lib/client/registeredClient';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router';

import {UrlUtil} from '@wireapp/commons';
import {ContainerXS, Loading} from '@wireapp/react-ui-kit';

import {getLogger} from 'Util/logger';

import {ClientItem} from './clientItem';

import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import * as LocalStorageAction from '../module/action/localStorageAction';
import {RootState, ThunkDispatch} from '../module/reducer';
import {getEntropy} from '../module/selector/authSelector';
import * as ClientSelector from '../module/selector/clientSelector';
import * as SelfSelector from '../module/selector/selfSelector';
import {QUERY_KEY, ROUTE} from '../route';

const logger = getLogger('ClientList');

type Props = HTMLProps<HTMLDivElement>;
const ClientListComponent: FunctionComponent<Props & ConnectedProps & DispatchProps> = ({
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
  const [showLoading, setShowLoading] = useState(false);
  const isOauth = UrlUtil.hasURLParameter(QUERY_KEY.SCOPE);
  const [currentlySelectedClient, setCurrentlySelectedClient] = useState<string | null>(null);
  const [sortedClients, setSortedClients] = useState(permanentClients);

  useEffect(() => {
    setSortedClients(
      permanentClients.toSorted((clientA, clientB) => {
        return new Date(clientA.time).getTime() - new Date(clientB.time).getTime();
      }),
    );
  }, [permanentClients]);

  const setSelectedClient = (clientId: string): void => {
    const isSelectedClient = currentlySelectedClient === clientId;

    const selectedClientId = isSelectedClient ? null : clientId;
    setCurrentlySelectedClient(selectedClientId);
    resetAuthError();
    resetClientError();
  };

  const removeClient = async (clientId: string, password?: string): Promise<void> => {
    try {
      const SFAcode = (await getLocalStorage(QUERY_KEY.CONVERSATION_CODE)) ?? undefined;
      setShowLoading(true);
      await doRemoveClient(clientId, password);
      const persist = await getLocalStorage(LocalStorageAction.LocalStorageKey.AUTH.PERSIST);
      const shouldPersist = isBoolean(persist) ? persist : isString(persist) && persist.length > 0;
      await doInitializeClient(shouldPersist ? ClientType.PERMANENT : ClientType.TEMPORARY, password, SFAcode, entropy);
      removeLocalStorage(QUERY_KEY.CONVERSATION_CODE);
      removeLocalStorage(QUERY_KEY.JOIN_EXPIRES);

      if (isOauth) {
        return navigate(ROUTE.AUTHORIZE);
      }

      return navigate(ROUTE.HISTORY_INFO);
    } catch (error: unknown) {
      logger.error(error);
    } finally {
      setShowLoading(false);
    }
  };

  const isSelectedClient = (clientId: string): boolean => {
    return clientId === currentlySelectedClient;
  };

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
      {sortedClients.map(client => {
        return (
          <ClientItem
            client={client}
            clientError={isSelectedClient(client.id) ? (clientError ?? undefined) : undefined}
            key={client.id}
            onClick={() => {
              setSelectedClient(client.id);
            }}
            onClientRemoval={(password?: string) => {
              return removeClient(client.id, password);
            }}
            requirePassword={!isNoPasswordSSO}
            selected={isSelectedClient(client.id)}
          />
        );
      })}
    </ContainerXS>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
type MapStateToPropsResult = {
  clientError: Error | null;
  entropy: Uint8Array<ArrayBufferLike> | undefined;
  isFetching: boolean;
  isNoPasswordSSO: boolean;
  permanentClients: RegisteredClient[];
};
const mapStateToProps = (state: RootState): MapStateToPropsResult => {
  return {
    clientError: ClientSelector.getError(state),
    entropy: getEntropy(state),
    isFetching: ClientSelector.isFetching(state),
    isNoPasswordSSO: SelfSelector.isNoPasswordSSO(state),
    permanentClients: ClientSelector.getPermanentClients(state),
  };
};

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type MapDispatchToPropsResult = {
  doInitializeClient: (
    clientType: ClientType,
    password?: string | undefined,
    verificationCode?: string | undefined,
    entropyData?: Uint8Array<ArrayBufferLike> | undefined,
  ) => Promise<void>;
  doRemoveClient: (clientId: string, password?: string | undefined) => Promise<void>;
  getLocalStorage: ClientListLocalStorageReader;
  removeLocalStorage: (key: string) => Promise<void>;
  resetAuthError: () => Promise<void>;
  resetClientError: () => Promise<void>;
};
type ClientListLocalStorageReader = {
  (key: typeof QUERY_KEY.CONVERSATION_CODE): Promise<string | undefined>;
  (key: typeof LocalStorageAction.LocalStorageKey.AUTH.PERSIST): Promise<boolean | string | undefined>;
};
const mapDispatchToProps = (dispatch: ThunkDispatch): MapDispatchToPropsResult => {
  return {
    doInitializeClient: (...args: Parameters<typeof ROOT_ACTIONS.clientAction.doInitializeClient>) => {
      return dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(...args));
    },
    doRemoveClient: (...args: Parameters<typeof ROOT_ACTIONS.clientAction.doRemoveClient>) => {
      return dispatch(ROOT_ACTIONS.clientAction.doRemoveClient(...args));
    },
    getLocalStorage: (...args: Parameters<typeof ROOT_ACTIONS.localStorageAction.getLocalStorage>) => {
      return dispatch(ROOT_ACTIONS.localStorageAction.getLocalStorage(...args));
    },
    removeLocalStorage: (...args: Parameters<typeof ROOT_ACTIONS.localStorageAction.deleteLocalStorage>) => {
      return dispatch(ROOT_ACTIONS.localStorageAction.deleteLocalStorage(...args));
    },
    resetAuthError: () => {
      return dispatch(ROOT_ACTIONS.authAction.resetAuthError());
    },
    resetClientError: () => {
      return dispatch(ROOT_ACTIONS.clientAction.resetClientError());
    },
  };
};

const ClientList = connect(mapStateToProps, mapDispatchToProps)(ClientListComponent);

export {ClientList};
