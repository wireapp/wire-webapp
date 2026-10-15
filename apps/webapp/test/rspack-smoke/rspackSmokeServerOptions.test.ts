/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {Result} from 'true-myth';

import {parseRspackSmokeServerOptions} from './rspackSmokeServerOptions';

describe('parseRspackSmokeServerOptions', () => {
  it('parses the internal build variant and port', () => {
    const actualOptions = parseRspackSmokeServerOptions(['--variant', 'internal', '--port', '4173']);

    expect(actualOptions).toEqual(Result.ok({buildVariant: 'internal', port: 4173}));
  });

  it('parses the public build variant and port', () => {
    const actualOptions = parseRspackSmokeServerOptions(['--variant', 'public', '--port', '4174']);

    expect(actualOptions).toEqual(Result.ok({buildVariant: 'public', port: 4174}));
  });

  it('identifies unknown server options', () => {
    const actualOptions = parseRspackSmokeServerOptions(['--variant', 'internal', '--other', 'value']);

    expect(actualOptions).toEqual(Result.err({kind: 'unknownOption', optionName: '--other'}));
  });

  it('rejects missing required option values', () => {
    const actualOptions = parseRspackSmokeServerOptions(['--variant', 'internal', '--port']);

    expect(actualOptions).toEqual(Result.err({kind: 'invalidArguments'}));
  });

  it('rejects ports that are not complete integer values', () => {
    const actualOptions = parseRspackSmokeServerOptions(['--variant', 'internal', '--port', '4173junk']);

    expect(actualOptions).toEqual(Result.err({kind: 'invalidArguments'}));
  });
});
