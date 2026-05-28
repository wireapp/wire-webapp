import {container} from 'tsyringe';

import {StorageService} from 'Repositories/storage';
import {DexieDatabase} from 'Repositories/storage/dexieDatabase';

/** Resolve the DexieDatabase via StorageService (the only registered path). */
export const getDb = (): DexieDatabase => {
    const db = container.resolve(StorageService).db;
    if (!db) {
        throw new Error('DexieDatabase not initialized yet — ensure StorageService.init() has run');
    }
    return db;
};
