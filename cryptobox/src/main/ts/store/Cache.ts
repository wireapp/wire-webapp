import * as Proteus from 'wire-webapp-proteus';
import Logdown = require('logdown');
import {CryptoboxStore} from './CryptoboxStore';

export default class Cache implements CryptoboxStore {
  private identity: Proteus.keys.IdentityKeyPair;
  private logger: Logdown;
  private prekeys: Object = {};
  private sessions: Object = {};

  constructor() {
    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: 'cryptobox.store.Cache'});
  }

  public delete_all(): Promise<boolean> {
    this.identity = undefined;
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

  public load_identity(): Promise<Proteus.keys.IdentityKeyPair> {
    return Promise.resolve(this.identity);
  }

  public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    const serialised: ArrayBuffer = this.prekeys[prekey_id];
    if (serialised) {
      return Promise.resolve(Proteus.keys.PreKey.deserialise(serialised));
    }

    return Promise.resolve(undefined);
  }

  public load_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    const prekey_promises: Array<Promise<Proteus.keys.PreKey>> = Object.keys(this.prekeys).map((key: string) => {
      const prekey_id = parseInt(key, 10);
      return this.load_prekey(prekey_id);
    });

    return Promise.all(prekey_promises);
  }

  public read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    const serialised: ArrayBuffer = this.sessions[session_id];
    if (serialised) {
      return Promise.resolve(Proteus.session.Session.deserialise(identity, serialised));
    }

    return Promise.reject(new Error(`Session with ID "${session_id}" not found.`));
  }

  public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    this.identity = identity;
    return Promise.resolve(this.identity);
  }

  public save_prekey(preKey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
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

  save_prekeys(preKeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>> {
    const savePromises: Array<Promise<Proteus.keys.PreKey>> = preKeys.map((preKey: Proteus.keys.PreKey) => {
      return this.save_prekey(preKey);
    });

    return Promise.all(savePromises).then(() => {
      return preKeys;
    });
  }

  public create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    try {
      this.sessions[session_id] = session.serialise();
    } catch (error) {
      return Promise.reject(new Error(`Session serialization problem: "${error.message}"`));
    }

    return Promise.resolve(session);
  }

  public update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    return this.create_session(session_id, session);
  }
}
