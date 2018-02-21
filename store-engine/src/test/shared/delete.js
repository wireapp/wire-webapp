const TABLE_NAME = 'the-simpsons';

module.exports = {
  'deletes a record.': (done, engine) => {
    const homer = {
      entity: {
        firstName: 'Homer',
        lastName: 'Simpson',
      },
      primaryKey: 'homer-simpson',
    };

    const lisa = {
      entity: {
        firstName: 'Lisa',
        lastName: 'Simpson',
      },
      primaryKey: 'lisa-simpson',
    };

    const marge = {
      entity: {
        firstName: 'Marge',
        lastName: 'Simpson',
      },
      primaryKey: 'marge-simpson',
    };

    const expectedRemainingEntities = 2;

    Promise.all([
      engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
      engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
      engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
    ])
      .then(() => engine.delete(TABLE_NAME, lisa.primaryKey))
      .then(() => engine.readAllPrimaryKeys(TABLE_NAME))
      .then(primaryKeys => {
        expect(primaryKeys.length).toBe(expectedRemainingEntities);
        expect(primaryKeys[0]).toBe(homer.primaryKey);
        expect(primaryKeys[1]).toBe(marge.primaryKey);
        done();
      });
  },
  'returns the primary key of a deleted record.': (done, engine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(primaryKey => engine.delete(TABLE_NAME, primaryKey))
      .then(primaryKey => {
        expect(primaryKey).toBe(PRIMARY_KEY);
        done();
      });
  },
};
