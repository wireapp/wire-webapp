const TABLE_NAME = 'the-simpsons';

module.exports = {
  'creates a record if it does not exist in the database.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      name: 'Old monitor',
    };

    const expectedAmountOfProperties = 1;

    engine
      .updateOrCreate(TABLE_NAME, PRIMARY_KEY, entity)
      .then(primaryKey => engine.read(TABLE_NAME, primaryKey))
      .then(updatedRecord => {
        expect(updatedRecord.name).toBe(entity.name);
        expect(Object.keys(updatedRecord).length).toBe(expectedAmountOfProperties);
        done();
      })
      .catch(done.fail);
  },
  'updates an existing database record.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      name: 'Old monitor',
    };

    const update = {
      name: 'Old monitor2',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => engine.updateOrCreate(TABLE_NAME, PRIMARY_KEY, update))
      .then(primaryKey => engine.read(TABLE_NAME, primaryKey))
      .then(updatedRecord => {
        expect(updatedRecord.name).toBe(update.name);
        done();
      })
      .catch(done.fail);
  },
};
