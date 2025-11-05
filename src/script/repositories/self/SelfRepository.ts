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

import {CONVERSATION_PROTOCOL, FEATURE_KEY, FEATURE_STATUS, FeatureList} from '@wireapp/api-client/lib/team/feature/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ClientEntity, ClientRepository} from 'Repositories/client';
import {EventSource} from 'Repositories/event/EventSource';
import {
  FeatureUpdateType,
  detectTeamFeatureUpdate,
} from 'Repositories/team/TeamFeatureConfigChangeDetector/TeamFeatureConfigChangeDetector';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {SelfService} from './SelfService';
import {evaluateSelfSupportedProtocols} from './SelfSupportedProtocols/SelfSupportedProtocols';

import {Core} from '../../service/CoreSingleton';

type Events = {selfSupportedProtocolsUpdated: CONVERSATION_PROTOCOL[]};

export class SelfRepository extends TypedEventEmitter<Events> {
  private readonly logger: Logger;
  static SELF_SUPPORTED_PROTOCOLS_CHECK_KEY = 'self-supported-protocols-check';

  constructor(
    private readonly selfService: SelfService,
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly clientRepository: ClientRepository,
    private readonly userState = container.resolve(UserState),
    private readonly core = container.resolve(Core),
  ) {
    super();
    this.logger = getLogger('SelfRepository');

    // Every time user's client is deleted, we need to re-evaluate self supported protocols.
    // It's possible that they have removed proteus client, and now all their clients are mls-capable.
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.handleSelfClientRemoved);

    teamRepository.on('featureConfigUpdated', async configUpdate => {
      await this.handleMLSFeatureUpdate(configUpdate);
      await this.handleMLSMigrationFeatureUpdate(configUpdate);
      await this.handleDownloadPathFeatureUpdate(configUpdate);
    });
  }

  private handleSelfClientRemoved = async (
    _userId: QualifiedId,
    _clientId: string,
    source: EventSource,
  ): Promise<void> => {
    if (source !== EventSource.WEBSOCKET) {
      return;
    }

    await this.refreshSelfSupportedProtocols();
  };

  private get selfUser() {
    const selfUser = this.userState.self();
    if (!selfUser) {
      throw new Error('Self user is not available');
    }
    return selfUser;
  }

  private handleMLSFeatureUpdate = async ({
    prevFeatureList,
    newFeatureList,
  }: {
    prevFeatureList?: FeatureList;
    newFeatureList?: FeatureList;
  }) => {
    const mlsFeatureUpdate = detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS);

    // Nothing to do if MLS feature was not changed
    if (mlsFeatureUpdate.type === FeatureUpdateType.UNCHANGED) {
      return;
    }

    // If MLS feature was enabled or disabled, we need to re-evaluate self supported protocols
    if (mlsFeatureUpdate.type === FeatureUpdateType.DISABLED || mlsFeatureUpdate.type === FeatureUpdateType.ENABLED) {
      await this.refreshSelfSupportedProtocols();
      return;
    }

    if (mlsFeatureUpdate.type === FeatureUpdateType.CONFIG_CHANGED) {
      const {prev, next} = mlsFeatureUpdate;

      const prevSupportedProtocols = prev?.config.supportedProtocols ?? [];
      const newSupportedProtocols = next.config.supportedProtocols ?? [];

      const hasTeamSupportedProtocolsChanged = !(
        prevSupportedProtocols.length === newSupportedProtocols.length &&
        [...prevSupportedProtocols].every(protocol => newSupportedProtocols.includes(protocol))
      );

      if (hasTeamSupportedProtocolsChanged) {
        await this.refreshSelfSupportedProtocols();
      }
    }
  };

  private handleMLSMigrationFeatureUpdate = async (featureUpdate: {
    prevFeatureList?: FeatureList;
    newFeatureList?: FeatureList;
  }) => {
    // MLS Migration feature config is also considered when evaluating self supported protocols
    // We still allow proteus to be used if migration is enabled (but startTime has not been reached yet),
    // or when migration is enabled, started and not finalised yet (finaliseRegardlessAfter has not arrived yet)
    const {type} = detectTeamFeatureUpdate(featureUpdate, FEATURE_KEY.MLS_MIGRATION);

    if (type !== FeatureUpdateType.UNCHANGED) {
      await this.refreshSelfSupportedProtocols();
    }
  };

  private handleDownloadPathFeatureUpdate = async (featureUpdate: {
    prevFeatureList?: FeatureList;
    newFeatureList?: FeatureList;
  }) => {
    const {type, next} = detectTeamFeatureUpdate(featureUpdate, FEATURE_KEY.ENFORCE_DOWNLOAD_PATH);

    if (type === FeatureUpdateType.UNCHANGED) {
      return;
    }

    this.handleDownloadPathUpdate(
      next?.status === FEATURE_STATUS.ENABLED ? next.config.enforcedDownloadLocation : undefined,
    );
  };

  private handleDownloadPathUpdate = (dlPath?: string) => {
    amplify.publish(WebAppEvents.TEAM.DOWNLOAD_PATH_UPDATE, dlPath);
  };

  /**
   * Update self user's list of supported protocols.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   * @param supportedProtocols - an array of new supported protocols
   */
  private async updateSelfSupportedProtocols(supportedProtocols: CONVERSATION_PROTOCOL[]): Promise<void> {
    this.logger.info('Supported protocols will get updated to:', supportedProtocols);
    try {
      await this.selfService.putSupportedProtocols(supportedProtocols);
      await this.userRepository.updateUserSupportedProtocols(this.selfUser.qualifiedId, supportedProtocols);
      this.emit('selfSupportedProtocolsUpdated', supportedProtocols);
    } catch (error) {
      this.logger.error('Failed to update self supported protocols: ', error);
    }
  }

  /**
   * Will re-evaluate self supported protocols and update them if necessary.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   */
  public readonly refreshSelfSupportedProtocols = async (): Promise<CONVERSATION_PROTOCOL[]> => {
    const localSupportedProtocols = this.selfUser.supportedProtocols();

    this.logger.info('Evaluating self supported protocols, currently supported protocols:', localSupportedProtocols);

    const currentSelf = await this.selfService.getSelf([]);

    const previousSupportedProtocols = currentSelf.supported_protocols;

    const refreshedSupportedProtocols = await evaluateSelfSupportedProtocols(
      this.teamRepository,
      this.clientRepository,
      previousSupportedProtocols,
    );

    if (!localSupportedProtocols) {
      await this.updateSelfSupportedProtocols(refreshedSupportedProtocols);
      return refreshedSupportedProtocols;
    }

    const hasSupportedProtocolsChanged = !(
      localSupportedProtocols.length === refreshedSupportedProtocols.length &&
      [...localSupportedProtocols].every(protocol => refreshedSupportedProtocols.includes(protocol))
    );

    if (!hasSupportedProtocolsChanged) {
      return localSupportedProtocols;
    }

    await this.updateSelfSupportedProtocols(refreshedSupportedProtocols);
    return refreshedSupportedProtocols;
  };

  /**
   * Will initialise the intervals for checking (and updating if necessary) self supported protocols.
   * Should be called only once on app load.
   */
  public async initialisePeriodicSelfSupportedProtocolsCheck() {
    // We update supported protocols of self user on initial app load and then in 24 hours intervals
    await this.refreshSelfSupportedProtocols();

    await this.core.recurringTaskScheduler.registerTask({
      every: TIME_IN_MILLIS.DAY,
      task: () => this.refreshSelfSupportedProtocols(),
      key: SelfRepository.SELF_SUPPORTED_PROTOCOLS_CHECK_KEY,
    });
  }

  public getSelfSupportedProtocols = async (): Promise<CONVERSATION_PROTOCOL[]> => {
    const localSupportedProtocols = this.selfUser.supportedProtocols();

    if (localSupportedProtocols) {
      return localSupportedProtocols;
    }

    return this.refreshSelfSupportedProtocols();
  };

  public async deleteSelfUserClient(clientId: string, password?: string): Promise<ClientEntity[]> {
    const clients = this.clientRepository.deleteClient(clientId, password);

    await this.refreshSelfSupportedProtocols();
    return clients;
  }
}
