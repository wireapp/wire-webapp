/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const configurationGeneratorPath = resolve(__dirname, 'server.config.ts');

type ReadServerConfigurationOptions = {
  readonly workingDirectory: string;
  readonly environment?: Readonly<Record<string, string>>;
};

function readServerConfiguration(options: ReadServerConfigurationOptions): unknown {
  const {workingDirectory, environment = {}} = options;
  const configurationProcess = spawnSync(
    process.execPath,
    [
      '--require',
      require.resolve('ts-node/register'),
      '--eval',
      `const {generateConfig} = require(process.argv[1]);
       const configuration = generateConfig(
         {commit: 'abcdef123', assetVersion: 'test-abcdef1', version: 'test', env: 'production', urls: {}},
         JSON.parse(process.argv[2])
       );
       process.stdout.write(JSON.stringify({
         certificateKeyPath: configuration.SSL_CERTIFICATE_KEY_PATH,
         certificatePath: configuration.SSL_CERTIFICATE_PATH,
         robots: configuration.ROBOTS
       }));`,
      configurationGeneratorPath,
      JSON.stringify(environment),
    ],
    {
      cwd: workingDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        TS_NODE_PROJECT: resolve(__dirname, '../tsconfig.json'),
        TS_NODE_TRANSPILE_ONLY: 'true',
      },
    },
  );

  expect(configurationProcess.error).toBeUndefined();
  expect(configurationProcess.status).toBe(0);

  const actualConfiguration: unknown = JSON.parse(configurationProcess.stdout);

  return actualConfiguration;
}

describe('server configuration runtime files', () => {
  let workingDirectory: string;

  beforeEach(() => {
    workingDirectory = realpathSync(mkdtempSync(join(tmpdir(), 'server-configuration-')));
  });

  afterEach(() => {
    rmSync(workingDirectory, {recursive: true, force: true});
  });

  it('prefers certificates in the working directory over the repository deployment fallback', () => {
    mkdirSync(join(workingDirectory, 'certificate'));
    mkdirSync(join(workingDirectory, 'apps/server/dist/certificate'), {recursive: true});
    writeFileSync(join(workingDirectory, 'certificate/development-key.pem'), 'workspace key');
    writeFileSync(join(workingDirectory, 'certificate/development-cert.pem'), 'workspace certificate');

    const actualConfiguration = readServerConfiguration({workingDirectory});

    expect(actualConfiguration).toEqual(
      expect.objectContaining({
        certificateKeyPath: join(workingDirectory, 'certificate/development-key.pem'),
        certificatePath: join(workingDirectory, 'certificate/development-cert.pem'),
      }),
    );
  });

  it('retains the repository deployment fallback when working-directory certificates are unavailable', () => {
    const actualConfiguration = readServerConfiguration({workingDirectory});

    expect(actualConfiguration).toEqual(
      expect.objectContaining({
        certificateKeyPath: join(workingDirectory, 'apps/server/dist/certificate/development-key.pem'),
        certificatePath: join(workingDirectory, 'apps/server/dist/certificate/development-cert.pem'),
      }),
    );
  });

  it('preserves explicit certificate paths and their precedence', () => {
    const actualConfiguration = readServerConfiguration({
      workingDirectory,
      environment: {
        SSL_CERTIFICATE_KEY_PATH: '/mounted/key.pem',
        SSL_CERTIFICATE_PATH: '/mounted/certificate.pem',
      },
    });

    expect(actualConfiguration).toEqual(
      expect.objectContaining({
        certificateKeyPath: '/mounted/key.pem',
        certificatePath: '/mounted/certificate.pem',
      }),
    );
  });

  it('retains the disallow fallback and does not read robots files from the working directory', () => {
    mkdirSync(join(workingDirectory, 'robots'));
    writeFileSync(join(workingDirectory, 'robots/robots.txt'), 'User-agent: *\nAllow: /');

    const actualConfiguration = readServerConfiguration({workingDirectory});

    expect(actualConfiguration).toEqual(
      expect.objectContaining({
        robots: {
          ALLOW: 'User-agent: *\r\nDisallow: /',
          ALLOWED_HOSTS: ['app.wire.com'],
          DISALLOW: 'User-agent: *\r\nDisallow: /',
        },
      }),
    );
  });
});
