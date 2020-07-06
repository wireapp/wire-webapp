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

/** Enum for different message super types */
export enum SuperType {
  CALL = 'call',
  CONTENT = 'normal',
  DELETE = 'delete',
  DEVICE = 'device',
  FILE_TYPE_RESTRICTED = 'file-type-restricted',
  LEGALHOLD = 'legal-hold',
  LOCATION = 'location',
  MEMBER = 'member',
  MISSED = 'missed',
  PING = 'ping',
  REACTION = 'reaction',
  SPECIAL = 'special',
  SYSTEM = 'system',
  UNABLE_TO_DECRYPT = 'unable-to-decrypt',
  VERIFICATION = 'verification',
}
