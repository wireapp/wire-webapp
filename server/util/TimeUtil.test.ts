import * as TimeUtil from './TimeUtil';

describe('TimeUtil', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('formats the time correctly', () => {
    jest.setSystemTime(new Date('1999-12-31T23:59:59.999Z'));
    expect(TimeUtil.formatDate()).toEqual('1999-12-31 23:59:59');

    jest.setSystemTime(new Date('2000-01-01T00:00:00.000Z'));
    expect(TimeUtil.formatDate()).toEqual('2000-01-01 00:00:00');
  });
});
