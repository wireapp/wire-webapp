import {ExpiredBundle, TransientBundle, TransientStore} from './store';
import {FileEngine, IndexedDBEngine, LocalStorageEngine, MemoryEngine} from './engine';
import {PathValidationError, RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './engine/error';

export = {
  Store: {
    ExpiredBundle,
    RecordAlreadyExistsError,
    TransientBundle,
    TransientStore,
  },
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
};
