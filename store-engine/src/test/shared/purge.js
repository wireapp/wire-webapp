const TABLE_NAME = 'the-simpsons';

module.exports = {
  'database can be reinitialized after purge': async (done, engine, initEngine) => {
    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});
    const SAVED_RECORDS = 1;
    let keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);

    await engine.purge();

    engine = await initEngine(false);
    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(0);

    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});

    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);

    done();
  },
  'deletes the database and all of its records.': async (done, engine, initEngine) => {
    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});
    await engine.create(TABLE_NAME, 'two', {name: 'Bravo'});
    await engine.create(TABLE_NAME, 'three', {name: 'Charlie'});
    await engine.create(TABLE_NAME, 'four', {name: 'Delta'});
    const SAVED_RECORDS = 4;
    let keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);

    await engine.purge();

    engine = await initEngine();
    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(0);

    done();
  },
};
