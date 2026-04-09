/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {AppsFeatureOptions, checkAppsFeatureAvailability} from "Util/featureUtil";
import {CONVERSATION_PROTOCOL} from "@wireapp/api-client/lib/team";

type AppsFeatureDataSet = AppsFeatureOptions & { expected: boolean };

describe('featureUtil', () => {
  it.each<AppsFeatureDataSet>([
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      expected: true
    },
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: false,
      expected: false
    },
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      hasWhitelistedServices: false,
      expected: true
    },
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      expected: false
    },
  ])('apps feature is $expected when { protocol: $protocol, isAppsEnabled: $isAppsEnabled, hasWhitelistedServices: $hasWhitelistedServices }',
    (testData) => {
    // Act
    const result = checkAppsFeatureAvailability(testData)

    //Assert
    expect(result).toBe(testData.expected);
  });
});
