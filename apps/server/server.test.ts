import http from 'http';
import type {Express} from 'express';

import {createFactory} from '@enormora/objectory';
import is from '@sindresorhus/is';
import type {BuildMetadata, ClientConfig, ServerConfig} from '@wireapp/config';

import {Server} from './Server';

type HttpResponse = {
  readonly body: string;
  readonly headers: http.IncomingHttpHeaders;
  readonly statusCode: number | undefined;
};

type ServerInternals = {
  readonly app: Express;
};

const nonCacheHeaders = {
  cacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  expires: '0',
  pragma: 'no-cache',
  surrogateControl: 'no-store',
};

type ServerResponseTestCase = {
  readonly expectedBody?: string;
  readonly expectedContentType?: string;
  readonly requestPath: string;
};

const mainBuildMetadata: BuildMetadata = {
  version: 'main-bdb93c9',
  assetVersion: 'main-bdb93c9',
  commit: 'bdb93c9269866d577c012f3a781cbe904f7bf47c',
  builtAt: '2026-07-20T14:43:21.123Z',
};

const releaseBuildMetadata: BuildMetadata = {
  version: '2026-07-20.1',
  assetVersion: '2026-07-20.1-025edc6',
  commit: '025edc663787b3d2da366f21a5958013201e6cd4',
  builtAt: '2026-07-20T06:18:03.123Z',
};

const nonCacheableResponseTestCaseFactory = createFactory<ServerResponseTestCase>(() => {
  return {
    expectedContentType: 'application/javascript',
    requestPath: '/config.js',
  };
});

function createServerConfiguration(): ServerConfig {
  return {
    APP_BASE: 'https://app.example.com',
    BACKEND_REST: 'https://backend.example.com',
    BACKEND_WS: 'wss://backend.example.com',
    CACHE_DURATION_SECONDS: 300,
    COMMIT: 'abc123',
    CSP: {},
    DEVELOPMENT: false,
    DEVELOPMENT_ENABLE_TLS: false,
    ENABLE_CLIENT_VERSION_ENFORCEMENT: false,
    ENABLE_DYNAMIC_HOSTNAME: false,
    ENFORCE_HTTPS: false,
    ENVIRONMENT: 'production',
    GOOGLE_WEBMASTER_ID: '',
    OPEN_GRAPH: {
      DESCRIPTION: '',
      IMAGE_URL: '',
      TITLE: '',
    },
    PORT_HTTP: 0,
    ROBOTS: {
      ALLOW: 'allow',
      ALLOWED_HOSTS: ['app.wire.com'],
      DISALLOW: 'disallow',
    },
    SSL_CERTIFICATE_KEY_PATH: '/tmp/key.pem',
    SSL_CERTIFICATE_PATH: '/tmp/cert.pem',
    VERSION: '2026.03.16.10.30.00',
  };
}

function createClientConfiguration(): ClientConfig {
  return {
    BACKEND_REST: 'https://backend.example.com',
    BACKEND_WS: 'wss://backend.example.com',
    FEATURE: {
      ENABLE_CHANNELS: true,
    },
  } as unknown as ClientConfig;
}

function getServerApplication(server: Server): Express {
  return (server as unknown as ServerInternals).app;
}

function openHttpServer(httpServer: http.Server): Promise<string> {
  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => {
      const address = httpServer.address();
      if (is.nullOrUndefined(address) || is.string(address)) {
        reject(new Error('Expected the test HTTP server to listen on a TCP port.'));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function closeHttpServer(httpServer: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.close(error => {
      if (is.error(error)) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function withHttpServer(
  clientConfiguration: ClientConfig,
  buildMetadata: BuildMetadata,
  runTest: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = new Server(createServerConfiguration(), clientConfiguration, buildMetadata);
  const httpServer = http.createServer(getServerApplication(server));
  let serverIsListening = false;

  try {
    const baseUrl = await openHttpServer(httpServer);
    serverIsListening = true;
    await runTest(baseUrl);
  } finally {
    if (serverIsListening) {
      await closeHttpServer(httpServer);
    }
  }
}

function requestHttpResponse(baseUrl: string, requestPath: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const request = http.get(`${baseUrl}${requestPath}`, response => {
      const responseBodyChunks: Buffer[] = [];

      response.on('data', responseBodyChunk => {
        responseBodyChunks.push(Buffer.from(responseBodyChunk));
      });
      response.on('end', () => {
        resolve({
          body: Buffer.concat(responseBodyChunks).toString('utf8'),
          headers: response.headers,
          statusCode: response.statusCode,
        });
      });
    });

    request.on('error', reject);
  });
}

function getResponseHeader(response: HttpResponse, headerName: string): string {
  const headerValue = response.headers[headerName];
  if (!is.string(headerValue)) {
    throw new Error(`Expected response header '${headerName}' to be a string.`);
  }

  return headerValue;
}

function expectNonCacheableResponse(response: HttpResponse): void {
  if (!is.number(response.statusCode)) {
    throw new Error('Expected the HTTP response to have a status code.');
  }

  expect(response.statusCode).toBe(200);
  expect(getResponseHeader(response, 'cache-control')).toBe(nonCacheHeaders.cacheControl);
  expect(getResponseHeader(response, 'pragma')).toBe(nonCacheHeaders.pragma);
  expect(getResponseHeader(response, 'expires')).toBe(nonCacheHeaders.expires);
  expect(getResponseHeader(response, 'surrogate-control')).toBe(nonCacheHeaders.surrogateControl);
}

describe('server response caching', () => {
  function createServerResponseTest(testCase: ServerResponseTestCase): () => Promise<void> {
    return async () => {
      const clientConfiguration = createClientConfiguration();

      await withHttpServer(clientConfiguration, mainBuildMetadata, async baseUrl => {
        const response = await requestHttpResponse(baseUrl, testCase.requestPath);

        if (testCase.expectedBody !== undefined) {
          expect(response.body).toContain(testCase.expectedBody);
        }

        if (is.nonEmptyString(testCase.expectedContentType)) {
          expect(getResponseHeader(response, 'content-type')).toContain(testCase.expectedContentType);
        }

        expectNonCacheableResponse(response);
      });
    };
  }

  [
    nonCacheableResponseTestCaseFactory.build(),
    nonCacheableResponseTestCaseFactory.build({requestPath: '/config.js?v=immutable-looking-value'}),
  ].forEach(testCase => {
    it(`returns non-cache headers for ${testCase.requestPath}`, createServerResponseTest(testCase));
  });

  it('returns the serialized runtime configuration from /config.js', async () => {
    const clientConfiguration = createClientConfiguration();

    await withHttpServer(clientConfiguration, mainBuildMetadata, async baseUrl => {
      const response = await requestHttpResponse(baseUrl, '/config.js');

      expect(response.body).toContain(`window.wire.env = ${JSON.stringify(clientConfiguration)};`);
    });
  });

  it.each([
    {buildMetadata: mainBuildMetadata, requestPath: '/version'},
    {buildMetadata: releaseBuildMetadata, requestPath: '/version'},
    {buildMetadata: mainBuildMetadata, requestPath: '/commit'},
  ])('returns exact metadata and keeps non-cache headers for $requestPath', async testCase => {
    const clientConfiguration = createClientConfiguration();

    await withHttpServer(clientConfiguration, testCase.buildMetadata, async baseUrl => {
      const response = await requestHttpResponse(baseUrl, testCase.requestPath);

      const expectedBody = testCase.requestPath === '/version' ? JSON.stringify(testCase.buildMetadata) : 'abc123';

      expect(response.body).toBe(expectedBody);
      expectNonCacheableResponse(response);
    });
  });

  it('keeps the public cache policy for ordinary responses', async () => {
    await withHttpServer(createClientConfiguration(), mainBuildMetadata, async baseUrl => {
      const response = await requestHttpResponse(baseUrl, '/_health');

      if (!is.number(response.statusCode)) {
        throw new Error('Expected the HTTP response to have a status code.');
      }

      expect(response.statusCode).toBe(200);
      expect(getResponseHeader(response, 'cache-control')).toBe('public, max-age=300');
    });
  });
});
