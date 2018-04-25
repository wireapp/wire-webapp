import {ExpiredBundle, TransientBundle, TransientStore} from './store';
import {FileEngine, FileSystemEngine, IndexedDBEngine, LocalStorageEngine, MemoryEngine} from './engine';
import {
  PathValidationError,
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from './engine/error';

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
    UnsupportedError,
  },
  FileEngine,
  FileSystemEngine,
  IndexedDBEngine,
  MemoryEngine,
  LocalStorageEngine,
};
