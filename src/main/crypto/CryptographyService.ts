import {ConversationEvent, OTRMessageAdd} from '@wireapp/api-client/dist/commonjs/conversation/event/';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/';
import {Cryptobox, store} from 'wire-webapp-cryptobox';
import {Decoder, Encoder} from 'bazinga64';
import {NewClient, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/';
import * as Proteus from 'wire-webapp-proteus';
import * as auth from '@wireapp/api-client/dist/commonjs/auth/';
import {SessionPayloadBundle} from '../crypto/';
import {
  ClientMismatch,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/';

export default class CryptographyService {
  public static STORES = {
    CLIENTS: 'clients',
  };
  public cryptobox: Cryptobox;

  constructor(private storeEngine: CRUDEngine) {
    this.cryptobox = new Cryptobox(new store.CryptoboxCRUDStore(storeEngine));
  }

  public createCryptobox(): Promise<Array<auth.PreKey>> {
    return this.cryptobox
      .create()
      .then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
        return initialPreKeys
          .map(preKey => {
            const preKeyJson: auth.PreKey = this.cryptobox.serialize_prekey(preKey);
            if (preKeyJson.id !== Proteus.keys.PreKey.MAX_PREKEY_ID) return preKeyJson;
            return undefined;
          })
          .filter(serializedPreKey => serializedPreKey);
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

  private encryptPayloadForSession(sessionId: string,
                                   plainText: Uint8Array,
                                   base64EncodedPreKey: string): Promise<SessionPayloadBundle> {
    const decodedPreKeyBundle: Uint8Array = Decoder.fromBase64(base64EncodedPreKey).asBytes;
    return this.cryptobox
      .encrypt(sessionId, plainText, decodedPreKeyBundle.buffer)
      .then(encryptedPayload => Encoder.toBase64(encryptedPayload).asString)
      .catch(error => '💣')
      .then(encryptedPayload => ({sessionId, encryptedPayload}));
  }

  public loadExistingClient(): Promise<RegisteredClient> {
    return this.cryptobox.load().then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
      return this.storeEngine.read<RegisteredClient>(
        CryptographyService.STORES.CLIENTS,
        store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY
      );
    });
  }

  public saveClient(client: RegisteredClient): Promise<string> {
    return this.storeEngine.create(CryptographyService.STORES.CLIENTS, store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY, client);
  }
}
