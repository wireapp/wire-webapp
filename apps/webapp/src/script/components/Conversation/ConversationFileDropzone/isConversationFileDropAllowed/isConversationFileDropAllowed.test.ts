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

import {isConversationFileDropAllowed} from './isConversationFileDropAllowed';

describe('isConversationFileDropAllowed', () => {
  it('allows file drops when Cells is disabled', () => {
    expect(isConversationFileDropAllowed({isCellsEnabled: false, isViewerPermissionFeatureEnabled: true})).toBe(true);
  });

  it('allows viewer file drops when the viewer permission feature is disabled', () => {
    expect(
      isConversationFileDropAllowed({
        conversationTeamId: 'team-a',
        selfUserTeamId: 'team-b',
        isCellsEnabled: true,
        isViewerPermissionFeatureEnabled: false,
      }),
    ).toBe(true);
  });

  it('allows editor file drops when the viewer permission feature is enabled', () => {
    expect(
      isConversationFileDropAllowed({
        conversationTeamId: 'team-a',
        selfUserTeamId: 'team-a',
        isCellsEnabled: true,
        isViewerPermissionFeatureEnabled: true,
      }),
    ).toBe(true);
  });

  it('prevents viewer file drops when the viewer permission feature is enabled', () => {
    expect(
      isConversationFileDropAllowed({
        conversationTeamId: 'team-a',
        selfUserTeamId: 'team-b',
        isCellsEnabled: true,
        isViewerPermissionFeatureEnabled: true,
      }),
    ).toBe(false);
  });
});
