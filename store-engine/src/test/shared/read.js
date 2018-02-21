const TABLE_NAME = 'the-simpsons';

const {StoreEngine} = require('@wireapp/store-engine');

module.exports = {
  'returns a database record.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(primaryKey => engine.read(TABLE_NAME, primaryKey))
      .then(record => {
        expect(record.some).toBe(entity.some);
        done();
      });
  },
  'throws an error if a record cannot be found.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    engine
      .read(TABLE_NAME, PRIMARY_KEY)
      .then(() => done.fail(new Error('Method is supposed to throw an error.')))
      .catch(error => {
        expect(error).toEqual(jasmine.any(StoreEngine.error.RecordNotFoundError));
        done();
      });
  },
};
