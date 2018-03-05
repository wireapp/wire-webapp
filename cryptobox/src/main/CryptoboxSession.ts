import * as ProteusMessage from '@wireapp/proteus/dist/message/root';
import * as ProteusSession from '@wireapp/proteus/dist/session/root';
import DecryptionError from './DecryptionError';
import {CryptoboxCRUDStore} from './store/root';

class CryptoboxSession {
  public id: string;
  public pk_store: CryptoboxCRUDStore;
  public session: ProteusSession.Session;

  constructor(id: string, pk_store: CryptoboxCRUDStore, session: ProteusSession.Session) {
    this.id = id;
    this.pk_store = pk_store;
    this.session = session;
    Object.freeze(this);
  }

  public decrypt(ciphertext: ArrayBuffer): Promise<Uint8Array> {
    if (ciphertext.byteLength === 0) {
      return Promise.reject(new DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
    }

    const envelope: ProteusMessage.Envelope = ProteusMessage.Envelope.deserialise(ciphertext);
    return this.session.decrypt(this.pk_store, envelope);
  }

  public encrypt(plaintext: string | Uint8Array): Promise<ArrayBuffer> {
    return this.session.encrypt(plaintext).then(function(ciphertext: ProteusMessage.Envelope) {
      return ciphertext.serialise();
    });
  }

  public fingerprint_local(): string {
    return this.session.local_identity!.public_key.fingerprint();
  }

  public fingerprint_remote(): string {
    return this.session.remote_identity!.fingerprint();
  }
}

export default CryptoboxSession;
