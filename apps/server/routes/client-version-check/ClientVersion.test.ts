import assert from 'node:assert';
import {parseClientVersion} from './ClientVersion';

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

  it('returns an Result Ok when the version number is valid', () => {
    const actual = parseClientVersion('2026.02.12.17.51.00');

    assert(actual.isOk === true);

    expect(actual.value).toStrictEqual(new Date('2026-02-12T17:51:00'));
  });
});
