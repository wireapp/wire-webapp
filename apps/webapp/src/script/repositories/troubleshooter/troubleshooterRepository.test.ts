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
 *
 */

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {result, task} from 'true-myth';

import {createTroubleshooterRepository} from './troubleshooterRepository';
import {
  createMockTroubleshooterService,
  MOCK_CONNECTION_DELAY_MILLISECONDS,
  MOCK_SCAN_DELAY_MILLISECONDS,
} from './troubleshooterService';

describe('troubleshooterRepository', () => {
  it('blocks concurrent tests, stores both results and shares them in one report', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const repository = createTroubleshooterRepository(createMockTroubleshooterService(clock), clock);
    expect(repository.store.getState().connection.isNothing).toBe(true);
    const connection = repository.testConnection();
    expect(repository.store.getState().running).toBe('connection');
    expect((await repository.runFullScan()).isErr).toBe(true);
    clock.advanceByMilliseconds(MOCK_CONNECTION_DELAY_MILLISECONDS);
    expect((await connection).isOk).toBe(true);
    expect(repository.store.getState().running).toBe('idle');
    expect(repository.store.getState().connection.unwrapOr({})).toMatchObject({
      durationMilliseconds: MOCK_CONNECTION_DELAY_MILLISECONDS,
      data: {route: 'relay'},
    });
    const scan = repository.runFullScan();
    clock.advanceByMilliseconds(MOCK_SCAN_DELAY_MILLISECONDS);
    await scan;
    const report = JSON.parse(repository.getReport('test-version'));
    expect(report).toMatchObject({simulated: true, version: 'test-version', includesMessagesOrCallContent: false});
    expect(report.connection).toHaveLength(1);
    expect(report.scan).toHaveLength(1);
    expect(report.scan[0].data.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({id: 'udp', status: 'blocked', address: 'mock-relay.example.invalid', port: 3478}),
        expect.objectContaining({id: 'roundTrip', value: '42 ms'}),
      ]),
    );
  });

  it('uses monotonic time for duration even when wall time changes', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const repository = createTroubleshooterRepository(createMockTroubleshooterService(clock), clock);
    const connection = repository.testConnection();
    clock.setCurrentUnixEpochMicroseconds(1_000_000_000n);
    clock.advanceByMilliseconds(MOCK_CONNECTION_DELAY_MILLISECONDS);
    await connection;
    expect(repository.store.getState().connection.unwrapOr({})).toMatchObject({
      durationMilliseconds: MOCK_CONNECTION_DELAY_MILLISECONDS,
    });
  });

  it('exposes a failed test, unlocks the actions, and allows retry', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const error = new Error('Test failed');
    const service = createMockTroubleshooterService(clock);
    const execute = jest.spyOn(service, 'testConnection').mockReturnValueOnce(task.reject(error));
    const repository = createTroubleshooterRepository(service, clock);
    expect(await repository.testConnection()).toEqual(result.err(error));
    expect(repository.store.getState().running).toBe('idle');
    expect(repository.store.getState().error.isJust).toBe(true);
    const retry = repository.testConnection();
    clock.advanceByMilliseconds(MOCK_CONNECTION_DELAY_MILLISECONDS);
    await retry;
    expect(repository.store.getState().error.isNothing).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
