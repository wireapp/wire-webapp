import {ExtensionStorageManager} from '../storage/ExtensionStorageManager';

export class SettingsApiHandler {
    constructor(
        private readonly storageManager: ExtensionStorageManager,
        private readonly extensionId: string,
    ) {}

    async handle(method: string, params: unknown): Promise<unknown> {
        const table = this.storageManager.getTable(this.extensionId, 'settings');

        switch (method) {
            case 'settings.get': {
                const {key} = params as {key: string};
                const row = await table.get(key) as Record<string, unknown> | undefined;
                return row?.value ?? null;
            }

            case 'settings.set': {
                const {key, value} = params as {key: string; value: unknown};
                const serialized = JSON.parse(JSON.stringify(value));
                await table.put({key, value: serialized} as Record<string, unknown>, key);
                return null;
            }

            case 'settings.getAll': {
                const rows = await table.toArray() as Array<Record<string, unknown>>;
                const result: Record<string, unknown> = {};
                for (const row of rows) {
                    result[row.key as string] = row.value;
                }
                return result;
            }

            default:
                throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
        }
    }
}
