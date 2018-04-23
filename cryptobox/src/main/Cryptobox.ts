import {keys as ProteusKeys} from '@wireapp/proteus';
import {message as ProteusMessage} from '@wireapp/proteus';
import {session as ProteusSession} from '@wireapp/proteus';
import {CryptoboxError} from './error/root';
import CryptoboxSession from './CryptoboxSession';
import DecryptionError from './DecryptionError';
import InvalidPreKeyFormatError from './InvalidPreKeyFormatError';
import {CryptoboxCRUDStore} from './store/root';
import LRUCache from '@wireapp/lru-cache';
import {PriorityQueue} from '@wireapp/priority-queue';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/';
import EventEmitter = require('events');

const logdown = require('logdown');
const VERSION = require('../../package.json').version;

class Cryptobox extends EventEmitter {
  public static TOPIC = {
    NEW_PREKEYS: 'new-prekeys',
    NEW_SESSION: 'new-session',
  };

  private cachedSessions: LRUCache<CryptoboxSession>;

  private logger: any = logdown('@wireapp/cryptobox/Cryptobox', {
    logger: console,
    markdown: false,
  });
  private minimumAmountOfPreKeys: number;
  private queues = new LRUCache<PriorityQueue>(1000);
  private store: CryptoboxCRUDStore;

  public lastResortPreKey: ProteusKeys.PreKey | undefined;
  public identity: ProteusKeys.IdentityKeyPair | undefined;
  public static VERSION: string = VERSION;

  constructor(engine: CRUDEngine, minimumAmountOfPreKeys: number = 1) {
    super();

    if (!engine) {
      throw new Error(`You cannot initialize Cryptobox without a storage component.`);
    }

    if (minimumAmountOfPreKeys > ProteusKeys.PreKey.MAX_PREKEY_ID) {
      minimumAmountOfPreKeys = ProteusKeys.PreKey.MAX_PREKEY_ID;
    }

    this.cachedSessions = new LRUCache(1000);
    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
    this.store = new CryptoboxCRUDStore(engine);

    const storageEngine: string = engine.constructor.name;
    this.logger.log(
      `Constructed Cryptobox. Minimum amount of PreKeys is "${minimumAmountOfPreKeys}". Storage engine is "${storageEngine}".`
    );
  }

  private get_session_queue(session_id: string): PriorityQueue {
    let queue = this.queues.get(session_id);

    if (!queue) {
      queue = new PriorityQueue({maxRetries: 0});
      this.queues.set(session_id, queue);
    }

    return queue;
  }

  private save_session_in_cache(session: CryptoboxSession): CryptoboxSession {
    this.logger.log(`Saving Session with ID "${session.id}" in cache...`);
    this.cachedSessions.set(session.id, session);
    return session;
  }

  private load_session_from_cache(session_id: string): CryptoboxSession | undefined {
    this.logger.log(`Trying to load Session with ID "${session_id}" from cache...`);
    return this.cachedSessions.get(session_id);
  }

  private remove_session_from_cache(session_id: string): void {
    this.logger.log(`Removing Session with ID "${session_id}" from cache...`);
    this.cachedSessions.delete(session_id);
  }

  public create(): Promise<Array<ProteusKeys.PreKey>> {
    this.logger.log(`Initializing Cryptobox. Creating local identity...`);
    return this.create_new_identity()
      .then((identity: ProteusKeys.IdentityKeyPair) => {
        this.identity = identity;
        this.logger.log(
          `Initialized Cryptobox with new local identity. Fingerprint is "${identity.public_key.fingerprint()}".`
        );

        return this.create_last_resort_prekey();
      })
      .then((lastResortPreKey: ProteusKeys.PreKey) => {
        this.logger.log(`Created Last Resort PreKey with ID "${lastResortPreKey.key_id}".`);
        return this.init(false);
      });
  }

  public load(): Promise<Array<ProteusKeys.PreKey>> {
    this.logger.log(`Initializing Cryptobox. Loading local identity...`);
    return this.store
      .load_identity()
      .then((identity: ProteusKeys.IdentityKeyPair | undefined) => {
        if (identity) {
          this.identity = identity;

          this.logger.log('Initialized Cryptobox with existing local identity.');
          this.logger.log(`Identity fingerprint is "${identity.public_key.fingerprint()}".`);
          this.logger.log(`Loading PreKeys...`);

          return this.store.load_prekeys();
        }
        throw new CryptoboxError('Failed to load local identity');
      })
      .then((preKeysFromStorage: Array<ProteusKeys.PreKey>) => {
        const lastResortPreKey = preKeysFromStorage.find(preKey => preKey.key_id === ProteusKeys.PreKey.MAX_PREKEY_ID);
        if (lastResortPreKey) {
          this.logger.log(`Loaded Last Resort PreKey with ID "${lastResortPreKey.key_id}".`);
          this.lastResortPreKey = lastResortPreKey;

          this.logger.log(`Loaded "${this.minimumAmountOfPreKeys - 1}" standard PreKeys...`);

          return this.init(true);
        }
        throw new CryptoboxError('Failed to load last resort PreKey');
      });
  }

  private init(publishPrekeys?: boolean): Promise<Array<ProteusKeys.PreKey>> {
    return this.refill_prekeys(publishPrekeys)
      .then(() => this.store.load_prekeys())
      .then(prekeys => prekeys.sort((a, b) => a.key_id - b.key_id));
  }

  public get_serialized_last_resort_prekey(): Promise<{id: number; key: string}> {
    if (this.lastResortPreKey) {
      return Promise.resolve(this.serialize_prekey(this.lastResortPreKey));
    }
    return Promise.reject(new CryptoboxError('No last resort PreKey available.'));
  }

  private get_prekey(prekey_id: number = ProteusKeys.PreKey.MAX_PREKEY_ID): Promise<ProteusKeys.PreKey | undefined> {
    return this.store.load_prekey(prekey_id);
  }

  public get_serialized_standard_prekeys(): Promise<Array<{id: number; key: string}>> {
    return this.store.load_prekeys().then(prekeys =>
      prekeys
        .filter((preKey: ProteusKeys.PreKey) => {
          const isLastResortPreKey = preKey.key_id === ProteusKeys.PreKey.MAX_PREKEY_ID;
          return !isLastResortPreKey;
        })
        .map((preKey: ProteusKeys.PreKey) => this.serialize_prekey(preKey))
    );
  }

  private publish_event(topic: string, event: any): void {
    this.emit(topic, event);
    this.logger.log(`Published event "${topic}".`, event);
  }

  private publish_prekeys(newPreKeys: Array<ProteusKeys.PreKey>): void {
    if (newPreKeys.length > 0) {
      this.publish_event(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
    }
  }

  private publish_session_id(session: CryptoboxSession): void {
    this.publish_event(Cryptobox.TOPIC.NEW_SESSION, session.id);
  }

  /**
   * This method returns all PreKeys available, respecting the minimum required amount of PreKeys.
   * If all available PreKeys don't meet the minimum PreKey amount, new PreKeys will be created.
   */
  private refill_prekeys(publishPrekeys: boolean = true): Promise<Array<ProteusKeys.PreKey>> {
    return this.store
      .load_prekeys()
      .then(prekeys => {
        const missingAmount: number = Math.max(0, this.minimumAmountOfPreKeys - prekeys.length);

        if (missingAmount > 0) {
          const startId: number = prekeys.reduce((currentHighestValue: number, currentPreKey: ProteusKeys.PreKey) => {
            const isLastResortPreKey = currentPreKey.key_id === ProteusKeys.PreKey.MAX_PREKEY_ID;
            return isLastResortPreKey ? currentHighestValue : Math.max(currentPreKey.key_id + 1, currentHighestValue);
          }, 0);

          this.logger.warn(
            `There are not enough PreKeys in the storage. Generating "${missingAmount}" new PreKey(s), starting from ID "${startId}"...`
          );
          return this.new_prekeys(startId, missingAmount);
        }

        return [];
      })
      .then((newPreKeys: Array<ProteusKeys.PreKey>) => {
        if (newPreKeys.length > 0) {
          this.logger.log(
            `Generated PreKeys from ID "${newPreKeys[0].key_id}" to ID "${newPreKeys[newPreKeys.length - 1].key_id}".`
          );

          if (publishPrekeys) {
            this.publish_prekeys(newPreKeys);
          }
        }
        return newPreKeys;
      });
  }

  private create_new_identity(): Promise<ProteusKeys.IdentityKeyPair> {
    return Promise.resolve()
      .then(() => this.store.delete_all())
      .then(() => {
        return ProteusKeys.IdentityKeyPair.new();
      })
      .then((identity: ProteusKeys.IdentityKeyPair) => {
        this.logger.warn(`Cleaned cryptographic items prior to saving a new local identity.`);
        return this.store.save_identity(identity);
      });
  }

  /**
   * Creates a new session which can be used for cryptographic operations (encryption & decryption) from a remote PreKey bundle.
   * Saving the session takes automatically place when the session is used to encrypt or decrypt a message.
   */
  public session_from_prekey(session_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession> {
    return this.session_load(session_id).catch(sessionLoadError => {
      this.logger.warn(
        `Creating new session because session with ID "${session_id}" could not be loaded: ${sessionLoadError.message}`
      );

      let bundle: ProteusKeys.PreKeyBundle;

      try {
        bundle = ProteusKeys.PreKeyBundle.deserialise(pre_key_bundle);
      } catch (error) {
        throw new InvalidPreKeyFormatError(
          `PreKey bundle for session "${session_id}" has an unsupported format: ${error.message}`
        );
      }

      if (this.identity) {
        return ProteusSession.Session.init_from_prekey(this.identity, bundle).then(
          (session: ProteusSession.Session) => {
            const cryptobox_session = new CryptoboxSession(session_id, this.store, session);
            return this.session_save(cryptobox_session);
          }
        );
      }

      return Promise.reject(new CryptoboxError('No local identity available.'));
    });
  }

  /**
   * Uses a cipher message to create a new session and to decrypt to message which the given cipher message contains.
   * Saving the newly created session is not needed as it's done during the inbuilt decryption phase.
   */
  private session_from_message(session_id: string, envelope: ArrayBuffer): Promise<[CryptoboxSession, Uint8Array]> {
    const env: ProteusMessage.Envelope = ProteusMessage.Envelope.deserialise(envelope);

    if (this.identity) {
      return ProteusSession.Session.init_from_message(this.identity, this.store, env).then(tuple => {
        const [session, decrypted] = tuple;
        const cryptoBoxSession = new CryptoboxSession(session_id, this.store, session);
        return <[CryptoboxSession, Uint8Array]>[cryptoBoxSession, decrypted];
      });
    }

    return Promise.reject(new CryptoboxError('No local identity available.'));
  }

  public session_load(session_id: string): Promise<CryptoboxSession> {
    this.logger.log(`Trying to load Session with ID "${session_id}"...`);

    const cachedSession: CryptoboxSession | undefined = this.load_session_from_cache(session_id);
    if (cachedSession) {
      return Promise.resolve(cachedSession);
    }

    if (this.identity) {
      return this.store.read_session(this.identity, session_id).then((session: ProteusSession.Session) => {
        const cryptobox_session = new CryptoboxSession(session_id, this.store, session);
        return this.save_session_in_cache(cryptobox_session);
      });
    }
    throw new CryptoboxError('No local identity available.');
  }

  private session_save(session: CryptoboxSession): Promise<CryptoboxSession> {
    return this.store.create_session(session.id, session.session).then(() => this.save_session_in_cache(session));
  }

  private session_update(session: CryptoboxSession): Promise<CryptoboxSession> {
    return this.store.update_session(session.id, session.session).then(() => this.save_session_in_cache(session));
  }

  public session_delete(session_id: string): Promise<string> {
    this.remove_session_from_cache(session_id);
    return this.store.delete_session(session_id);
  }

  private create_last_resort_prekey(): Promise<ProteusKeys.PreKey> {
    return Promise.resolve()
      .then(async () => {
        this.logger.log(`Creating Last Resort PreKey with ID "${ProteusKeys.PreKey.MAX_PREKEY_ID}"...`);
        this.lastResortPreKey = await ProteusKeys.PreKey.last_resort();
        return this.store.save_prekeys([this.lastResortPreKey]);
      })
      .then((preKeys: Array<ProteusKeys.PreKey>) => preKeys[0]);
  }

  public serialize_prekey(prekey: ProteusKeys.PreKey): {id: number; key: string} {
    if (this.identity) {
      return ProteusKeys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
    }
    throw new CryptoboxError('No local identity available.');
  }

  /**
   * Creates new PreKeys and saves them into the storage.
   */
  private new_prekeys(start: number, size: number = 0): Promise<Array<ProteusKeys.PreKey>> {
    if (size === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve()
      .then(() => ProteusKeys.PreKey.generate_prekeys(start, size))
      .then((newPreKeys: Array<ProteusKeys.PreKey>) => this.store.save_prekeys(newPreKeys));
  }

  public encrypt(session_id: string, payload: string | Uint8Array, pre_key_bundle?: ArrayBuffer): Promise<ArrayBuffer> {
    let encryptedBuffer: ArrayBuffer;
    let loadedSession: CryptoboxSession;

    return this.get_session_queue(session_id).add(() => {
      return Promise.resolve()
        .then(() => {
          if (pre_key_bundle) {
            return this.session_from_prekey(session_id, pre_key_bundle);
          }

          return this.session_load(session_id);
        })
        .then((session: CryptoboxSession) => {
          loadedSession = session;
          return loadedSession.encrypt(payload);
        })
        .then((encrypted: ArrayBuffer) => {
          encryptedBuffer = encrypted;
          return this.session_update(loadedSession);
        })
        .then(() => encryptedBuffer);
    });
  }

  public decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array> {
    let is_new_session = false;
    let message: Uint8Array;
    let session: CryptoboxSession;

    if (ciphertext.byteLength === 0) {
      return Promise.reject(new DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
    }

    return this.get_session_queue(session_id).add(() => {
      return (
        this.session_load(session_id)
          .catch(() => this.session_from_message(session_id, ciphertext))
          // TODO: "value" can be of type CryptoboxSession | Array[CryptoboxSession, Uint8Array]
          .then((value: any) => {
            let decrypted_message: Uint8Array;

            if (value[0] !== undefined) {
              [session, decrypted_message] = value;
              this.publish_session_id(session);
              is_new_session = true;
              return decrypted_message;
            }

            session = value;
            return session.decrypt(ciphertext);
          })
          .then(decrypted_message => {
            message = decrypted_message;
            if (is_new_session) {
              return this.session_save(session);
            }

            return this.session_update(session);
          })
          .then(() => this.refill_prekeys(true))
          .then(() => message)
      );
    });
  }
}

export default Cryptobox;
