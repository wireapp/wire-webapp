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
import {Maybe} from 'true-myth';

import {createDesktopLogOutput} from './createDesktopLogOutput';
import {createPinoLogging} from './createPinoLogging';
import {initializeLogging} from './initializeLogging';
import {logStartupRuntimeIdentity} from './logRuntimeIdentity';
import {selectDesktopApplicationLogWrite, type DesktopApplicationLogWrite} from './selectDesktopApplicationLogWrite';

import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

const enabledSearch = '?enabled-features=desktop-structured-logs,persistent-browser-logs';

function createTestOutput(writeToDesktop: DesktopApplicationLogWrite): {
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly output: ReturnType<typeof createDesktopLogOutput>;
  readonly reportFailure: jest.Mock;
} {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000n});
  const reportFailure = jest.fn();
  const output = createDesktopLogOutput({clock, writeToDesktop, reportFailure});

  return {clock, output, reportFailure};
}

describe('Desktop structured logging', () => {
  it.each([
    {isDesktopApp: false, locationSearch: enabledSearch, reads: 0},
    {isDesktopApp: true, locationSearch: '', reads: 0},
    {isDesktopApp: true, locationSearch: '?enabled-features=', reads: 0},
    {isDesktopApp: true, locationSearch: enabledSearch, reads: 1},
  ])('reads the capability only on opted-in Wire Desktop ($isDesktopApp, $locationSearch)', options => {
    const {isDesktopApp, locationSearch, reads} = options;
    const capability = {
      version: 1,
      async write(): Promise<string> {
        return this === capability ? 'written' : 'failed';
      },
    };
    const readCapability = jest.fn(() => {
      return capability;
    });
    const write = selectDesktopApplicationLogWrite({
      isDesktopApp,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(locationSearch),
      readCapability,
    });

    expect(readCapability).toHaveBeenCalledTimes(reads);
    expect(write.isJust).toBe(reads === 1);

    return write
      .map(async invoke => {
        await expect(invoke(['{}'])).resolves.toBe('written');
      })
      .unwrapOr(undefined);
  });

  it.each([undefined, null, {version: 2, write: jest.fn()}, {version: 1, write: 'write'}, {version: 1}])(
    'ignores an unavailable capability (%s)',
    capability => {
      expect(
        selectDesktopApplicationLogWrite({
          isDesktopApp: true,
          startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(enabledSearch),
          readCapability() {
            return capability;
          },
        }).isNothing,
      ).toBe(true);
    },
  );

  it('contains errors while reading the capability', () => {
    expect(
      selectDesktopApplicationLogWrite({
        isDesktopApp: true,
        startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(enabledSearch),
        readCapability() {
          throw new Error('Preload unavailable');
        },
      }).isNothing,
    ).toBe(true);
  });

  it.each([
    {consoleQuery: '', expectedConsoleInfoRecordIndexes: []},
    {consoleQuery: '&debugLogging=Selected', expectedConsoleInfoRecordIndexes: [1]},
    {consoleQuery: '&debugLogging=RuntimeIdentity', expectedConsoleInfoRecordIndexes: [0]},
  ])(
    'persists sanitized Pino diagnostics and startup identity with independent console filtering ($consoleQuery)',
    async options => {
      const {consoleQuery, expectedConsoleInfoRecordIndexes} = options;
      const writeToDesktop = jest.fn<Promise<string>, [readonly string[]]>().mockResolvedValue('written');
      const {clock, output, reportFailure} = createTestOutput(writeToDesktop);
      const logging = createPinoLogging(Maybe.nothing());
      const consoleOutput = {info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn()};
      const createPersistenceOutput = jest.fn();
      const locationSearch = enabledSearch + consoleQuery;
      const browserPersistence = initializeLogging({
        clock,
        consoleOutput,
        locationSearch,
        debugEnabled: false,
        developerConsoleEnabled: true,
        storage: Maybe.nothing(),
        configureLogging: logging.configure,
        browserPersistenceEnabled: false,
        desktopPersistenceOutput: output.write,
        createPersistenceOutput,
      });

      logStartupRuntimeIdentity({
        logger: logging.getLogger('RuntimeIdentity'),
        clock,
        consoleOutput,
        isDesktopApp: true,
        hasDesktopLogPersistence: true,
        locationSearch,
        deploymentStage: 'production',
        origin: 'https://app.wire.com',
        version: '1.2.3',
        assetVersion: '1.2.3-147',
      });
      const selected = logging.getLogger('Selected');
      const credential = {
        toJSON: jest.fn(() => {
          return 'Bearer secret-credential';
        }),
      };
      selected.info('WebSocket connected', {connectionId: 42, credential, detail: 'first\nsecond\r'});
      logging.getLogger('Other').warn('Unselected namespace');
      expect(writeToDesktop).not.toHaveBeenCalled();

      clock.advanceByMilliseconds(1000);
      expect(writeToDesktop).toHaveBeenCalledTimes(1);
      await output.flush();

      const [records] = writeToDesktop.mock.calls.at(0) ?? [];
      expect(writeToDesktop).toHaveBeenCalledTimes(1);
      expect(records).toHaveLength(3);
      expect(records?.join('')).not.toMatch(/[\r\n]|secret-credential/);
      expect(
        records?.map(record => {
          return JSON.parse(record) as unknown;
        }),
      ).toEqual([
        {
          level: 30,
          time: 1000,
          component: 'RuntimeIdentity',
          msg: 'WebApp runtime identity',
          deploymentStage: 'production',
          version: '1.2.3',
          assetVersion: '1.2.3-147',
          origin: 'https://app.wire.com',
        },
        {
          level: 30,
          time: 1000,
          component: 'Selected',
          msg: 'WebSocket connected',
          connectionId: 42,
          credential: 'Bearer [REDACTED]',
          detail: 'first\nsecond\r',
        },
        {level: 40, time: 1000, component: 'Other', msg: 'Unselected namespace'},
      ]);
      expect(credential.toJSON).toHaveBeenCalledTimes(1);
      expect(consoleOutput.info.mock.calls).toEqual(
        expectedConsoleInfoRecordIndexes.map(index => {
          return [records?.at(index)];
        }),
      );
      expect(consoleOutput.debug).not.toHaveBeenCalled();
      expect(consoleOutput.warn).not.toHaveBeenCalled();
      expect(browserPersistence.isNothing).toBe(true);
      expect(createPersistenceOutput).not.toHaveBeenCalled();
      expect(reportFailure).not.toHaveBeenCalled();
    },
  );

  it('treats an empty flush as a no-op and preserves the exact serialized strings when splitting at 1024 records', async () => {
    const writeToDesktop = jest.fn().mockResolvedValue('written');
    const {output} = createTestOutput(writeToDesktop);
    await output.flush();
    expect(writeToDesktop).not.toHaveBeenCalled();
    const records = Array.from({length: 1025}, (_, index) => {
      return '{"msg":"\\u0025\\n","index":' + index + '}';
    });
    for (const record of records) {
      output.write(record, 'info');
    }

    await output.flush();

    expect(writeToDesktop.mock.calls).toEqual([[records.slice(0, 1024)], [records.slice(1024)]]);
  });

  it('limits UTF-8 records including the LF Desktop adds', async () => {
    const writeToDesktop = jest.fn().mockResolvedValue('written');
    const {output} = createTestOutput(writeToDesktop);
    const largestRecord = '"' + '€'.repeat(87_379) + 'xxxx"';
    output.write(' ' + largestRecord, 'info');
    output.write(largestRecord, 'info');
    output.write('{"msg":"unchecked\nline"}', 'info');

    await output.flush();

    expect(writeToDesktop.mock.calls).toEqual([[[largestRecord]]]);
  });

  it('bounds queued and in-flight bytes, preserves retained ordering, and waits for acknowledgement', async () => {
    const acknowledgement = Promise.withResolvers<string>();
    const writeToDesktop = jest
      .fn<Promise<string>, [readonly string[]]>()
      .mockResolvedValue('written')
      .mockReturnValueOnce(acknowledgement.promise);
    const {output} = createTestOutput(writeToDesktop);
    const records = Array.from({length: 6}, (_, index) => {
      return '"' + index + 'x'.repeat(65_532) + '"';
    });
    for (const record of records) {
      output.write(record, 'info');
    }
    const completion = output.flush();
    expect(writeToDesktop.mock.calls).toEqual([[records.slice(0, 1)]]);
    acknowledgement.resolve('written');

    await completion;

    expect(writeToDesktop.mock.calls).toEqual([[records.slice(0, 1)], [records.slice(3)]]);
    const encoder = new TextEncoder();
    for (const [batch] of writeToDesktop.mock.calls) {
      expect(encoder.encode(batch.join('\n') + '\n').byteLength).toBeLessThanOrEqual(256 * 1024);
    }
  });

  it.each(['busy', 'rejected', 'failed', 'rejected promise', 'synchronous error', 'unknown response'])(
    'reports %s once until a successful acknowledgement and keeps accepting new batches',
    async response => {
      let succeeding = false;
      const writeToDesktop = jest.fn(() => {
        if (succeeding) {
          return Promise.resolve('written');
        }
        switch (response) {
          case 'rejected promise':
            return Promise.reject(new Error('IPC unavailable'));
          case 'synchronous error':
            throw new Error('IPC unavailable');
          default:
            return Promise.resolve(response);
        }
      });
      const {output, reportFailure} = createTestOutput(writeToDesktop);
      const batches = [['"first"', '"second"'], ['"third"'], ['"fourth"'], ['"fifth"']];
      for (const [index, batch] of batches.entries()) {
        succeeding = index === 2;
        for (const record of batch) {
          output.write(record, 'info');
        }
        await output.flush();
      }

      const failure = response === 'busy' || response === 'rejected' ? response : 'failed';
      expect(reportFailure.mock.calls).toEqual([[failure], [failure]]);
      expect(writeToDesktop.mock.calls).toEqual(
        batches.map(batch => {
          return [batch];
        }),
      );
      const expectedDroppedRecords = failure === 'failed' ? 0 : 4;
      expect(output.getStatistics()).toMatchObject({droppedRecords: expectedDroppedRecords, pendingBytes: 0});
    },
  );

  it('accepts an acknowledgement just before the timeout and stays available afterward', async () => {
    const acknowledgement = Promise.withResolvers<string>();
    const writeToDesktop = jest.fn().mockResolvedValue('written').mockReturnValueOnce(acknowledgement.promise);
    const {clock, output, reportFailure} = createTestOutput(writeToDesktop);

    output.write('"slow write"', 'info');
    const firstFlush = output.flush();
    clock.advanceByMilliseconds(9999);
    acknowledgement.resolve('written');
    await firstFlush;
    clock.advanceByMilliseconds(1);

    output.write('"next write"', 'info');
    await output.flush();

    expect(writeToDesktop.mock.calls).toEqual([[['"slow write"']], [['"next write"']]]);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('keeps discarding batches without replay while an IPC write never settles', async () => {
    const writeToDesktop = jest.fn().mockReturnValue(Promise.withResolvers<never>().promise);
    const {clock, output, reportFailure} = createTestOutput(writeToDesktop);

    output.write('"pending"', 'info');
    const firstFlush = output.flush();
    clock.advanceByMilliseconds(10_000);
    await firstFlush;

    for (const record of ['"first discarded"', '"second discarded"', '"third discarded"']) {
      output.write(record, 'info');
      await output.flush();
    }
    clock.advanceByMilliseconds(60_000);

    expect(writeToDesktop.mock.calls).toEqual([[['"pending"']]]);
    expect(reportFailure.mock.calls).toEqual([['timeout'], ['stalled']]);
    expect(output.getStatistics()).toMatchObject({droppedRecords: 3, pendingBytes: 0});
  });

  it.each(['success', 'rejection'])(
    'counts batches discarded during a stall and recovers after late %s',
    async settlement => {
      const acknowledgement = Promise.withResolvers<string>();
      const writeToDesktop = jest.fn().mockResolvedValue('written').mockReturnValueOnce(acknowledgement.promise);
      const {clock, output, reportFailure} = createTestOutput(writeToDesktop);

      output.write('"pending"', 'info');
      const firstFlush = output.flush();
      clock.advanceByMilliseconds(10_000);
      await firstFlush;
      expect(output.getStatistics()).toMatchObject({droppedRecords: 0, pendingBytes: 0});
      output.write('"first dropped record"', 'info');
      output.write('"second dropped record"', 'info');
      await output.flush();
      output.write('"third dropped record"', 'info');
      await output.flush();
      clock.advanceByMilliseconds(60_000);

      expect(reportFailure.mock.calls).toEqual([['timeout'], ['stalled']]);
      expect(output.getStatistics()).toMatchObject({droppedRecords: 3, pendingBytes: 0});
      expect(writeToDesktop.mock.calls).toEqual([[['"pending"']]]);
      if (settlement === 'success') {
        acknowledgement.resolve('written');
      } else {
        acknowledgement.reject(new Error('Late interruption'));
      }
      await Promise.resolve();

      output.write('"first after recovery"', 'info');
      output.write('"second after recovery"', 'info');
      await output.flush();
      expect(writeToDesktop.mock.calls).toEqual([
        [['"pending"']],
        [['"first after recovery"', '"second after recovery"']],
      ]);
      expect(reportFailure.mock.calls).toEqual([['timeout'], ['stalled']]);
      expect(output.getStatistics()).toMatchObject({droppedRecords: 3, pendingBytes: 0});
    },
  );
});
