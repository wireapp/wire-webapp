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

export enum PlatformType {
  BROWSER_APP = 'web',
  DESKTOP_LINUX = 'linux',
  DESKTOP_MACOS = 'mac',
  DESKTOP_WINDOWS = 'windows',
}

export enum UserType {
  GUEST = 'guest',
  TEMPORARY_GUEST = 'temporary_guest',
  USER = 'user',
}

export enum ConversationType {
  GROUP = 'group',
  ONE_TO_ONE = 'one_to_one',
}
