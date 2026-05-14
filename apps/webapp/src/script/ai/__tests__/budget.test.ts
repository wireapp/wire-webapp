import {computeBudget} from '../tokenizer';

describe('computeBudget', () => {
  it('returns forTranscript equal to totalAllowed when overhead is zero', () => {
    const result = computeBudget({contextSize: 8192, promptOverheadTokens: 0, safetyMarginPct: 0.2});
    expect(result.totalAllowed).toBe(6553);
    expect(result.forTranscript).toBe(6553);
  });

  it('clamps forTranscript to 0 when overhead exceeds totalAllowed', () => {
    const result = computeBudget({contextSize: 1000, promptOverheadTokens: 2000, safetyMarginPct: 0.2});
    expect(result.totalAllowed).toBe(800);
    expect(result.forTranscript).toBe(0);
  });

  it('computes correct totalAllowed and forTranscript for standard inputs', () => {
    const result = computeBudget({contextSize: 4096, promptOverheadTokens: 500, safetyMarginPct: 0.2});
    expect(result.totalAllowed).toBe(3276);
    expect(result.forTranscript).toBe(2776);
  });
});
