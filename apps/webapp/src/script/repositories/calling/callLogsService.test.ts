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

import {
  CallLogsTransport,
  createCallLogsService,
  createMockCallLogsService,
  createHttpCallLogsService,
} from './callLogsService';

describe('callLogsService', () => {
  it.each([false, true])('uses multipart field file and force=%s', async force => {
    const transport = jest.fn<ReturnType<CallLogsTransport>, Parameters<CallLogsTransport>>(() => {
      return task.reject({status: 502});
    });
    const file = new File(['log data'], 'Wire-c44a.log');
    const result = await createCallLogsService(transport).sendCallLogs(file, {force});
    const request = transport.mock.calls[0][0];
    expect(request.method).toBe('POST');
    expect(request.url).toBe(force ? '/api/logs?force=true' : '/api/logs');
    expect(request.body.get('file')).toBe(file);
    expect(result.isErr).toBe(true);
  });

  it('returns the report, rejects duplicate exports, and allows an explicit force export', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const service = createMockCallLogsService(clock);
    const file = new File(['log data'], 'Wire-c44a.log');
    const first = service.sendCallLogs(file, {force: false});
    clock.advanceByMilliseconds(2_000);
    const firstResult = await first;
    expect(firstResult.unwrapOr({})).toMatchObject({
      status: 'exported',
      file_name: file.name,
      bytes: file.size,
      improvised_span_ids: 0,
    });
    const duplicate = service.sendCallLogs(file, {force: false});
    clock.advanceByMilliseconds(2_000);
    expect(await duplicate).toEqual(result.err({status: 409}));
    const forced = service.sendCallLogs(file, {force: true});
    clock.advanceByMilliseconds(2_000);
    expect((await forced).isOk).toBe(true);
  });

  it('rejects an empty file with 400', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const upload = createMockCallLogsService(clock).sendCallLogs(new File([], 'empty.log'), {force: false});
    clock.advanceByMilliseconds(2_000);
    expect(await upload).toEqual(result.err({status: 400}));
  });
});

const report = {
  status: 'exported',
  file_name: 'Wire-c44a.log',
  bytes: 8,
  participant_id: 'c44a@wire',
  format: 'avs',
  entries_exported: 1,
  log_records_exported: 2,
  participants_hashed: 0,
  duration_ms: 10,
  improvised_span_ids: 0,
};

describe('HTTP call log upload', () => {
  it.each([false, true])('uploads the file to the configured server with force=%s', async force => {
    const fetchRequest = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() => {
      return Promise.resolve({
        status: 200,
        json: () => {
          return Promise.resolve(report);
        },
      } as Response);
    });
    const file = new File(['log data'], 'Wire-c44a.log');
    const uploaded = await createHttpCallLogsService('https://localhost:8080', fetchRequest).sendCallLogs(file, {
      force,
    });
    expect(uploaded).toEqual(result.ok(report));
    expect(fetchRequest).toHaveBeenCalledTimes(1);
    const [url, options] = fetchRequest.mock.calls[0];
    expect(url).toBe(`https://localhost:8080/api/logs${force ? '?force=true' : ''}`);
    expect(options).toMatchObject({method: 'POST', credentials: 'omit', redirect: 'error'});
    expect((options?.body as FormData).get('file')).toBe(file);
    expect(options?.headers).toBeUndefined();
  });

  it.each([400, 409, 413, 422, 500, 502])('preserves HTTP %s without retrying', async status => {
    const fetchRequest = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() => {
      return Promise.resolve({status} as Response);
    });
    const uploaded = await createHttpCallLogsService('https://localhost:8080', fetchRequest).sendCallLogs(
      new File(['log'], 'test.log'),
      {force: false},
    );
    expect(uploaded).toEqual(result.err({status}));
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it.each([{status: 'exported'}, {...report, bytes: -1}])('rejects an invalid success report', async body => {
    const fetchRequest = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() => {
      return Promise.resolve({
        status: 200,
        json: () => {
          return Promise.resolve(body);
        },
      } as Response);
    });
    expect(
      await createHttpCallLogsService('https://localhost:8080', fetchRequest).sendCallLogs(
        new File(['log'], 'test.log'),
        {force: false},
      ),
    ).toEqual(result.err({status: 'response'}));
  });

  it('handles a connection failure without retrying', async () => {
    const fetchRequest = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() => {
      return Promise.reject(new Error('connection failed'));
    });
    expect(
      await createHttpCallLogsService('https://localhost:8080', fetchRequest).sendCallLogs(
        new File(['log'], 'test.log'),
        {force: false},
      ),
    ).toEqual(result.err({status: 'network'}));
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });
});
