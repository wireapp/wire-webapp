import {ExpiredBundle, TransientBundle, TransientStore} from './store';
import {FileEngine, IndexedDBEngine, MemoryEngine, LocalStorageEngine} from './engine';
import {PathValidationError, RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './engine/error';

export = {
  Store: {
    ExpiredBundle,
    RecordAlreadyExistsError,
    TransientBundle,
    TransientStore,
  },
  StoreEngine: {
    error: {
      PathValidationError,
      RecordAlreadyExistsError,
      RecordNotFoundError,
      RecordTypeError,
    },
    FileEngine,
    IndexedDBEngine,
    MemoryEngine,
    LocalStorageEngine,
  },
};
