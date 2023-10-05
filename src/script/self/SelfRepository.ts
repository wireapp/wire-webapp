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
import {FEATURE_KEY, FeatureMLS} from '@wireapp/api-client/lib/team/feature/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {SelfService} from './SelfService';
import {evaluateSelfSupportedProtocols} from './SelfSupportedProtocols/SelfSupportedProtocols';

import {ClientEntity, ClientRepository} from '../client';
import {Core} from '../service/CoreSingleton';
import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

export class SelfRepository {
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
    this.logger = getLogger('SelfRepository');

    // Every time user's client is deleted, we need to re-evaluate self supported protocols.
    // It's possible that they have removed proteus client, and now all their clients are mls-capable.
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.refreshSelfSupportedProtocols);

    teamRepository.on('teamRefreshed', this.refreshSelfSupportedProtocols);
    teamRepository.on('featureUpdated', ({event, prevFeatureList}) => {
      if (event.name === FEATURE_KEY.MLS) {
        void this.handleMLSFeatureUpdate(event.data, prevFeatureList?.[FEATURE_KEY.MLS]);
      }
    });
  }

  private get selfUser() {
    const selfUser = this.userState.self();
    if (!selfUser) {
      throw new Error('Self user is not available');
    }
    return selfUser;
  }

  private handleMLSFeatureUpdate = async (newMLSFeature: FeatureMLS, prevMLSFeature?: FeatureMLS) => {
    const prevSupportedProtocols = prevMLSFeature?.config.supportedProtocols ?? [];
    const newSupportedProtocols = newMLSFeature.config.supportedProtocols ?? [];

    const hasFeatureStatusChanged = prevMLSFeature?.status !== newMLSFeature.status;

    const hasTeamSupportedProtocolsChanged = !(
      prevSupportedProtocols.length === newSupportedProtocols.length &&
      [...prevSupportedProtocols].every(protocol => newSupportedProtocols.includes(protocol))
    );

    if (hasFeatureStatusChanged || hasTeamSupportedProtocolsChanged) {
      await this.refreshSelfSupportedProtocols();
    }
  };

  /**
   * Update self user's list of supported protocols.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   * @param supportedProtocols - an array of new supported protocols
   */
  private async updateSelfSupportedProtocols(supportedProtocols: ConversationProtocol[]): Promise<void> {
    this.logger.info('Supported protocols will get updated to:', supportedProtocols);
    try {
      await this.selfService.putSupportedProtocols(supportedProtocols);
      await this.userRepository.updateUserSupportedProtocols(this.selfUser.qualifiedId, supportedProtocols);
    } catch (error) {
      this.logger.error('Failed to update self supported protocols: ', error);
    }
  }

  /**
   * Will re-evaluate self supported protocols and update them if necessary.
   * It will send a request to the backend to change the supported protocols and then update the user in the local state.
   */
  public readonly refreshSelfSupportedProtocols = async (): Promise<ConversationProtocol[]> => {
    const localSupportedProtocols = this.selfUser.supportedProtocols();

    this.logger.info('Evaluating self supported protocols, currently supported protocols:', localSupportedProtocols);
    const refreshedSupportedProtocols = await evaluateSelfSupportedProtocols(
      this.teamRepository,
      this.clientRepository,
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

  public async deleteSelfUserClient(clientId: string, password?: string): Promise<ClientEntity[]> {
    const clients = this.clientRepository.deleteClient(clientId, password);

    await this.refreshSelfSupportedProtocols();
    return clients;
  }
}
