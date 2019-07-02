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

import {keys as ProteusKeys, session as ProteusSession} from '@wireapp/proteus';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';
import {PersistedRecord, SerialisedRecord} from '../store/';

export enum CRUDStoreKeys {
  LOCAL_IDENTITY = 'local_identity',
}

export enum CrudStoreStores {
  LOCAL_IDENTITY = 'keys',
  PRE_KEYS = 'prekeys',
  SESSIONS = 'sessions',
}

export class CryptoboxCRUDStore implements ProteusSession.PreKeyStore {
  public static readonly KEYS = CRUDStoreKeys;
  public static readonly STORES = CrudStoreStores;

  constructor(private readonly engine: CRUDEngine) {}

  public delete_all(): Promise<boolean> {
    return Promise.resolve()
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.PRE_KEYS))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.SESSIONS))
      .then(() => true);
  }

  /**
   * Deletes a specified PreKey.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  public delete_prekey(prekey_id: number): Promise<number> {
    return this.engine.delete(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString()).then(() => prekey_id);
  }

  /**
   * Loads the local identity.
   * @return Promise<ProteusKeys.IdentityKeyPair> Resolves with the "key pair" from the local identity.
   */
  public load_identity(): Promise<ProteusKeys.IdentityKeyPair | undefined> {
    return this.engine
      .read<PersistedRecord>(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY)
      .then((record: PersistedRecord) => {
        const payload = this.from_store(record);
        const identity: ProteusKeys.IdentityKeyPair = ProteusKeys.IdentityKeyPair.deserialise(payload);
        return identity;
      })
      .catch((error: Error) => {
        if (error instanceof StoreEngineError.RecordNotFoundError) {
          return undefined;
        }
        throw error;
      });
  }

  /**
   * Loads and deserializes a specified PreKey.
   * @return Promise<ProteusKeys.PreKey> Resolves with the the specified "PreKey".
   */
  public load_prekey(prekey_id: number): Promise<ProteusKeys.PreKey | undefined> {
    return this.engine
      .read<PersistedRecord>(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
      .then((record: PersistedRecord) => {
        const payload = this.from_store(record);
        return ProteusKeys.PreKey.deserialise(payload);
      })
      .catch((error: Error) => {
        if (error instanceof StoreEngineError.RecordNotFoundError) {
          return undefined;
        }
        throw error;
      });
  }

  /**
   * Loads all available PreKeys.
   */
  public load_prekeys(): Promise<ProteusKeys.PreKey[]> {
    return this.engine.readAll(CryptoboxCRUDStore.STORES.PRE_KEYS).then((records: any[]) => {
      const preKeys: ProteusKeys.PreKey[] = [];

      records.forEach((record: PersistedRecord) => {
        const payload = this.from_store(record);
        const preKey: ProteusKeys.PreKey = ProteusKeys.PreKey.deserialise(payload);
        preKeys.push(preKey);
      });

      return preKeys;
    });
  }

  /**
   * Saves the local identity.
   * @return Promise<string> Resolves with the "fingerprint" from the saved local identity.
   */
  public save_identity(identity: ProteusKeys.IdentityKeyPair): Promise<ProteusKeys.IdentityKeyPair> {
    const serialised = this.to_store(identity.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
    return this.engine.create(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, payload.id, payload).then(() => identity);
  }

  /**
   * Saves the serialised format of a specified PreKey.
   * @return Promise<string> Resolves with the "ID" from the saved PreKey record.
   */
  public save_prekey(pre_key: ProteusKeys.PreKey): Promise<ProteusKeys.PreKey> {
    const serialised = this.to_store(pre_key.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, pre_key.key_id.toString());
    return this.engine.create(CryptoboxCRUDStore.STORES.PRE_KEYS, payload.id, payload).then(() => pre_key);
  }

  /**
   * Saves the serialised formats from a batch of PreKeys.
   */
  public save_prekeys(pre_keys: ProteusKeys.PreKey[]): Promise<ProteusKeys.PreKey[]> {
    const promises: Promise<ProteusKeys.PreKey>[] = pre_keys.map(pre_key => this.save_prekey(pre_key));
    return Promise.all(promises).then(() => pre_keys);
  }

  /**
   * Saves a specified session.
   * @return Promise<ProteusSession.Session> Resolves with the saved session.
   */
  public create_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    const serialised = this.to_store(session.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
    return this.engine.create(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, payload).then(() => session);
  }

  /**
   * Loads a specified session.
   * @return Promise<ProteusSession.Session> Resolves with the the specified "session".
   */
  public read_session(identity: ProteusKeys.IdentityKeyPair, session_id: string): Promise<ProteusSession.Session> {
    return this.engine
      .read<PersistedRecord>(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((record: PersistedRecord) => {
        const payload = this.from_store(record);
        return ProteusSession.Session.deserialise(identity, payload);
      });
  }

  public async read_sessions(identity: ProteusKeys.IdentityKeyPair): Promise<Record<string, ProteusSession.Session>> {
    const sessionIds = await this.engine.readAllPrimaryKeys(CryptoboxCRUDStore.STORES.SESSIONS);
    const sessions: Record<string, ProteusSession.Session> = {};

    for (const sessionId of sessionIds) {
      sessions[sessionId] = await this.read_session(identity, sessionId);
    }

    return sessions;
  }

  public update_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    const serialised = this.to_store(session.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
    return this.engine
      .update(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, {serialised: payload.serialised})
      .then(() => session);
  }

  /**
   * Deletes a specified session.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  public delete_session(session_id: string): Promise<string> {
    return this.engine
      .delete(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((primary_key: string) => primary_key);
  }

  private from_store(record: PersistedRecord): ArrayBuffer {
    return typeof record.serialised === 'string'
      ? Decoder.fromBase64(record.serialised).asBytes.buffer
      : record.serialised;
  }

  private to_store(serialised: ArrayBuffer | string): string {
    return Encoder.toBase64(serialised).asString;
  }
}
