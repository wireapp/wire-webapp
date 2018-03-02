import * as ProteusKeys from '@wireapp/proteus/dist/keys/root';
import * as ProteusSession from '@wireapp/proteus/dist/session/root';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import {CryptoboxStore, PersistedRecord, SerialisedRecord} from '../store/root';
import {error as StoreEngineError} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';

class CryptoboxCRUDStore implements CryptoboxStore {
  constructor(private engine: CRUDEngine) {}

  static get KEYS() {
    return {
      LOCAL_IDENTITY: 'local_identity',
    };
  }

  static get STORES() {
    return {
      LOCAL_IDENTITY: 'keys',
      PRE_KEYS: 'prekeys',
      SESSIONS: 'sessions',
    };
  }

  private from_store(record: PersistedRecord): ArrayBuffer {
    return typeof record.serialised === 'string'
      ? Decoder.fromBase64(record.serialised).asBytes.buffer
      : record.serialised;
  }

  private to_store(serialised: ArrayBuffer | string): string {
    return Encoder.toBase64(serialised).asString;
  }

  public delete_all(): Promise<boolean> {
    return Promise.resolve()
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.PRE_KEYS))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.SESSIONS))
      .then(() => true);
  }

  public delete_prekey(prekey_id: number): Promise<number> {
    return this.engine.delete(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString()).then(() => prekey_id);
  }

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

  public load_prekeys(): Promise<Array<ProteusKeys.PreKey>> {
    return this.engine.readAll(CryptoboxCRUDStore.STORES.PRE_KEYS).then((records: Array<any>) => {
      const preKeys: Array<ProteusKeys.PreKey> = [];

      records.forEach((record: PersistedRecord) => {
        const payload = this.from_store(record);
        let preKey: ProteusKeys.PreKey = ProteusKeys.PreKey.deserialise(payload);
        preKeys.push(preKey);
      });

      return preKeys;
    });
  }

  public save_identity(identity: ProteusKeys.IdentityKeyPair): Promise<ProteusKeys.IdentityKeyPair> {
    const serialised = this.to_store(identity.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
    return this.engine.create(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, payload.id, payload).then(() => identity);
  }

  public save_prekey(pre_key: ProteusKeys.PreKey): Promise<ProteusKeys.PreKey> {
    const serialised = this.to_store(pre_key.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, pre_key.key_id.toString());
    return this.engine.create(CryptoboxCRUDStore.STORES.PRE_KEYS, payload.id, payload).then(() => pre_key);
  }

  public save_prekeys(pre_keys: ProteusKeys.PreKey[]): Promise<ProteusKeys.PreKey[]> {
    const promises: Array<Promise<ProteusKeys.PreKey>> = pre_keys.map(pre_key => this.save_prekey(pre_key));
    return Promise.all(promises).then(() => pre_keys);
  }

  public create_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    const serialised = this.to_store(session.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
    return this.engine.create(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, payload).then(() => session);
  }

  public read_session(identity: ProteusKeys.IdentityKeyPair, session_id: string): Promise<ProteusSession.Session> {
    return this.engine
      .read<PersistedRecord>(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((record: PersistedRecord) => {
        const payload = this.from_store(record);
        return ProteusSession.Session.deserialise(identity, payload);
      });
  }

  public update_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    const serialised = this.to_store(session.serialise());
    const payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
    return this.engine
      .update(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, {serialised: payload.serialised})
      .then(() => session);
  }

  public delete_session(session_id: string): Promise<string> {
    return this.engine
      .delete(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((primary_key: string) => primary_key);
  }
}

export {CryptoboxCRUDStore};
