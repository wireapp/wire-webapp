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

import {MemberData} from '../member/MemberData';

export interface NewTeamData {
  /** User binding team
   *  @deprecated */
  binding?: boolean;
  /** Team icon (asset ID) */
  icon: string;
  /** Team icon (asset key) */
  icon_key?: string;
  /** Initial team member IDs (between 1 and 127) */
  members?: MemberData[];
  name: string;
  /** Team Splash Screen (asset key) */
  splash_screen?: string;
}
