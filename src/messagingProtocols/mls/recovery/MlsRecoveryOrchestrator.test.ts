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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {DomainMlsError, MlsErrorMapper} from './MlsErrorMapper';
import {
  MlsRecoveryOrchestratorImpl,
  minimalDefaultPolicies,
  PolicyTable,
  OperationName,
  RecoveryActionKind,
} from './MlsRecoveryOrchestrator';

function qid(id = 'conv-1'): QualifiedId {
  return {id, domain: 'wire.test'};
}

function makeMapperReturning(err: DomainMlsError): MlsErrorMapper {
  return {map: jest.fn().mockReturnValue(err)};
}

describe('MlsRecoveryOrchestrator', () => {
  const baseDeps = () => ({
    joinViaExternalCommit: jest.fn().mockResolvedValue(undefined),
    resetAndReestablish: jest.fn().mockResolvedValue(undefined),
    recoverFromEpochMismatch: jest.fn().mockResolvedValue(undefined),
    addMissingUsers: jest.fn().mockResolvedValue(undefined),
    wipeMLSConversation: jest.fn().mockResolvedValue(undefined),
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

    expect(deps.recoverFromEpochMismatch).toHaveBeenCalledWith(qid(), SUBCONVERSATION_ID.CONFERENCE);
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
        retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
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
        retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
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

  it('rethrows when action is Unknown', async () => {
    const deps = baseDeps();
    const mapper = makeMapperReturning({type: 'ConversationAlreadyExists'} as DomainMlsError);
    const policies: PolicyTable = {
      ConversationAlreadyExists: {action: RecoveryActionKind.Unknown, retryConfig: {maxAttempts: 0}},
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
    let resolveJoin: () => void = () => {};
    const joinPromise = new Promise<void>(resolve => {
      resolveJoin = resolve;
    });
    deps.joinViaExternalCommit.mockImplementation(() => joinPromise);

    const ctx = {
      operationName: OperationName.handleWelcome,
      qualifiedConversationId: qid('same') as QualifiedId,
    } as const;
    const callBack = () => Promise.reject(new Error('orphan'));

    const p1 = orch.execute({context: ctx, callBack});
    const p2 = orch.execute({context: ctx, callBack});

    // Let both catch handlers run and start recovery
    await new Promise(r => setImmediate(r));
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
          retryConfig: {maxAttempts: 1, reRunOriginalOperation: true, delayMs: 50},
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
    expect(deps.recoverFromEpochMismatch).toHaveBeenCalledWith(qid(), SUBCONVERSATION_ID.CONFERENCE);

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
});
