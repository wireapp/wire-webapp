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

import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {container} from 'tsyringe';

import {APIClient} from '@wireapp/api-client';

import {User} from 'src/script/entity/User';
import {APIClient as APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {evaluateSelfSupportedProtocols} from './evaluateSelfSupportedProtocols';

const SELF_SUPPORTED_PROTOCOLS_CHECK_KEY = 'self-supported-protocols-check';

const logger = getLogger('SupportedProtocols');

/**
 * Will initialise the intervals for checking (and updating if necessary) self supported protocols.
 * Should be called only once on app load.
 *
 * @param selfUser - self user
 * @param teamState - team state
 * @param userRepository - user repository
 */
export const initialisePeriodicSelfSupportedProtocolsCheck = async (
  selfUser: User,
  {userRepository, teamRepository}: {userRepository: UserRepository; teamRepository: TeamRepository},
) => {
  const apiClient = container.resolve(APIClientSingleton);

  const checkSupportedProtocolsTask = () =>
    updateSelfSupportedProtocols(selfUser, {apiClient, teamRepository, userRepository});

  // We update supported protocols of self user on initial app load and then in 24 hours intervals
  await checkSupportedProtocolsTask();

  return registerRecurringTask({
    every: TIME_IN_MILLIS.DAY,
    task: checkSupportedProtocolsTask,
    key: SELF_SUPPORTED_PROTOCOLS_CHECK_KEY,
  });
};

const updateSelfSupportedProtocols = async (
  selfUser: User,
  {
    apiClient,
    userRepository,
    teamRepository,
  }: {
    apiClient: APIClient;
    userRepository: UserRepository;
    teamRepository: TeamRepository;
  },
) => {
  const localSupportedProtocols = new Set(selfUser.supportedProtocols());
  logger.info('Evaluating self supported protocols, currently supported protocols:', localSupportedProtocols);

  try {
    const refreshedSupportedProtocols = await evaluateSelfSupportedProtocols({apiClient, teamRepository});

    const hasSupportedProtocolsChanged = !(
      localSupportedProtocols.size === refreshedSupportedProtocols.size &&
      [...localSupportedProtocols].every(protocol => refreshedSupportedProtocols.has(protocol))
    );

    if (!hasSupportedProtocolsChanged) {
      return;
    }

    logger.info('Supported protocols will get updated to:', refreshedSupportedProtocols);
    await userRepository.changeSupportedProtocols(Array.from(refreshedSupportedProtocols));
  } catch (error) {
    logger.error('Failed to update self supported protocols, will retry after 24h. Error: ', error);
  }
};
