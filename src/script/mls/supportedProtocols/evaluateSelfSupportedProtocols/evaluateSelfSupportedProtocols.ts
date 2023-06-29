/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {RegisteredClient} from '@wireapp/api-client/lib/client';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {FeatureList, FeatureMLS, FeatureStatus} from '@wireapp/api-client/lib/team';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {isMLSSupportedByEnvironment} from '../../isMLSSupportedByEnvironment';
import {getMLSMigrationStatus, MLSMigrationStatus} from '../../MLSMigration/migrationStatus';

export const evaluateSelfSupportedProtocols = async ({
  core,
  apiClient,
  teamFeatureList,
}: {
  core: Account;
  apiClient: APIClient;
  teamFeatureList: FeatureList;
}): Promise<Set<ConversationProtocol>> => {
  const supportedProtocols = new Set<ConversationProtocol>();

  const {mlsMigration: mlsMigrationFeature, mls: mlsFeature} = teamFeatureList;

  const teamSupportedProtocols = getSelfTeamSupportedProtocols(mlsFeature);

  const selfClients = await apiClient.api.client.getClients();

  const mlsMigrationStatus = getMLSMigrationStatus(mlsMigrationFeature);

  if (await isProteusSupported({teamSupportedProtocols, mlsMigrationStatus})) {
    supportedProtocols.add(ConversationProtocol.PROTEUS);
  }

  if (
    (await isMLSSupported({teamSupportedProtocols, selfClients, mlsMigrationStatus, core, apiClient})) ||
    (await isMLSForcedWithoutMigration({teamSupportedProtocols, selfClients, mlsMigrationStatus, core, apiClient}))
  ) {
    supportedProtocols.add(ConversationProtocol.MLS);
  }

  return supportedProtocols;
};

const isMLSSupported = async ({
  teamSupportedProtocols,
  selfClients,
  mlsMigrationStatus,
  core,
  apiClient,
}: {
  teamSupportedProtocols: Set<ConversationProtocol>;
  selfClients: RegisteredClient[];
  mlsMigrationStatus: MLSMigrationStatus;
  core: Account;
  apiClient: APIClient;
}): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({core, apiClient});

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const isMLSSupportedByTeam = teamSupportedProtocols.has(ConversationProtocol.MLS);
  const doActiveClientsSupportMLS = await haveAllActiveClientsRegisteredMLSDevice(selfClients);
  return isMLSSupportedByTeam && (doActiveClientsSupportMLS || mlsMigrationStatus === MLSMigrationStatus.FINALISED);
};

const isMLSForcedWithoutMigration = async ({
  teamSupportedProtocols,
  selfClients,
  mlsMigrationStatus,
  core,
  apiClient,
}: {
  teamSupportedProtocols: Set<ConversationProtocol>;
  selfClients: RegisteredClient[];
  mlsMigrationStatus: MLSMigrationStatus;
  core: Account;
  apiClient: APIClient;
}): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({core, apiClient});

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const isMLSSupportedByTeam = teamSupportedProtocols.has(ConversationProtocol.MLS);
  const isProteusSupportedByTeam = teamSupportedProtocols.has(ConversationProtocol.PROTEUS);
  const doActiveClientsSupportMLS = await haveAllActiveClientsRegisteredMLSDevice(selfClients);
  const isMigrationDisabled = mlsMigrationStatus === MLSMigrationStatus.DISABLED;

  return !doActiveClientsSupportMLS && isMLSSupportedByTeam && !isProteusSupportedByTeam && isMigrationDisabled;
};

const isProteusSupported = async ({
  teamSupportedProtocols,
  mlsMigrationStatus,
}: {
  teamSupportedProtocols: Set<ConversationProtocol>;
  mlsMigrationStatus: MLSMigrationStatus;
}): Promise<boolean> => {
  const isProteusSupportedByTeam = teamSupportedProtocols.has(ConversationProtocol.PROTEUS);
  return (
    isProteusSupportedByTeam ||
    [MLSMigrationStatus.NOT_STARTED, MLSMigrationStatus.ONGOING].includes(mlsMigrationStatus)
  );
};

const wasClientActiveWithinLast4Weeks = (client: RegisteredClient): boolean => {
  //FIXME: once last_active field is added to the client entity
  const lastActiveISODate = (client as any).last_active as string;
  const lastActiveDate = new Date(lastActiveISODate).getTime();
  const fourWeeks = TIME_IN_MILLIS.WEEK * 4;
  return Date.now() - lastActiveDate < fourWeeks;
};

const haveAllActiveClientsRegisteredMLSDevice = async (selfClients: RegisteredClient[]): Promise<boolean> => {
  //TODO: filter only active clients once last_active field is added to the client entity
  const activeClients = selfClients.filter(wasClientActiveWithinLast4Weeks);
  return activeClients.every(client => !!client.mls_public_keys);
};

const getSelfTeamSupportedProtocols = (mlsFeature?: FeatureMLS): Set<ConversationProtocol> => {
  if (!mlsFeature || mlsFeature.status === FeatureStatus.DISABLED) {
    return new Set([ConversationProtocol.PROTEUS]);
  }

  //FIXME: fix type after supportedProtocols is implemented on backend
  const teamSupportedProtocols = (mlsFeature.config as any).supportedProtocols || [
    ConversationProtocol.PROTEUS,
    ConversationProtocol.MLS,
  ];

  return new Set<ConversationProtocol>(teamSupportedProtocols);
};
