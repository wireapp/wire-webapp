import {Maybe, Result} from 'true-myth';
import {parseMinimumRequiredClientBuildDate, ParseMinimumRequiredClientBuildDateDependencies} from './ClientBuildDate';

const validClientVersion = '2026.02.12.17.51.00';

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
  it('returns a Nothing when no client version is configured', () => {
    const parseClientVersion = jest.fn();
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion,
      clientVersion: undefined,
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.nothing());
    expect(parseClientVersion).not.toHaveBeenCalled();
  });

  it.each([
    {
      description: 'returns a Nothing when parseClientVersion() returns a Result Err',
      parseResult: Result.err<Date, Error>(),
      expectedResult: Maybe.nothing<Date>(),
    },
    {
      description: 'returns a Just when parseClientVersion() returns a Result Ok',
      parseResult: Result.ok(new Date(2026, 1, 12, 17, 51, 0)),
      expectedResult: Maybe.just(new Date(2026, 1, 12, 17, 51, 0)),
    },
  ])('$description', ({parseResult, expectedResult}) => {
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest.fn().mockReturnValue(parseResult),
      clientVersion: validClientVersion,
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(expectedResult);
  });
});
