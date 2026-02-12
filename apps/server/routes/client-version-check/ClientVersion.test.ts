import {parseClientVersion} from './ClientVersion';

describe('client version', () => {
  it('returns an Result Err when parsing the client fails', () => {
    const actual = parseClientVersion('2026.02.11.15.37.44');

    expect(actual.isErr).toBe(true);
  });

  // it('parses the client to a corresponding Date', () => {
  //   parseClientVersion('foo');
  // });
});
