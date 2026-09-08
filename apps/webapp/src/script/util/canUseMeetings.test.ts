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

import {Config} from 'src/script/Config';

import {canUseMeetings} from './canUseMeetings';

describe('canUseMeetings', () => {
  const minSupportedApiVersion = Config.getConfig().MIN_MEETINGS_SUPPORTED_API_VERSION;

  it('is enabled when the team feature is on and the API version is at least 17', () => {
    expect(
      canUseMeetings({
        isTeamMeetingsFeatureEnabled: true,
        apiVersion: minSupportedApiVersion,
      }),
    ).toBe(true);
  });

  it('is disabled when the negotiated API version is below 17', () => {
    expect(
      canUseMeetings({
        isTeamMeetingsFeatureEnabled: true,
        apiVersion: minSupportedApiVersion - 1,
      }),
    ).toBe(false);
  });

  it('is disabled when the team meetings feature is off', () => {
    expect(
      canUseMeetings({
        isTeamMeetingsFeatureEnabled: false,
        apiVersion: minSupportedApiVersion,
      }),
    ).toBe(false);
  });
});
