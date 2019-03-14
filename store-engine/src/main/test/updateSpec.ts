import {CRUDEngine} from '../engine';
import {RecordNotFoundError} from '../engine/error';

const TABLE_NAME = 'the-simpsons';

interface DomainEntity {
  name: string;
  age: number;
  size: {
    height: number;
    width: number;
  };
}

export default {
  'fails if the record does not exist.': async (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const updates = {
      age: 177,
      size: {
        height: 1080,
        width: 1920,
      },
    };

    try {
      await engine.update(TABLE_NAME, PRIMARY_KEY, updates);
      console.log('B');
    } catch (error) {
      expect(error).toEqual(jasmine.any(RecordNotFoundError));
      done();
    }
  },
  'updates an existing database record.': (done: DoneFn, engine: CRUDEngine) => {
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
      .then(() => engine.update(TABLE_NAME, PRIMARY_KEY, updates))
      .then(primaryKey => engine.read<DomainEntity>(TABLE_NAME, primaryKey))
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
