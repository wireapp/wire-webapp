/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {SUBCONVERSATION_ID} from '../../../../apiClient/conversation/subconversation';
import {QualifiedId} from '../../../../apiClient/user/qualifiedId';
import {noop} from 'noop-esm';

import {getLogger} from '../../../../logger/getLogger';

import {createDefaultMlsErrorMapper, DomainMlsError, MlsErrorMapper} from './mlsErrorMapper';
import {CoreCryptoError, MlsError, MlsError_Tags} from '@wireapp/core-crypto';
import {serializeAbortReason, UPLOAD_COMMIT_BUNDLE_ABORT_REASONS} from '../mlsService/coreCryptoMlsError';
import {
  MlsRecoveryOrchestratorImpl,
  minimalDefaultPolicies,
  PolicyTable,
  OperationName,
  RecoveryActionKind,
  OrchestratorDeps,
} from './mlsRecoveryOrchestrator';

function qid(id = 'conv-1'): QualifiedId {
  return {id, domain: 'wire.test'};
}

function makeMapperReturning(err: DomainMlsError): MlsErrorMapper {
  return {map: jest.fn().mockReturnValue(err)};
}

describe('MlsRecoveryOrchestrator', () => {
  const baseDeps = (): Record<keyof OrchestratorDeps, jest.Mock> => {
    return {
      joinViaExternalCommit: jest.fn().mockResolvedValue(undefined),
      resetAndReestablish: jest.fn().mockResolvedValue(undefined),
      recoverFromEpochMismatch: jest.fn().mockResolvedValue(undefined),
      addMissingUsers: jest.fn().mockResolvedValue(undefined),
      wipeMLSConversation: jest.fn().mockResolvedValue(undefined),
    };
  };

  describe('policy-driven retries before recovery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      {maxRetries: 2, delayMs: 10, backoffFactor: 3},
      {maxRetries: 3, delayMs: 20, backoffFactor: 1},
      {maxRetries: 0, delayMs: 10, backoffFactor: 2},
    ])('uses the configured retry count and delays: %o', async backoff => {
      const deps = baseDeps();
      // Any mapped error can opt in; this test deliberately uses a different error type.
      const mapper = makeMapperReturning({type: MlsError_Tags.Other});
      const policies: PolicyTable = {
        Other: {
          action: RecoveryActionKind.JoinViaExternalCommit,
          retryConfig: {beforeRecovery: backoff, reRunOriginalOperation: true},
        },
      };
      const orchestrator = new MlsRecoveryOrchestratorImpl(mapper, policies, deps);
      const callback = jest.fn().mockRejectedValue(new Error('operation failed'));
      deps.joinViaExternalCommit.mockImplementation(async () => {
        expect(callback).toHaveBeenCalledTimes(backoff.maxRetries + 1);
        callback.mockResolvedValue('recovered');
      });
      const result = orchestrator.execute({
        context: {operationName: OperationName.send, qualifiedConversationId: qid()},
        callBack: callback,
      });

      for (let attempt = 0; attempt < backoff.maxRetries; attempt++) {
        await jest.advanceTimersByTimeAsync(backoff.delayMs * backoff.backoffFactor ** attempt - 1);
        expect(callback).toHaveBeenCalledTimes(attempt + 1);
        expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(1);
      }

      await expect(result).resolves.toBe('recovered');
      expect(callback).toHaveBeenCalledTimes(backoff.maxRetries + 2);
      expect(deps.joinViaExternalCommit).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('missing commit references', () => {
    const error = CoreCryptoError.Mls.new({
      mlsError: MlsError.MessageRejected.new({
        reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_COMMIT_MISSING_REFERENCES}),
      }),
    });
    const context = {operationName: OperationName.send, qualifiedConversationId: qid(), groupId: 'group'};

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('retries with 1s, 2s and 4s backoff, then rejoins before replaying the send', async () => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValue(error);
      deps.joinViaExternalCommit.mockImplementation(async () => {
        expect(callback).toHaveBeenCalledTimes(4);
        callback.mockResolvedValue('sent');
      });
      const result = orchestrator.execute({context, callBack: callback});

      for (const [index, delay] of [1_000, 2_000, 4_000].entries()) {
        await jest.advanceTimersByTimeAsync(delay - 1);
        expect(callback).toHaveBeenCalledTimes(index + 1);
        expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(1);
      }

      await expect(result).resolves.toBe('sent');
      expect(deps.joinViaExternalCommit).toHaveBeenCalledTimes(1);
      expect(deps.joinViaExternalCommit).toHaveBeenCalledWith(qid());
      expect(callback).toHaveBeenCalledTimes(5);
    });

    it.each([1, 2, 3])('does not rejoin when retry %s succeeds', async retryCount => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockResolvedValue('sent');
      for (let attempt = 0; attempt < retryCount; attempt++) {
        callback.mockRejectedValueOnce(error);
      }
      const result = orchestrator.execute({context, callBack: callback});
      await jest.runAllTimersAsync();

      await expect(result).resolves.toBe('sent');
      expect(callback).toHaveBeenCalledTimes(retryCount + 1);
      expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
    });

    it('retries an out-of-band failure by invoking the real operation', async () => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockResolvedValue(undefined);
      const result = orchestrator.execute({
        context: {...context, operationName: OperationName.keyMaterialUpdate},
        seedError: error,
        callBack: callback,
      });
      expect(callback).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1_000);
      await expect(result).resolves.toBeUndefined();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
    });

    it('honors disabled retries', async () => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValue(error);
      await expect(orchestrator.execute({context, callBack: callback, retry: false})).rejects.toBe(error);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
      expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
    });

    it('stops if the operation still fails after rejoining', async () => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValue(error);
      const result = expect(orchestrator.execute({context, callBack: callback})).rejects.toBe(error);
      await jest.runAllTimersAsync();
      await result;

      expect(callback).toHaveBeenCalledTimes(5);
      expect(deps.joinViaExternalCommit).toHaveBeenCalledTimes(1);
    });

    it('propagates rejoin failure without replaying the operation', async () => {
      const deps = baseDeps();
      const rejoinError = new Error('rejoin failed');
      deps.joinViaExternalCommit.mockRejectedValue(rejoinError);
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValue(error);
      const result = expect(orchestrator.execute({context, callBack: callback})).rejects.toBe(rejoinError);
      await jest.runAllTimersAsync();
      await result;

      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('does not restart missing-reference retries when the error changes', async () => {
      const deps = baseDeps();
      const otherError = new Error('unrecoverable');
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValueOnce(error).mockRejectedValue(otherError);
      const result = expect(orchestrator.execute({context, callBack: callback})).rejects.toBe(otherError);
      await jest.runAllTimersAsync();
      await result;

      expect(callback).toHaveBeenCalledTimes(2);
      expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
    });

    it('fulfills a failed external join through recovery without replaying it again', async () => {
      const deps = baseDeps();
      const orchestrator = new MlsRecoveryOrchestratorImpl(createDefaultMlsErrorMapper(), minimalDefaultPolicies, deps);
      const callback = jest.fn().mockRejectedValue(error);
      const result = orchestrator.execute({context: {...context, operationName: OperationName.joinExternalCommit}, callBack: callback});
      await jest.runAllTimersAsync();
      await expect(result).resolves.toBeUndefined();

      expect(callback).toHaveBeenCalledTimes(4);
      expect(deps.joinViaExternalCommit).toHaveBeenCalledTimes(1);
    });
  });

  it('does nothing when callback succeeds', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'Unknown'} as any);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockResolvedValue('ok');
    const res = await orch.execute({
      context: {operationName: OperationName.send, qualifiedConversationId: qid()},
      callBack: cb,
    });

    expect(res).toBe('ok');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(deps.joinViaExternalCommit).not.toHaveBeenCalled();
    expect(deps.wipeMLSConversation).not.toHaveBeenCalled();
  });

  it.each([
    {recoveryError: null, expectedDetails: '(not an object)'},
    {recoveryError: undefined, expectedDetails: '(not an object)'},
    {recoveryError: 'recovery failed', expectedDetails: '(not an object)'},
    {recoveryError: noop, expectedDetails: '(not an object)'},
    {recoveryError: new Error('recovery failed'), expectedDetails: '(no meaningful data)'},
    {recoveryError: {}, expectedDetails: '(no meaningful data)'},
    {recoveryError: {status: undefined}, expectedDetails: '(no meaningful data)'},
    {recoveryError: {status: 0}, expectedDetails: {status: 0}},
    {recoveryError: {response: null}, expectedDetails: '(no meaningful data)'},
    {recoveryError: {response: 'response'}, expectedDetails: '(no meaningful data)'},
    {recoveryError: {response: noop}, expectedDetails: '(no meaningful data)'},
    {
      recoveryError: {status: 503, response: {data: {message: 'unavailable'}, headers: {secret: 'private'}}},
      expectedDetails: {status: 503, response: {data: {message: 'unavailable'}}},
    },
  ])('logs only selected recovery error details and rethrows $recoveryError', async testCase => {
    const {recoveryError, expectedDetails} = testCase;
    const dependencies = baseDeps();
    dependencies.joinViaExternalCommit.mockRejectedValue(recoveryError);
    const mapper = makeMapperReturning({type: 'OrphanWelcome'} as DomainMlsError);
    const logger = getLogger('recovery-error-test');
    logger.warn = jest.fn();
    const orchestrator = new MlsRecoveryOrchestratorImpl(
      mapper,
      minimalDefaultPolicies,
      dependencies,
      new Set(),
      logger,
    );

    await expect(
      orchestrator.execute({
        context: {operationName: OperationName.handleWelcome, qualifiedConversationId: qid()},
        callBack: jest.fn().mockRejectedValue(new Error('operation failed')),
      }),
    ).rejects.toBe(recoveryError);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Recovery failed for key'), {
      error: expectedDetails,
    });
  });

  it('retries original when policy requests reRunOriginalOperation (WrongEpoch/send)', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'WrongEpoch'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const res = await orch.execute({
      context: {
        operationName: OperationName.send,
        qualifiedConversationId: qid(),
        subconvId: SUBCONVERSATION_ID.CONFERENCE,
      },
      callBack: cb,
    });

    expect(deps.recoverFromEpochMismatch).toHaveBeenCalledWith(qid(), SUBCONVERSATION_ID.CONFERENCE, {
      operationName: OperationName.send,
      errorType: 'WrongEpoch',
      groupId: undefined,
    });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(res).toBe('ok');
  });

  it('handles JoinViaExternalCommit without re-running original (OrphanWelcome/handleWelcome)', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'OrphanWelcome'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValue(new Error('orphan'));
    const res = await orch.execute({
      context: {operationName: OperationName.handleWelcome, qualifiedConversationId: qid()},
      callBack: cb,
    });

    expect(deps.joinViaExternalCommit).toHaveBeenCalledWith(qid());
    expect(cb).toHaveBeenCalledTimes(1);
    expect(res).toBeUndefined();
  });

  it('uses JoinViaExternalCommit without re-run for establishGroup when conversation already exists', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'ConversationAlreadyExists'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValue(new Error('exists'));
    const res = await orch.execute({
      context: {operationName: OperationName.establishGroup, qualifiedConversationId: qid()},
      callBack: cb,
    });

    expect(deps.joinViaExternalCommit).toHaveBeenCalledWith(qid());
    expect(cb).toHaveBeenCalledTimes(1);
    expect(res).toBeUndefined();
  });

  it('wipes group using context groupId when ConversationAlreadyExists and retries once', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'ConversationAlreadyExists'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValueOnce('exists').mockResolvedValueOnce(undefined);

    await orch.execute({
      context: {
        operationName: OperationName.handleWelcome,
        qualifiedConversationId: qid(),
        groupId: 'gid-from-context',
      },
      callBack: cb,
    });

    expect(deps.wipeMLSConversation).toHaveBeenCalledTimes(1);
    expect(deps.wipeMLSConversation).toHaveBeenCalledWith('gid-from-context');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('wipes group using mapped error groupId when missing in context', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({
      type: 'ConversationAlreadyExists',
      context: {groupId: 'gid-from-error'},
    } as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValueOnce('exists').mockResolvedValueOnce(undefined);

    await orch.execute({
      context: {operationName: OperationName.handleWelcome, qualifiedConversationId: qid()},
      callBack: cb,
    });

    expect(deps.wipeMLSConversation).toHaveBeenCalledWith('gid-from-error');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('throws if AddMissingUsers missing required inputs', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'GroupOutOfSync', context: {missingUsers: []}} as DomainMlsError);
    const policies: PolicyTable = {
      GroupOutOfSync: {
        action: RecoveryActionKind.AddMissingUsers,
        retryConfig: {reRunOriginalOperation: true},
      },
    };
    const orch = new MlsRecoveryOrchestratorImpl(mapper, policies, deps);

    const cb = jest.fn().mockRejectedValueOnce('oops');

    await expect(
      orch.execute({
        context: {operationName: OperationName.send, qualifiedConversationId: qid(), groupId: 'gid'},
        callBack: cb,
      }),
    ).rejects.toThrow('No missing users reported in error context for AddMissingUsers');
  });

  it('calls AddMissingUsers with provided missing users and retries', async () => {
    const deps = baseDeps();
    const missing = [qid('u1'), qid('u2')];
    const mapper = makeMapperReturning({type: 'GroupOutOfSync', context: {missingUsers: missing}} as DomainMlsError);
    const policies: PolicyTable = {
      GroupOutOfSync: {
        action: RecoveryActionKind.AddMissingUsers,
        retryConfig: {reRunOriginalOperation: true},
      },
    };
    const orch = new MlsRecoveryOrchestratorImpl(mapper, policies, deps);

    const cb = jest.fn().mockRejectedValueOnce('oops').mockResolvedValueOnce('ok');
    const res = await orch.execute({
      context: {operationName: OperationName.send, qualifiedConversationId: qid(), groupId: 'gid'},
      callBack: cb,
    });

    expect(deps.addMissingUsers).toHaveBeenCalledWith(qid(), 'gid', missing);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(res).toBe('ok');
  });

  it('calls AddMissingUsers and retries for establishGroup GroupOutOfSync', async () => {
    const deps = baseDeps();
    const missing = [qid('u1'), qid('u2')];
    const mapper = makeMapperReturning({type: 'GroupOutOfSync', context: {missingUsers: missing}} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValueOnce(new Error('out-of-sync')).mockResolvedValueOnce('ok');
    const res = await orch.execute({
      context: {operationName: OperationName.establishGroup, qualifiedConversationId: qid(), groupId: 'gid'},
      callBack: cb,
    });

    expect(deps.addMissingUsers).toHaveBeenCalledWith(qid(), 'gid', missing);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(res).toBe('ok');
  });

  it('rethrows when action is Unknown', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'ConversationAlreadyExists'} as DomainMlsError);
    const policies: PolicyTable = {
      ConversationAlreadyExists: {action: RecoveryActionKind.Unknown, retryConfig: {}},
    };
    const orch = new MlsRecoveryOrchestratorImpl(mapper, policies, deps);

    const cb = jest.fn().mockRejectedValue(new Error('problem'));
    await expect(
      orch.execute({
        context: {operationName: OperationName.handleWelcome, qualifiedConversationId: qid()},
        callBack: cb,
      }),
    ).rejects.toThrow('problem');
  });

  it('deduplicates concurrent recoveries for the same key', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'OrphanWelcome'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    // Simulate slow recovery function to keep the window open
    let resolveJoin: () => void = noop;
    const joinPromise = new Promise<void>(resolve => {
      resolveJoin = resolve;
    });
    deps.joinViaExternalCommit.mockImplementation(() => {
      return joinPromise;
    });

    const ctx = {
      operationName: OperationName.handleWelcome,
      qualifiedConversationId: qid('same') as QualifiedId,
    } as const;
    const callBack = (): Promise<never> => {
      return Promise.reject(new Error('orphan'));
    };

    const p1 = orch.execute({context: ctx, callBack});
    const p2 = orch.execute({context: ctx, callBack});

    // Let both catch handlers run and start recovery
    await new Promise(r => {
      return setImmediate(r);
    });
    // Release the recovery
    resolveJoin();

    await Promise.all([p1, p2]);

    expect(deps.joinViaExternalCommit).toHaveBeenCalledTimes(1);
  });

  it('waits delayMs before re-running original operation', async () => {
    jest.useFakeTimers({advanceTimers: true});
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'WrongEpoch'} as DomainMlsError);
    const policies: PolicyTable = {
      WrongEpoch: {
        send: {
          action: 'RecoverFromEpochMismatch',
          retryConfig: {reRunOriginalOperation: true, delayMs: 50},
        },
      },
    } as any;
    const orch = new MlsRecoveryOrchestratorImpl(mapper, policies, deps);

    const cb = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const runPromise = orch.execute({
      context: {
        operationName: OperationName.send,
        qualifiedConversationId: qid(),
        subconvId: SUBCONVERSATION_ID.CONFERENCE,
      },
      callBack: cb,
    });

    // Flush any microtasks from initial rejection handling
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(deps.recoverFromEpochMismatch).toHaveBeenCalledWith(qid(), SUBCONVERSATION_ID.CONFERENCE, {
      operationName: OperationName.send,
      errorType: 'WrongEpoch',
      groupId: undefined,
    });

    // The rerun should not happen until timers advance
    jest.advanceTimersByTime(49);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);

    // Advance past delay and await completion
    jest.advanceTimersByTime(1);
    // Drain queued timers and microtasks
    await Promise.resolve();
    const res = await runPromise;
    expect(cb).toHaveBeenCalledTimes(2);
    expect(res).toBe('ok');
    jest.useRealTimers();
  });

  it('ResetAndReestablish re-runs original for add/remove operations', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'GroupNotEstablished'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    // addUsers path
    const cbAdd = jest.fn().mockRejectedValueOnce(new Error('broken')).mockResolvedValueOnce('ok-add');
    const resAdd = await orch.execute({
      context: {operationName: OperationName.addUsers, qualifiedConversationId: qid()},
      callBack: cbAdd,
    });
    expect(deps.resetAndReestablish).toHaveBeenCalledWith(qid());
    expect(cbAdd).toHaveBeenCalledTimes(2);
    expect(resAdd).toBe('ok-add');

    // removeUsers path
    const cbRemove = jest.fn().mockRejectedValueOnce(new Error('broken')).mockResolvedValueOnce('ok-remove');
    const resRemove = await orch.execute({
      context: {operationName: OperationName.removeUsers, qualifiedConversationId: qid()},
      callBack: cbRemove,
    });
    expect(deps.resetAndReestablish).toHaveBeenCalledWith(qid());
    expect(cbRemove).toHaveBeenCalledTimes(2);
    expect(resRemove).toBe('ok-remove');
  });

  it('ResetAndReestablish re-runs original for establishGroup operation', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'GroupNotEstablished'} as DomainMlsError);
    const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

    const cb = jest.fn().mockRejectedValueOnce(new Error('broken')).mockResolvedValueOnce('ok-establish');
    const res = await orch.execute({
      context: {operationName: OperationName.establishGroup, qualifiedConversationId: qid()},
      callBack: cb,
    });

    expect(deps.resetAndReestablish).toHaveBeenCalledWith(qid());
    expect(cb).toHaveBeenCalledTimes(2);
    expect(res).toBe('ok-establish');
  });

  describe('seedError', () => {
    it('maps the seeded error without invoking the callback first', async () => {
      const deps = baseDeps();
      const mapper = makeMapperReturning({type: 'GroupNotEstablished'} as DomainMlsError);
      const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

      const seedError = new Error('reported out of band');
      const cb = jest.fn().mockResolvedValue('ok');

      await orch.execute({
        context: {operationName: OperationName.keyMaterialUpdate, qualifiedConversationId: qid()},
        callBack: cb,
        seedError,
      });

      expect(mapper.map).toHaveBeenCalledWith(seedError, expect.anything());
      expect(deps.resetAndReestablish).toHaveBeenCalledWith(qid());
      // GroupNotEstablished/keyMaterialUpdate does not re-run, so the callback is never reached
      expect(cb).not.toHaveBeenCalled();
    });

    it('re-runs the real operation after recovery when the policy requests it', async () => {
      const deps = baseDeps();
      const mapper = makeMapperReturning({type: 'WrongEpoch'} as DomainMlsError);
      const orch = new MlsRecoveryOrchestratorImpl(mapper, minimalDefaultPolicies, deps);

      const cb = jest.fn().mockResolvedValue('ok');

      await orch.execute({
        context: {operationName: OperationName.keyMaterialUpdate, qualifiedConversationId: qid()},
        callBack: cb,
        seedError: new Error('stale epoch'),
      });

      expect(deps.recoverFromEpochMismatch).toHaveBeenCalled();
      // The epoch is re-synced first, so publishing keying material again can now succeed
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
