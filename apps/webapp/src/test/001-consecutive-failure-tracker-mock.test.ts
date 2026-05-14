import {ConsecutiveFailureTracker} from '../script/ai/pipeline/ConsecutiveFailureTracker';

describe('ConsecutiveFailureTracker', () => {
  it('returns false when failures are below threshold', () => {
    const tracker = new ConsecutiveFailureTracker(3);
    expect(tracker.recordFailure()).toBe(false);
    expect(tracker.recordFailure()).toBe(false);
  });

  it('returns true when the failure threshold is reached', () => {
    const tracker = new ConsecutiveFailureTracker(3);
    tracker.recordFailure();
    tracker.recordFailure();
    expect(tracker.recordFailure()).toBe(true);
  });

  it('keeps returning true on subsequent failures after threshold', () => {
    const tracker = new ConsecutiveFailureTracker(2);
    tracker.recordFailure();
    tracker.recordFailure(); // threshold reached
    expect(tracker.recordFailure()).toBe(true);
  });

  it('reset() clears the failure count so threshold starts over', () => {
    const tracker = new ConsecutiveFailureTracker(2);
    tracker.recordFailure();
    tracker.recordFailure(); // threshold reached
    tracker.reset();
    expect(tracker.recordFailure()).toBe(false);
    expect(tracker.recordFailure()).toBe(true);
  });

  it('recordSuccess() resets the failure count', () => {
    const tracker = new ConsecutiveFailureTracker(2);
    tracker.recordFailure();
    tracker.recordSuccess();
    // After success, count is 0 — takes 2 more failures to reach threshold
    expect(tracker.recordFailure()).toBe(false);
    expect(tracker.recordFailure()).toBe(true);
  });

  it('interleaved success prevents threshold from being reached', () => {
    const tracker = new ConsecutiveFailureTracker(3);
    tracker.recordFailure();
    tracker.recordFailure();
    tracker.recordSuccess(); // resets count
    tracker.recordFailure();
    tracker.recordFailure();
    // Only 2 consecutive failures since the success, threshold is 3
    expect(tracker.recordFailure()).toBe(true);
  });

  it('threshold of 1 triggers immediately on first failure', () => {
    const tracker = new ConsecutiveFailureTracker(1);
    expect(tracker.recordFailure()).toBe(true);
  });
});
