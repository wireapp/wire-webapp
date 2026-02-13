import {Router, type Response} from 'express';
import {Result} from 'true-myth';
import {createClientVersionCheckRoute} from './ClientVersionCheckRoute';

type ClientVersionCheckRouteDependencyFunctionOverrides = {
  readonly get?: jest.Mock;
  readonly parseClientVersion?: jest.Mock;
};

function createClientVersionCheckRouteDependencies(overrides: ClientVersionCheckRouteDependencyFunctionOverrides = {}) {
  const get = overrides.get ?? jest.fn();
  const parseClientVersion = overrides.parseClientVersion ?? jest.fn().mockReturnValue(Result.ok(new Date()));
  const router = {get} as unknown as Router;

  return {router, parseClientVersion, get};
}

describe('/client-version-check', () => {
  it('listens on /client-version-check path', async () => {
    const dependencies = createClientVersionCheckRouteDependencies();

    createClientVersionCheckRoute(dependencies);

    expect(dependencies.get).toHaveBeenNthCalledWith(1, '/client-version-check', expect.any(Function));
  });

  it('returns HTTP 200', async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.51.00')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(dependencies.parseClientVersion).toHaveBeenNthCalledWith(1, '2026.02.12.17.51.00');
    expect(sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it.each<{headerValue: string | undefined; expectedHttpStatusCode: number}>([
    {headerValue: '', expectedHttpStatusCode: 400},
    {headerValue: undefined, expectedHttpStatusCode: 400},
  ])(
    'returns HTTP status code $expectedHttpStatusCode if header value is "$headerValue"',
    async ({headerValue, expectedHttpStatusCode}) => {
      const sendStatus = jest.fn();
      const fakeHeader = jest.fn().mockReturnValue(headerValue);
      const fakeRequest = {header: fakeHeader} as unknown as Request;
      const fakeResponse = {sendStatus} as unknown as Response;
      const dependencies = createClientVersionCheckRouteDependencies({
        get: jest.fn((_routePath, routeHandler) => {
          routeHandler(fakeRequest, fakeResponse);
        }),
      });

      createClientVersionCheckRoute(dependencies);

      expect(fakeHeader).toHaveBeenNthCalledWith(1, 'Wire-Client-Version');
      expect(dependencies.parseClientVersion).not.toHaveBeenCalled();
      expect(sendStatus).toHaveBeenNthCalledWith(1, expectedHttpStatusCode);
    },
  );

  it('returns HTTP 400 if parseClientVersion() returns a Result Err', async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue('1.0.0')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.err(new Error('invalid version'))),
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(dependencies.parseClientVersion).toHaveBeenNthCalledWith(1, '1.0.0');
    expect(sendStatus).toHaveBeenNthCalledWith(1, 400);
  });
});
