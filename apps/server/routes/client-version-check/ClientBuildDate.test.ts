import {Maybe, Result} from 'true-myth';
import {parseMinimumRequiredClientBuildDate, ParseMinimumRequiredClientBuildDateDependencies} from './ClientBuildDate';

const validClientVersion = '2026.02.12.17.51.00';

type Overrides = {
  readonly parseClientVersion?: jest.Mock;
  readonly clientVersion?: Maybe<string>;
  readonly deployedClientVersion?: string;
  readonly logInvalidMinimumRequiredClientBuildDate?: jest.Mock;
};

function createParseMinimumRequiredClientBuildDateDependencies(
  overrides: Overrides = {},
): ParseMinimumRequiredClientBuildDateDependencies {
  return {
    parseClientVersion: overrides.parseClientVersion ?? jest.fn(),
    clientVersion: overrides.clientVersion ?? Maybe.nothing<string>(),
    deployedClientVersion: overrides.deployedClientVersion ?? validClientVersion,
    logInvalidMinimumRequiredClientBuildDate: overrides.logInvalidMinimumRequiredClientBuildDate ?? jest.fn(),
  };
}

describe('parseMinimumRequiredClientBuildDate()', () => {
  it('returns a Nothing when no client version is configured', () => {
    const parseClientVersion = jest.fn();
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion,
      clientVersion: Maybe.nothing(),
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
      clientVersion: Maybe.just(validClientVersion),
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(expectedResult);
  });

  it('returns a Nothing and logs an error when minimum required client build date is newer than deployed client version', () => {
    const logInvalidMinimumRequiredClientBuildDate = jest.fn();
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest
        .fn()
        .mockReturnValueOnce(Result.ok(new Date(2026, 1, 12, 17, 51, 1)))
        .mockReturnValueOnce(Result.ok(new Date(2026, 1, 12, 17, 51, 0))),
      clientVersion: Maybe.just('2026.02.12.17.51.01'),
      deployedClientVersion: '2026.02.12.17.51.00',
      logInvalidMinimumRequiredClientBuildDate,
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.nothing());
    expect(logInvalidMinimumRequiredClientBuildDate).toHaveBeenNthCalledWith(
      1,
      'Ignoring MINIMUM_REQUIRED_CLIENT_BUILD_DATE="2026.02.12.17.51.01" because it is newer than deployed client version "2026.02.12.17.51.00".',
    );
  });

  it('returns a Just when minimum required client build date equals deployed client version', () => {
    const minimumRequiredClientBuildDate = new Date(2026, 1, 12, 17, 51, 0);
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(minimumRequiredClientBuildDate)),
      clientVersion: Maybe.just(validClientVersion),
      deployedClientVersion: validClientVersion,
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.just(minimumRequiredClientBuildDate));
  });

  it('returns a Just when minimum required client build date is older than deployed client version', () => {
    const minimumRequiredClientBuildDate = new Date(2026, 1, 12, 17, 51, 0);
    const dependencies = createParseMinimumRequiredClientBuildDateDependencies({
      parseClientVersion: jest
        .fn()
        .mockReturnValueOnce(Result.ok(minimumRequiredClientBuildDate))
        .mockReturnValueOnce(Result.ok(new Date(2026, 1, 12, 17, 51, 1))),
      clientVersion: Maybe.just(validClientVersion),
      deployedClientVersion: '2026.02.12.17.51.01',
    });

    expect(parseMinimumRequiredClientBuildDate(dependencies)).toStrictEqual(Maybe.just(minimumRequiredClientBuildDate));
  });
});
