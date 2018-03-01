import Cryptobox from '../Cryptobox';

// Record that is read from the store
class PersistedRecord {
  public created: number;
  public id: string;
  public serialised: ArrayBuffer | string;
  public version: string;

  constructor(serialised: ArrayBuffer, id: string) {
    this.created = Date.now();
    this.id = id;
    this.serialised = serialised; // For backward compatibility "serialised" can be an ArrayBuffer or Base64-encoded String.
    this.version = Cryptobox.prototype.VERSION;
  }
}

export default PersistedRecord;
