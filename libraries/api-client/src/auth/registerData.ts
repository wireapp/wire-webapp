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

import {TeamData} from '../team/team/TeamData';
import {User} from '../user/';

export type RegisterData = Pick<User, 'accent_id' | 'assets' | 'email' | 'name'> & {
  /** Email activation code */
  email_code?: string;
  /** Life time of a new temporary guest account */
  expires_in?: number;
  /** Regular invitation code. Mutually exclusive with `team_code` */
  invitation_code?: string;
  label?: string;
  locale?: string;
  password?: string;
  /** Data for new team account creation */
  team?: TeamData;
  /** Team invitation code for joining an existing team. Mutually exclusive with `invitation_code` */
  team_code?: string;
};
