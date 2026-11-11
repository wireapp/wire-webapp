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

import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

describe('production server artifact', () => {
  it('assembles browser-only output without requiring a server build', () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'browser-only-assembly-'));

    try {
      const serverDirectory = join(fixtureDirectory, 'apps/server');
      mkdirSync(join(serverDirectory, 'bin'), {recursive: true});
      mkdirSync(join(serverDirectory, 'build/metadata'), {recursive: true});
      mkdirSync(join(fixtureDirectory, 'apps/webapp/dist/development'), {recursive: true});
      cpSync('apps/server/bin/assembleBuild.mts', join(serverDirectory, 'bin/assembleBuild.mts'));
      writeFileSync(join(serverDirectory, 'build/metadata/version.json'), '{"version":"browser-build"}');
      writeFileSync(join(fixtureDirectory, 'apps/webapp/dist/development/index.html'), 'development browser');

      execFileSync(process.execPath, ['apps/server/bin/assembleBuild.mts', 'development', 'webapp'], {
        cwd: fixtureDirectory,
      });

      expect(readFileSync(join(serverDirectory, 'dist/static/index.html'), 'utf8')).toBe('development browser');
      expect(readFileSync(join(serverDirectory, 'dist/version.json'), 'utf8')).toBe('{"version":"browser-build"}');
      expect(existsSync(join(serverDirectory, 'dist/index.js'))).toBe(false);
    } finally {
      rmSync(fixtureDirectory, {recursive: true, force: true});
    }
  });

  it.each(['internal', 'public'])('packages the %s browser build with its server bundle', buildVariant => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'production-artifact-'));

    function writeFixtureFile(relativePath: string, contents: string): void {
      const filePath = join(fixtureDirectory, relativePath);
      mkdirSync(dirname(filePath), {recursive: true});
      writeFileSync(filePath, contents);
    }

    try {
      const runtimeFiles = [
        'index.js',
        'index.js.map',
        'dbs/GeoLite2-Country.mmdb',
        'templates/index.html',
        'certificate/development-key.pem',
        'certificate/development-cert.pem',
        'libs/wire/telemetry/embed.js',
        'robots/default.txt',
      ];
      for (const runtimeFile of runtimeFiles) {
        writeFixtureFile(`apps/server/build/bundle/${runtimeFile}`, `bundled ${runtimeFile}`);
      }
      writeFixtureFile('apps/server/build/server/index.js', 'obsolete compiled server');
      writeFixtureFile('apps/server/dist/obsolete.js', 'stale assembly');
      writeFixtureFile('apps/server/build/metadata/version.json', '{"version":"shared-build-identity"}');
      writeFixtureFile(`apps/webapp/dist/${buildVariant}/index.html`, `${buildVariant} browser`);
      writeFixtureFile('.env.defaults', 'BACKEND_NAME=example');
      writeFixtureFile('apps/server/package.json', '{"dependencies":{"unwanted":"1.0.0"}}');
      for (const scriptPath of ['apps/server/bin/assembleBuild.mts', 'tools/serverPackaging/zip.js']) {
        const destinationPath = join(fixtureDirectory, scriptPath);
        mkdirSync(dirname(destinationPath), {recursive: true});
        cpSync(join(process.cwd(), scriptPath), destinationPath);
      }
      for (const deploymentPath of ['Procfile', '.ebextensions', '.platform']) {
        cpSync(
          join(process.cwd(), 'apps/server', deploymentPath),
          join(fixtureDirectory, 'apps/server', deploymentPath),
          {
            recursive: true,
          },
        );
      }

      execFileSync(process.execPath, ['apps/server/bin/assembleBuild.mts', buildVariant, 'artifact'], {
        cwd: fixtureDirectory,
      });

      const artifactDirectory = join(fixtureDirectory, 'apps/server/dist');
      for (const runtimeFile of runtimeFiles) {
        expect(readFileSync(join(artifactDirectory, runtimeFile), 'utf8')).toBe(`bundled ${runtimeFile}`);
      }
      expect(existsSync(join(artifactDirectory, 'obsolete.js'))).toBe(false);
      expect(readFileSync(join(artifactDirectory, 'static/index.html'), 'utf8')).toBe(`${buildVariant} browser`);
      expect(readFileSync(join(artifactDirectory, 'version.json'), 'utf8')).toBe('{"version":"shared-build-identity"}');
      expect(readFileSync(join(artifactDirectory, '.env.defaults'), 'utf8')).toBe('BACKEND_NAME=example');
      expect(existsSync(join(artifactDirectory, 'static/index.js.map'))).toBe(false);

      execFileSync(process.execPath, ['tools/serverPackaging/zip.js'], {
        cwd: fixtureDirectory,
        env: {...process.env, NODE_PATH: join(process.cwd(), 'node_modules')},
      });
      const archivePath = join(artifactDirectory, 's3/ebs.zip');
      const archiveEntries = execFileSync('unzip', ['-Z1', archivePath], {encoding: 'utf8'}).trim().split('\n');
      expect(archiveEntries).toEqual(
        expect.arrayContaining([...runtimeFiles, '.env.defaults', 'Procfile', 'version.json']),
      );
      expect(archiveEntries).toEqual(expect.arrayContaining(['.platform/nginx/conf.d/proxy.conf']));
      expect(archiveEntries).not.toContain('package.json');
      expect(
        archiveEntries.some(entryPath => {
          return /npm_install|node_modules|^s3\//.test(entryPath);
        }),
      ).toBe(false);
      const processDeclaration = execFileSync('unzip', ['-p', archivePath, 'Procfile'], {encoding: 'utf8'});
      expect(processDeclaration.trim()).toBe('web: node --enable-source-maps ./index.js');
    } finally {
      rmSync(fixtureDirectory, {recursive: true, force: true});
    }
  });
});
