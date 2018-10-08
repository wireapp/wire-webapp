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

import * as dotenv from 'dotenv';

const {version}: {version: string} = require('../package.json');

dotenv.config();

export interface ServerConfig {
  CACHE_DURATION_SECONDS: number;
  COMPRESS_LEVEL: number;
  COMPRESS_MIN_SIZE: number;
  DEVELOPMENT?: boolean;
  ENVIRONMENT: string;
  PORT_HTTP: number;
  VERSION: string;
}

const config: ServerConfig = {
  CACHE_DURATION_SECONDS: 300,
  COMPRESS_LEVEL: 6,
  COMPRESS_MIN_SIZE: 500,
  ENVIRONMENT: process.env.ENVIRONMENT || 'prod',
  PORT_HTTP: Number(process.env.PORT) || 21080,
  VERSION: version,
};

config.DEVELOPMENT = config.ENVIRONMENT === 'dev';

export default config;
