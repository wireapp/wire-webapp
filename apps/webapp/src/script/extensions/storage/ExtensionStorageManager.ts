import {liveQuery} from 'dexie';

import {DexieDatabase} from 'Repositories/storage/dexieDatabase';
import {getDb} from '../getDb';
import {encodeTableName} from './ExtensionStorageNamespace';

interface StorageWatcher {
    extensionId: string;
    unsubscribe: () => void;
}

/** Manages namespaced extension storage tables in Dexie. */
export class ExtensionStorageManager {
    private readonly db: DexieDatabase;
    // keyed by watchId (client-provided), tagged with extensionId for per-extension cleanup
    private readonly watchers = new Map<string, StorageWatcher>();

    constructor(db: DexieDatabase) {
        this.db = db;
    }

    /** Get a Dexie Table reference for an extension's declared table. Throws if not provisioned. */
    getTable(extensionId: string, tableName: string) {
        const namespacedName = encodeTableName(extensionId, tableName);
        const table = (this.db as unknown as Record<string, unknown>)[namespacedName];
        if (!table) {
            throw Object.assign(new Error(`Table not found: ${namespacedName}`), {
                code: 'NOT_FOUND',
            });
        }
        return table as ReturnType<DexieDatabase['table']>;
    }

    /** Conversation-scoped key-value storage in the ext_{id}__convSettings table. */
    getConversationStorageTable(extensionId: string) {
        return this.getTable(extensionId, 'convSettings');
    }

    buildConversationKey(conversationId: string, key: string): string {
        return `${conversationId}::${key}`;
    }

    /**
     * Register a live query watch using the caller-supplied watchId as the map key.
     * This ensures storage.unwatch (which passes the same client watchId) resolves correctly.
     */
    watchTable(
        extensionId: string,
        tableName: string,
        spec: Record<string, unknown>,
        onChange: (items: unknown[]) => void,
        watchId: string,
    ): void {
        const table = this.getTable(extensionId, tableName);

        const subscription = liveQuery(async () => {
            const where = spec.where as Record<string, unknown> | undefined;
            let collection = table.toCollection();

            if (where) {
                const entries = Object.entries(where);
                if (entries.length > 0) {
                    const [firstField, firstValue] = entries[0];
                    try {
                        collection = (table as unknown as {where: (f: string) => {equals: (v: unknown) => unknown}} & typeof table)
                            .where(firstField)
                            .equals(firstValue) as unknown as typeof collection;
                    } catch {
                        // Field not indexed — fall back to full scan
                    }
                }
            }

            let results = await collection.toArray();

            if (where) {
                results = results.filter(row =>
                    Object.entries(where).every(([field, value]) => {
                        return (row as Record<string, unknown>)[field] === value;
                    }),
                );
            }

            const orderBy = spec.orderBy as string | undefined;
            if (orderBy) {
                const order = (spec.order as string) === 'desc' ? -1 : 1;
                results.sort((a, b) => {
                    const av = (a as Record<string, unknown>)[orderBy];
                    const bv = (b as Record<string, unknown>)[orderBy];
                    if (av === bv) return 0;
                    if (av == null) return order;
                    if (bv == null) return -order;
                    return ((av as string | number) < (bv as string | number) ? -1 : 1) * order;
                });
            }

            const offset = spec.offset as number | undefined;
            const limit = spec.limit as number | undefined;
            if (offset) results = results.slice(offset);
            if (limit) results = results.slice(0, limit);

            return results;
        }).subscribe(items => {
            onChange(JSON.parse(JSON.stringify(items)));
        });

        this.watchers.set(watchId, {
            extensionId,
            unsubscribe: () => subscription.unsubscribe(),
        });
    }

    unwatchTable(watchId: string): void {
        const watcher = this.watchers.get(watchId);
        if (watcher) {
            watcher.unsubscribe();
            this.watchers.delete(watchId);
        }
    }

    /** Remove all live queries belonging to a specific extension. Safe on deactivation. */
    unwatchAll(extensionId: string): void {
        for (const [watchId, watcher] of this.watchers) {
            if (watcher.extensionId === extensionId) {
                watcher.unsubscribe();
                this.watchers.delete(watchId);
            }
        }
    }
}

let _instance: ExtensionStorageManager | null = null;

/** Returns the singleton, creating it from getDb() on first call. No db param needed. */
export const getExtensionStorageManager = (): ExtensionStorageManager => {
    if (!_instance) _instance = new ExtensionStorageManager(getDb());
    return _instance;
};
