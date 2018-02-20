import Cryptobox from '../Cryptobox';

class SerialisedRecord {
  public created: number;
  public id: string;
  public serialised: ArrayBuffer;
  public version: string;

  constructor(serialised: ArrayBuffer, id: string) {
    this.created = Date.now();
    this.id = id;
    this.serialised = serialised;
    this.version = Cryptobox.prototype.VERSION;
  }
}

export default SerialisedRecord;
