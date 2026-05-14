import {tokenize, countTokens} from '../script/ai/tokenizer/tokenize';

describe('tokenize', () => {
  it('returns an array of token numbers for non-empty text', () => {
    const tokens = tokenize('hello world');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    tokens.forEach(t => expect(typeof t).toBe('number'));
  });

  it('returns an empty array for an empty string', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('countTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('returns a positive integer for non-empty text', () => {
    const count = countTokens('the quick brown fox');
    expect(count).toBeGreaterThan(0);
  });

  it('returns more tokens for longer text', () => {
    const short = countTokens('hello');
    const long = countTokens('hello world this is a longer sentence with many words in it');
    expect(long).toBeGreaterThan(short);
  });

  it('token count matches the length of the tokenize array', () => {
    const text = 'the quick brown fox jumped over the lazy dog';
    expect(countTokens(text)).toBe(tokenize(text).length);
  });

  it('handles multi-line text', () => {
    const multiLine = 'line one\nline two\nline three';
    expect(countTokens(multiLine)).toBeGreaterThan(0);
  });
});
