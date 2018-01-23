import * as Proteus from '@wireapp/proteus';

interface CryptoboxStore {
  delete_all(): Promise<boolean>;

  /**
   * Deletes a specified PreKey.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_prekey(prekey_id: number): Promise<number>;

  /**
   * Loads the local identity.
   * @return Promise<Proteus.keys.IdentityKeyPair> Resolves with the "key pair" from the local identity.
   */
  load_identity(): Promise<Proteus.keys.IdentityKeyPair | undefined>;

  /**
   * Loads and deserializes a specified PreKey.
   * @return Promise<Proteus.keys.PreKey> Resolves with the the specified "PreKey".
   */
  load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey | undefined>;

  /**
   * Loads all available PreKeys.
   */
  load_prekeys(): Promise<Array<Proteus.keys.PreKey>>;

  /**
   * Saves the local identity.
   * @return Promise<string> Resolves with the "fingerprint" from the saved local identity.
   */
  save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;

  /**
   * Saves the serialised format of a specified PreKey.
   * @deprecated Please use "save_prekeys" instead.
   * @return Promise<string> Resolves with the "ID" from the saved PreKey record.
   */
  save_prekey(pre_key: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;

  /**
   * Saves the serialised formats from a batch of PreKeys.
   */
  save_prekeys(pre_keys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>>;

  /**
   * Saves a specified session.
   * @return Promise<Proteus.session.Session> Resolves with the saved session.
   */
  create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;

  /**
   * Loads a specified session.
   * @return Promise<Proteus.session.Session> Resolves with the the specified "session".
   */
  read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;

  update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;

  /**
   * Deletes a specified session.
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_session(session_id: string): Promise<string>;
}

export default CryptoboxStore;
