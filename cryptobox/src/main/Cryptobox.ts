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

import {LRUCache} from '@wireapp/lru-cache';
import {PriorityQueue} from '@wireapp/priority-queue';
import {keys as ProteusKeys, message as ProteusMessage, session as ProteusSession} from '@wireapp/proteus';
import {CRUDEngine} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';
import EventEmitter from 'events';
import logdown from 'logdown';
import {CryptoboxSession} from './CryptoboxSession';
import {DecryptionError} from './DecryptionError';
import {CryptoboxError} from './error/';
import {InvalidPreKeyFormatError} from './InvalidPreKeyFormatError';
import {SerializedCryptobox} from './SerializedCryptobox';
import {CryptoboxCRUDStore} from './store/';

const DEFAULT_CAPACITY = 1000;
const {version}: {version: string} = require('../../package.json');

enum TOPIC {
  NEW_PREKEYS = 'new-prekeys',
  NEW_SESSION = 'new-session',
}

export declare interface Cryptobox {
  on(event: TOPIC.NEW_PREKEYS, listener: (prekeys: ProteusKeys.PreKey[]) => void): this;
  on(event: TOPIC.NEW_SESSION, listener: (session: string) => void): this;
}

export class Cryptobox extends EventEmitter {
  public static get TOPIC(): typeof TOPIC {
    return TOPIC;
  }

  private cachedSessions: LRUCache<CryptoboxSession>;
  private readonly logger: logdown.Logger;
  private readonly minimumAmountOfPreKeys: number;
  private queues = new LRUCache<PriorityQueue>(DEFAULT_CAPACITY);
  private readonly store: CryptoboxCRUDStore;

  public lastResortPreKey: ProteusKeys.PreKey | undefined;
  public identity: ProteusKeys.IdentityKeyPair | undefined;
  public static VERSION = version;

  constructor(engine: CRUDEngine, minimumAmountOfPreKeys: number = 1) {
    super();

    if (!engine) {
      throw new Error('You cannot initialize Cryptobox without a storage component.');
    }

    if (minimumAmountOfPreKeys > ProteusKeys.PreKey.MAX_PREKEY_ID) {
      minimumAmountOfPreKeys = ProteusKeys.PreKey.MAX_PREKEY_ID;
    }

    this.logger = logdown('@wireapp/cryptobox/Cryptobox', {
      logger: console,
      markdown: false,
    });

    this.cachedSessions = new LRUCache(DEFAULT_CAPACITY);
    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
    this.store = new CryptoboxCRUDStore(engine);

    const storageEngine: string = engine.constructor.name;
    this.logger.log(
      `Constructed Cryptobox. Minimum amount of PreKeys is "${minimumAmountOfPreKeys}". Storage engine is "${storageEngine}".`,
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

  public create(): Promise<ProteusKeys.PreKey[]> {
    this.logger.log('Initializing Cryptobox. Creating local identity...');
    return this.create_new_identity()
      .then(() => this.create_last_resort_prekey())
      .then((lastResortPreKey: ProteusKeys.PreKey) => {
        this.logger.log(`Created Last Resort PreKey with ID "${lastResortPreKey.key_id}".`);
        return this.init(false);
      });
  }

  public load(): Promise<ProteusKeys.PreKey[]> {
    this.logger.log('Initializing Cryptobox. Loading local identity...');
    return this.store
      .load_identity()
      .then((identity: ProteusKeys.IdentityKeyPair | undefined) => {
        if (identity) {
          this.identity = identity;

          this.logger.log('Initialized Cryptobox with existing local identity.');
          this.logger.log(`Identity fingerprint is "${identity.public_key.fingerprint()}".`);
          this.logger.log('Loading PreKeys...');

          return this.store.load_prekeys();
        }
        throw new CryptoboxError('Failed to load local identity');
      })
      .then((preKeysFromStorage: ProteusKeys.PreKey[]) => {
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

  private init(publishPrekeys?: boolean): Promise<ProteusKeys.PreKey[]> {
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

  public get_prekey(prekey_id: number = ProteusKeys.PreKey.MAX_PREKEY_ID): Promise<ProteusKeys.PreKey | undefined> {
    return this.store.load_prekey(prekey_id);
  }

  public async get_prekey_bundle(
    preKeyId: number = ProteusKeys.PreKey.MAX_PREKEY_ID,
  ): Promise<ProteusKeys.PreKeyBundle> {
    const preKey = await this.get_prekey(preKeyId);

    if (!this.identity) {
      throw new CryptoboxError('No local identity available.');
    }
    if (!preKey) {
      throw new CryptoboxError(`PreKey with ID "${preKeyId}" cannot be found.`);
    }

    return ProteusKeys.PreKeyBundle.new(this.identity.public_key, preKey);
  }

  public get_serialized_standard_prekeys(): Promise<{id: number; key: string}[]> {
    return this.store.load_prekeys().then(prekeys =>
      prekeys
        .filter((preKey: ProteusKeys.PreKey) => {
          const isLastResortPreKey = preKey.key_id === ProteusKeys.PreKey.MAX_PREKEY_ID;
          return !isLastResortPreKey;
        })
        .map((preKey: ProteusKeys.PreKey) => this.serialize_prekey(preKey)),
    );
  }

  private publish_event(topic: TOPIC, event: ProteusKeys.PreKey[] | string): void {
    this.emit(topic, event);
    this.logger.log(`Published event "${topic}".`, event);
  }

  private publish_prekeys(newPreKeys: ProteusKeys.PreKey[]): void {
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
  private refill_prekeys(publishPrekeys: boolean = true): Promise<ProteusKeys.PreKey[]> {
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
            `There are not enough PreKeys in the storage. Generating "${missingAmount}" new PreKey(s), starting from ID "${startId}"...`,
          );
          return this.new_prekeys(startId, missingAmount);
        }

        return [];
      })
      .then((newPreKeys: ProteusKeys.PreKey[]) => {
        if (newPreKeys.length > 0) {
          this.logger.log(
            `Generated PreKeys from ID "${newPreKeys[0].key_id}" to ID "${newPreKeys[newPreKeys.length - 1].key_id}".`,
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
        this.logger.warn('Cleaned cryptographic items prior to saving a new local identity.');
        this.logger.log(`Created new local identity. Fingerprint is "${identity.public_key.fingerprint()}".`);
        return this.save_identity(identity);
      });
  }

  private save_identity(identity: ProteusKeys.IdentityKeyPair): Promise<ProteusKeys.IdentityKeyPair> {
    this.identity = identity;
    return this.store.save_identity(identity);
  }

  /**
   * Creates (and persists) a new session which can be used for cryptographic operations (encryption & decryption) from
   * a remote PreKey bundle. This function is automatically called on every execution of "encrypt" and "decrypt" so you
   * might not need to call it yourself. However, it has been marked as "public" because there are some cases where you
   * just need the session without executing an encryption or decryption. This is the case when you for example just
   * want to show the fingerprint of the remote party.
   */
  public session_from_prekey(session_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession> {
    return this.session_load(session_id).catch(sessionLoadError => {
      this.logger.warn(
        `Creating new session because session with ID "${session_id}" could not be loaded: ${sessionLoadError.message}`,
      );

      let bundle: ProteusKeys.PreKeyBundle;

      try {
        bundle = ProteusKeys.PreKeyBundle.deserialise(pre_key_bundle);
      } catch (error) {
        throw new InvalidPreKeyFormatError(
          `PreKey bundle for session "${session_id}" has an unsupported format: ${error.message}`,
        );
      }

      if (this.identity) {
        return ProteusSession.Session.init_from_prekey(this.identity, bundle).then(
          (session: ProteusSession.Session) => {
            const cryptobox_session = new CryptoboxSession(session_id, session);
            return this.session_save(cryptobox_session);
          },
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
        const cryptoBoxSession = new CryptoboxSession(session_id, session);
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
        const cryptobox_session = new CryptoboxSession(session_id, session);
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
      .then((preKeys: ProteusKeys.PreKey[]) => preKeys[0]);
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
  private new_prekeys(start: number, size: number = 0): Promise<ProteusKeys.PreKey[]> {
    if (size === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve()
      .then(() => ProteusKeys.PreKey.generate_prekeys(start, size))
      .then((newPreKeys: ProteusKeys.PreKey[]) => this.store.save_prekeys(newPreKeys));
  }

  public async encrypt(
    session_id: string,
    payload: string | Uint8Array,
    pre_key_bundle?: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    return this.get_session_queue(session_id).add(async () => {
      const session = pre_key_bundle
        ? await this.session_from_prekey(session_id, pre_key_bundle)
        : await this.session_load(session_id);
      const encryptedBuffer = session.encrypt(payload);
      await this.session_update(session);
      return encryptedBuffer;
    });
  }

  public async decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array> {
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
            return session.decrypt(ciphertext, this.store);
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

  private async deleteData(): Promise<void> {
    this.cachedSessions = new LRUCache(DEFAULT_CAPACITY);
    this.identity = undefined;
    this.lastResortPreKey = undefined;
    this.queues = new LRUCache<PriorityQueue>(DEFAULT_CAPACITY);
    await this.store.delete_all();
  }

  private async importIdentity(payload: string): Promise<void> {
    this.logger.log('Importing local identity...');

    const identityBuffer = Decoder.fromBase64(payload).asBytes.buffer;
    const identity = ProteusKeys.IdentityKeyPair.deserialise(identityBuffer);

    await this.save_identity(identity);
  }

  private async importPreKeys(serializedPreKeys: {[sessionId: string]: string}): Promise<void> {
    this.logger.log(`Importing "${Object.keys(serializedPreKeys).length}" PreKeys...`);

    const proteusPreKeys = Object.values(serializedPreKeys).map(preKey => {
      const preKeyBuffer = Decoder.fromBase64(preKey).asBytes.buffer;
      const proteusPreKey = ProteusKeys.PreKey.deserialise(preKeyBuffer);
      if (proteusPreKey.key_id === ProteusKeys.PreKey.MAX_PREKEY_ID) {
        this.lastResortPreKey = proteusPreKey;
      }
      return proteusPreKey;
    });

    await this.store.save_prekeys(proteusPreKeys);
  }

  private async importSessions(serializedSessions: {[sessionId: string]: string}): Promise<void> {
    this.logger.log(`Importing "${Object.keys(serializedSessions).length}" sessions...`);

    for (const sessionId in serializedSessions) {
      const serializedSession = serializedSessions[sessionId];
      const sessionBuffer = Decoder.fromBase64(serializedSession).asBytes.buffer;
      const proteusSession = ProteusSession.Session.deserialise(this.identity!, sessionBuffer);
      const cryptoBoxSession = new CryptoboxSession(sessionId, proteusSession);
      await this.session_save(cryptoBoxSession);
    }
  }

  public async deserialize(payload: SerializedCryptobox): Promise<void> {
    await this.deleteData();
    await this.importIdentity(payload.identity);
    await this.importPreKeys(payload.prekeys);
    await this.importSessions(payload.sessions);
    await this.refill_prekeys(true);
  }

  public async serialize(): Promise<SerializedCryptobox> {
    const toBase64 = (buffer: ArrayBuffer) => Encoder.toBase64(buffer).asString;

    const data: SerializedCryptobox = {
      identity: '',
      prekeys: {},
      sessions: {},
    };

    const identity = await this.store.load_identity();

    if (identity) {
      data.identity = toBase64(identity.serialise());
      const sessions = await this.store.read_sessions(identity);
      for (const sessionId in sessions) {
        const storedSession = sessions[sessionId];
        data.sessions[sessionId] = toBase64(storedSession.serialise());
      }
    }

    const storedPreKeys = await this.store.load_prekeys();
    for (const storedPreKey of storedPreKeys) {
      data.prekeys[storedPreKey.key_id] = toBase64(storedPreKey.serialise());
    }

    return data;
  }
}
