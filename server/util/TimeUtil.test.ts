import * as TimeUtil from './TimeUtil';

describe('TimeUtil', () => {
  beforeAll(() => {
    jasmine.clock().install();
  });

  afterAll(() => {
    jasmine.clock().uninstall();
  });

  it('formats the time correctly', () => {
    jasmine.clock().mockDate(new Date('1999-12-31T23:59:59.999Z'));

    expect(TimeUtil.formatDate()).toEqual('1999-12-31 23:59:59');

    jasmine.clock().mockDate(new Date('2000-01-01T00:00:00.000Z'));

    expect(TimeUtil.formatDate()).toEqual('2000-01-01 00:00:00');
  });
});
