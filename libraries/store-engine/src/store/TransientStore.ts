/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {EventEmitter} from 'events';

import {ExpiredBundle} from './ExpiredBundle';
import {TransientBundle} from './TransientBundle';

import {CRUDEngine} from '../engine/';
import {RecordAlreadyExistsError, RecordNotFoundError} from '../engine/error/';

enum TOPIC {
  EXPIRED = 'expired',
}

export interface TransientStore {
  on(event: TOPIC.EXPIRED, listener: (bundle: ExpiredBundle) => void): this;
}

export class TransientStore extends EventEmitter {
  public static readonly TOPIC = TOPIC;
  private readonly bundles: Record<string, TransientBundle> = {};
  private tableName = '';

  constructor(private readonly engine: CRUDEngine) {
    super();
  }

  public async delete(primaryKey: string): Promise<string> {
    const cacheKey = this.constructCacheKey(primaryKey);

    await Promise.all([this.deleteFromStore(primaryKey), this.deleteFromCache(cacheKey)]);
    return cacheKey;
  }

  public deleteFromCache(cacheKey: string): string {
    const timeoutID = this.bundles[cacheKey]?.timeoutID;
    if (timeoutID) {
      clearTimeout(timeoutID as number);
    }
    delete this.bundles[cacheKey];
    return cacheKey;
  }

  public async get(primaryKey: string): Promise<TransientBundle | undefined> {
    try {
      const cachedBundle = await this.getFromCache(primaryKey);
      return cachedBundle !== undefined ? cachedBundle : await this.getFromStore(primaryKey);
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  public async init(tableName: string): Promise<TransientBundle[]> {
    this.tableName = tableName;

    const cacheKeys: string[] = [];

    const primaryKeys = await this.engine.readAllPrimaryKeys(this.tableName);

    const readBundles = primaryKeys.map(primaryKey => {
      const cacheKey = this.constructCacheKey(primaryKey);
      cacheKeys.push(cacheKey);
      return this.engine.read<TransientBundle>(this.tableName, primaryKey);
    });

    const bundles = await Promise.all(readBundles);

    for (const index in bundles) {
      const bundle = bundles[index];
      const cacheKey = cacheKeys[index];
      await this.startTimer(cacheKey);
      this.bundles[cacheKey] = bundle;
    }

    return bundles;
  }

  /**
   * Saves a transient record to the store and starts a timer to remove this record when the time to live (TTL) ended.
   * @param primaryKey Primary key from which the FQN is created
   * @param record A payload which should be kept in the TransientStore
   * @param ttl The time to live (TTL) in milliseconds (ex. 1000 is 1s)
   * @returns A transient bundle, wrapping the initial record
   */
  public async set<T>(primaryKey: string, record: T, ttl: number): Promise<TransientBundle> {
    const bundle: TransientBundle = this.createTransientBundle(record, ttl);

    const cachedBundle = await this.getFromCache(primaryKey);
    if (cachedBundle) {
      const message = `Record with primary key "${primaryKey}" already exists in table "${this.tableName}" of database "${this.engine.storeName}".`;
      throw new RecordAlreadyExistsError(message);
    } else {
      const cacheKey = await this.save(primaryKey, bundle);
      const transientBundle = await this.startTimer(cacheKey);
      // Note: Save bundle with timeoutID in cache (not in persistent storage)
      return this.saveInCache(cacheKey, transientBundle);
    }
  }

  /**
   * Returns a fully qualified name (FQN) which can be used to cache a transient bundle.
   * @param primaryKey Primary key from which the FQN is created
   * @returns A fully qualified name
   */
  private constructCacheKey(primaryKey: string): string {
    return `${this.engine.storeName}@${this.tableName}@${primaryKey}`;
  }

  private constructPrimaryKey(cacheKey: string): string {
    return cacheKey.replace(`${this.engine.storeName}@${this.tableName}@`, '');
  }

  private createTransientBundle<T>(record: T, ttl: number): {expires: number; payload: T} {
    return {
      expires: Date.now() + ttl,
      payload: record,
    };
  }

  private deleteFromStore(primaryKey: string): Promise<string> {
    return this.engine.delete(this.tableName, primaryKey);
  }

  private async expireBundle(cacheKey: string): Promise<ExpiredBundle> {
    const expiredBundle: ExpiredBundle = {
      cacheKey: cacheKey,
      payload: this.bundles[cacheKey].payload,
      primaryKey: this.constructPrimaryKey(cacheKey),
    };

    await this.delete(expiredBundle.primaryKey);
    return expiredBundle;
  }

  private getFromCache(primaryKey: string): Promise<TransientBundle> {
    const cacheBundle = this.bundles[this.constructCacheKey(primaryKey)];
    return Promise.resolve(cacheBundle);
  }

  private getFromStore(primaryKey: string): Promise<TransientBundle> {
    return this.engine.read(this.tableName, primaryKey);
  }

  private async save<TransientBundle>(primaryKey: string, bundle: TransientBundle): Promise<string> {
    const cacheKey = this.constructCacheKey(primaryKey);
    await Promise.all([this.saveInStore(primaryKey, bundle), this.saveInCache(cacheKey, bundle)]);
    return cacheKey;
  }

  private saveInCache<TransientBundle>(cacheKey: string, bundle: TransientBundle): TransientBundle {
    return (this.bundles[cacheKey] = bundle as any);
  }

  private saveInStore<TransientBundle>(primaryKey: string, bundle: TransientBundle): Promise<string> {
    return this.engine.create(this.tableName, primaryKey, bundle);
  }

  private async startTimer(cacheKey: string): Promise<TransientBundle> {
    const primaryKey = this.constructPrimaryKey(cacheKey);
    let bundle = await this.get(primaryKey);
    if (!bundle) {
      bundle = new TransientBundle();
      bundle.expires = 0;
      bundle.payload = undefined;
    }
    const {expires, timeoutID} = bundle;
    const timespan: number = expires - Date.now();
    if (expires <= 0) {
      await this.expireBundle(cacheKey);
    } else if (!timeoutID) {
      bundle.timeoutID = setTimeout(async () => {
        const expiredBundle = await this.expireBundle(cacheKey);
        this.emit(TransientStore.TOPIC.EXPIRED, expiredBundle);
      }, timespan);
    }
    return bundle;
  }
}
