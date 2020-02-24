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

// Configure default test config
window.wire = {};
window.wire.env = {
  BACKEND_REST: 'http://localhost',
  BACKEND_WS: 'wss://localhost',
  FEATURE: {
    CHECK_CONSENT: false,
    DEFAULT_LOGIN_TEMPORARY_CLIENT: false,
    ENABLE_DOMAIN_DISCOVERY: true,
  },
};

// create initial div element with ID 'main' for react
const main = document.createElement('div');
main.id = 'main';
document.body.appendChild(main);
