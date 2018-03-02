import Cryptobox from '../Cryptobox';

// Record that is written into the store
class SerialisedRecord {
  public created: number;
  public id: string;
  public serialised: string;
  public version: string;

  constructor(serialised: string, id: string) {
    this.created = Date.now();
    this.id = id;
    this.serialised = serialised;
    this.version = Cryptobox.prototype.VERSION;
  }
}

export {SerialisedRecord};
