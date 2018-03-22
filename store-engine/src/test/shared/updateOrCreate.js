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

    const updates = {
      age: 177,
      size: {
        height: 1080,
        width: 1920,
      },
    };

    const expectedAmountOfProperties = 2;

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => engine.updateOrCreate(TABLE_NAME, PRIMARY_KEY, updates))
      .then(primaryKey => engine.read(TABLE_NAME, primaryKey))
      .then(updatedRecord => {
        expect(updatedRecord.name).toBe(entity.name);
        expect(updatedRecord.age).toBe(updates.age);
        expect(Object.keys(updatedRecord.size).length).toBe(expectedAmountOfProperties);
        expect(updatedRecord.size.height).toBe(updates.size.height);
        expect(updatedRecord.size.width).toBe(updates.size.width);
        done();
      })
      .catch(done.fail);
  },
};
