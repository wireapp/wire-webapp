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

export enum CONVERSATION_READONLY_STATE {
  READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS = 'READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS',
  READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS = 'READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS',
  READONLY_ONE_TO_ONE_NO_KEY_PACKAGES = 'READONLY_ONE_TO_ONE_NO_KEY_PACKAGES',
}

export const MAX_GROUP_NAME_LENGTH = 64;
