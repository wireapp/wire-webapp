import {CRUDEngine} from '../engine';

const TABLE_NAME = 'the-simpsons';

export default {
  'appends text to an existing record.': async (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const text = 'Hello';
    const textExtension = '\r\nWorld';
    const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY, text);
    await engine.append(TABLE_NAME, primaryKey, textExtension);
    const record = await engine.read(TABLE_NAME, primaryKey);
    expect(record).toBe(`${text}${textExtension}`);

    done();
  },
};
