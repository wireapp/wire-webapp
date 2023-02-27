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
import {UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {Decoder} from 'bazinga64';
import {Logger} from 'logdown';

import {APIClient} from '@wireapp/api-client';

import {SessionId} from './SessionHandler.types';

import {flattenUserClients} from '../../../../conversation/message/UserClientsUtil';
import {CryptoClient} from '../../ProteusService/CryptoClient';

interface ConstructSessionIdParams {
  userId: string | QualifiedId;
  clientId: string;
  useQualifiedIds: boolean;
  domain?: string;
}

type InitSessionsResult = {
  /** valid sessions that either already existed or have been freshly created */
  sessions: string[];
  /** client that do we do not have sessions with and that do not have existence on backend (deleted clients) */
  unknowns?: UserClients;
};

const constructSessionId = ({userId, clientId, useQualifiedIds, domain}: ConstructSessionIdParams): string => {
  const id = typeof userId === 'string' ? userId : userId.id;
  const baseDomain = typeof userId === 'string' ? domain : userId.domain;
  const baseId = `${id}@${clientId}`;
  return baseDomain && useQualifiedIds ? `${baseDomain}@${baseId}` : baseId;
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

interface CreateLegacySessionsProps extends CreateSessionsBase {
  userClients: UserClients;
}

const createLegacySessions = async ({
  userClients,
  apiClient,
  cryptoClient,
}: CreateLegacySessionsProps): Promise<InitSessionsResult> => {
  const preKeyBundleMap = await apiClient.api.user.postMultiPreKeyBundles(userClients);
  const sessions = await createSessionsFromPreKeys({
    preKeyBundleMap,
    useQualifiedIds: false,
    cryptoClient,
  });

  return sessions;
};

interface CreateQualifiedSessionsProps extends CreateSessionsBase {
  userClientMap: UserClients;
  domain: string;
}

/**
 * Create sessions for the qualified clients.
 * @param {userClientMap} map of domain to (map of user IDs to client IDs)
 */
const createQualifiedSessions = async ({
  userClientMap,
  domain,
  apiClient,
  cryptoClient,
}: CreateQualifiedSessionsProps): Promise<InitSessionsResult> => {
  const prekeyBundleMap = await apiClient.api.user.postQualifiedMultiPreKeyBundles({[domain]: userClientMap});

  const sessions: string[] = [];
  let unknowns: UserClients = {};

  for (const domain in prekeyBundleMap) {
    const domainUsers = prekeyBundleMap[domain];

    const {sessions: createdSessions, unknowns: domainUnknowns} = await createSessionsFromPreKeys({
      preKeyBundleMap: domainUsers,
      domain,
      useQualifiedIds: true,
      cryptoClient,
    });
    sessions.push(...createdSessions);
    unknowns = {...unknowns, ...domainUnknowns};
  }

  return {sessions, unknowns};
};

interface CreateSessionsProps extends CreateSessionsBase {
  userClientMap: UserClients;
  domain?: string;
}

/**
 * Will make sure the session is available in cryptoClient
 * @param sessionId the session to init
 */
const initSession = async (
  {userId, clientId, initialPrekey}: {userId: QualifiedId; clientId: string; initialPrekey?: PreKey},
  {cryptoClient, apiClient}: {apiClient: APIClient; cryptoClient: CryptoClient},
): Promise<string> => {
  const recipients = initialPrekey ? {[userId.id]: {[clientId]: initialPrekey}} : {[userId.id]: [clientId]};
  const {sessions} = await initSessions({
    recipients,
    domain: userId.domain,
    apiClient,
    cryptoClient,
  });
  return sessions[0];
};

/**
 * Create sessions for legacy/qualified clients (umberella function).
 * Will call createQualifiedSessions or createLegacySessions based on passed userClientMap.
 * @param {userClientMap} map of domain to (map of user IDs to client IDs) or map of user IDs containg the lists of clients
 */
const createSessions = async ({userClientMap, domain, apiClient, cryptoClient, logger}: CreateSessionsProps) => {
  return domain
    ? createQualifiedSessions({userClientMap, domain, apiClient, cryptoClient, logger})
    : createLegacySessions({
        userClients: userClientMap,
        apiClient,
        cryptoClient,
      });
};

interface GetSessionsAndClientsFromRecipientsProps {
  recipients: UserClients | UserPreKeyBundleMap;
  domain?: string;
  apiClient: APIClient;
  cryptoClient: CryptoClient;
  logger?: Logger;
}

/**
 * Will make sure all the sessions need to encrypt for those user/clients pair are set
 */
const initSessions = async ({
  recipients,
  domain = '',
  apiClient,
  cryptoClient,
  logger,
}: GetSessionsAndClientsFromRecipientsProps): Promise<InitSessionsResult> => {
  const missingClients: UserClients = {};
  const missingClientsWithPrekeys: UserPreKeyBundleMap = {};
  const existingSessions: string[] = [];
  const users = flattenUserClients<string[] | Record<string, PreKey | null>>(recipients, domain);

  for (const user of users) {
    const {userId, data} = user;
    const clients = Array.isArray(data) ? data : Object.keys(data);
    for (const clientId of clients) {
      const sessionId = constructSessionId({userId, clientId, useQualifiedIds: !!domain});
      if (await cryptoClient.sessionExists(sessionId)) {
        existingSessions.push(sessionId);
        continue;
      }
      if (!Array.isArray(data)) {
        missingClientsWithPrekeys[userId.id] = missingClientsWithPrekeys[userId.id] || {};
        missingClientsWithPrekeys[userId.id][clientId] = data[clientId];
        continue;
      }
      missingClients[userId.id] = missingClients[userId.id] || [];
      missingClients[userId.id].push(clientId);
    }
  }

  const {sessions: prekeyCreated, unknowns: prekeyUnknows} =
    Object.keys(missingClientsWithPrekeys).length > 0
      ? await createSessionsFromPreKeys({
          preKeyBundleMap: missingClientsWithPrekeys,
          domain,
          useQualifiedIds: !!domain,
          cryptoClient,
        })
      : {sessions: [], unknowns: {}};

  const {sessions: created, unknowns} =
    Object.keys(missingClients).length > 0
      ? await createSessions({
          userClientMap: missingClients,
          domain,
          apiClient,
          cryptoClient,
          logger,
        })
      : {sessions: [], unknowns: {}};

  const allUnknowns = {...prekeyUnknows, ...unknowns};
  return {
    sessions: [...existingSessions, ...prekeyCreated, ...created],
    unknowns: Object.keys(allUnknowns).length > 0 ? allUnknowns : undefined,
  };
};

interface DeleteSessionParams {
  userId: QualifiedId;
  clientId: string;
  cryptoClient: CryptoClient;
  useQualifiedIds: boolean;
}
async function deleteSession(params: DeleteSessionParams) {
  const sessionId = constructSessionId(params);
  await params.cryptoClient.deleteSession(sessionId);
}

interface CreateSessionsFromPreKeysProps {
  preKeyBundleMap: UserPreKeyBundleMap;
  cryptoClient: CryptoClient;
  useQualifiedIds: boolean;
  domain?: string;
  logger?: Logger;
}

const createSessionsFromPreKeys = async ({
  preKeyBundleMap,
  domain = '',
  useQualifiedIds,
  cryptoClient,
}: CreateSessionsFromPreKeysProps): Promise<InitSessionsResult> => {
  const sessions: string[] = [];
  const unknowns: UserClients = {};

  for (const userId in preKeyBundleMap) {
    const userClients = preKeyBundleMap[userId];

    for (const clientId in userClients) {
      const sessionId = constructSessionId({userId, clientId, domain, useQualifiedIds});
      const prekey = userClients[clientId];

      if (!prekey) {
        unknowns[userId] = unknowns[userId] || [];
        unknowns[userId].push(clientId);
        continue;
      }

      const prekeyBuffer = Decoder.fromBase64(prekey.key).asBytes;

      await cryptoClient.sessionFromPrekey(sessionId, prekeyBuffer);
      await cryptoClient.saveSession(sessionId);

      sessions.push(sessionId);
    }
  }

  return {sessions, unknowns};
};

type EncryptedPayloads<T> = Record<string, Record<string, T>>;
/**
 * creates an encrypted payload that can be sent to backend from a bunch of sessionIds/encrypted payload
 */
const buildEncryptedPayloads = <T>(payloads: Map<string, T>): EncryptedPayloads<T> => {
  return [...payloads].reduce((acc, [sessionId, payload]) => {
    const {userId, clientId} = parseSessionId(sessionId);
    acc[userId] = acc[userId] ?? {};
    acc[userId][clientId] = payload;
    return acc;
  }, {} as EncryptedPayloads<T>);
};

export {constructSessionId, initSession, initSessions, deleteSession, buildEncryptedPayloads};
