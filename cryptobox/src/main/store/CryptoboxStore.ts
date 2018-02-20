import * as ProteusKeys from '@wireapp/proteus/dist/keys/root';
import * as ProteusSession from '@wireapp/proteus/dist/session/root';

interface CryptoboxStore {
  delete_all(): Promise<boolean>;

  /**
   * Deletes a specified PreKey.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_prekey(prekey_id: number): Promise<number>;

  /**
   * Loads the local identity.
   * @return Promise<ProteusKeys.IdentityKeyPair> Resolves with the "key pair" from the local identity.
   */
  load_identity(): Promise<ProteusKeys.IdentityKeyPair | undefined>;

  /**
   * Loads and deserializes a specified PreKey.
   * @return Promise<ProteusKeys.PreKey> Resolves with the the specified "PreKey".
   */
  load_prekey(prekey_id: number): Promise<ProteusKeys.PreKey | undefined>;

  /**
   * Loads all available PreKeys.
   */
  load_prekeys(): Promise<Array<ProteusKeys.PreKey>>;

  /**
   * Saves the local identity.
   * @return Promise<string> Resolves with the "fingerprint" from the saved local identity.
   */
  save_identity(identity: ProteusKeys.IdentityKeyPair): Promise<ProteusKeys.IdentityKeyPair>;

  /**
   * Saves the serialised format of a specified PreKey.
   * @deprecated Please use "save_prekeys" instead.
   * @return Promise<string> Resolves with the "ID" from the saved PreKey record.
   */
  save_prekey(pre_key: ProteusKeys.PreKey): Promise<ProteusKeys.PreKey>;

  /**
   * Saves the serialised formats from a batch of PreKeys.
   */
  save_prekeys(pre_keys: Array<ProteusKeys.PreKey>): Promise<Array<ProteusKeys.PreKey>>;

  /**
   * Saves a specified session.
   * @return Promise<ProteusSession.Session> Resolves with the saved session.
   */
  create_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session>;

  /**
   * Loads a specified session.
   * @return Promise<ProteusSession.Session> Resolves with the the specified "session".
   */
  read_session(identity: ProteusKeys.IdentityKeyPair, session_id: string): Promise<ProteusSession.Session>;

  update_session(session_id: string, session: ProteusSession.Session): Promise<ProteusSession.Session>;

  /**
   * Deletes a specified session.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_session(session_id: string): Promise<string>;
}

export default CryptoboxStore;
