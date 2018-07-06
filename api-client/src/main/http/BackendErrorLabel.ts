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

enum BackendErrorLabel {
  // @note: All backend error labels are defined by the backend team and their source code.
  // @see: https://github.com/wireapp/wire-server/blob/master/services/galley/src/Galley/API/Error.hs
  ACCESS_DENIED = 'access-denied',
  BINDING_EXISTS = 'binding-exists',
  BINDING_TEAM = 'binding-team',
  CLIENT_ERROR = 'client-error',
  INTERNAL_ERROR = 'internal-error',
  INVALID_CREDENTIALS = 'invalid-credentials',
  INVALID_OPERATION = 'invalid-op',
  INVALID_PAYLOAD = 'invalid-payload',
  INVALID_PERMISSIONS = 'invalid-permissions',
  INVALID_TEAM_STATUS_UPDATE = 'invalid-team-status-update',
  NO_ADD_TO_MANAGED = 'no-add-to-managed',
  NO_CONVERSATION = 'no-conversation',
  NO_CONVERSATION_CODE = 'no-conversation-code',
  NO_MANAGED_CONVERSATION = 'no-managed-team-conv',
  NO_OTHER_OWNER = 'no-other-owner',
  NO_TEAM = 'no-team',
  NO_TEAM_MEMBER = 'no-team-member',
  NON_BINDING_TEAM = 'non-binding-team',
  NON_BINDING_TEAM_MEMBERS = 'non-binding-team-members',
  NOT_CONNECTED = 'not-connected',
  QUEUE_FULL = 'queue-full',
  TOO_MANY_CLIENTS = 'too-many-clients',
  TOO_MANY_MEMBERS = 'too-many-members',
  TOO_MANY_TEAM_MEMBERS = 'too-many-team-members',
  UNKNOWN_CLIENT = 'unknown-client',
  UNKNOWN = 'unknown-error', // defined by web team
}

export {BackendErrorLabel};
