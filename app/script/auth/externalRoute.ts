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

import * as config from './config';

export default {
  PHONE_LOGIN: `/login/`,
  PWA: config.URL.MOBILE_BASE,
  PWA_LOGIN: `${config.URL.MOBILE_BASE}/login/`,
  WEBAPP: '/',
  WIRE_ACCOUNT: config.URL.ACCOUNT_BASE,
  WIRE_ACCOUNT_PASSWORD_RESET: `${config.URL.ACCOUNT_BASE}/forgot/`,
  WIRE_PRIVACY_POLICY: `${config.URL.WEBSITE_BASE}/legal/#privacy`,
  WIRE_TEAM_FEATURES: `${config.URL.WEBSITE_BASE}/create-team/#features`,
  WIRE_TERMS_PERSONAL: `${config.URL.WEBSITE_BASE}/legal/terms/#personal`,
  WIRE_TERMS_TEAMS: `${config.URL.WEBSITE_BASE}/legal/terms/#teams`,
  WIRE_WEBSITE: config.URL.WEBSITE_BASE,
};
