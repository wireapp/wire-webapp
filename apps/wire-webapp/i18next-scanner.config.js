/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

module.exports = {
  options: {
    debug: true,
    defaultLng: 'en-US',
    defaultNs: 'translation',
    func: {
      extensions: ['.js', '.html', '.htm'],
      list: ['t'],
    },
    interpolation: {
      prefix: '{{',
      suffix: '}}',
    },
    lngs: ['en-US'],
    nsSeparator: false,
    removeUnusedKeys: false,
    resource: {
      jsonIndent: 2,
      lineEnding: '\n',
      loadPath: 'src/i18n/{{lng}}.json',
      savePath: 'src/i18n/{{lng}}.json',
    },
  },
};
