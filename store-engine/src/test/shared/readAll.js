const TABLE_NAME = 'the-simpsons';

module.exports = {
  'returns multiple database records.': (done, engine) => {
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
      .then(() => engine.readAll(TABLE_NAME))
      .then(records => {
        expect(records.length).toBe(allEntities.length);
        for (const counter in records) {
          expect(records[counter].firstName).toBe(allEntities[counter].entity.firstName);
        }
        done();
      });
  },
};
