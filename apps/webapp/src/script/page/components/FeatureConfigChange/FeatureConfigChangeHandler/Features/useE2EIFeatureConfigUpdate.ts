/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {FEATURE_KEY, FeatureList} from '@wireapp/api-client/lib/team';
import {
  FeatureUpdateType,
  detectTeamFeatureUpdate,
} from 'Repositories/team/TeamFeatureConfigChangeDetector/TeamFeatureConfigChangeDetector';
import {TeamRepository} from 'Repositories/team/TeamRepository';

import {configureE2EI} from './E2EIdentity';

const onConfigUpdate = async (configUpdate: {
  prevFeatureList?: FeatureList | undefined;
  newFeatureList: FeatureList;
}) => {
  const {type} = detectTeamFeatureUpdate(configUpdate, FEATURE_KEY.MLSE2EID);

  if (type !== FeatureUpdateType.UNCHANGED) {
    const client = await configureE2EI(configUpdate.newFeatureList);
    await client?.startTimers();
  }
};

export const useE2EIFeatureConfigUpdate = (teamRepository: TeamRepository) => {
  useEffect(() => {
    teamRepository.on('featureConfigUpdated', onConfigUpdate);

    return () => {
      teamRepository.off('featureConfigUpdated', onConfigUpdate);
    };
  }, [teamRepository]);
};
