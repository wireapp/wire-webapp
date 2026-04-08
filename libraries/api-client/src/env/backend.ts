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

export interface BackendData {
  name: string;
  rest: string;
  ws: string;
}

const PRODUCTION: BackendData = {
  name: 'production',
  rest: 'https://prod-nginz-https.wire.com',
  ws: 'wss://prod-nginz-ssl.wire.com',
};

const STAGING: BackendData = {
  name: 'staging',
  rest: 'https://staging-nginz-https.zinfra.io',
  ws: 'wss://staging-nginz-ssl.zinfra.io',
};

export const Backend = {
  PRODUCTION,
  STAGING,
};
