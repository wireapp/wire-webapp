import {Router, type Response, type Request} from 'express';
import {Result} from 'true-myth';
import {createClientVersionCheckRoute} from './ClientVersionCheckRoute';

type ClientVersionCheckRouteDependencyFunctionOverrides = {
  readonly get?: jest.Mock;
  readonly parseClientVersion?: jest.Mock;
  readonly deployedClientVersion?: string;
  readonly isClientVersionEnforcementEnabled?: boolean;
};

function createClientVersionCheckRouteDependencies(overrides: ClientVersionCheckRouteDependencyFunctionOverrides = {}) {
  const get = overrides.get ?? jest.fn();
  const parseClientVersion = overrides.parseClientVersion ?? jest.fn().mockReturnValue(Result.ok(new Date()));
  const deployedClientVersion = overrides.deployedClientVersion ?? '2026.02.12.17.51.00';
  const isClientVersionEnforcementEnabled = overrides.isClientVersionEnforcementEnabled ?? false;
  const router = {get} as unknown as Router;

  return {router, parseClientVersion, deployedClientVersion, isClientVersionEnforcementEnabled, get};
}

describe('/client-version-check', () => {
  it('listens on /client-version-check path', async () => {
    const dependencies = createClientVersionCheckRouteDependencies();

    createClientVersionCheckRoute(dependencies);

    expect(dependencies.get).toHaveBeenNthCalledWith(1, '/client-version-check', expect.any(Function));
  });

  it('returns HTTP 200 when client version enforcement is disabled and parsed client version equals deployed version', async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.51.00')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      deployedClientVersion: '2026.02.12.17.51.00',
      isClientVersionEnforcementEnabled: false,
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
    {headerValue: '   ', expectedHttpStatusCode: 400},
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

  it('returns HTTP 200 when client version enforcement is disabled and parsed client version is lower than deployed version', async () => {
    const sendStatus = jest.fn();
    const clientVersionDate = new Date(2026, 1, 12, 17, 50, 59);
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.50.59')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(clientVersionDate)),
      deployedClientVersion: '2026.02.12.17.51.00',
      isClientVersionEnforcementEnabled: false,
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it('returns HTTP 200 when client version enforcement is disabled and parsed client version is higher than deployed version', async () => {
    const sendStatus = jest.fn();
    const clientVersionDate = new Date(2026, 1, 12, 17, 51, 1);
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.51.01')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(clientVersionDate)),
      deployedClientVersion: '2026.02.12.17.51.00',
      isClientVersionEnforcementEnabled: false,
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it('returns HTTP 200 when client version enforcement is enabled and parsed client version equals deployed version', async () => {
    const sendStatus = jest.fn();
    const deployedClientVersion = '2026.02.12.17.51.00';
    const fakeRequest = {header: jest.fn().mockReturnValue(deployedClientVersion)} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(new Date(2026, 1, 12, 17, 51, 0))),
      deployedClientVersion,
      isClientVersionEnforcementEnabled: true,
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it('returns HTTP 426 with reload action when client version enforcement is enabled and parsed client version is below deployed version', async () => {
    const sendStatus = jest.fn();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({json});
    const clientVersionDate = new Date(2026, 1, 12, 17, 50, 59);
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.50.59')} as unknown as Request;
    const fakeResponse = {sendStatus, status} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(clientVersionDate)),
      deployedClientVersion: '2026.02.12.17.51.00',
      isClientVersionEnforcementEnabled: true,
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(status).toHaveBeenNthCalledWith(1, 426);
    expect(json).toHaveBeenNthCalledWith(1, {action: 'reload'});
    expect(sendStatus).not.toHaveBeenCalled();
  });

  it('returns HTTP 426 with reload action when client version enforcement is enabled and parsed client version is above deployed version', async () => {
    const sendStatus = jest.fn();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({json});
    const clientVersionDate = new Date(2026, 1, 12, 17, 51, 1);
    const fakeRequest = {header: jest.fn().mockReturnValue('2026.02.12.17.51.01')} as unknown as Request;
    const fakeResponse = {sendStatus, status} as unknown as Response;
    const dependencies = createClientVersionCheckRouteDependencies({
      parseClientVersion: jest.fn().mockReturnValue(Result.ok(clientVersionDate)),
      deployedClientVersion: '2026.02.12.17.51.00',
      isClientVersionEnforcementEnabled: true,
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    });

    createClientVersionCheckRoute(dependencies);

    expect(status).toHaveBeenNthCalledWith(1, 426);
    expect(json).toHaveBeenNthCalledWith(1, {action: 'reload'});
    expect(sendStatus).not.toHaveBeenCalled();
  });
});
