import {useRelativeTimestamp} from './useRelativeTimestamp';
import {renderHook, act} from '@testing-library/react';
import {formatLocale, formatTimeShort} from 'Util/TimeUtil';

describe('useRelativeTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  it('updates the timestamp as time passes on', async () => {
    jest.setSystemTime(0);
    const timestamp = Date.now();
    const {result} = renderHook(() => useRelativeTimestamp(timestamp));
    expect(result.current).toBe('conversationJustNow');

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1001);
    });
    expect(result.current).toBe('5 minutes ago');

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 60 * 1001);
    });
    expect(result.current).toEqual(formatTimeShort(timestamp));
  });

  it.each([
    [24 * 60 * 60 * 1001, 'conversationYesterday 12:00 AM'],
    [5 * 24 * 60 * 60 * 1001, formatLocale(0, 'EEEE p')],
    [10 * 24 * 60 * 60 * 1001, 'Thursday, Jan 1, 12:00 AM'],
    [366 * 24 * 60 * 60 * 1001, 'Thursday, Jan 1 1970, 12:00 AM'],
  ])('computes the right time according to the given timestamp', async (currentTime, expected) => {
    jest.setSystemTime(currentTime);
    const {result} = renderHook(() => useRelativeTimestamp(0, true));
    expect(result.current).toEqual(expected);
  });
});
