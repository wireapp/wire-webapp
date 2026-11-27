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

import {
  backoffDelay,
  decideCascade,
  isCascadePending,
  findOperationFollowers,
  lanesOf,
  newOperationData,
  nextQueuedSeqOf,
  planPass,
  resolveKind,
  resolveTarget,
  versionOperationData,
  type LaneSettings,
  type PassPlan,
  type PassSituation,
  type TransitionContext,
} from './operationRules';
import {createStoredSnapshot, parseTestPayload, type TestPayload} from './testing/createOutboxTestKit';
import type {EnqueueRequest, Kind, OperationData, OperationSnapshot, OperationState, Trigger} from './types';

type From = OperationState | 'initial';

const allStates: From[] = ['initial', 'queued', 'on-hold', 'in-progress', 'dead-lettered', 'succeeded', 'deleted'];
const allTriggers: Trigger[] = [
  'operation-queued',
  'operation-versioned',
  'operation-held',
  'operation-released',
  'operation-dead-lettered',
  'operation-deleted',
  'operation-expired',
  'attempt-started',
  'attempt-succeeded',
  'attempt-failed',
  'attempt-held',
  'attempt-dead-lettered',
  'attempt-deleted',
  'attempt-timed-out',
  'attempt-errored',
  'attempt-interrupted',
  'lane-dead-lettered',
  'lane-deleted',
];
const failedAttemptTriggers: Trigger[] = [
  'attempt-failed',
  'attempt-timed-out',
  'attempt-errored',
  'attempt-interrupted',
];

const kindDefinition: Kind<TestPayload> = {
  name: 'kind',
  parsePayload: parseTestPayload,
  attempt: async () => {
    return {outcome: 'attempt-succeeded'};
  },
};
const kind = resolveKind({...kindDefinition, expiresAfterMilliseconds: 10_000});

function ids(operations: {id: string}[]): string[] {
  return operations.map(({id}) => {
    return id;
  });
}

describe('resolveTarget', () => {
  const hasAttemptsLeft: TransitionContext = {attempts: 1, maxAttempts: 3, whenExhausted: 'dead-letter'};
  const noAttemptsLeftDeadLetters: TransitionContext = {attempts: 3, maxAttempts: 3, whenExhausted: 'dead-letter'};
  const noAttemptsLeftDeletes: TransitionContext = {attempts: 3, maxAttempts: 3, whenExhausted: 'delete'};
  const deadLetters: TransitionContext = hasAttemptsLeft;
  const deletes: TransitionContext = {...hasAttemptsLeft, whenExhausted: 'delete'};

  const resolvedRows: [From, Trigger, OperationState][] = [
    ['initial', 'operation-queued', 'queued'],
    ['queued', 'attempt-started', 'in-progress'],
    ['queued', 'operation-versioned', 'queued'],
    ['queued', 'operation-held', 'on-hold'],
    ['queued', 'operation-expired', 'dead-lettered'],
    ['queued', 'operation-dead-lettered', 'dead-lettered'],
    ['queued', 'operation-deleted', 'deleted'],
    ['queued', 'lane-dead-lettered', 'dead-lettered'],
    ['queued', 'lane-deleted', 'deleted'],
    ['on-hold', 'operation-released', 'queued'],
    ['on-hold', 'operation-versioned', 'queued'],
    ['on-hold', 'operation-expired', 'dead-lettered'],
    ['on-hold', 'operation-dead-lettered', 'dead-lettered'],
    ['on-hold', 'operation-deleted', 'deleted'],
    ['on-hold', 'lane-dead-lettered', 'dead-lettered'],
    ['on-hold', 'lane-deleted', 'deleted'],
    ['in-progress', 'attempt-succeeded', 'succeeded'],
    ['in-progress', 'attempt-failed', 'queued'],
    ['in-progress', 'attempt-timed-out', 'queued'],
    ['in-progress', 'attempt-errored', 'queued'],
    ['in-progress', 'attempt-interrupted', 'queued'],
    ['in-progress', 'attempt-held', 'on-hold'],
    ['in-progress', 'attempt-dead-lettered', 'dead-lettered'],
    ['in-progress', 'attempt-deleted', 'deleted'],
    ['in-progress', 'operation-dead-lettered', 'dead-lettered'],
    ['in-progress', 'operation-deleted', 'deleted'],
    ['dead-lettered', 'operation-versioned', 'queued'],
    ['dead-lettered', 'operation-deleted', 'deleted'],
  ];
  const refusedRows = allStates.flatMap(from => {
    return allTriggers
      .filter(trigger => {
        return !resolvedRows.some(([resolvedFrom, resolvedTrigger]) => {
          return resolvedFrom === from && resolvedTrigger === trigger;
        });
      })
      .map((trigger): [From, Trigger] => {
        return [from, trigger];
      });
  });

  it.each(resolvedRows)('%s on %s leads to %s', (from, trigger, target) => {
    expect(resolveTarget(from, trigger, hasAttemptsLeft)).toEqual({outcome: 'target-resolved', target});
  });

  it.each(refusedRows)('%s refuses %s', (from, trigger) => {
    expect(resolveTarget(from, trigger, hasAttemptsLeft)).toEqual({outcome: 'target-refused'});
  });

  it.each(['succeeded', 'deleted'] as const)('%s is final and accepts nothing', from => {
    for (const trigger of allTriggers) {
      expect(resolveTarget(from, trigger, hasAttemptsLeft)).toEqual({outcome: 'target-refused'});
    }
  });

  describe('a failed attempt', () => {
    it.each(failedAttemptTriggers)('%s retries while there are attempts left', trigger => {
      expect(resolveTarget('in-progress', trigger, hasAttemptsLeft)).toEqual({
        outcome: 'target-resolved',
        target: 'queued',
      });
    });

    it.each(failedAttemptTriggers)('%s dead-letters without attempts left when the kind dead-letters', trigger => {
      expect(resolveTarget('in-progress', trigger, noAttemptsLeftDeadLetters)).toEqual({
        outcome: 'target-resolved',
        target: 'dead-lettered',
      });
    });

    it.each(failedAttemptTriggers)('%s deletes without attempts left when the kind deletes', trigger => {
      expect(resolveTarget('in-progress', trigger, noAttemptsLeftDeletes)).toEqual({
        outcome: 'target-resolved',
        target: 'deleted',
      });
    });

    it('retries when the attempts are one short of the maximum', () => {
      expect(
        resolveTarget('in-progress', 'attempt-failed', {attempts: 2, maxAttempts: 3, whenExhausted: 'delete'}),
      ).toEqual({outcome: 'target-resolved', target: 'queued'});
    });

    it('is exhausted when the attempts are past the maximum', () => {
      expect(
        resolveTarget('in-progress', 'attempt-failed', {attempts: 4, maxAttempts: 3, whenExhausted: 'delete'}),
      ).toEqual({outcome: 'target-resolved', target: 'deleted'});
    });
  });

  describe('expiry', () => {
    it.each(['queued', 'on-hold'] as const)('%s dead-letters on expiry when the kind dead-letters', from => {
      expect(resolveTarget(from, 'operation-expired', deadLetters)).toEqual({
        outcome: 'target-resolved',
        target: 'dead-lettered',
      });
    });

    it.each(['queued', 'on-hold'] as const)('%s deletes on expiry when the kind deletes', from => {
      expect(resolveTarget(from, 'operation-expired', deletes)).toEqual({
        outcome: 'target-resolved',
        target: 'deleted',
      });
    });

    it('expires regardless of the attempts left', () => {
      expect(resolveTarget('queued', 'operation-expired', noAttemptsLeftDeletes)).toEqual({
        outcome: 'target-resolved',
        target: 'deleted',
      });
      expect(resolveTarget('queued', 'operation-expired', hasAttemptsLeft)).toEqual({
        outcome: 'target-resolved',
        target: 'dead-lettered',
      });
    });
  });

  describe('the attempt ending the operation by its answer', () => {
    it.each(['dead-letter', 'delete'] as const)('ignores whenExhausted %s', whenExhausted => {
      const context = {...hasAttemptsLeft, whenExhausted};

      expect(resolveTarget('in-progress', 'attempt-dead-lettered', context)).toEqual({
        outcome: 'target-resolved',
        target: 'dead-lettered',
      });
      expect(resolveTarget('in-progress', 'attempt-deleted', context)).toEqual({
        outcome: 'target-resolved',
        target: 'deleted',
      });
    });
  });
});

describe('decideCascade', () => {
  const endings = [
    {target: 'dead-lettered', laneTrigger: 'lane-dead-lettered'},
    {target: 'deleted', laneTrigger: 'lane-deleted'},
  ] as const;
  const otherTargets: OperationState[] = ['queued', 'on-hold', 'in-progress', 'succeeded'];
  const laneTriggers: Trigger[] = ['lane-dead-lettered', 'lane-deleted'];
  const nonLaneTriggers = allTriggers.filter(trigger => {
    return !laneTriggers.includes(trigger);
  });
  const follows: LaneSettings = {'dead-lettered': 'follows', deleted: 'follows'};
  const continues: LaneSettings = {'dead-lettered': 'continues', deleted: 'continues'};

  it.each(
    nonLaneTriggers.flatMap(trigger => {
      return endings.map(ending => {
        return {trigger, ...ending};
      });
    }),
  )(
    'follows $trigger ending in $target with $laneTrigger when that ending follows',
    ({trigger, target, laneTrigger}) => {
      expect(decideCascade('queued', trigger, target, follows)).toEqual({state: 'pending', trigger: laneTrigger});
    },
  );

  it.each(endings)('reads only the setting for $target', ({target, laneTrigger}) => {
    const onlyThis: LaneSettings = {...continues, [target]: 'follows'};
    const allButThis: LaneSettings = {...follows, [target]: 'continues'};

    expect(decideCascade('queued', 'operation-expired', target, onlyThis)).toEqual({
      state: 'pending',
      trigger: laneTrigger,
    });
    expect(decideCascade('queued', 'operation-expired', target, allButThis)).toEqual({state: 'none'});
  });

  it.each(
    laneTriggers.flatMap(trigger => {
      return endings.map(({target}) => {
        return {trigger, target};
      });
    }),
  )('continues on its own cascade $trigger ending in $target', ({trigger, target}) => {
    expect(decideCascade('queued', trigger, target, follows)).toEqual({state: 'none'});
  });

  it.each(
    allTriggers.flatMap(trigger => {
      return otherTargets.map(target => {
        return {trigger, target};
      });
    }),
  )('decides nothing on $trigger leading to $target, which does not end it that way', ({trigger, target}) => {
    expect(decideCascade('in-progress', trigger, target, follows)).toEqual({state: 'none'});
  });

  it.each(
    allTriggers.flatMap(trigger => {
      return endings.map(({target}) => {
        return {trigger, target};
      });
    }),
  )(
    'continues on $trigger ending in $target from a dead-lettered operation, which no longer blocks its lane',
    ({trigger, target}) => {
      expect(decideCascade('dead-lettered', trigger, target, follows)).toEqual({state: 'none'});
    },
  );

  it.each(endings)('continues on an ending in $target when that ending continues', ({target}) => {
    expect(decideCascade('queued', 'operation-expired', target, continues)).toEqual({state: 'none'});
  });

  it.each(['queued', 'on-hold', 'in-progress'] as const)('follows from %s', from => {
    expect(decideCascade(from, 'operation-deleted', 'deleted', follows)).toEqual({
      state: 'pending',
      trigger: 'lane-deleted',
    });
  });

  it('resolves the kind to continue on both endings by default', () => {
    expect(kind.laneWhenEnded).toEqual(continues);
  });
});

describe('isCascadePending', () => {
  it.each([
    {cascade: {state: 'pending', trigger: 'lane-deleted'}, pending: true},
    {cascade: {state: 'none'}, pending: false},
  ] as const)('reads $cascade.state from the stored cascade', ({cascade, pending}) => {
    expect(isCascadePending(createStoredSnapshot({kind: 'kind', state: 'deleted', cascade}))).toBe(pending);
  });
});

describe('newOperationData', () => {
  const place = {id: 'new', queuedSeq: 9, serverTime: 1_000};

  it('starts queued now, with no attempts, expiring after the kind says', () => {
    const data = newOperationData(
      kind,
      {payload: {text: 'p'}, correlationKey: 'key', laneKey: 'lane'},
      {text: 'p'},
      place,
    );

    expect(data).toEqual({
      state: 'queued',
      id: 'new',
      kind: 'kind',
      payload: {text: 'p'},
      correlation: {state: 'correlated', correlationKey: 'key'},
      lane: {state: 'in-lane', laneKey: 'lane'},
      queuedAt: 1_000,
      attempts: 0,
      queuedSeq: 9,
      expiry: {state: 'expires-at', serverTime: 11_000},
      limits: {attemptTimeout: {state: 'never-times-out'}},
      cascade: {state: 'none'},
    });
  });

  it('is uncorrelated and in no lane when the request has no keys', () => {
    const data = newOperationData(kind, {payload: {text: 'p'}}, {text: 'p'}, place);

    expect(data).toMatchObject({correlation: {state: 'uncorrelated'}, lane: {state: 'no-lane'}});
  });

  it('takes the limits of the request over the kind, for this operation only', () => {
    const data = newOperationData(
      resolveKind({...kindDefinition, attemptTimeoutMilliseconds: 30}),
      {payload: {text: 'p'}, expiresAfterMilliseconds: 500, attemptTimeoutMilliseconds: 70},
      {text: 'p'},
      place,
    );

    expect(data).toMatchObject({
      expiry: {state: 'expires-at', serverTime: 1_500},
      limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 70}},
    });
  });

  it('takes the attempt timeout of the kind when the request passes none', () => {
    const data = newOperationData(
      resolveKind({...kindDefinition, attemptTimeoutMilliseconds: 30}),
      {payload: {text: 'p'}},
      {text: 'p'},
      place,
    );

    expect(data.limits).toEqual({attemptTimeout: {state: 'times-out-after', milliseconds: 30}});
  });

  it('never expires without a limit from the kind or the request', () => {
    const data = newOperationData(resolveKind(kindDefinition), {payload: {text: 'p'}}, {text: 'p'}, place);

    expect(data.expiry).toEqual({state: 'never-expires'});
  });

  it('expires after the limit of the request when the kind has none', () => {
    const data = newOperationData(
      resolveKind(kindDefinition),
      {payload: {text: 'p'}, expiresAfterMilliseconds: 500},
      {text: 'p'},
      place,
    );

    expect(data.expiry).toEqual({state: 'expires-at', serverTime: 1_500});
  });
});

describe('versionOperationData', () => {
  const found = createStoredSnapshot({
    kind: 'kind',
    id: 'found',
    correlation: {state: 'correlated', correlationKey: 'key'},
    lane: {state: 'in-lane', laneKey: 'lane'},
    queuedSeq: 3,
    queuedAt: 500,
    attempts: 4,
    expiry: {state: 'expires-at', serverTime: 5_000},
    limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 70}},
  });
  const place = {queuedSeq: 20, serverTime: 2_000};
  const version = (request: Partial<EnqueueRequest<TestPayload>>, from: OperationSnapshot = found): OperationData => {
    return versionOperationData(from, kind, {payload: {text: 'new'}, ...request}, {text: 'new'}, place);
  };

  it('replaces the payload, starts the attempts again, and keeps what the request does not pass', () => {
    expect(version({})).toEqual({...found, payload: {text: 'new'}, attempts: 0});
  });

  it('moves to the end of another lane when the request passes another lane key', () => {
    expect(version({laneKey: 'elsewhere'})).toMatchObject({
      lane: {state: 'in-lane', laneKey: 'elsewhere'},
      queuedSeq: 20,
    });
  });

  it('keeps its place when the lane key is the same', () => {
    expect(version({laneKey: 'lane'})).toMatchObject({lane: {state: 'in-lane', laneKey: 'lane'}, queuedSeq: 3});
  });

  it('keeps its lane and place when the request passes no lane key', () => {
    expect(version({})).toMatchObject({lane: {state: 'in-lane', laneKey: 'lane'}, queuedSeq: 3});
  });

  it('moves to the end of a lane it joins from no lane', () => {
    const unlaned = {...found, lane: {state: 'no-lane' as const}};

    expect(version({laneKey: 'lane'}, unlaned)).toMatchObject({
      lane: {state: 'in-lane', laneKey: 'lane'},
      queuedSeq: 20,
    });
  });

  it('keeps its place when it stays out of lanes', () => {
    const unlaned = {...found, lane: {state: 'no-lane' as const}};

    expect(version({}, unlaned)).toMatchObject({lane: {state: 'no-lane'}, queuedSeq: 3});
  });

  it('starts the expiry again from now when the request passes one, even the same value', () => {
    expect(version({expiresAfterMilliseconds: 4_500})).toMatchObject({
      expiry: {state: 'expires-at', serverTime: 6_500},
    });
  });

  it('keeps the earlier expiry when the request passes none', () => {
    expect(version({}).expiry).toEqual({state: 'expires-at', serverTime: 5_000});
  });

  it('takes the attempt timeout the request passes', () => {
    expect(version({attemptTimeoutMilliseconds: 90}).limits).toEqual({
      attemptTimeout: {state: 'times-out-after', milliseconds: 90},
    });
  });

  it('keeps the attempt timeout the operation has when the request passes none', () => {
    expect(version({}).limits).toEqual({attemptTimeout: {state: 'times-out-after', milliseconds: 70}});
  });

  it('gives a dead-lettered operation the expiry of the kind, never the earlier one', () => {
    const deadLettered = {...found, state: 'dead-lettered' as const};

    expect(version({}, deadLettered).expiry).toEqual({state: 'expires-at', serverTime: 12_000});
  });

  it('gives a dead-lettered operation the expiry of the request over the kind', () => {
    const deadLettered = {...found, state: 'dead-lettered' as const};

    expect(version({expiresAfterMilliseconds: 300}, deadLettered).expiry).toEqual({
      state: 'expires-at',
      serverTime: 2_300,
    });
  });

  it('gives a dead-lettered operation no expiry when neither the request nor the kind has a limit', () => {
    const deadLettered = {...found, state: 'dead-lettered' as const};

    const data = versionOperationData(
      deadLettered,
      resolveKind(kindDefinition),
      {payload: {text: 'new'}},
      {text: 'new'},
      place,
    );

    expect(data.expiry).toEqual({state: 'never-expires'});
  });

  it('keeps the state, id, kind, correlation and queued time', () => {
    expect(version({laneKey: 'elsewhere'})).toMatchObject({
      state: 'queued',
      id: 'found',
      kind: 'kind',
      correlation: {state: 'correlated', correlationKey: 'key'},
      queuedAt: 500,
    });
  });
});

describe('nextQueuedSeqOf', () => {
  it('is one after the highest place', () => {
    const operations = [
      createStoredSnapshot({kind: 'kind', queuedSeq: 4}),
      createStoredSnapshot({kind: 'kind', queuedSeq: 9}),
      createStoredSnapshot({kind: 'kind', queuedSeq: 2}),
    ];

    expect(nextQueuedSeqOf(operations)).toBe(10);
  });

  it('is 1 without operations', () => {
    expect(nextQueuedSeqOf([])).toBe(1);
  });
});

describe('lanesOf and findOperationFollowers', () => {
  function operation(id: string, queuedSeq: number, overrides: Partial<OperationSnapshot> = {}): OperationSnapshot {
    return createStoredSnapshot({
      kind: 'kind',
      id,
      queuedSeq,
      lane: {state: 'in-lane', laneKey: 'lane'},
      ...overrides,
    });
  }
  const noLane = {lane: {state: 'no-lane'}} as const;
  const otherLane = {lane: {state: 'in-lane', laneKey: 'other'}} as const;

  describe('lanesOf', () => {
    it('lists the operations of a lane by their place in it', () => {
      const lanes = lanesOf([operation('c', 3), operation('a', 1), operation('b', 2)]);

      expect(ids(lanes.get('lane')?.operations ?? [])).toEqual(['a', 'b', 'c']);
    });

    it('keeps the lanes apart, and leaves out operations without a lane and dead-lettered ones', () => {
      const lanes = lanesOf([
        operation('a', 1),
        operation('b', 2, otherLane),
        operation('c', 3, noLane),
        operation('d', 0, {state: 'dead-lettered'}),
      ]);

      expect([...lanes.keys()].toSorted()).toEqual(['lane', 'other']);
      expect(ids(lanes.get('lane')?.operations ?? [])).toEqual(['a']);
    });

    it('has no lane when its only operation is dead-lettered', () => {
      expect(lanesOf([operation('a', 1, {state: 'dead-lettered'})]).size).toBe(0);
    });

    it('has no lanes without operations', () => {
      expect(lanesOf([]).size).toBe(0);
    });

    it('is moving while its first operation is queued or running', () => {
      expect(lanesOf([operation('a', 1)]).get('lane')?.state).toBe('moving');
      expect(lanesOf([operation('a', 1, {state: 'in-progress'})]).get('lane')?.state).toBe('moving');
    });

    it('is blocked while its first operation is on hold', () => {
      const lanes = lanesOf([operation('a', 1, {state: 'on-hold'}), operation('b', 2)]);

      expect(lanes.get('lane')?.state).toBe('blocked');
    });

    it('is moving when only an operation behind its first is on hold', () => {
      const lanes = lanesOf([operation('a', 1), operation('b', 2, {state: 'on-hold'})]);

      expect(lanes.get('lane')?.state).toBe('moving');
    });

    it('keeps a dead-lettered operation in its lane, first, while it still ends the operations behind it', () => {
      const lanes = lanesOf([
        operation('a', 1, {state: 'dead-lettered', cascade: {state: 'pending', trigger: 'lane-dead-lettered'}}),
        operation('b', 2),
      ]);

      expect(ids(lanes.get('lane')?.operations ?? [])).toEqual(['a', 'b']);
    });

    it('is moving when the operation ahead of the first queued one is dead-lettered', () => {
      const lanes = lanesOf([operation('a', 1, {state: 'dead-lettered'}), operation('b', 2)]);

      expect(lanes.get('lane')?.state).toBe('moving');
    });

    it('names the lane by its key', () => {
      expect(lanesOf([operation('a', 1)]).get('lane')).toMatchObject({laneKey: 'lane'});
    });

    it('does not change what it is given', () => {
      const operations = [operation('b', 2), operation('a', 1)];

      lanesOf(operations);

      expect(ids(operations)).toEqual(['b', 'a']);
    });

    it('takes any iterable', () => {
      const lanes = lanesOf(new Set([operation('b', 2), operation('a', 1)]));

      expect(ids(lanes.get('lane')?.operations ?? [])).toEqual(['a', 'b']);
    });
  });

  describe('findOperationFollowers', () => {
    it('reaches the operations of the same kind behind it in its lane, queued or on hold, in lane order', () => {
      const givenUp = operation('a', 2, {state: 'dead-lettered'});

      const followers = findOperationFollowers([
        operation('d', 5),
        operation('c', 4, {state: 'on-hold'}),
        givenUp,
        operation('b', 3),
        operation('before', 1),
      ])(givenUp);

      expect(ids(followers)).toEqual(['b', 'c', 'd']);
    });

    it('leaves out other kinds, other lanes, operations without a lane, and those that are not waiting', () => {
      const givenUp = operation('a', 1);

      const followers = findOperationFollowers([
        operation('kind', 2, {kind: 'other'}),
        operation('lane', 3, otherLane),
        operation('none', 4, noLane),
        operation('running', 5, {state: 'in-progress'}),
        operation('dead', 6, {state: 'dead-lettered'}),
        operation('deleted', 7, {state: 'deleted'}),
        operation('succeeded', 8, {state: 'succeeded'}),
        operation('reached', 9),
      ])(givenUp);

      expect(ids(followers)).toEqual(['reached']);
    });

    it('reaches nothing behind an operation without a lane', () => {
      const givenUp = operation('a', 1, noLane);

      expect(findOperationFollowers([operation('b', 2, noLane)])(givenUp)).toEqual([]);
    });

    it('does not reach the operation itself', () => {
      const givenUp = operation('a', 1);

      expect(findOperationFollowers([givenUp])(givenUp)).toEqual([]);
    });
  });
});

describe('planPass', () => {
  function operation(id: string, overrides: Partial<OperationSnapshot> = {}): OperationSnapshot {
    return createStoredSnapshot({kind: 'kind', id, queuedSeq: Number(id.replace(/\D/g, '')) || 1, ...overrides});
  }
  const inLane = (laneKey: string): Pick<OperationSnapshot, 'lane'> => {
    return {lane: {state: 'in-lane', laneKey}};
  };
  const expiresAt = (serverTime: number): Pick<OperationSnapshot, 'expiry'> => {
    return {expiry: {state: 'expires-at', serverTime}};
  };

  function plan(operations: OperationSnapshot[], overrides: Partial<PassSituation> = {}): PassPlan {
    return planPass({
      operations,
      serverTime: 1_000,
      run: {state: 'running'},
      backoffRemainingMilliseconds: 0,
      ...overrides,
    });
  }

  describe('what starts', () => {
    it('starts every queued operation without a lane, in queue order', () => {
      expect(plan([operation('b2'), operation('a1')]).start).toEqual(['a1', 'b2']);
    });

    it('starts only the first operation of a lane', () => {
      const operations = [
        operation('a1', inLane('lane')),
        operation('a2', inLane('lane')),
        operation('b3', inLane('other')),
      ];

      expect(plan(operations).start).toEqual(['a1', 'b3']);
    });

    it('starts the heads of lanes and the operations without a lane together, in queue order', () => {
      const operations = [
        operation('a1', inLane('lane')),
        operation('b2'),
        operation('c3', inLane('lane')),
        operation('d4', inLane('other')),
      ];

      expect(plan(operations).start).toEqual(['a1', 'b2', 'd4']);
    });

    it('starts nothing in a lane whose first operation is on hold', () => {
      const operations = [operation('a1', {...inLane('lane'), state: 'on-hold'}), operation('a2', inLane('lane'))];

      expect(plan(operations).start).toEqual([]);
    });

    it('starts nothing in a lane whose first operation is running', () => {
      const operations = [operation('a1', {...inLane('lane'), state: 'in-progress'}), operation('a2', inLane('lane'))];

      expect(plan(operations).start).toEqual([]);
    });

    it('skips a dead-lettered operation: the next one in its lane starts', () => {
      const operations = [
        operation('a1', {...inLane('lane'), state: 'dead-lettered'}),
        operation('a2', inLane('lane')),
      ];

      expect(plan(operations).start).toEqual(['a2']);
    });

    it('starts nothing in a lane whose first operation is still ending the operations behind it', () => {
      const pending = {state: 'pending', trigger: 'lane-dead-lettered'} as const;
      const operations = [
        operation('a1', {...inLane('lane'), state: 'dead-lettered', cascade: pending}),
        operation('a2', inLane('lane')),
        operation('b3', {...inLane('other'), state: 'deleted', cascade: {...pending, trigger: 'lane-deleted'}}),
        operation('b4', inLane('other')),
      ];

      expect(plan(operations).start).toEqual([]);
    });

    it('does not start operations that are on hold, running, dead-lettered, succeeded or deleted, outside lanes', () => {
      const operations = [
        operation('a1', {state: 'on-hold'}),
        operation('b2', {state: 'in-progress'}),
        operation('c3', {state: 'dead-lettered'}),
        operation('d4', {state: 'succeeded'}),
        operation('e5', {state: 'deleted'}),
      ];

      expect(plan(operations).start).toEqual([]);
    });

    it('starts nothing while paused', () => {
      expect(plan([operation('a1')], {run: {state: 'paused'}}).start).toEqual([]);
    });

    it('starts nothing during the backoff', () => {
      expect(plan([operation('a1')], {backoffRemainingMilliseconds: 1}).start).toEqual([]);
    });

    it('starts nothing without operations', () => {
      expect(plan([]).start).toEqual([]);
    });
  });

  describe('what expires', () => {
    it('expires a queued or on-hold operation whose time has come, even while paused and in backoff', () => {
      const operations = [
        operation('a1', expiresAt(1_000)),
        operation('b2', {...expiresAt(999), state: 'on-hold'}),
        operation('c3', expiresAt(1_001)),
        operation('d4'),
      ];

      const planned = plan(operations, {run: {state: 'paused'}, backoffRemainingMilliseconds: 500});

      expect(planned.expire).toEqual(['a1', 'b2']);
    });

    it('does not expire a running or dead-lettered operation', () => {
      const operations = [
        operation('a1', {...expiresAt(0), state: 'in-progress'}),
        operation('b2', {...expiresAt(0), state: 'dead-lettered'}),
      ];

      expect(plan(operations).expire).toEqual([]);
    });

    it('starts an operation that is due to expire, leaving its expiry to the pass', () => {
      const planned = plan([operation('a1', expiresAt(1_000))]);

      expect(planned).toEqual({expire: ['a1'], start: ['a1'], wake: {state: 'no-wake'}});
    });
  });

  describe('when to look again', () => {
    it('has nothing to wait for without expiry or backoff', () => {
      expect(plan([operation('a1')]).wake).toEqual({state: 'no-wake'});
    });

    it('has nothing to wait for without operations', () => {
      expect(plan([]).wake).toEqual({state: 'no-wake'});
    });

    it('wakes for the nearest expiry', () => {
      const operations = [operation('a1', expiresAt(1_700)), operation('b2', expiresAt(1_300))];

      expect(plan(operations).wake).toEqual({state: 'wake-in', milliseconds: 300});
    });

    it('wakes for an expiry while paused', () => {
      expect(plan([operation('a1', expiresAt(1_300))], {run: {state: 'paused'}}).wake).toEqual({
        state: 'wake-in',
        milliseconds: 300,
      });
    });

    it('does not wake for an expiry that is due now, nor for one of a running operation', () => {
      const operations = [
        operation('a1', expiresAt(1_000)),
        operation('b2', {...expiresAt(1_500), state: 'in-progress'}),
      ];

      expect(plan(operations).wake).toEqual({state: 'no-wake'});
    });

    it('wakes at the end of the backoff when something queued waits for it', () => {
      expect(plan([operation('a1')], {backoffRemainingMilliseconds: 250}).wake).toEqual({
        state: 'wake-in',
        milliseconds: 250,
      });
    });

    it('wakes at the nearest of the backoff and an expiry', () => {
      const operations = [operation('a1', expiresAt(1_100))];

      expect(plan(operations, {backoffRemainingMilliseconds: 250}).wake).toEqual({state: 'wake-in', milliseconds: 100});
      expect(plan(operations, {backoffRemainingMilliseconds: 50}).wake).toEqual({state: 'wake-in', milliseconds: 50});
    });

    it('does not wake for the backoff while paused', () => {
      const planned = plan([operation('a1')], {run: {state: 'paused'}, backoffRemainingMilliseconds: 250});

      expect(planned.wake).toEqual({state: 'no-wake'});
    });

    it('does not wake for the backoff without a queued operation', () => {
      const planned = plan([operation('a1', {state: 'on-hold'})], {backoffRemainingMilliseconds: 250});

      expect(planned.wake).toEqual({state: 'no-wake'});
    });
  });
});

describe('backoffDelay', () => {
  const limits = {minimumMilliseconds: 100, maximumMilliseconds: 350};
  const full = (): number => {
    return 0.999999;
  };

  it('has a cap that starts at the minimum', () => {
    expect(
      backoffDelay(0, limits, () => {
        return 1;
      }),
    ).toBe(100);
  });

  it('doubles the cap with each failure', () => {
    const waits = [0, 1].map(failures => {
      return backoffDelay(failures, {minimumMilliseconds: 100, maximumMilliseconds: 10_000}, () => {
        return 1;
      });
    });

    expect(waits).toEqual([100, 200]);
  });

  it('stops doubling at the maximum', () => {
    const waits = [0, 1, 2, 3, 10].map(failures => {
      return backoffDelay(failures, limits, () => {
        return 1;
      });
    });

    expect(waits).toEqual([100, 200, 350, 350, 350]);
  });

  it('is a random time between 0 and the cap', () => {
    const waits = [0, 0.5, 0.25].map(random => {
      return backoffDelay(2, limits, () => {
        return random;
      });
    });

    expect(waits).toEqual([0, 175, 87]);
  });

  it('is less than the cap for the largest random number', () => {
    expect(backoffDelay(0, limits, full)).toBe(99);
  });

  it('is a whole number of milliseconds', () => {
    expect(
      Number.isInteger(
        backoffDelay(1, limits, () => {
          return 0.333;
        }),
      ),
    ).toBe(true);
  });

  it('asks for one random number each time', () => {
    const random = jest.fn(() => {
      return 0.5;
    });

    backoffDelay(0, limits, random);

    expect(random).toHaveBeenCalledTimes(1);
  });
});
