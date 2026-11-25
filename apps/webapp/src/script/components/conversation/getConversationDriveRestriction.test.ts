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

import {Maybe} from 'true-myth';

import {getConversationDriveRestriction} from './getConversationDriveRestriction';

import {CONVERSATION_CELLS_STATE} from '../../apiClient/conversation/conversation';

const ownTeamDrive = {
  conversationTeamId: Maybe.just('team-a'),
  selfUserTeamId: Maybe.just('team-a'),
  selfUserDriveRole: 'editor' as const,
  cellsState: CONVERSATION_CELLS_STATE.READY,
  isCellsEnabled: true,
  isCellsEnabledForTeam: false,
  isDriveOffboardingFeatureEnabled: true,
};

describe('getConversationDriveRestriction', () => {
  it('selects offboarding for an existing Drive owned by the signed-in team', () => {
    expect(getConversationDriveRestriction(ownTeamDrive)).toBe('offboarding');
    expect(getConversationDriveRestriction({...ownTeamDrive, selfUserDriveRole: 'viewer'})).toBe('offboarding');
  });

  it.each([true, false])(
    'keeps external viewers role-restricted when their own team Cells is %s',
    isCellsEnabledForTeam => {
      expect(
        getConversationDriveRestriction({
          ...ownTeamDrive,
          conversationTeamId: Maybe.just('team-b'),
          selfUserDriveRole: 'viewer',
          isCellsEnabledForTeam,
        }),
      ).toBe('viewer');
    },
  );

  it('keeps a teamless guest role-restricted', () => {
    expect(
      getConversationDriveRestriction({
        ...ownTeamDrive,
        selfUserTeamId: Maybe.nothing<string>(),
        selfUserDriveRole: 'viewer',
      }),
    ).toBe('viewer');
  });

  it('does not offboard a conversation without an owning team', () => {
    expect(getConversationDriveRestriction({...ownTeamDrive, conversationTeamId: Maybe.nothing<string>()})).toBe(
      'none',
    );
  });

  it('preserves enabled Drive and disabled feature-flag behavior', () => {
    expect(getConversationDriveRestriction({...ownTeamDrive, isCellsEnabledForTeam: true})).toBe('none');
    expect(getConversationDriveRestriction({...ownTeamDrive, isDriveOffboardingFeatureEnabled: false})).toBe('none');
    expect(
      getConversationDriveRestriction({
        ...ownTeamDrive,
        isDriveOffboardingFeatureEnabled: false,
        selfUserDriveRole: 'viewer',
      }),
    ).toBe('viewer');
  });

  it('does not show a Drive restriction when the Drive UI is unavailable', () => {
    expect(getConversationDriveRestriction({...ownTeamDrive, isCellsEnabled: false})).toBe('none');
    expect(getConversationDriveRestriction({...ownTeamDrive, isCellsEnabled: false, selfUserDriveRole: 'viewer'})).toBe(
      'none',
    );
  });

  it.each([CONVERSATION_CELLS_STATE.PENDING, CONVERSATION_CELLS_STATE.DISABLED])(
    'does not infer offboarding from conversation state %s',
    cellsState => {
      expect(getConversationDriveRestriction({...ownTeamDrive, cellsState})).toBe('none');
    },
  );
});
