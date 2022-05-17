/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ACCESS_STATE, TEAM} from './AccessState';
import {
  // ACCESS_MODES,
  // featureFromStateChange,
  // isGettingAccessToFeature,
  teamPermissionsForAccessState,
  // updateAccessRights,
} from './ConversationAccessPermission';

// describe('ConversationAccessPermissions', () => {

describe('teamPermissionsForAccessState', () => {
  const team = {
    GUESTS_SERVICES: (1 << 0) | (1 << 1) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 3),
    GUEST_FEATURES: (1 << 0) | (1 << 1) | (1 << 5),
    GUEST_ROOM: (1 << 0) | (1 << 1) | (1 << 5) | (1 << 4) | (1 << 2),
    LEGACY: 0,
    ONE2ONE: 0,
    SERVICES: (1 << 4) | (1 << 2) | (1 << 3),
    TEAM_ONLY: (1 << 4) | (1 << 2),
  };
  const entry: [TEAM, number][] = Object.entries(team).map(([k, v]) => [
    ACCESS_STATE.TEAM[k as keyof typeof ACCESS_STATE.TEAM],
    v,
  ]);

  it.each(entry)('should return the expected number for features for each team state', (accessState, results) => {
    expect(teamPermissionsForAccessState(accessState as typeof ACCESS_STATE.TEAM[keyof typeof ACCESS_STATE.TEAM])).toBe(
      results,
    );
  });

  it('should return 0 if an unknown value is passed to it', () => {
    expect(teamPermissionsForAccessState(ACCESS_STATE.OTHER.SELF)).toBe(0);
  });
});
// });
