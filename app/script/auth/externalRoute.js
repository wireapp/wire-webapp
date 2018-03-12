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

const WEBAPP_ENV = onEnvironment('http://localhost:8888', '', '');
const WIRE_WEBSITE = onEnvironment(
  'https://wire-website-staging.zinfra.io',
  'https://wire-website-staging.zinfra.io',
  'https://wire.com'
);

export default {
  LOGIN: `${WEBAPP_ENV}/login`,
  WEBAPP: WEBAPP_ENV,
  WIRE_PRIVACY_POLICY: `${WIRE_WEBSITE}/legal/#privacy`,
  WIRE_ROOT: WIRE_WEBSITE,
  WIRE_TERMS_PERSONAL: `${WIRE_WEBSITE}/legal/terms/#personal`,
  WIRE_TERMS_TEAMS: `${WIRE_WEBSITE}/legal/terms/#teams`,
};
