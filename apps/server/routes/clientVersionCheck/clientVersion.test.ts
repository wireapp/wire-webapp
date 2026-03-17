import assert from 'node:assert';
import {parseClientVersion} from './clientVersion';

describe('client version', () => {
  it('returns an Result Err when the version number is not a date', () => {
    const actual = parseClientVersion('not-a-date');

    expect(actual.isErr).toBe(true);
  });

  it('returns an Result Err when the version number is missing the time', () => {
    const actual = parseClientVersion('2026.02.11');

    expect(actual.isErr).toBe(true);
  });

  it('returns an Result Err when the version number is an empty string', () => {
    const actual = parseClientVersion('');

    expect(actual.isErr).toBe(true);
  });

  it('returns an Result Err when the version number is a regular ISO date', () => {
    const actual = parseClientVersion('2026-02-12T17:51:00+01:00');

    expect(actual.isErr).toBe(true);
  });

  it('returns an Result Err when the version number is valid but includes a timezone', () => {
    const actual = parseClientVersion('2026.02.12.17.51.00+01:00');

    expect(actual.isErr).toBe(true);
  });

  it.each([
    '2026.13.12.17.51.00',
    '2026.02.30.17.51.00',
    '2026.02.12.24.00.00',
    '2026.02.12.17.60.00',
    '2026.02.12.17.51.60',
  ])(
    'returns an Result Err when the version number has out-of-range date or time values (%s)',
    invalidClientVersion => {
      const actual = parseClientVersion(invalidClientVersion);

      expect(actual.isErr).toBe(true);
    },
  );

  it('returns an Error with zod validation cause when parsing fails', () => {
    const actual = parseClientVersion('not-a-date');

    assert(actual.isErr === true);

    expect(actual.error).toBeInstanceOf(Error);
    expect(actual.error.message).toBe(
      'Invalid client version format: "not-a-date". Expected format: yyyy.MM.dd.HH.mm.ss',
    );
    expect(actual.error.cause).toBeDefined();
  });

  it('returns an Result Ok when the version number is valid', () => {
    const actual = parseClientVersion('2026.02.12.17.51.00');

    assert(actual.isOk === true);

    expect(actual.value).toStrictEqual(new Date(2026, 1, 12, 17, 51, 0));
  });
});
