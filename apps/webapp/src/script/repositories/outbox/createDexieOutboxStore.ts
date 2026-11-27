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

import type {Table} from 'dexie';

import type {
  AppendOutcome,
  LoadOutcome,
  OperationSnapshot,
  OutboxStore,
  RemoveOutcome,
  StorageFailed,
  StorageFull,
} from '../../outbox';

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null;
}

/** Whether the row has the envelope the outbox needs; the payload is parsed by the outbox's kinds */
function isPlausibleSnapshot(row: Row): boolean {
  return (
    typeof row.id === 'string' &&
    typeof row.seq === 'number' &&
    typeof row.state === 'string' &&
    typeof row.kind === 'string'
  );
}

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function toStorageFailure(error: unknown): StorageFull | StorageFailed {
  const errorName = errorNameOf(error);
  return errorName === 'QuotaExceededError' ? {outcome: 'storage-full'} : {outcome: 'storage-failed', errorName};
}

/**
 * The table is append-only: every snapshot of an operation is a row, and the newest one is the operation's state.
 * Takes the table lazily because the database is opened after the repositories are created.
 * Never rejects.
 */
export function createDexieOutboxStore(getTable: () => Table<OperationSnapshot, number>): OutboxStore {
  async function loadLatest(): Promise<LoadOutcome> {
    try {
      const table = getTable();
      const rows: unknown[] = await table.toArray();

      const newestRowById = new Map<string, Row>();
      const rowsWithoutId: Row[] = [];
      let quarantinedCount = 0;
      for (const row of rows) {
        if (!isRow(row)) {
          quarantinedCount++;
          continue;
        }
        if (typeof row.id !== 'string') {
          rowsWithoutId.push(row);
          continue;
        }
        const newest = newestRowById.get(row.id);
        const rowSeq = typeof row.seq === 'number' ? row.seq : Number.NEGATIVE_INFINITY;
        const newestSeq = typeof newest?.seq === 'number' ? newest.seq : Number.NEGATIVE_INFINITY;
        if (newest === undefined || rowSeq >= newestSeq) {
          newestRowById.set(row.id, row);
        }
      }

      const operations: OperationSnapshot[] = [];
      const implausibleIds: string[] = [];
      for (const [id, row] of newestRowById) {
        if (isPlausibleSnapshot(row)) {
          // The inbound key would make the next snapshot's append collide with this row
          const {primary_key: _primaryKey, ...snapshot} = row;
          operations.push(snapshot as unknown as OperationSnapshot);
        } else {
          implausibleIds.push(id);
        }
      }

      const orphanKeys = rowsWithoutId.flatMap(row => {
        return typeof row.primary_key === 'number' ? [row.primary_key] : [];
      });
      if (orphanKeys.length > 0) {
        await table.bulkDelete(orphanKeys);
      }
      if (implausibleIds.length > 0) {
        await table.where('id').anyOf(implausibleIds).delete();
      }
      quarantinedCount += rowsWithoutId.length + implausibleIds.length;

      return {outcome: 'snapshots-loaded', operations, quarantinedCount};
    } catch (error: unknown) {
      return {outcome: 'storage-failed', errorName: errorNameOf(error)};
    }
  }

  async function append(snapshot: OperationSnapshot): Promise<AppendOutcome> {
    try {
      // Dexie writes the generated key onto the object it is given
      await getTable().add({...snapshot});
      return {outcome: 'snapshot-appended'};
    } catch (error: unknown) {
      return toStorageFailure(error);
    }
  }

  async function remove(operationIds: string[]): Promise<RemoveOutcome> {
    try {
      await getTable().where('id').anyOf(operationIds).delete();
      return {outcome: 'snapshots-removed'};
    } catch (error: unknown) {
      return {outcome: 'storage-failed', errorName: errorNameOf(error)};
    }
  }

  return {loadLatest, append, remove};
}
