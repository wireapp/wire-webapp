import type {ServerConfig} from '@wireapp/config';
import {formatServerStartupMessage, logServerStartup} from './serverStartupLog';

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
    ENFORCE_HTTPS: true,
    ENVIRONMENT: 'production',
    GOOGLE_WEBMASTER_ID: '',
    OPEN_GRAPH: {
      DESCRIPTION: '',
      IMAGE_URL: '',
      TITLE: '',
    },
    PORT_HTTP: 8080,
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

describe('server startup logging', () => {
  it('formats startup message with version and commit identifiers', () => {
    const serverConfiguration = createServerConfiguration();

    const startupMessage = formatServerStartupMessage(serverConfiguration, 8080);

    expect(startupMessage).toContain('Server is running on port 8080.');
    expect(startupMessage).toContain('Deployed client version: 2026.03.16.10.30.00.');
    expect(startupMessage).toContain('Deployed commit: abc123.');
  });

  it('logs startup message through the provided dependency', () => {
    const serverConfiguration = createServerConfiguration();
    const logInformation = jest.fn();

    logServerStartup(
      {
        port: 8080,
        serverConfiguration,
      },
      {logInformation},
    );

    expect(logInformation).toHaveBeenNthCalledWith(
      1,
      'Server is running on port 8080. Deployed client version: 2026.03.16.10.30.00. Deployed commit: abc123.',
    );
  });
});
