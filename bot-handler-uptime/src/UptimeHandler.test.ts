import {UptimeHandler} from './UptimeHandler';

describe('UptimeHandler', () => {
  describe('getUptime', () => {
    it('returns a human-readable string', () => {
      const upTime = UptimeHandler.getUptime();
      expect(upTime.includes('second')).toBeTrue();
    });
  });
});
