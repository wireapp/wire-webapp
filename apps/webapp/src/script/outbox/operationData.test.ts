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

import {guardContextOf, newOperationData, toView, versionData} from './operationData';
import {createStoredSnapshot, parseTestPayload} from './testing/createOutboxTestKit';
import type {Kind} from './types';

const kind: Kind<unknown> = {
  name: 'kind',
  parsePayload: parseTestPayload,
  perform: async () => {
    return {type: 'attempt-succeeded'};
  },
  expiresAfterMilliseconds: 10_000,
};
const place = {id: 'new', queuedSeq: 9, now: 1_000};

describe('newOperationData', () => {
  it('starts with no attempts, queued now, expiring after the kind says', () => {
    const data = newOperationData(kind, {payload: 'p', correlationKey: 'key', orderingKey: 'lane'}, 'p', place);

    expect(data).toMatchObject({
      id: 'new',
      kind: 'kind',
      payload: 'p',
      correlationKey: 'key',
      orderingKey: 'lane',
      queuedSeq: 9,
      queuedAt: 1_000,
      attempts: 0,
      validUntil: 11_000,
      expiresAfterMilliseconds: undefined,
    });
  });

  it('takes the limits of the request over the kind, and stores them', () => {
    const data = newOperationData(
      kind,
      {payload: 'p', expiresAfterMilliseconds: 500, performTimeoutMilliseconds: 70},
      'p',
      place,
    );

    expect(data).toMatchObject({validUntil: 1_500, expiresAfterMilliseconds: 500, performTimeoutMilliseconds: 70});
  });

  it('does not expire without a limit from the kind or the request', () => {
    const data = newOperationData({...kind, expiresAfterMilliseconds: undefined}, {payload: 'p'}, 'p', place);

    expect(data.validUntil).toBeUndefined();
  });
});

describe('versionData', () => {
  const found = createStoredSnapshot({
    kind: 'kind',
    id: 'found',
    orderingKey: 'lane',
    queuedSeq: 3,
    queuedAt: 500,
    attempts: 4,
    validUntil: 5_000,
    expiresAfterMilliseconds: 4_500,
    performTimeoutMilliseconds: 70,
  });
  const versionPlace = {queuedSeq: 20, now: 2_000};

  it('replaces the payload, starts the attempts again, and keeps what the request does not pass', () => {
    const data = versionData(found, kind, {payload: 'new'}, 'new', versionPlace);

    expect(data).toEqual({
      ...found,
      payload: 'new',
      attempts: 0,
    });
  });

  it('moves to the end of another lane when the request passes another ordering key', () => {
    const data = versionData(found, kind, {payload: 'new', orderingKey: 'elsewhere'}, 'new', versionPlace);

    expect(data).toMatchObject({orderingKey: 'elsewhere', queuedSeq: 20});
  });

  it('keeps its place when the ordering key is the same', () => {
    const data = versionData(found, kind, {payload: 'new', orderingKey: 'lane'}, 'new', versionPlace);

    expect(data).toMatchObject({orderingKey: 'lane', queuedSeq: 3});
  });

  it('starts the expiry again from now when the request passes one, even the same value', () => {
    const data = versionData(found, kind, {payload: 'new', expiresAfterMilliseconds: 4_500}, 'new', versionPlace);

    expect(data).toMatchObject({validUntil: 6_500, expiresAfterMilliseconds: 4_500});
  });

  it('takes the timeout the request passes', () => {
    const data = versionData(found, kind, {payload: 'new', performTimeoutMilliseconds: 90}, 'new', versionPlace);

    expect(data.performTimeoutMilliseconds).toBe(90);
  });

  it('gives a dead-lettered operation the expiry of the request, or else the kind, never the earlier one', () => {
    const deadLettered = {...found, state: 'dead-lettered' as const};

    expect(versionData(deadLettered, kind, {payload: 'new'}, 'new', versionPlace)).toMatchObject({
      validUntil: 12_000,
      expiresAfterMilliseconds: undefined,
    });
    expect(
      versionData(deadLettered, kind, {payload: 'new', expiresAfterMilliseconds: 300}, 'new', versionPlace),
    ).toMatchObject({validUntil: 2_300, expiresAfterMilliseconds: 300});
  });
});

describe('guardContextOf and toView', () => {
  it('reads the limits of the kind, with the defaults', () => {
    const operation = createStoredSnapshot({kind: 'kind', attempts: 2});

    expect(guardContextOf(operation, kind)).toEqual({attempts: 2, maxAttempts: 5, whenGivenUp: 'dead-letter'});
    expect(guardContextOf(operation, {...kind, maxAttempts: 1, whenGivenUp: 'drop'})).toEqual({
      attempts: 2,
      maxAttempts: 1,
      whenGivenUp: 'drop',
    });
  });

  it('shows what owners may see of an operation', () => {
    const operation = createStoredSnapshot({kind: 'kind', id: 'x', correlationKey: 'key', orderingKey: 'lane'});

    expect(toView(operation)).toEqual({
      id: 'x',
      kind: 'kind',
      payload: {text: 'stored'},
      correlationKey: 'key',
      queuedAt: 1_000_000,
      state: 'queued',
      attempts: 0,
    });
  });
});
