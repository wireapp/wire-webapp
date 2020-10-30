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

export enum GENERIC_MESSAGE_TYPE {
  ASSET = 'asset',
  AVAILABILITY = 'availability',
  BUTTON_ACTION = 'buttonAction',
  BUTTON_ACTION_CONFIRMATION = 'buttonActionConfirmation',
  CALLING = 'calling',
  CLEARED = 'cleared',
  CLIENT_ACTION = 'clientAction',
  COMPOSITE_MESSAGE = 'composite',
  CONFIRMATION = 'confirmation',
  DATA_TRANSFER = 'dataTransfer',
  DELETED = 'deleted',
  EDITED = 'edited',
  EPHEMERAL = 'ephemeral',
  EXTERNAL = 'external',
  HIDDEN = 'hidden',
  IMAGE = 'image',
  KNOCK = 'knock',
  LAST_READ = 'lastRead',
  LOCATION = 'location',
  REACTION = 'reaction',
  TEXT = 'text',
}
