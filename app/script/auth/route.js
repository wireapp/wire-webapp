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

import {onEnvironment} from './Environment';

const stagingWebsite = 'https://wire-website-staging.zinfra.io';

export default {
  CHOOSE_HANDLE: '/choosehandle',
  CONVERSATION_JOIN: '/join-conversation',
  CREATE_ACCOUNT: '/createaccount',
  CREATE_TEAM: '/createteam',
  CREATE_TEAM_ACCOUNT: '/createteamaccount',
  INDEX: '/',
  INITIAL_INVITE: '/teaminvite',
  INVITE: '/invite',
  LOGIN: '/login',
  PERSONAL_INVITE: '/personalinvite',
  VERIFY: '/verify',
  WIRE_ROOT: onEnvironment(stagingWebsite, stagingWebsite, 'https://wire.com'),
};
