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

import {isNonEmptyString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  type CellsSelfUserDriveRole,
} from './conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

import {CONVERSATION_CELLS_STATE} from '../../apiClient/conversation/conversation';

interface ConversationDriveRestrictionParams {
  conversationTeamId: Maybe<string>;
  selfUserTeamId: Maybe<string>;
  selfUserDriveRole: CellsSelfUserDriveRole;
  cellsState: CONVERSATION_CELLS_STATE;
  isCellsEnabled: boolean;
  isCellsEnabledForTeam: boolean;
  isDriveOffboardingFeatureEnabled: boolean;
}

export type ConversationDriveRestriction = 'none' | 'offboarding' | 'viewer';

export const getConversationDriveRestriction = ({
  conversationTeamId,
  selfUserTeamId,
  selfUserDriveRole,
  cellsState,
  isCellsEnabled,
  isCellsEnabledForTeam,
  isDriveOffboardingFeatureEnabled,
}: ConversationDriveRestrictionParams): ConversationDriveRestriction => {
  if (!isCellsEnabled) {
    return 'none';
  }

  // The signed-in team's feature status says nothing about another team's Drive.
  if (
    isDriveOffboardingFeatureEnabled &&
    conversationTeamId.isJust &&
    selfUserTeamId.isJust &&
    isNonEmptyString(conversationTeamId.value) &&
    conversationTeamId.value === selfUserTeamId.value &&
    !isCellsEnabledForTeam &&
    cellsState === CONVERSATION_CELLS_STATE.READY
  ) {
    return 'offboarding';
  }

  return selfUserDriveRole === CELLS_SELF_USER_DRIVE_ROLE.VIEWER ? 'viewer' : 'none';
};
