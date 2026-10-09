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

import {isConversationFileUploadAllowed} from './isConversationFileUploadAllowed';

describe('isConversationFileUploadAllowed', () => {
  it('allows uploads in a regular conversation regardless of the team Cells setting', () => {
    expect(isConversationFileUploadAllowed({isCellsEnabled: false, isCellsEnabledForTeam: false})).toBe(true);
  });

  it('allows a Cells editor to upload when the team feature is enabled', () => {
    expect(
      isConversationFileUploadAllowed({
        conversationTeamId: 'team-a',
        selfUserTeamId: 'team-a',
        isCellsEnabled: true,
        isCellsEnabledForTeam: true,
      }),
    ).toBe(true);
  });

  it('prevents a Cells viewer from uploading when the team feature is enabled', () => {
    expect(
      isConversationFileUploadAllowed({
        conversationTeamId: 'team-a',
        selfUserTeamId: 'team-b',
        isCellsEnabled: true,
        isCellsEnabledForTeam: true,
      }),
    ).toBe(false);
  });

  it('blocks Cells uploads while the team feature is disabled and restores them when enabled again', () => {
    const permissions = {
      conversationTeamId: 'team-a',
      selfUserTeamId: 'team-a',
      isCellsEnabled: true,
    };

    expect(isConversationFileUploadAllowed({...permissions, isCellsEnabledForTeam: false})).toBe(false);
    expect(isConversationFileUploadAllowed({...permissions, isCellsEnabledForTeam: true})).toBe(true);
  });
});
