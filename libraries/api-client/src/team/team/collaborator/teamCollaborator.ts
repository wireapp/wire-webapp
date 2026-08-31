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

export enum CollaboratorPermission {
  CREATE_TEAM_CONVERSATION = 'create_team_conversation',
  IMPLICIT_CONNECTION = 'implicit_connection',
}

/**
 * Note: `permissions` is a plain array, as returned by the backend (`GET /teams/:tid/collaborators`).
 * Do not change this to a `Set` - that is not how the JSON payload deserializes. Convert to a `Set`
 * only at the point of consumption (e.g. in a repository) if O(1) membership checks are needed there.
 */
export interface TeamCollaborator {
  permissions: CollaboratorPermission[];
  team: string;
  user: string;
}
