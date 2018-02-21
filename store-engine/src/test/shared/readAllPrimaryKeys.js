const TABLE_NAME = 'the-simpsons';

module.exports = {
  'gets the primary keys of all records in a table.': (done, engine) => {
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

    const allEntities = [homer, lisa, marge];

    Promise.all([
      engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
      engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
      engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
    ])
      .then(() => engine.readAllPrimaryKeys(TABLE_NAME))
      .then(primaryKeys => {
        expect(primaryKeys.length).toBe(allEntities.length);
        for (const counter in allEntities) {
          expect(primaryKeys[counter]).toBe(allEntities[counter].primaryKey);
        }
        done();
      });
  },
};
