import Dexie from 'dexie';
import {StorageSchemata} from './StorageSchemata';
import {getLogger, Logger} from 'Util/Logger';
import {ClientRecord} from './ClientRecord';

interface AmplifyRecord {
  value: string;
}

export class LocalWireDatabase extends Dexie {
  /**  @see https://dexie.org/docs/Observable/Dexie.Observable */
  _dbSchema?: Object;

  // Tables
  amplify: Dexie.Table<AmplifyRecord, string>;
  clients: Dexie.Table<ClientRecord, string>;

  private readonly logger: Logger;

  constructor(dbName: string) {
    super(dbName);
    this.logger = getLogger(dbName);

    StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      const versionInstance = this.version(version).stores(schema);
      if (upgrade) {
        versionInstance.upgrade((transaction: Dexie.Transaction) => {
          this.logger.warn(`Database upgrade to version '${version}'`);
          upgrade(transaction, this);
        });
      }
    });

    this.amplify = this.table('amplify');
    this.clients = this.table('clients');
  }
}
