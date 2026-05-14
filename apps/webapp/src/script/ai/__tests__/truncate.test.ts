import {truncateTranscript} from '../tokenizer';

describe('truncateTranscript', () => {
  it('returns empty result for empty input', () => {
    const result = truncateTranscript([], 1000, 100);
    expect(result.lines).toEqual([]);
    expect(result.droppedFromStart).toBe(0);
    expect(result.truncatedPerMessage).toBe(0);
  });

  it('returns input unchanged when all lines are within budget and cap', () => {
    const input = ['Hello world', 'How are you?'];
    const result = truncateTranscript(input, 10000, 500);
    expect(result.lines).toEqual(input);
    expect(result.droppedFromStart).toBe(0);
    expect(result.truncatedPerMessage).toBe(0);
  });

  it('drops oldest lines first when total exceeds forTranscript', () => {
    const input = ['hello world this is a test message', 'another message here', 'yet another one', 'and more', 'final line'];
    const result = truncateTranscript(input, 15, 500);
    // After truncating, we expect the oldest lines to be dropped
    expect(result.droppedFromStart).toBeGreaterThan(0);
    expect(result.truncatedPerMessage).toBe(0);
    // The remaining lines should be from the end
    expect(result.lines.length).toBeLessThan(input.length);
  });

  it('appends truncation suffix to lines exceeding perMessageCap', () => {
    const longLine = 'a'.repeat(1000);
    const result = truncateTranscript([longLine], 10000, 3);
    expect(result.lines[0]).toMatch(/ …\[truncated\]$/);
    expect(result.truncatedPerMessage).toBe(1);
    expect(result.droppedFromStart).toBe(0);
  });

  it('applies per-message cap first then drops oldest lines when combined budget exceeded', () => {
    const input = ['short', 'a'.repeat(500), 'b'.repeat(500), 'c'.repeat(500)];
    const result = truncateTranscript(input, 5, 3);
    // At least one line should be truncated
    expect(result.truncatedPerMessage).toBeGreaterThanOrEqual(1);
    // At least one line should be dropped
    expect(result.droppedFromStart).toBeGreaterThanOrEqual(1);
  });
});
