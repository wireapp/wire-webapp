import {FileEngine, FileSystemEngine, IndexedDBEngine, LocalStorageEngine, MemoryEngine} from './engine/';
import {
  PathValidationError,
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from './engine/error/';
import {ExpiredBundle, TransientBundle, TransientStore} from './store/';

export = {
  FileEngine,
  FileSystemEngine,
  IndexedDBEngine,
  LocalStorageEngine,
  MemoryEngine,
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
};
