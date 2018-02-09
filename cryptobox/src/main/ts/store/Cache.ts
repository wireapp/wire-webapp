import * as ProteusKeys from '@wireapp/proteus/dist/keys/';
import * as ProteusSession from '@wireapp/proteus/dist/session/';
const logdown = require('logdown');
import {CryptoboxStore} from '../store/';
import {CryptoboxError} from '../error/';

export default class Cache implements CryptoboxStore {
  private identity: ProteusKeys.IdentityKeyPair | undefined;
  private logger: any = logdown('cryptobox.store.Cache', {
    logger: console,
    markdown: false,
  });
  private prekeys: {[index: string]: ProteusKeys.PreKey | ArrayBuffer};
  private sessions: {[index: string]: ProteusSession.Session | ArrayBuffer};

  constructor() {
    this.identity = undefined;
    this.prekeys = {};
    this.sessions = {};
  }

  public delete_all(): Promise<boolean> {
    delete this.identity;
    this.prekeys = {};
    this.sessions = {};
    return Promise.resolve(true);
  }

  public delete_prekey(prekey_id: number): Promise<number> {
    delete this.prekeys[prekey_id];
    this.logger.log(`Deleted PreKey ID "${prekey_id}".`);
    return Promise.resolve(prekey_id);
  }

  public delete_session(session_id: string): Promise<string> {
    delete this.sessions[session_id];
    return Promise.resolve(session_id);
  }

  public load_identity(): Promise<ProteusKeys.IdentityKeyPair> {
    if (this.identity) {
      return Promise.resolve(this.identity);
    }
    return Promise.reject(new CryptoboxError('No local identity available.'));
  }

  public load_prekey(prekey_id: number): Promise<ProteusKeys.PreKey> {
    const serialised: ArrayBuffer = <ArrayBuffer>this.prekeys[prekey_id];

    if (serialised) {
      return Promise.resolve(ProteusKeys.PreKey.deserialise(serialised));
    }

    return Promise.reject(new CryptoboxError(`No PreKey found with ID "${prekey_id}".`));
  }

  public load_prekeys(): Promise<Array<ProteusKeys.PreKey>> {
    const prekey_promises: Array<Promise<ProteusKeys.PreKey>> = Object.keys(this.prekeys).map((key: string) => {
      const prekey_id = parseInt(key, 10);
      return this.load_prekey(prekey_id);
    });

    return Promise.all(prekey_promises);
  }

  public read_session(identity: ProteusKeys.IdentityKeyPair, session_id: string): Promise<ProteusSession.Session> {
    const serialised: ArrayBuffer = <ArrayBuffer>this.sessions[session_id];
    if (serialised) {
      return Promise.resolve(ProteusSession.Session.deserialise(identity, serialised));
    }

    return Promise.reject(new Error(`Session with ID "${session_id}" not found.`));
  }

  public save_identity(identity: ProteusKeys.IdentityKeyPair): Promise<ProteusKeys.IdentityKeyPair> {
    this.identity = identity;
    return Promise.resolve(this.identity);
  }

  public save_prekey(preKey: ProteusKeys.PreKey): Promise<ProteusKeys.PreKey> {
    try {
      this.prekeys[preKey.key_id] = preKey.serialise();
      this.logger.log(`Saved PreKey ID "${preKey.key_id}".`);
    } catch (error) {
      // TODO: Keep (and log) error stack trace
      return Promise.reject(
        new Error(`PreKey (no. ${preKey.key_id}) serialization problem "${error.message}" at "${error.stack}".`)
      );
    }

    return Promise.resolve(preKey);
  }

  save_prekeys(preKeys: Array<ProteusKeys.PreKey>): Promise<Array<ProteusKeys.PreKey>> {
    const savePromises: Array<Promise<ProteusKeys.PreKey>> = preKeys.map((preKey: ProteusKeys.PreKey) => {
      return this.save_prekey(preKey);
    });

    return Promise.all(savePromises).then(() => {
      return preKeys;
    });
  }

  public create_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    try {
      this.sessions[session_id] = session.serialise();
    } catch (error) {
      return Promise.reject(new Error(`Session serialization problem: "${error.message}"`));
    }

    return Promise.resolve(session);
  }

  public update_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session> {
    return this.create_session(session_id, session);
  }
}
