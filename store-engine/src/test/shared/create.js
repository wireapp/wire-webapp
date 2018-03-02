const TABLE_NAME = 'the-simpsons';

const StoreEngine = require('@wireapp/store-engine');

module.exports = {
  'creates a serialized database record.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(primaryKey => {
        expect(primaryKey).toEqual(PRIMARY_KEY);
        done();
      })
      .catch(done.fail);
  },
  "doesn't save empty values.": (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => done.fail(new Error('Method is supposed to throw an error.')))
      .catch(error => {
        expect(error).toEqual(jasmine.any(StoreEngine.error.RecordTypeError));
        done();
      });
  },
  "doesn't save null values.": (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => done.fail(new Error('Method is supposed to throw an error.')))
      .catch(error => {
        expect(error).toEqual(jasmine.any(StoreEngine.error.RecordTypeError));
        done();
      });
  },
  'throws an error when attempting to overwrite a record.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const firstEntity = {
      some: 'value',
    };

    const secondEntity = {
      some: 'newer-value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, firstEntity)
      .then(() => engine.create(TABLE_NAME, PRIMARY_KEY, secondEntity))
      .catch(error => {
        expect(error).toEqual(jasmine.any(StoreEngine.error.RecordAlreadyExistsError));
        done();
      });
  },
};
