import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import {Cryptobox, store} from '@wireapp/cryptobox';
import {Decoder, Encoder} from 'bazinga64';
import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import * as ProteusKeys from '@wireapp/proteus/dist/keys/root';
import * as auth from '@wireapp/api-client/dist/commonjs/auth/index';
import {SessionPayloadBundle} from '../crypto/root';
import {OTRRecipients} from '@wireapp/api-client/dist/commonjs/conversation/index';

export default class CryptographyService {
  public static STORES = {
    CLIENTS: 'clients',
  };
  public cryptobox: Cryptobox;

  constructor(private storeEngine: CRUDEngine) {
    this.cryptobox = new Cryptobox(storeEngine);
  }

  public createCryptobox(): Promise<Array<auth.PreKey>> {
    return this.cryptobox.create().then((initialPreKeys: Array<ProteusKeys.PreKey>) => {
      return initialPreKeys
        .map(preKey => {
          const preKeyJson: auth.PreKey = this.cryptobox.serialize_prekey(preKey);
          if (preKeyJson.id !== ProteusKeys.PreKey.MAX_PREKEY_ID) {
            return preKeyJson;
          }
          return {id: -1, key: ''};
        })
        .filter(serializedPreKey => serializedPreKey.key);
    });
  }

  public constructSessionId(userId: string, clientId: string): string {
    return `${userId}@${clientId}`;
  }

  public decrypt(sessionId: string, encodedCiphertext: string): Promise<Uint8Array> {
    const messageBytes: Uint8Array = Decoder.fromBase64(encodedCiphertext).asBytes;
    return this.cryptobox.decrypt(sessionId, messageBytes.buffer);
  }

  private dismantleSessionId(sessionId: string): Array<string> {
    return sessionId.split('@');
  }

  public encrypt(typedArray: Uint8Array, preKeyBundles: UserPreKeyBundleMap): Promise<OTRRecipients> {
    const recipients: OTRRecipients = {};
    const encryptions: Array<Promise<SessionPayloadBundle>> = [];

    for (const userId in preKeyBundles) {
      recipients[userId] = {};
      for (const clientId in preKeyBundles[userId]) {
        const preKeyPayload: auth.PreKey = preKeyBundles[userId][clientId];
        const preKey: string = preKeyPayload.key;
        const sessionId: string = this.constructSessionId(userId, clientId);
        encryptions.push(this.encryptPayloadForSession(sessionId, typedArray, preKey));
      }
    }

    return Promise.all(encryptions).then((payloads: Array<SessionPayloadBundle>) => {
      const recipients: OTRRecipients = {};

      if (payloads) {
        payloads.forEach((payload: SessionPayloadBundle) => {
          const sessionId: string = payload.sessionId;
          const encrypted: string = payload.encryptedPayload;
          const [userId, clientId] = this.dismantleSessionId(sessionId);
          recipients[userId] = recipients[userId] || {};
          recipients[userId][clientId] = encrypted;
        });
      }

      return recipients;
    });
  }

  private encryptPayloadForSession(
    sessionId: string,
    plainText: Uint8Array,
    base64EncodedPreKey: string
  ): Promise<SessionPayloadBundle> {
    const decodedPreKeyBundle: Uint8Array = Decoder.fromBase64(base64EncodedPreKey).asBytes;
    return this.cryptobox
      .encrypt(sessionId, plainText, decodedPreKeyBundle.buffer)
      .then((encryptedPayload: ArrayBuffer) => Encoder.toBase64(encryptedPayload).asString)
      .catch((error: Error) => '💣')
      .then((encryptedPayload: string) => ({sessionId, encryptedPayload}));
  }

  public deleteClient(): Promise<string> {
    return this.storeEngine.delete(CryptographyService.STORES.CLIENTS, store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
  }

  public loadClient(): Promise<RegisteredClient> {
    return this.cryptobox.load().then((initialPreKeys: Array<ProteusKeys.PreKey>) => {
      return this.storeEngine.read<RegisteredClient>(
        CryptographyService.STORES.CLIENTS,
        store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY
      );
    });
  }

  public saveClient(client: RegisteredClient): Promise<string> {
    const clientWithMeta = {
      ...client,
      meta: {primary_key: store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY, is_verified: true},
    };
    return this.storeEngine.create(
      CryptographyService.STORES.CLIENTS,
      store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY,
      clientWithMeta
    );
  }
}
