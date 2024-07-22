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

export interface Activate {
  /** The activation code */
  code: string;
  /**
   * Whether to perform a dryrun, i.e. to only
   * check whether activation would succeed.
   * Dry-runs never issue access cookies or
   * tokens on success but failures still
   * count towards the maximum failure count.
   */
  dryrun?: boolean;

  /** A known email address to activate. */
  email?: string;

  /** An opaque key to activate, as it was sent by the API. */
  key?: string;

  /**
   * An optional label to associate with the
   * access cookie, if one is granted during
   * account activation
   */
  label?: string;
}
