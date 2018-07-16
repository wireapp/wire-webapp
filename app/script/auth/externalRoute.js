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

const WEBAPP_ENV = onEnvironment({
  onLocal: '/app',
  onProduction: '/',
  onStaging: '/',
});
const WIRE_WEBSITE = onEnvironment({
  onProduction: 'https://wire.com/',
  onStaging: 'https://wire-website-staging.zinfra.io/',
});
const WIRE_ACCOUNT = onEnvironment({
  onProduction: 'https://account.wire.com/',
  onStaging: 'https://wire-account-staging.zinfra.io/',
});
const WIRE_PWA = onEnvironment({
  onProduction: '/',
  onStaging: 'https://wire-pwa-staging.zinfra.io/',
});

export default {
  PHONE_LOGIN: `${WEBAPP_ENV}login/`,
  PWA: WIRE_PWA,
  PWA_LOGIN: `${WIRE_PWA}login/`,
  WEBAPP: WEBAPP_ENV,
  WIRE_ACCOUNT,
  WIRE_ACCOUNT_PASSWORD_RESET: `${WIRE_ACCOUNT}forgot/`,
  WIRE_PRIVACY_POLICY: `${WIRE_WEBSITE}legal/#privacy`,
  WIRE_TEAM_FEATURES: `${WIRE_WEBSITE}create-team/#features`,
  WIRE_TERMS_PERSONAL: `${WIRE_WEBSITE}legal/terms/#personal`,
  WIRE_TERMS_TEAMS: `${WIRE_WEBSITE}legal/terms/#teams`,
  WIRE_WEBSITE,
};
