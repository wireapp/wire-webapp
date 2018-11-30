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

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.enum = z.calling.enum || {};

z.calling.enum.CALL_MESSAGE_TYPE = {
  CANCEL: 'CANCEL',
  GROUP_CHECK: 'GROUPCHECK',
  GROUP_LEAVE: 'GROUPLEAVE',
  GROUP_SETUP: 'GROUPSETUP',
  GROUP_START: 'GROUPSTART',
  HANGUP: 'HANGUP',
  PROP_SYNC: 'PROPSYNC',
  REJECT: 'REJECT',
  SETUP: 'SETUP',
  UPDATE: 'UPDATE',
};
