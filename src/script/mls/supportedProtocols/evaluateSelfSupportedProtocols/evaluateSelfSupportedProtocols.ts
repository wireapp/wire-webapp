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

import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';

import {isMLSSupportedByEnvironment} from '../../isMLSSupportedByEnvironment';
import {MLSMigrationStatus} from '../../MLSMigration/migrationStatus';
import {wasClientActiveWithinLast4Weeks} from '../wasClientActiveWithinLast4Weeks';

export const evaluateSelfSupportedProtocols = async ({
  teamRepository,
  userRepository,
}: {
  teamRepository: TeamRepository;
  userRepository: UserRepository;
}): Promise<ConversationProtocol[]> => {
  const supportedProtocols: ConversationProtocol[] = [];

  const teamSupportedProtocols = teamRepository.getTeamSupportedProtocols();
  const mlsMigrationStatus = teamRepository.getTeamMLSMigrationStatus();

  const selfClients = await userRepository.getAllSelfClients();

  const isProteusProtocolSupported = await isProteusSupported({teamSupportedProtocols, mlsMigrationStatus});
  if (isProteusProtocolSupported) {
    supportedProtocols.push(ConversationProtocol.PROTEUS);
  }

  const mlsCheckDependencies = {
    teamSupportedProtocols,
    selfClients,
    mlsMigrationStatus,
  };

  const isMLSProtocolSupported = await isMLSSupported(mlsCheckDependencies);

  const isMLSForced = await isMLSForcedWithoutMigration(mlsCheckDependencies);

  if (isMLSProtocolSupported || isMLSForced) {
    supportedProtocols.push(ConversationProtocol.MLS);
  }

  return supportedProtocols;
};

/*
  MLS is supported if:
  - MLS is in the list of supported protocols
  - All active clients support MLS, or MLS migration is finalised
*/
const isMLSSupported = async ({
  teamSupportedProtocols,
  selfClients,
  mlsMigrationStatus,
}: {
  teamSupportedProtocols: ConversationProtocol[];
  selfClients: RegisteredClient[];
  mlsMigrationStatus: MLSMigrationStatus;
}): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
  const doActiveClientsSupportMLS = await haveAllActiveClientsRegisteredMLSDevice(selfClients);
  return isMLSSupportedByTeam && (doActiveClientsSupportMLS || mlsMigrationStatus === MLSMigrationStatus.FINALISED);
};

/*
  MLS is forced if:
  - only MLS is in the list of supported protocols
  - MLS migration is disabled
  - There are still some active clients that do not support MLS
  It means that team admin wants to force MLS and drop proteus support, even though not all active clients support MLS
*/
const isMLSForcedWithoutMigration = async ({
  teamSupportedProtocols,
  selfClients,
  mlsMigrationStatus,
}: {
  teamSupportedProtocols: ConversationProtocol[];
  selfClients: RegisteredClient[];
  mlsMigrationStatus: MLSMigrationStatus;
}): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
  const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
  const doActiveClientsSupportMLS = await haveAllActiveClientsRegisteredMLSDevice(selfClients);
  const isMigrationDisabled = mlsMigrationStatus === MLSMigrationStatus.DISABLED;

  return !doActiveClientsSupportMLS && isMLSSupportedByTeam && !isProteusSupportedByTeam && isMigrationDisabled;
};

/*
  Proteus is supported if:
  - Proteus is in the list of supported protocols
  - MLS migration is enabled but not finalised
*/
const isProteusSupported = async ({
  teamSupportedProtocols,
  mlsMigrationStatus,
}: {
  teamSupportedProtocols: ConversationProtocol[];
  mlsMigrationStatus: MLSMigrationStatus;
}): Promise<boolean> => {
  const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
  return (
    isProteusSupportedByTeam ||
    [MLSMigrationStatus.NOT_STARTED, MLSMigrationStatus.ONGOING].includes(mlsMigrationStatus)
  );
};

const haveAllActiveClientsRegisteredMLSDevice = async (selfClients: RegisteredClient[]): Promise<boolean> => {
  //we consider client active if it was active within last 4 weeks
  const activeClients = selfClients.filter(wasClientActiveWithinLast4Weeks);
  return activeClients.every(client => !!client.mls_public_keys);
};
