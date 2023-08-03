/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {enableLogging} from 'src/script/util/LoggerUtil';
import {Config} from 'src/script/Config';

describe('enableLogging', () => {
  beforeEach(() => window.localStorage.clear());

  const config = Config.getConfig();

  it('writes a specified logger namespace into the localStorage API', () => {
    const namespace = '@wireapp';

    enableLogging(config, `?enableLogging=${namespace}`);

    expect(localStorage.getItem('debug')).toBe(namespace);

    enableLogging(config, `?enableLogging=${namespace}`);

    expect(localStorage.getItem('debug')).toBe(namespace);
  });

  it('removes an old namespace from the localStorage when there is no new namespace', () => {
    const namespace = '@wireapp';
    localStorage.setItem('debug', namespace);

    enableLogging(config, '');

    expect(localStorage.getItem('debug')).toBe(null);
  });

  it('enable the webapp logs if dev mode is enabled', () => {
    const namespace = '@wireapp';
    localStorage.setItem('debug', namespace);

    enableLogging({...config, FEATURE: {...config.FEATURE, ENABLE_DEBUG: true}}, '');

    expect(localStorage.getItem('debug')).toBe('*');
  });
});
