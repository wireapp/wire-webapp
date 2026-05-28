import {getLogger} from 'Util/logger';

import {getCommandsApiHandler} from './CommandsApiHandler';
import {getExtensionStorageManager} from '../storage/ExtensionStorageManager';
import {useExtensionRegistry} from '../registry/ExtensionRegistry';

const log = getLogger('Extension/DatasetsApiHandler');

type SendEventFn = (channel: string, payload: unknown) => void;

interface QuerySpec {
    where?: Record<string, unknown>;
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

interface DatasetQueryParams {
    sourceExtensionId: string;
    channel: string;
    spec?: QuerySpec;
}

interface DatasetWatchParams extends DatasetQueryParams {
    watchId: string;
}

interface DatasetUnwatchParams {
    watchId: string;
}

/**
 * Handles datasets.* bridge methods for cross-extension data sharing.
 *
 * Query: invokes the source extension's registered queryCommand and returns results.
 * Watch: sets up liveQuery subscriptions on the source extension's declared storage tables;
 *        whenever any of those tables change, the queryCommand is re-invoked and results pushed.
 */
export class DatasetsApiHandler {
    /**
     * Active dataset watches: watchId → array of storage watchIds registered with
     * ExtensionStorageManager. Kept so they can all be cancelled on unwatch.
     */
    private readonly activeWatches = new Map<string, string[]>();

    constructor(
        private readonly extensionId: string,
        private readonly sendEvent: SendEventFn,
    ) {}

    async handle(method: string, params: unknown): Promise<unknown> {
        switch (method) {
            case 'datasets.query':
                return this.handleQuery(params as DatasetQueryParams);

            case 'datasets.watch':
                return this.handleWatch(params as DatasetWatchParams);

            case 'datasets.unwatch':
                return this.handleUnwatch(params as DatasetUnwatchParams);

            case 'datasets.publish':
                // Publish is a no-op — consumers subscribe via datasets.watch using the
                // source extension's queryCommand + storage liveQuery, not a push channel.
                log.debug(`datasets.publish called by ${this.extensionId} — no-op`);
                return null;

            default:
                throw Object.assign(
                    new Error(`Not implemented: ${method}`),
                    {code: 'NOT_IMPLEMENTED'},
                );
        }
    }

    private async handleQuery(params: DatasetQueryParams): Promise<unknown[]> {
        const {sourceExtensionId, channel, spec} = params;
        this.checkDatasetAccess(sourceExtensionId, channel);
        const dataset = this.resolveDataset(sourceExtensionId, channel);
        log.debug(`Dataset query: ${sourceExtensionId}:${channel}`);
        const result = await getCommandsApiHandler().invoke(sourceExtensionId, dataset.queryCommand, spec ?? {});
        return Array.isArray(result) ? result : [];
    }

    private async handleWatch(params: DatasetWatchParams): Promise<null> {
        const {sourceExtensionId, channel, watchId, spec} = params;
        this.checkDatasetAccess(sourceExtensionId, channel);
        const dataset = this.resolveDataset(sourceExtensionId, channel);

        const sourceExt = useExtensionRegistry.getState().getExtension(sourceExtensionId)!;
        const storageManager = getExtensionStorageManager();

        // Find all tables declared by the source extension across all storage contributions
        const tables: string[] = [];
        for (const storageContrib of sourceExt.manifest.contributes?.storage ?? []) {
            for (const tableName of storageContrib.tables ?? []) {
                tables.push(tableName);
            }
        }

        const innerWatchIds: string[] = [];

        const triggerPush = async () => {
            try {
                const result = await getCommandsApiHandler().invoke(
                    sourceExtensionId,
                    dataset.queryCommand,
                    spec ?? {},
                );
                this.sendEvent(`datasets:watch:${watchId}`, Array.isArray(result) ? result : []);
            } catch (err) {
                log.error(`Dataset watch re-query failed for ${sourceExtensionId}:${channel}:`, err);
            }
        };

        // Watch each declared table of the source extension.
        // Any table change re-invokes the query command and pushes fresh results.
        for (const tableName of tables) {
            try {
                const innerWatchId = `${watchId}:${tableName}`;
                storageManager.watchTable(
                    sourceExtensionId,
                    tableName,
                    {},
                    () => void triggerPush(),
                    innerWatchId,
                );
                innerWatchIds.push(innerWatchId);
            } catch {
                // Table may not exist for every extension (e.g. optional tables)
            }
        }

        this.activeWatches.set(watchId, innerWatchIds);
        log.debug(`Dataset watch started: ${sourceExtensionId}:${channel} (${innerWatchIds.length} table watches)`);
        return null;
    }

    private handleUnwatch(params: DatasetUnwatchParams): null {
        const {watchId} = params;
        const innerWatchIds = this.activeWatches.get(watchId);
        if (innerWatchIds) {
            const storageManager = getExtensionStorageManager();
            for (const id of innerWatchIds) {
                storageManager.unwatchTable(id);
            }
            this.activeWatches.delete(watchId);
        }
        return null;
    }

    private checkDatasetAccess(sourceExtensionId: string, channel: string): void {
        const requestingExt = useExtensionRegistry.getState().getExtension(this.extensionId);
        const consumes = requestingExt?.manifest?.consumes ?? [];
        const hasAccess = consumes.some(
            entry => entry.from === sourceExtensionId && entry.dataset === channel,
        );
        if (!hasAccess) {
            throw Object.assign(
                new Error(
                    `Extension ${this.extensionId} has not declared consumption of ` +
                    `dataset '${channel}' from ${sourceExtensionId}`,
                ),
                {code: 'PERMISSION_DENIED'},
            );
        }
    }

    private resolveDataset(sourceExtensionId: string, channel: string) {
        const sourceExt = useExtensionRegistry.getState().getExtension(sourceExtensionId);
        if (!sourceExt) {
            throw Object.assign(
                new Error(`Source extension not found: ${sourceExtensionId}`),
                {code: 'NOT_FOUND'},
            );
        }
        const dataset = (sourceExt.manifest.contributes?.datasets ?? []).find(d => d.id === channel);
        if (!dataset) {
            throw Object.assign(
                new Error(`Dataset '${channel}' not found in ${sourceExtensionId}`),
                {code: 'NOT_FOUND'},
            );
        }
        return dataset;
    }
}
