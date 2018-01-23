import * as Proteus from '@wireapp/proteus';
import Dexie from 'dexie';
import Logdown = require('logdown');
import CryptoboxStore from './CryptoboxStore';
import {error as storeError} from '../store/';
import {SerialisedRecord} from '../store';

export interface DexieInstance extends Dexie {
  [index: string]: any;
}

class IndexedDB implements CryptoboxStore {
  public identity: Proteus.keys.IdentityKeyPair;

  private db: DexieInstance;
  private prekeys: {[index: string]: Proteus.keys.PreKey} = {};
  private TABLE = {
    LOCAL_IDENTITY: 'keys',
    PRE_KEYS: 'prekeys',
    SESSIONS: 'sessions',
  };
  private logger: Logdown;
  private localIdentityKey: string = 'local_identity';

  constructor(identifier: string | DexieInstance) {
    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: 'cryptobox.store.IndexedDB'});

    if (typeof indexedDB === 'undefined') {
      const warning = `IndexedDB isn't supported by your platform.`;
      throw new Error(warning);
    }

    if (typeof identifier === 'string') {
      const schema: {[key: string]: string} = {};
      schema[this.TABLE.LOCAL_IDENTITY] = '';
      schema[this.TABLE.PRE_KEYS] = '';
      schema[this.TABLE.SESSIONS] = '';

      this.db = new Dexie(`cryptobox@${identifier}`);
      this.db.version(1).stores(schema);
    } else {
      this.db = identifier;
      this.logger.log(`Using cryptobox with existing database "${this.db.name}".`);
    }
  }

  private create(store_name: string, primary_key: string, entity: SerialisedRecord): Promise<string> {
    return Promise.resolve().then(() => {
      if (entity) {
        this.logger.log(`Add record "${primary_key}" in object store "${store_name}"...`, entity);
        return this.db[store_name].add(entity, primary_key);
      }

      throw new storeError.RecordTypeError(
        `Entity is "undefined" or "null". Store name "${store_name}", Primary Key "${primary_key}".`
      );
    });
  }

  private read<T>(store_name: string, primary_key: string): Promise<T> {
    return Promise.resolve()
      .then(() => {
        this.logger.log(`Trying to load record "${primary_key}" from object store "${store_name}".`);
        return this.db[store_name].get(primary_key);
      })
      .then((record: any) => {
        if (record) {
          this.logger.log(`Loaded record "${primary_key}" from object store "${store_name}".`, record);
          return record;
        }

        const message: string = `Record "${primary_key}" from object store "${store_name}" could not be found.`;
        this.logger.warn(message);
        throw new storeError.RecordNotFoundError(message);
      });
  }

  private update(store_name: string, primary_key: string, changes: Object): Promise<string> {
    this.logger.log(`Changing record "${primary_key}" in object store "${store_name}"...`, changes);
    return this.db[store_name].update(primary_key, changes);
  }

  private delete(store_name: string, primary_key: string): Promise<string> {
    return Promise.resolve()
      .then(() => {
        return this.db[store_name].delete(primary_key);
      })
      .then(() => {
        this.logger.log(`Deleted record with primary key "${primary_key}" from object store "${store_name}".`);
        return primary_key;
      });
  }

  public delete_all(): Promise<boolean> {
    return Promise.resolve()
      .then(() => {
        return this.db[this.TABLE.LOCAL_IDENTITY].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.LOCAL_IDENTITY}".`);
        return this.db[this.TABLE.PRE_KEYS].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.PRE_KEYS}".`);
        return this.db[this.TABLE.SESSIONS].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.SESSIONS}".`);
        return true;
      });
  }

  public delete_prekey(prekey_id: number): Promise<number> {
    return this.delete(this.TABLE.PRE_KEYS, prekey_id.toString()).then(function() {
      return prekey_id;
    });
  }

  public delete_session(session_id: string): Promise<string> {
    return this.delete(this.TABLE.SESSIONS, session_id).then((primary_key: string) => {
      return primary_key;
    });
  }

  public load_identity(): Promise<Proteus.keys.IdentityKeyPair | undefined> {
    return this.read<SerialisedRecord>(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
      .then((record: SerialisedRecord) => {
        return Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
      })
      .catch(function(error: Error) {
        if (error instanceof storeError.RecordNotFoundError) {
          return undefined;
        }
        throw error;
      });
  }

  public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey | undefined> {
    return this.read<SerialisedRecord>(this.TABLE.PRE_KEYS, prekey_id.toString())
      .then((record: SerialisedRecord) => {
        return Proteus.keys.PreKey.deserialise(record.serialised);
      })
      .catch(function(error: Error) {
        if (error instanceof storeError.RecordNotFoundError) {
          return undefined;
        }
        throw error;
      });
  }

  public load_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve()
      .then(() => {
        return this.db[this.TABLE.PRE_KEYS].toArray();
      })
      .then((records: any) => {
        return records.map((record: SerialisedRecord) => {
          return Proteus.keys.PreKey.deserialise(record.serialised);
        });
      });
  }

  public read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    return this.read<SerialisedRecord>(this.TABLE.SESSIONS, session_id).then((payload: SerialisedRecord) => {
      return Proteus.session.Session.deserialise(identity, payload.serialised);
    });
  }

  public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    const payload: SerialisedRecord = new SerialisedRecord(identity.serialise(), this.localIdentityKey);
    this.identity = identity;

    return this.create(this.TABLE.LOCAL_IDENTITY, payload.id, payload).then((primaryKey: string) => {
      const fingerprint: string = identity.public_key.fingerprint();
      const message =
        `Saved local identity "${fingerprint}"` +
        ` with key "${primaryKey}" in object store "${this.TABLE.LOCAL_IDENTITY}".`;
      this.logger.log(message);
      return identity;
    });
  }

  public save_prekey(prekey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
    const payload: SerialisedRecord = new SerialisedRecord(prekey.serialise(), prekey.key_id.toString());
    this.prekeys[prekey.key_id] = prekey;

    return this.create(this.TABLE.PRE_KEYS, payload.id, payload).then((primaryKey: string) => {
      const message = `Saved PreKey (ID "${prekey.key_id}") with key "${primaryKey}" in object store "${
        this.TABLE.PRE_KEYS
      }".`;
      this.logger.log(message);
      return prekey;
    });
  }

  public save_prekeys(prekeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>> {
    if (prekeys.length === 0) {
      return Promise.resolve(prekeys);
    }

    const items: Array<SerialisedRecord> = [];
    const keys: Array<string> = prekeys.map(function(preKey: Proteus.keys.PreKey) {
      const key: string = preKey.key_id.toString();
      const payload: SerialisedRecord = new SerialisedRecord(preKey.serialise(), key);
      items.push(payload);
      return key;
    });

    this.logger.log(
      `Saving a batch of "${items.length}" PreKeys (${keys.join(', ')}) in object store "${this.TABLE.PRE_KEYS}"...`,
      prekeys
    );

    return Promise.resolve()
      .then(() => {
        return this.db[this.TABLE.PRE_KEYS].bulkPut(items, keys);
      })
      .then(() => {
        this.logger.log(`Saved a batch of "${items.length}" PreKeys (${keys.join(', ')}).`, items);
        return prekeys;
      });
  }

  public create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    const payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

    return this.create(this.TABLE.SESSIONS, payload.id, payload)
      .then((primaryKey: string) => {
        const message = `Added session ID "${session_id}" in object store "${
          this.TABLE.SESSIONS
        }" with key "${primaryKey}".`;
        this.logger.log(message);
        return session;
      })
      .catch((error: Error) => {
        if (error instanceof Dexie.ConstraintError) {
          const message: string = `Session with ID '${session_id}' already exists and cannot get overwritten. You need to delete the session first if you want to do it.`;
          throw new storeError.RecordAlreadyExistsError(message);
        }

        throw error;
      });
  }

  public update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    const payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

    return this.update(this.TABLE.SESSIONS, payload.id, {serialised: payload.serialised}).then((primaryKey: string) => {
      const message = `Updated session ID "${session_id}" in object store "${
        this.TABLE.SESSIONS
      }" with key "${primaryKey}".`;
      this.logger.log(message);
      return session;
    });
  }
}

export default IndexedDB;
