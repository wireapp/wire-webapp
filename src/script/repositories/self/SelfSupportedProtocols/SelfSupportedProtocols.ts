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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {isMLSSupportedByEnvironment} from '../../../mls/isMLSSupportedByEnvironment';
import {MLSMigrationStatus} from '../../../mls/MLSMigration/migrationStatus';

interface SelfSupportedProtocolsTeamHandler {
  getTeamSupportedProtocols: () => ConversationProtocol[];
  getTeamMLSMigrationStatus: () => MLSMigrationStatus;
}

interface SelfSupportedProtocolsSelfClientsHandler {
  haveAllActiveSelfClientsRegisteredMLSDevice: () => Promise<boolean>;
}

/**
 * Proteus is supported if:
 * - Proteus is in the list of supported protocols
 * - MLS migration is enabled but not finalised
 */
const isProteusSupported = (teamHandler: SelfSupportedProtocolsTeamHandler) => {
  const teamSupportedProtocols = teamHandler.getTeamSupportedProtocols();
  const mlsMigrationStatus = teamHandler.getTeamMLSMigrationStatus();

  const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
  return (
    isProteusSupportedByTeam ||
    [MLSMigrationStatus.NOT_STARTED, MLSMigrationStatus.ONGOING].includes(mlsMigrationStatus)
  );
};

/**
 * MLS is forced if:
 * - only MLS is in the list of supported protocols
 * - MLS migration is disabled
 * - There are still some active clients that do not support MLS
 * It means that team admin wants to force MLS and drop proteus support, even though not all active clients support MLS
 */
const isMLSForcedWithoutMigration = async (
  teamHandler: SelfSupportedProtocolsTeamHandler,
  selfClientsHandler: SelfSupportedProtocolsSelfClientsHandler,
): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const teamSupportedProtocols = teamHandler.getTeamSupportedProtocols();
  const mlsMigrationStatus = teamHandler.getTeamMLSMigrationStatus();

  const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
  const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
  const doActiveClientsSupportMLS = await selfClientsHandler.haveAllActiveSelfClientsRegisteredMLSDevice();
  const isMigrationDisabled = mlsMigrationStatus === MLSMigrationStatus.DISABLED;

  return !doActiveClientsSupportMLS && isMLSSupportedByTeam && !isProteusSupportedByTeam && isMigrationDisabled;
};

/**
 * MLS is supported if:
 * - MLS is in the list of supported protocols
 * - All active clients support MLS, or MLS migration is finalised
 */
const isMLSSupported = async (
  teamHandler: SelfSupportedProtocolsTeamHandler,
  selfClientsHandler: SelfSupportedProtocolsSelfClientsHandler,
): Promise<boolean> => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

  if (!isMLSSupportedByEnv) {
    return false;
  }

  const teamSupportedProtocols = teamHandler.getTeamSupportedProtocols();
  const mlsMigrationStatus = teamHandler.getTeamMLSMigrationStatus();

  const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
  const doActiveClientsSupportMLS = await selfClientsHandler.haveAllActiveSelfClientsRegisteredMLSDevice();
  return isMLSSupportedByTeam && (doActiveClientsSupportMLS || mlsMigrationStatus === MLSMigrationStatus.FINALISED);
};

/**
 * Will evaluate the list of self user's supported protocols and return them.
 */
export const evaluateSelfSupportedProtocols = async (
  teamHandler: SelfSupportedProtocolsTeamHandler,
  selfClientsHandler: SelfSupportedProtocolsSelfClientsHandler,
  previousSupportedProtocols: ConversationProtocol[] = [],
): Promise<ConversationProtocol[]> => {
  const supportedProtocols: ConversationProtocol[] = [];

  const isProteusProtocolSupported = isProteusSupported(teamHandler);
  if (isProteusProtocolSupported) {
    supportedProtocols.push(ConversationProtocol.PROTEUS);
  }

  const isMLSProtocolSupported = await isMLSSupported(teamHandler, selfClientsHandler);

  const isMLSForced = await isMLSForcedWithoutMigration(teamHandler, selfClientsHandler);

  if (isMLSProtocolSupported || isMLSForced || previousSupportedProtocols.includes(ConversationProtocol.MLS)) {
    supportedProtocols.push(ConversationProtocol.MLS);
  }

  return supportedProtocols;
};
