/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {container} from 'tsyringe';

import {meetingsFeatureToggleName} from 'src/script/featureToggles/startupfeaturetogglenames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TeamState} from 'src/script/repositories/team/teamstate';
import {useKoSubscribableChildren} from 'Util/componentUtil';

export const useMeetingsFeatureFlag = () => {
  const {isFeatureToggleEnabled} = useApplicationContext();
  const teamState = container.resolve(TeamState);
  const {isMeetingsEnabled: isMeetingsEnabledForTeam} = useKoSubscribableChildren(teamState, ['isMeetingsEnabled']);

  const isMeetingsEnabled = isMeetingsEnabledForTeam && isFeatureToggleEnabled(meetingsFeatureToggleName);

  return {isMeetingsEnabled};
};
