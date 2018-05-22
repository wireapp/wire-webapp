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

'use strict';

// grunt test_init && grunt test_run:telemetry/calling/CallLogger

describe('z.telemetry.calling.CallLogger', () => {
  it('properly replaces IP addresses', () => {
    const callLogger = new z.telemetry.calling.CallLogger('test', {}, 'test');
    expect(callLogger.safeGuard('test 10.10.12.43 test')).toBe('test 10.10.XXX.XXX test');
    expect(callLogger.safeGuard('127.0.0.1')).toBe('127.0.XXX.XXX');
    expect(callLogger.safeGuard('52.153.34.121')).toBe('52.153.XXX.XXX');
  });

  it('properly replaces UUIDs', () => {
    const callLogger = new z.telemetry.calling.CallLogger('test', {}, 'test');
    expect(callLogger.safeGuard('df63c05f-cfbb-4c33-a759-d867ed8fd803')).toBe('df63');
    expect(callLogger.safeGuard('789bbed7-6da0-46e2-b5aa-3347a4f80c1e')).toBe('789b');
  });
});
