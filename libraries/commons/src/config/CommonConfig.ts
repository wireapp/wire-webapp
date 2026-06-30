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

export const BROWSER = {
  CHROME: 'chrome',
  CHROMIUM: 'chromium', // Added for express-useragent
  EDGE: 'edge', // Added for express-useragent and https://github.com/wireapp/wire-webapp/issues/5263
  ELECTRON: 'electron',
  FIREFOX: 'firefox',
  IE: 'ie',
  MS_EDGE: 'microsoft edge',
  OPERA: 'opera',
  SAFARI: 'safari',
};

export const WEBAPP_SUPPORTED_BROWSERS = {
  [BROWSER.CHROME]: {major: 56, minor: 0},
  [BROWSER.CHROMIUM]: {major: 56, minor: 0},
  [BROWSER.FIREFOX]: {major: 60, minor: 0},
  [BROWSER.EDGE]: {major: 15, minor: 0},
  [BROWSER.MS_EDGE]: {major: 15, minor: 0},
  [BROWSER.ELECTRON]: {major: 1, minor: 6},
  [BROWSER.OPERA]: {major: 43, minor: 0},
};

export const LANGUAGE_QUERY_PARAMETER = 'hl';

export const ACCOUNT_PAGES_DEFAULT_LANGUAGE = 'en-US';
export const ACCOUNT_PAGES_SUPPORTED_LANGUAGES = [ACCOUNT_PAGES_DEFAULT_LANGUAGE, 'de-DE'];

export const WEBSITE_DEFAULT_LANGUAGE = 'en';
export const WEBSITE_SUPPORTED_LANGUAGES = [WEBSITE_DEFAULT_LANGUAGE, 'de'];

export const TEAMS_DEFAULT_LANGUAGE = 'en';
export const TEAMS_SUPPORTED_LANGUAGES = [TEAMS_DEFAULT_LANGUAGE, 'de'];
