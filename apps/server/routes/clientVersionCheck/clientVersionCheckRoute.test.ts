import {Router, type Request, type Response} from 'express';

import {createBuildMetadata, generateClientConfig, type BuildMetadata, type Env} from '@wireapp/config';

import {createClientVersionCheckRoute} from './clientVersionCheckRoute';

const clientAssetVersionHeaderName = 'Wire-Client-Version';

type ClientVersionCheckRouteOverrides = {
  readonly deployedAssetVersion?: string;
  readonly isClientVersionEnforcementEnabled?: boolean;
};

type FakeResponse = {
  readonly response: Response;
  readonly sendStatus: jest.Mock;
  readonly set: jest.Mock;
  readonly status: jest.Mock;
  readonly json: jest.Mock;
};

type InvokedRoute = FakeResponse & {
  readonly requestHeader: jest.Mock;
};

type InvokeRouteOptions = ClientVersionCheckRouteOverrides & {
  readonly clientAssetVersion: string | undefined;
};

function createClientVersionCheckRouteDependencies(overrides: ClientVersionCheckRouteOverrides = {}) {
  const get = jest.fn();
  const router = {get} as unknown as Router;

  return {
    get,
    router,
    deployedAssetVersion: overrides.deployedAssetVersion ?? 'main-deployed',
    isClientVersionEnforcementEnabled: overrides.isClientVersionEnforcementEnabled ?? false,
  };
}

function createFakeResponse(): FakeResponse {
  const sendStatus = jest.fn();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({json});
  const set = jest.fn().mockImplementation(() => {
    return responseShape;
  });
  const responseShape = {sendStatus, set, status};

  return {
    response: responseShape as unknown as Response,
    sendStatus,
    set,
    status,
    json,
  };
}

function invokeClientVersionCheckRoute(options: InvokeRouteOptions): InvokedRoute {
  const fakeResponse = createFakeResponse();
  const requestHeader = jest.fn().mockReturnValue(options.clientAssetVersion);
  const fakeRequest = {
    header: requestHeader,
  } as unknown as Request;
  const dependencies = createClientVersionCheckRouteDependencies(options);

  dependencies.get.mockImplementation((_routePath, routeHandler) => {
    routeHandler(fakeRequest, fakeResponse.response);
  });

  createClientVersionCheckRoute(dependencies);

  return {...fakeResponse, requestHeader};
}

describe('/client-version-check', () => {
  it('listens on /client-version-check path', () => {
    const dependencies = createClientVersionCheckRouteDependencies();

    createClientVersionCheckRoute(dependencies);

    expect(dependencies.get).toHaveBeenNthCalledWith(1, '/client-version-check', expect.any(Function));
  });

  it.each([undefined, '', '   '])(
    'returns HTTP 400 for a missing or blank client asset identity (%s)',
    clientAssetVersion => {
      const fakeResponse = invokeClientVersionCheckRoute({clientAssetVersion});

      expect(fakeResponse.sendStatus).toHaveBeenNthCalledWith(1, 400);
    },
  );

  it.each(['main-aaaaaaa', 'dev-aaaaaaa', '2026-08-03.1-aaaaaaa', '2026.07.20.06.18.03'])(
    'returns HTTP 200 for non-empty identity %s when enforcement is disabled',
    clientAssetVersion => {
      const fakeResponse = invokeClientVersionCheckRoute({
        clientAssetVersion,
        deployedAssetVersion: 'main-bbbbbbb',
        isClientVersionEnforcementEnabled: false,
      });

      expect(fakeResponse.sendStatus).toHaveBeenNthCalledWith(1, 200);
      expect(fakeResponse.status).not.toHaveBeenCalled();
    },
  );

  it('returns HTTP 200 when enforcement is enabled and the asset identities match', () => {
    const deployedAssetVersion = 'main-aaaaaaa';
    const fakeResponse = invokeClientVersionCheckRoute({
      clientAssetVersion: deployedAssetVersion,
      deployedAssetVersion,
      isClientVersionEnforcementEnabled: true,
    });

    expect(fakeResponse.sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it.each([
    {
      description: 'the main artifact differs',
      clientAssetVersion: 'main-aaaaaaa',
      deployedAssetVersion: 'main-bbbbbbb',
    },
    {
      description: 'the Beta candidate differs within the same logical release',
      clientAssetVersion: '2026-08-03.1-aaaaaaa',
      deployedAssetVersion: '2026-08-03.1-bbbbbbb',
    },
    {
      description: 'the deployment was rolled back to another artifact',
      clientAssetVersion: '2026-08-03.1-bbbbbbb',
      deployedAssetVersion: '2026-08-03.1-aaaaaaa',
    },
    {
      description: 'the client has a legacy timestamp identity',
      clientAssetVersion: '2026.07.20.06.18.03',
      deployedAssetVersion: 'main-bbbbbbb',
    },
  ])('returns HTTP 426 with a reload action when $description', testCase => {
    const fakeResponse = invokeClientVersionCheckRoute({
      ...testCase,
      isClientVersionEnforcementEnabled: true,
    });

    expect(fakeResponse.status).toHaveBeenNthCalledWith(1, 426);
    expect(fakeResponse.json).toHaveBeenNthCalledWith(1, {action: 'reload'});
    expect(fakeResponse.sendStatus).not.toHaveBeenCalled();
  });

  it('accepts the asset identity produced by the shared build metadata and client configuration contract', () => {
    const buildMetadata: BuildMetadata = createBuildMetadata({
      version: '2026-08-03.1',
      commit: 'bbbbbbb1234567890',
      builtAt: '2026-08-03T10:00:00.000Z',
    });
    const clientConfiguration = generateClientConfig(
      {
        assetVersion: buildMetadata.assetVersion,
        commit: buildMetadata.commit,
        env: 'production',
        urls: {},
        version: buildMetadata.version,
      },
      {} as Env,
    );

    const fakeResponse = invokeClientVersionCheckRoute({
      clientAssetVersion: clientConfiguration.ASSET_VERSION,
      deployedAssetVersion: buildMetadata.assetVersion,
      isClientVersionEnforcementEnabled: true,
    });

    expect(clientConfiguration.ASSET_VERSION).toBe(buildMetadata.assetVersion);
    expect(fakeResponse.requestHeader).toHaveBeenCalledWith(clientAssetVersionHeaderName);
    expect(fakeResponse.sendStatus).toHaveBeenNthCalledWith(1, 200);
  });
});
