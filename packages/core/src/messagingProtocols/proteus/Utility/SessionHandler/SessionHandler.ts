/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {PreKey} from '@wireapp/api-client/lib/auth';
import {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {Decoder} from 'bazinga64';
import {Logger} from 'logdown';

import {APIClient} from '@wireapp/api-client';

import {SessionId} from './SessionHandler.types';

import {flattenUserMap} from '../../../../conversation/message/UserClientsUtil';
import {CryptoClient} from '../../ProteusService/CryptoClient';

interface ConstructSessionIdParams {
  userId: QualifiedId;
  clientId: string;
  domain?: string;
}

type InitSessionsResult = {
  /** valid sessions that either already existed or have been freshly created */
  sessions: string[];
  /** client that do we do not have sessions with and that do not have existence on backend (deleted clients) */
  unknowns?: QualifiedUserClients;
  /** clients for which we had problem fetch prekeys (federated server down) */
  failed?: QualifiedId[];
};

const constructSessionId = ({userId, clientId}: ConstructSessionIdParams): string => {
  const {id, domain} = userId;
  const baseId = `${id}@${clientId}`;
  return domain ? `${domain}@${baseId}` : baseId;
};

const isSessionId = (object: any): object is SessionId => {
  return object.userId && object.clientId;
};

/**
 * Splits a sessionId into userId, clientId & domain (if any).
 */
const parseSessionId = (sessionId: string): SessionId => {
  // see https://regex101.com/r/c8FtCw/1
  const regex = /((?<domain>.+)@)?(?<userId>.+)@(?<clientId>.+)$/g;
  const match = regex.exec(sessionId);
  if (!match || !isSessionId(match.groups)) {
    throw new Error(`given session id "${sessionId}" has wrong format`);
  }
  return match.groups;
};

interface CreateSessionsBase {
  apiClient: APIClient;
  cryptoClient: CryptoClient;
  logger?: Logger;
}

interface CreateSessionsProps extends CreateSessionsBase {
  recipients: QualifiedUserClients;
}

/**
 * Will make sure the session is available in cryptoClient
 * @param sessionId the session to init
 */
const initSession = async (
  {userId, clientId, initialPrekey}: {userId: QualifiedId; clientId: string; initialPrekey?: PreKey},
  {cryptoClient, apiClient}: {apiClient: APIClient; cryptoClient: CryptoClient},
): Promise<string> => {
  const recipients = initialPrekey
    ? {[userId.domain]: {[userId.id]: {[clientId]: initialPrekey}}}
    : {[userId.domain]: {[userId.id]: [clientId]}};
  const {sessions} = await initSessions({
    recipients,
    apiClient,
    cryptoClient,
  });
  return sessions[0];
};

/**
 * Create sessions for legacy/qualified clients (umberella function).
 * @param {userClientMap} map of domain to (map of user IDs to client IDs) or map of user IDs containg the lists of clients
 */
const createSessions = async ({recipients, apiClient, cryptoClient}: CreateSessionsProps) => {
  const {qualified_user_client_prekeys: prekeysBundle, failed_to_list: failed} =
    await apiClient.api.user.postMultiPreKeyBundles(recipients);

  const result = await createSessionsFromPreKeys({
    recipients: prekeysBundle,
    cryptoClient,
  });

  return {
    ...result,
    failed: failed?.length ? failed : undefined,
  };
};

interface GetSessionsAndClientsFromRecipientsProps {
  recipients: QualifiedUserClients | QualifiedUserPreKeyBundleMap;
  apiClient: APIClient;
  cryptoClient: CryptoClient;
  logger?: Logger;
}

/**
 * Will make sure all the sessions need to encrypt for those user/clients pair are set
 */
const initSessions = async ({
  recipients,
  apiClient,
  cryptoClient,
  logger,
}: GetSessionsAndClientsFromRecipientsProps): Promise<InitSessionsResult> => {
  const missingClients: QualifiedUserClients = {};
  const missingClientsWithPrekeys: QualifiedUserPreKeyBundleMap = {};
  const existingSessions: string[] = [];
  const users = flattenUserMap<string[] | Record<string, PreKey | null>>(recipients);

  for (const user of users) {
    const {userId, data} = user;
    const clients = Array.isArray(data) ? data : Object.keys(data);
    for (const clientId of clients) {
      const sessionId = constructSessionId({userId, clientId});
      if (await cryptoClient.sessionExists(sessionId)) {
        existingSessions.push(sessionId);
        continue;
      }
      if (!Array.isArray(data)) {
        const domainMissingWithPrekey = missingClientsWithPrekeys[userId.domain] ?? {};
        domainMissingWithPrekey[userId.id] = domainMissingWithPrekey[userId.id] ?? {};
        domainMissingWithPrekey[userId.id][clientId] = data[clientId];
        missingClientsWithPrekeys[userId.domain] = domainMissingWithPrekey;
        continue;
      }
      const domainMissing = missingClients[userId.domain] ?? {};
      domainMissing[userId.id] = domainMissing[userId.id] || [];
      domainMissing[userId.id].push(clientId);
      missingClients[userId.domain] = domainMissing;
    }
  }

  const {sessions: prekeyCreated, unknowns: prekeyUnknows} =
    Object.keys(missingClientsWithPrekeys).length > 0
      ? await createSessionsFromPreKeys({
          recipients: missingClientsWithPrekeys,
          cryptoClient,
        })
      : {sessions: [], unknowns: {}};

  const {
    sessions: created,
    failed,
    unknowns,
  } = Object.keys(missingClients).length > 0
    ? await createSessions({
        recipients: missingClients,
        apiClient,
        cryptoClient,
        logger,
      })
    : {sessions: [], failed: undefined, unknowns: undefined};

  const allUnknowns = {...prekeyUnknows, ...unknowns};
  return {
    sessions: [...existingSessions, ...prekeyCreated, ...created],
    failed,
    unknowns: Object.keys(allUnknowns).length > 0 ? allUnknowns : undefined,
  };
};

interface DeleteSessionParams {
  userId: QualifiedId;
  clientId: string;
  cryptoClient: CryptoClient;
}
async function deleteSession(params: DeleteSessionParams) {
  const sessionId = constructSessionId(params);
  await params.cryptoClient.deleteSession(sessionId);
}

interface CreateSessionsFromPreKeysProps {
  recipients: QualifiedUserPreKeyBundleMap;
  cryptoClient: CryptoClient;
  logger?: Logger;
}

const createSessionsFromPreKeys = async ({
  recipients,
  cryptoClient,
}: CreateSessionsFromPreKeysProps): Promise<InitSessionsResult> => {
  const sessions: string[] = [];
  const unknowns: QualifiedUserClients = {};

  for (const domain in recipients) {
    for (const userId in recipients[domain]) {
      const userClients = recipients[domain][userId];

      for (const clientId in userClients) {
        const sessionId = constructSessionId({userId: {id: userId, domain}, clientId});
        const prekey = userClients[clientId];

        if (!prekey) {
          const domainUnknowns = unknowns[domain] ?? {};
          domainUnknowns[userId] = domainUnknowns[userId] ?? [];
          domainUnknowns[userId].push(clientId);
          unknowns[domain] = domainUnknowns;
          continue;
        }

        const prekeyBuffer = Decoder.fromBase64(prekey.key).asBytes;

        await cryptoClient.sessionFromPrekey(sessionId, prekeyBuffer);
        await cryptoClient.saveSession(sessionId);

        sessions.push(sessionId);
      }
    }
  }

  return {sessions, unknowns};
};

type EncryptedPayloads<T> = Record<string, Record<string, Record<string, T>>>;
/**
 * creates an encrypted payload that can be sent to backend from a bunch of sessionIds/encrypted payload
 */
const buildEncryptedPayloads = <T>(payloads: Map<string, T>): EncryptedPayloads<T> => {
  return [...payloads].reduce((acc, [sessionId, payload]) => {
    const {userId, domain, clientId} = parseSessionId(sessionId);
    if (!domain) {
      throw new Error('Invalid session ID');
    }
    const domainPayloads = acc[domain] ?? {};
    domainPayloads[userId] = domainPayloads[userId] ?? {};
    domainPayloads[userId][clientId] = payload;
    acc[domain] = domainPayloads;
    return acc;
  }, {} as EncryptedPayloads<T>);
};

export {constructSessionId, initSession, initSessions, deleteSession, buildEncryptedPayloads};
