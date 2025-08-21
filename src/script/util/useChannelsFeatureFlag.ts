/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {AccessType, FEATURE_KEY, FeatureStatus, Role} from '@wireapp/api-client/lib/team';
import {container} from 'tsyringe';

import {Config} from 'src/script/Config';
import {TeamState} from 'src/script/repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {Core} from '../service/CoreSingleton';

const accessTypeRoleMap = {
  [AccessType.ADMINS]: [Role.ADMIN, Role.OWNER],
  [AccessType.TEAM_MEMBERS]: [Role.ADMIN, Role.MEMBER, Role.OWNER],
  [AccessType.EVERYONE]: [Role.ADMIN, Role.MEMBER, Role.EXTERNAL, Role.OWNER],
};

const useChannelFeature = () => {
  const teamState = container.resolve(TeamState);
  const {teamFeatures} = useKoSubscribableChildren(teamState, ['teamFeatures']);
  return teamFeatures ? teamFeatures[FEATURE_KEY.CHANNELS] : null;
};

const useCanCreateChannels = () => {
  const teamState = container.resolve(TeamState);
  const {selfRole} = useKoSubscribableChildren(teamState, ['selfRole']);
  const channelFeature = useChannelFeature();

  if (
    channelFeature &&
    channelFeature.status === FeatureStatus.ENABLED &&
    selfRole &&
    accessTypeRoleMap[channelFeature.config.allowed_to_create_channels].includes(selfRole)
  ) {
    return true;
  }

  return false;
};

const useCanCreatePublicChannels = () => {
  const teamState = container.resolve(TeamState);
  const {selfRole} = useKoSubscribableChildren(teamState, ['selfRole']);
  const channelFeature = useChannelFeature();

  if (
    channelFeature &&
    selfRole &&
    accessTypeRoleMap[channelFeature.config.allowed_to_open_channels].includes(selfRole)
  ) {
    return true;
  }

  return false;
};

export const useChannelsFeatureFlag = () => {
  const canCreatePublicChannels = useCanCreatePublicChannels();
  const channelFeature = useChannelFeature();
  const core = container.resolve(Core);
  const isChannelsEnabled =
    Config.getConfig().FEATURE.ENABLE_CHANNELS &&
    core.backendFeatures.version >= Config.getConfig().MIN_ENTERPRISE_LOGIN_V2_AND_CHANNELS_SUPPORTED_API_VERSION;
  const canCreateChannels = useCanCreateChannels();

  return {
    canCreateChannels,
    isChannelsEnabled,
    isChannelsFeatureEnabled: channelFeature?.status === FeatureStatus.ENABLED,
    isChannelsHistorySharingEnabled: Config.getConfig().FEATURE.ENABLE_CHANNELS_HISTORY_SHARING,
    isPublicChannelsEnabled: canCreatePublicChannels && Config.getConfig().FEATURE.ENABLE_PUBLIC_CHANNELS,
  };
};
