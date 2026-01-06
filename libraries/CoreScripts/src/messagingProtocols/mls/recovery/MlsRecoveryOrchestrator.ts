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

import {LogFactory} from '@wireapp/commons';

import {DomainMlsError, DomainMlsErrorType, MlsErrorMapper} from './MlsErrorMapper';

import {BaseCreateConversationResponse} from '../../../conversation';

/**
 * Coordinates recovery actions for MLS operations.
 *
 * The orchestrator takes an arbitrary async "operation" (e.g. send, add users, handle welcome),
 * executes it, and on failure maps the thrown error to a DomainMlsError via {@link MlsErrorMapper}.
 * A recovery policy is then resolved and executed exactly-once per unique key, with optional
 * re-run of the original operation after recovery.
 *
 * Key properties:
 * - Single-flight: duplicate recoveries (same action+conversation+group+subconv) are deduplicated.
 * - Per-operation policies: the same DomainMlsError can map to different actions depending on operation.
 * - Non-invasive: the orchestrator has no MLS logic; it calls provided deps to perform actions.
 */

/**
 * Concrete recovery actions the orchestrator can trigger.
 */
export enum RecoveryActionKind {
  /**
   * Issue an external-commit join for the conversation.
   */
  JoinViaExternalCommit = 'JoinViaExternalCommit',
  /**
   * Fetch missing epoch state and reconcile.
   */
  RecoverFromEpochMismatch = 'RecoverFromEpochMismatch',
  /**
   * Tear down local MLS state and re-create the group.
   */
  ResetAndReestablish = 'ResetAndReestablish',
  /**
   * Add users reported as missing to get the group back in sync.
   */
  AddMissingUsers = 'AddMissingUsers',
  /**
   * Remove local MLS artifacts for the group and retry welcome handling.
   */
  WipeAndReprocessWelcome = 'WipeAndReprocessWelcome',
  /**
   * No matching policy found; treated as no-op and the original error is re-thrown.
   */
  Unknown = 'Unknown',
}

/**
 * Retry behavior for an operation under recovery.
 */
export type RetryPolicy = {
  maxAttempts: number;
  delayMs?: number;
  /**
   * Whether to retry the original operation once after a successful recovery
   */
  reRunOriginalOperation?: boolean;
};

/**
 * A single recovery policy that pairs an action with a retry configuration.
 */
export type RecoveryPolicy = {
  action: RecoveryActionKind;
  retryConfig: RetryPolicy;
};

type PerOperationPolicies = Partial<Record<OperationName, RecoveryPolicy>>;
/**
 * Global policy table from DomainMlsErrorType to RecoveryPolicy.
 *
 * A value can be either a flat policy (applies to all operations) or a per-operation
 * map that allows different actions depending on the invoking operation.
 */
export type PolicyTable = Partial<Record<DomainMlsErrorType, RecoveryPolicy | PerOperationPolicies>>;

export enum OperationName {
  send = 'send',
  addUsers = 'addUsers',
  removeUsers = 'removeUsers',
  joinExternalCommit = 'joinExternalCommit',
  handleWelcome = 'handleWelcome',
  handleMessageAdd = 'handleMessageAdd',
  keyMaterialUpdate = 'keyMaterialUpdate',
}

/**
 * Context about the operation being orchestrated. Used for policy selection and keying.
 */
export type OperationContext = {
  operationName: OperationName;
  qualifiedConversationId?: QualifiedId;
  groupId?: string;
  subconvId?: SUBCONVERSATION_ID;
};

/**
 * Public orchestrator interface. Wrap your async operation with {@link execute}.
 *
 * The callback is invoked immediately. If it throws, the orchestrator maps the error,
 * performs recovery according to policies, optionally waits, and may re-run the callback once.
 */
export interface MlsRecoveryOrchestrator {
  // Void-returning ops (e.g., joinExternalCommit)
  execute(params: executeParams<void>): Promise<void>;
  // Value-returning ops (e.g., send/add/remove)
  execute<T>(params: executeParams<T>): Promise<T>;
}

/**
 * Concrete side-effecting functions the orchestrator uses to perform recovery.
 * Provided by the MLS layer/service.
 */
export type OrchestratorDeps = {
  joinViaExternalCommit: (conversationId: QualifiedId) => Promise<void>;
  resetAndReestablish: (conversationId: QualifiedId) => Promise<void>;
  recoverFromEpochMismatch: (conversationId: QualifiedId, subconvId?: SUBCONVERSATION_ID) => Promise<void>;
  addMissingUsers: (
    conversationId: QualifiedId,
    groupId: string,
    users: QualifiedId[],
  ) => Promise<BaseCreateConversationResponse>;
  // Wipes local MLS state so welcome processing can be retried cleanly
  wipeMLSConversation: (groupId: string) => Promise<void>;
};

/**
 * Parameters for {@link execute}.
 */
type executeParams<T> = {
  context: OperationContext;
  callBack: () => Promise<T>;
  retry?: boolean;
};

function isRecoveryPolicy(entry: RecoveryPolicy | PerOperationPolicies): entry is RecoveryPolicy {
  return 'action' in entry && typeof entry.action === 'string';
}

/**
 * Default implementation with in-process deduplication keyed by action and context.
 */
export class MlsRecoveryOrchestratorImpl implements MlsRecoveryOrchestrator {
  constructor(
    private readonly mapper: MlsErrorMapper,
    private readonly policies: PolicyTable,
    private readonly deps: OrchestratorDeps,
    private readonly inProgressRecoveries: Set<string> = new Set(),
    private readonly logger = LogFactory.getLogger('@wireapp/core/MlsRecoveryOrchestrator'),
  ) {}

  /**
   * Execute the provided callback, and on failure, map and perform a configured recovery.
   * If {@link RetryPolicy.reRunOriginalOperation} is true, the callback is re-invoked once after recovery.
   */
  public async execute(params: executeParams<void>): Promise<void>;
  public async execute<T>(params: executeParams<T>): Promise<T>;
  public async execute<T>({context, callBack, retry = true}: executeParams<T>): Promise<T | void> {
    try {
      this.logger.info('Executing MLS operation with recovery orchestration', {context});
      return await callBack();
    } catch (rawError) {
      this.logger.info('Operation failed, invoking MLS recovery orchestrator', {rawError});
      const normalizedError = this.mapper.map(rawError, {
        qualifiedConversationId: context.qualifiedConversationId,
        groupId: context.groupId,
        subconvId: context.subconvId,
      });
      this.logger.info(`Mapped error to domain MLS error of type ${normalizedError.type}`, {normalizedError});
      const policy = this.getPolicyFor(normalizedError, context);
      this.logger.info(`Resolved recovery policy: action=${policy.action}`, {policy});

      if (policy.action === 'Unknown' || !retry) {
        this.logger.info('No recovery action configured or retry disabled, re-throwing original error');
        throw rawError;
      }

      const key = this.getRecoveryKey(context, policy.action);
      await this.performRecovery(context, normalizedError, policy, key);
      await this.maybeDelay(policy.retryConfig);

      if (policy.retryConfig.reRunOriginalOperation) {
        this.logger.info(`Re-running original operation after recovery for key ${key}`);
        return this.execute({context, callBack, retry: false});
      }
    }
  }

  /** Resolve the effective policy for the mapped error and operation. Supports per-operation policies. */
  private getPolicyFor = (err: DomainMlsError, ctx: OperationContext): RecoveryPolicy => {
    const entry = this.policies[err.type];
    if (!entry) {
      return {action: RecoveryActionKind.Unknown, retryConfig: {maxAttempts: 0}};
    }

    if (isRecoveryPolicy(entry)) {
      return entry;
    }

    const perOperationPolicy = entry;
    return perOperationPolicy[ctx.operationName] ?? {action: RecoveryActionKind.Unknown, retryConfig: {maxAttempts: 0}};
  };

  /**
   * Execute the concrete recovery action once per unique recovery key. Throws if required context is missing.
   * For WipeAndReprocessWelcome, attempts to derive groupId from either the operation context or error context.
   */
  private async performRecovery(
    context: OperationContext,
    err: DomainMlsError,
    policy: RecoveryPolicy,
    recoveryKey: string,
  ) {
    const id = context.qualifiedConversationId;
    if (!id) {
      const errorMessage = `Missing conversationId for recovery action ${policy.action}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    switch (policy.action) {
      case 'RecoverFromEpochMismatch': {
        await this.runOnceWithKey(recoveryKey, () => this.deps.recoverFromEpochMismatch(id, context.subconvId));
        break;
      }
      case 'JoinViaExternalCommit': {
        await this.runOnceWithKey(recoveryKey, () => this.deps.joinViaExternalCommit(id));
        break;
      }
      case 'ResetAndReestablish': {
        await this.runOnceWithKey(recoveryKey, () => this.deps.resetAndReestablish(id));
        break;
      }
      case 'AddMissingUsers': {
        const groupId = context.groupId;
        const missing = err.context?.missingUsers;
        if (!missing || missing.length === 0) {
          throw new Error('No missing users reported in error context for AddMissingUsers');
        }
        if (!groupId) {
          throw new Error('Missing groupId for AddMissingUsers');
        }
        await this.runOnceWithKey(recoveryKey, () => this.deps.addMissingUsers(id, groupId, missing));
        break;
      }
      case 'WipeAndReprocessWelcome': {
        // We rely on either the operation context groupId (preferred) or any mapped error context
        const groupId = context.groupId ?? err.context?.groupId;
        if (!groupId) {
          this.logger.warn('Could not determine groupId for WipeAndReprocessWelcome; skipping wipe');
          break;
        }
        await this.runOnceWithKey(recoveryKey, () => this.deps.wipeMLSConversation(groupId));
        break;
      }
      default:
        this.logger.info(`No recovery action taken for action ${policy.action}`);
        break;
    }
  }

  /**
   * Build a stable deduplication key from action and operation context.
   */
  private getRecoveryKey(context: OperationContext, action: RecoveryActionKind): string {
    const conv = context.qualifiedConversationId?.id ?? 'unknownConv';
    const group = context.groupId ?? 'unknownGroup';
    const sub = context.subconvId ?? 'none';
    const key = `${action}:${conv}:${group}:${String(sub)}`;
    this.logger.info(`Generated recovery key: ${key} for action ${action} with context`, {context});
    return key;
  }

  /**
   * Ensure the provided async task runs at most once for the given key at a time.
   */
  private runOnceWithKey = async <T>(key: string, task: () => Promise<T>): Promise<void> => {
    if (this.inProgressRecoveries.has(key)) {
      this.logger.info(`Recovery already in progress for key ${key}, skipping duplicate recovery`);
      return;
    }
    this.logger.info(`Starting recovery for key ${key}`);
    this.inProgressRecoveries.add(key);
    try {
      await task();
    } catch (error) {
      this.logger.warn(`Recovery failed for key ${key}`, {error});
      throw error;
    } finally {
      this.logger.info(`Completed recovery for key ${key}`);
      this.inProgressRecoveries.delete(key);
    }
  };

  /** Optionally wait before re-invoking the original operation. */
  private async maybeDelay(retry: RetryPolicy): Promise<void> {
    if (retry.delayMs) {
      this.logger.info(`Waiting for ${retry.delayMs}ms before retrying original operation`);
      await this.sleep(retry.delayMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Minimal default policies used by the initial integration. These can be extended over time.
 *
 * Highlights:
 * - WrongEpoch: reconcile and retry for typed ops; do not re-run for join.
 * - GroupNotEstablished: reset and re-establish; typed ops re-run once.
 * - GroupOutOfSync: add missing users and retry for typed ops.
 * - ConversationAlreadyExists (welcome): wipe local MLS state and re-run welcome once.
 * - OrphanWelcome (welcome): attempt join via external commit; do not re-run.
 */
export const minimalDefaultPolicies: PolicyTable = {
  WrongEpoch: {
    // For join operations, recover from epoch mismatch; do not re-run original op
    joinExternalCommit: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
    // For non-join operations, recover from epoch mismatch and retry original once
    send: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    addUsers: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    removeUsers: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    // For inbound message-add processing, fix epoch and allow normal flow to progress (no auto re-run)
    handleMessageAdd: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    keyMaterialUpdate: {
      action: RecoveryActionKind.RecoverFromEpochMismatch,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
  },
  // Use per-operation semantics so typed operations re-run once post-recovery
  GroupNotEstablished: {
    joinExternalCommit: {
      action: RecoveryActionKind.ResetAndReestablish,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
    send: {action: RecoveryActionKind.ResetAndReestablish, retryConfig: {maxAttempts: 1, reRunOriginalOperation: true}},
    addUsers: {
      action: RecoveryActionKind.ResetAndReestablish,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    removeUsers: {
      action: RecoveryActionKind.ResetAndReestablish,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    keyMaterialUpdate: {
      action: RecoveryActionKind.ResetAndReestablish,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
  },
  GroupOutOfSync: {
    send: {action: RecoveryActionKind.AddMissingUsers, retryConfig: {maxAttempts: 1, reRunOriginalOperation: true}},
    addUsers: {action: RecoveryActionKind.AddMissingUsers, retryConfig: {maxAttempts: 1, reRunOriginalOperation: true}},
    removeUsers: {
      action: RecoveryActionKind.AddMissingUsers,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
    keyMaterialUpdate: {
      action: RecoveryActionKind.AddMissingUsers,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
  },
  ConversationAlreadyExists: {
    // For welcome handling, wipe local state; do not auto re-run the original callback
    handleWelcome: {
      action: RecoveryActionKind.WipeAndReprocessWelcome,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: true},
    },
  },
  OrphanWelcome: {
    // For orphan welcome, attempt an external commit join; no auto re-run
    handleWelcome: {
      action: RecoveryActionKind.JoinViaExternalCommit,
      retryConfig: {maxAttempts: 1, reRunOriginalOperation: false},
    },
  },
};
