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

import type {OperationSnapshot, OutboxStore, StorageFailed} from '../types';

type StoreMethod = keyof OutboxStore;

export type StoreCall =
  {method: 'loadLatest'} | {method: 'append'; snapshot: OperationSnapshot} | {method: 'remove'; operationIds: string[]};

export type InMemoryOutboxStore = OutboxStore & {
  /** Every snapshot of the operation, oldest first */
  history: (operationId: string) => OperationSnapshot[];
  /** The ids of the operations that still have snapshots */
  operationIds: () => string[];
  /** Puts a snapshot in as if an earlier session had stored it */
  seed: (snapshot: OperationSnapshot) => void;
  /** Makes every call of the method answer `storage-failed`, until `false` clears it */
  fail: (method: StoreMethod, isFailing: boolean) => void;
  /** Lets the next calls of the method work, then makes every call answer `storage-failed`, until `fail(method, false)` */
  failAfter: (method: StoreMethod, successfulCalls: number) => void;
  /** Makes `append` answer `storage-full`, until `false` clears it */
  fill: (isFull: boolean) => void;
  /** Makes `loadLatest` report that many operations as quarantined by the store itself, on top of what it loads */
  quarantine: (count: number) => void;
  /** Makes every call of the method reject, until `undefined` clears it */
  rejectWith: (method: StoreMethod, error: Error | undefined) => void;
  /** Every call, in the order it was made, whether it was answered or not */
  calls: StoreCall[];
};

const failure: StorageFailed = {outcome: 'storage-failed', errorName: 'TestFailure'};

export function createInMemoryOutboxStore(): InMemoryOutboxStore {
  const snapshotsByOperation = new Map<string, OperationSnapshot[]>();
  const failing = new Set<StoreMethod>();
  const allowances = new Map<StoreMethod, number>();
  const rejections = new Map<StoreMethod, Error>();
  let isFull = false;
  let quarantinedCount = 0;
  const calls: StoreCall[] = [];

  /** Records the call, then rejects or fails it if the test says so */
  function recordCall(call: StoreCall): StorageFailed | undefined {
    calls.push(call);
    const {method} = call;
    const rejection = rejections.get(method);
    if (rejection !== undefined) {
      throw rejection;
    }
    const callsAllowed = allowances.get(method);
    if (callsAllowed !== undefined) {
      allowances.set(method, Math.max(0, callsAllowed - 1));
      return callsAllowed === 0 ? failure : undefined;
    }
    return failing.has(method) ? failure : undefined;
  }

  function put(snapshot: OperationSnapshot): void {
    snapshotsByOperation.set(snapshot.id, [...(snapshotsByOperation.get(snapshot.id) ?? []), snapshot]);
  }

  return {
    async loadLatest() {
      return (
        recordCall({method: 'loadLatest'}) ?? {
          outcome: 'snapshots-loaded',
          operations: [...snapshotsByOperation.values()].flatMap(snapshots => {
            return snapshots.slice(-1);
          }),
          quarantinedCount,
        }
      );
    },
    async append(snapshot) {
      const failed = recordCall({method: 'append', snapshot});
      if (failed !== undefined) {
        return failed;
      }
      if (isFull) {
        return {outcome: 'storage-full'};
      }
      put(snapshot);
      return {outcome: 'snapshot-appended'};
    },
    async remove(operationIds) {
      const failed = recordCall({method: 'remove', operationIds});
      if (failed !== undefined) {
        return failed;
      }
      for (const id of operationIds) {
        snapshotsByOperation.delete(id);
      }
      return {outcome: 'snapshots-removed'};
    },
    history: operationId => {
      return snapshotsByOperation.get(operationId) ?? [];
    },
    operationIds: () => {
      return [...snapshotsByOperation.keys()];
    },
    seed: put,
    fail(method, isFailing) {
      allowances.delete(method);
      if (isFailing) {
        failing.add(method);
      } else {
        failing.delete(method);
      }
    },
    failAfter(method, successfulCalls) {
      allowances.set(method, successfulCalls);
    },
    fill(full) {
      isFull = full;
    },
    quarantine(count) {
      quarantinedCount = count;
    },
    rejectWith(method, error) {
      if (error !== undefined) {
        rejections.set(method, error);
      } else {
        rejections.delete(method);
      }
    },
    calls,
  };
}
