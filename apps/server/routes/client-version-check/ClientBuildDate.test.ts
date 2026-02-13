import {Maybe, Result} from 'true-myth';
import {parseMinimumRequiredClientBuildDate, ParseMinimumRequiredClientBuildDateDependencies} from './ClientBuildDate';

type Overrides = {
  readonly parseClientVersion?: jest.Mock;
  readonly clientVersion?: string | undefined;
};

function createParseMinimumRequiredClientBuildDateDependencies(
  overrides: Overrides = {},
): ParseMinimumRequiredClientBuildDateDependencies {
  return {
    parseClientVersion: overrides.parseClientVersion ?? jest.fn(),
    clientVersion: overrides.clientVersion ?? undefined,
  };
}

describe('parseMinimumRequiredClientBuildDate()', () => {
  it('returns a Nothing when parseClientVersion() returns a Result Err', () => {
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.err()),
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.nothing());
  });

  it('returns a Just when parseClientVersion() returns a Result Ok', () => {
    const expectedDate = new Date(2026, 1, 12, 17, 51, 0);
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(expectedDate)),
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.just(expectedDate));
  });
});
