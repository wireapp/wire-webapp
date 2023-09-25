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
import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {SelfService} from './SelfService';

import {ClientEntity, ClientRepository} from '../client';
import {isMLSSupportedByEnvironment} from '../mls/isMLSSupportedByEnvironment';
import {MLSMigrationStatus} from '../mls/MLSMigration/migrationStatus';
import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

const SELF_SUPPORTED_PROTOCOLS_CHECK_KEY = 'self-supported-protocols-check';

export class SelfRepository {
  private readonly logger: Logger;

  constructor(
    private readonly selfService: SelfService,
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly clientRepository: ClientRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.logger = getLogger('SelfRepository');

    // Every time user's client is deleted, we need to re-evaluate self supported protocols.
    // It's possible that they have removed proteus client, and now all their clients are mls-capable.
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.refreshSelfSupportedProtocols);

    // Every time team admin updates the list of team's supported protocols, we re-evaluate self supported protocols list.
    teamRepository.onTeamSupportedProtocolsUpdate(this.refreshSelfSupportedProtocols);
  }

  private get selfUser() {
    const selfUser = this.userState.self();
    if (!selfUser) {
      throw new Error('Self user is not available');
    }
    return selfUser;
  }

  /**
   * Proteus is supported if:
   * - Proteus is in the list of supported protocols
   * - MLS migration is enabled but not finalised
   */
  private isProteusSupported(): boolean {
    const teamSupportedProtocols = this.teamRepository.getTeamSupportedProtocols();
    const mlsMigrationStatus = this.teamRepository.getTeamMLSMigrationStatus();

    const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
    return (
      isProteusSupportedByTeam ||
      [MLSMigrationStatus.NOT_STARTED, MLSMigrationStatus.ONGOING].includes(mlsMigrationStatus)
    );
  }

  /**
   * MLS is forced if:
   * - only MLS is in the list of supported protocols
   * - MLS migration is disabled
   * - There are still some active clients that do not support MLS
   * It means that team admin wants to force MLS and drop proteus support, even though not all active clients support MLS
   */
  private async isMLSForcedWithoutMigration(): Promise<boolean> {
    const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

    if (!isMLSSupportedByEnv) {
      return false;
    }

    const teamSupportedProtocols = this.teamRepository.getTeamSupportedProtocols();
    const mlsMigrationStatus = this.teamRepository.getTeamMLSMigrationStatus();

    const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
    const isProteusSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.PROTEUS);
    const doActiveClientsSupportMLS = await this.clientRepository.haveAllActiveSelfClientsRegisteredMLSDevice();
    const isMigrationDisabled = mlsMigrationStatus === MLSMigrationStatus.DISABLED;

    return !doActiveClientsSupportMLS && isMLSSupportedByTeam && !isProteusSupportedByTeam && isMigrationDisabled;
  }

  /**
   * MLS is supported if:
   * - MLS is in the list of supported protocols
   * - All active clients support MLS, or MLS migration is finalised
   */
  private async isMLSSupported(): Promise<boolean> {
    const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

    if (!isMLSSupportedByEnv) {
      return false;
    }

    const teamSupportedProtocols = this.teamRepository.getTeamSupportedProtocols();
    const mlsMigrationStatus = this.teamRepository.getTeamMLSMigrationStatus();

    const isMLSSupportedByTeam = teamSupportedProtocols.includes(ConversationProtocol.MLS);
    const doActiveClientsSupportMLS = await this.clientRepository.haveAllActiveSelfClientsRegisteredMLSDevice();
    return isMLSSupportedByTeam && (doActiveClientsSupportMLS || mlsMigrationStatus === MLSMigrationStatus.FINALISED);
  }

  /**
   * Will evaluate the list of self user's supported protocols and return them.
   */
  public async evaluateSelfSupportedProtocols(): Promise<ConversationProtocol[]> {
    const supportedProtocols: ConversationProtocol[] = [];

    const isProteusProtocolSupported = this.isProteusSupported();
    if (isProteusProtocolSupported) {
      supportedProtocols.push(ConversationProtocol.PROTEUS);
    }

    const isMLSProtocolSupported = await this.isMLSSupported();

    const isMLSForced = await this.isMLSForcedWithoutMigration();

    if (isMLSProtocolSupported || isMLSForced) {
      supportedProtocols.push(ConversationProtocol.MLS);
    }

    return supportedProtocols;
  }

  public async getSelfSupportedProtocols(): Promise<ConversationProtocol[]> {
    const selfUser = this.userState.self();

    const localSupportedProtocols = selfUser.supportedProtocols();

    if (localSupportedProtocols) {
      return localSupportedProtocols;
    }

    const supportedProtocols = await this.refreshSelfSupportedProtocols();

    return supportedProtocols;
  }

  /**
   * Update self user's list of supported protocols.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   * @param supportedProtocols - an array of new supported protocols
   */
  private async updateSelfSupportedProtocols(
    supportedProtocols: ConversationProtocol[],
  ): Promise<ConversationProtocol[]> {
    this.logger.info('Supported protocols will get updated to:', supportedProtocols);
    await this.selfService.putSupportedProtocols(supportedProtocols);
    await this.userRepository.updateUserSupportedProtocols(this.selfUser.qualifiedId, supportedProtocols);
    return supportedProtocols;
  }

  /**
   * Will re-evaluate self supported protocols and update them if necessary.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   * @param supportedProtocols - an array of new supported protocols
   */
  public readonly refreshSelfSupportedProtocols = async (): Promise<ConversationProtocol[]> => {
    const localSupportedProtocols = this.selfUser.supportedProtocols();

    this.logger.info('Evaluating self supported protocols, currently supported protocols:', localSupportedProtocols);
    const refreshedSupportedProtocols = await this.evaluateSelfSupportedProtocols();

    if (!localSupportedProtocols) {
      return this.updateSelfSupportedProtocols(refreshedSupportedProtocols);
    }

    const hasSupportedProtocolsChanged = !(
      localSupportedProtocols.length === refreshedSupportedProtocols.length &&
      [...localSupportedProtocols].every(protocol => refreshedSupportedProtocols.includes(protocol))
    );

    if (!hasSupportedProtocolsChanged) {
      return localSupportedProtocols;
    }

    return this.updateSelfSupportedProtocols(refreshedSupportedProtocols);
  };

  /**
   * Will initialise the intervals for checking (and updating if necessary) self supported protocols.
   * Should be called only once on app load.
   *
   * @param selfUser - self user
   * @param teamState - team state
   * @param userRepository - user repository
   */
  public async initialisePeriodicSelfSupportedProtocolsCheck() {
    // We update supported protocols of self user on initial app load and then in 24 hours intervals
    const refreshProtocolsTask = async () => {
      await this.refreshSelfSupportedProtocols();
      try {
      } catch (error) {
        this.logger.error('Failed to update self supported protocols, will retry after 24h. Error: ', error);
      }
    };
    await refreshProtocolsTask();

    return registerRecurringTask({
      every: TIME_IN_MILLIS.DAY,
      task: refreshProtocolsTask,
      key: SELF_SUPPORTED_PROTOCOLS_CHECK_KEY,
    });
  }

  public async deleteSelfUserClient(clientId: string, password?: string): Promise<ClientEntity[]> {
    const clients = this.clientRepository.deleteClient(clientId, password);

    await this.refreshSelfSupportedProtocols();
    return clients;
  }
}
