const TABLE_NAME = 'the-simpsons';

module.exports = {
  'deletes all records from a database table.': (done, engine) => {
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

    Promise.all([
      engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
      engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
      engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
    ])
      .then(() => engine.deleteAll(TABLE_NAME))
      .then(hasBeenDeleted => {
        expect(hasBeenDeleted).toBe(true);
        return engine.readAllPrimaryKeys(TABLE_NAME);
      })
      .then(primaryKeys => {
        expect(primaryKeys.length).toBe(0);
        done();
      });
  },
};
