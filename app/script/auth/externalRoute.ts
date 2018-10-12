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
  PWA: config.EXTERNAL.MOBILE_BASE,
  PWA_LOGIN: `${config.EXTERNAL.MOBILE_BASE}login/`,
  WEBAPP: '/',
  WIRE_ACCOUNT: config.EXTERNAL.ACCOUNT_BASE,
  WIRE_ACCOUNT_PASSWORD_RESET: `${config.EXTERNAL.ACCOUNT_BASE}forgot/`,
  WIRE_PRIVACY_POLICY: `${config.EXTERNAL.WEBSITE_BASE}legal/#privacy`,
  WIRE_TEAM_FEATURES: `${config.EXTERNAL.WEBSITE_BASE}create-team/#features`,
  WIRE_TERMS_PERSONAL: `${config.EXTERNAL.WEBSITE_BASE}legal/terms/#personal`,
  WIRE_TERMS_TEAMS: `${config.EXTERNAL.WEBSITE_BASE}legal/terms/#teams`,
  WIRE_WEBSITE: config.EXTERNAL.WEBSITE_BASE,
};
