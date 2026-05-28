import {ExtensionStorageManager} from '../storage/ExtensionStorageManager';

interface StorageGetParams { table: string; key: string }
interface StoragePutParams { table: string; key: string; value: unknown }
interface StorageDeleteParams { table: string; key: string }
interface StorageGetAllParams { table: string }
interface StorageQueryParams { table: string; spec: Record<string, unknown> }
interface StorageWatchParams { table: string; spec: Record<string, unknown>; watchId: string }
interface StorageUnwatchParams { watchId: string }
interface StorageConvGetParams { conversationId: string; key: string }
interface StorageConvPutParams { conversationId: string; key: string; value: unknown }

export class StorageApiHandler {
    constructor(
        private readonly storageManager: ExtensionStorageManager,
        private readonly extensionId: string,
        private readonly sendEvent: (channel: string, payload: unknown) => void,
    ) {}

    async handle(method: string, params: unknown): Promise<unknown> {
        switch (method) {
            case 'storage.get': {
                const {table, key} = params as StorageGetParams;
                const t = this.storageManager.getTable(this.extensionId, table);
                const row = await t.get(key);
                return row ? JSON.parse(JSON.stringify(row)) : null;
            }

            case 'storage.put': {
                const {table, key, value} = params as StoragePutParams;
                let serialized: unknown;
                try {
                    serialized = JSON.parse(JSON.stringify(value));
                } catch {
                    throw Object.assign(new Error('Value is not JSON-serializable'), {code: 'SERIALIZATION_ERROR'});
                }
                const t = this.storageManager.getTable(this.extensionId, table);
                await t.put({...(serialized as Record<string, unknown>)}, key);
                return null;
            }

            case 'storage.delete': {
                const {table, key} = params as StorageDeleteParams;
                const t = this.storageManager.getTable(this.extensionId, table);
                await t.delete(key);
                return null;
            }

            case 'storage.getAll': {
                const {table} = params as StorageGetAllParams;
                const t = this.storageManager.getTable(this.extensionId, table);
                const rows = await t.toArray();
                return JSON.parse(JSON.stringify(rows));
            }

            case 'storage.query': {
                const {table, spec} = params as StorageQueryParams;
                const t = this.storageManager.getTable(this.extensionId, table);
                const where = spec.where as Record<string, unknown> | undefined;

                // Use Dexie's indexed query for the first where field when possible,
                // then post-filter remaining conditions in memory.
                let rows: unknown[];
                if (where) {
                    const entries = Object.entries(where);
                    if (entries.length > 0) {
                        const [firstField, firstValue] = entries[0];
                        try {
                            rows = await (t as unknown as {where: (f: string) => {equals: (v: unknown) => {toArray: () => Promise<unknown[]>}}})
                                .where(firstField)
                                .equals(firstValue)
                                .toArray();
                        } catch {
                            rows = await t.toArray();
                        }
                        // Post-filter for remaining where conditions
                        if (entries.length > 1) {
                            const remaining = entries.slice(1);
                            rows = rows.filter(row =>
                                remaining.every(([field, value]) =>
                                    (row as Record<string, unknown>)[field] === value,
                                ),
                            );
                        }
                    } else {
                        rows = await t.toArray();
                    }
                } else {
                    rows = await t.toArray();
                }

                if (typeof spec.orderBy === 'string') {
                    const order = spec.order === 'desc' ? -1 : 1;
                    const orderBy = spec.orderBy;
                    rows.sort((a, b) => {
                        const av = (a as Record<string, unknown>)[orderBy];
                        const bv = (b as Record<string, unknown>)[orderBy];
                        if (av === bv) return 0;
                        if (av == null) return order;
                        if (bv == null) return -order;
                        return ((av as string | number) < (bv as string | number) ? -1 : 1) * order;
                    });
                }

                if (typeof spec.offset === 'number') rows = rows.slice(spec.offset);
                if (typeof spec.limit === 'number') rows = rows.slice(0, spec.limit);

                return JSON.parse(JSON.stringify(rows));
            }

            case 'storage.watch': {
                // The client supplies watchId; the storage manager uses it as the map key so
                // that storage.unwatch (which sends the same watchId) can cancel correctly.
                const {table, spec, watchId} = params as StorageWatchParams;
                this.storageManager.watchTable(
                    this.extensionId,
                    table,
                    spec,
                    items => this.sendEvent(`storage:watch:${watchId}`, items),
                    watchId,
                );
                return null;
            }

            case 'storage.unwatch': {
                const {watchId} = params as StorageUnwatchParams;
                this.storageManager.unwatchTable(watchId);
                return null;
            }

            case 'storage.convGet': {
                const {conversationId, key} = params as StorageConvGetParams;
                const t = this.storageManager.getConversationStorageTable(this.extensionId);
                const compositeKey = this.storageManager.buildConversationKey(conversationId, key);
                const row = await t.get(compositeKey) as Record<string, unknown> | undefined;
                return row ? JSON.parse(JSON.stringify(row.value ?? null)) : null;
            }

            case 'storage.convPut': {
                const {conversationId, key, value} = params as StorageConvPutParams;
                const t = this.storageManager.getConversationStorageTable(this.extensionId);
                const compositeKey = this.storageManager.buildConversationKey(conversationId, key);
                const serialized = JSON.parse(JSON.stringify(value));
                await t.put({
                    conversation_id: compositeKey,
                    conversationId,
                    key,
                    value: serialized,
                } as Record<string, unknown>, compositeKey);
                return null;
            }

            default:
                throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
        }
    }
}
