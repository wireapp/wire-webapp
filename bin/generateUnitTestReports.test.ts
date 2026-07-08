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

import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir as operatingSystemTemporaryDirectory} from 'node:os';

import {
  createNxTestCommand,
  createReportFileName,
  discoverTestableLibraryProjects,
  sanitizeProjectNameForFileName,
} from './generateUnitTestReports';

async function createTemporaryWorkspace(): Promise<string> {
  const temporaryWorkspacePath = await mkdtemp(join(operatingSystemTemporaryDirectory(), 'wire-unit-test-report-'));

  await mkdir(join(temporaryWorkspacePath, 'libraries'), {recursive: true});

  return temporaryWorkspacePath;
}

async function writeLibraryProjectJson(
  workspaceRoot: string,
  libraryDirectoryName: string,
  projectJson: object,
): Promise<void> {
  const libraryDirectoryPath = join(workspaceRoot, 'libraries', libraryDirectoryName);

  await mkdir(libraryDirectoryPath, {recursive: true});
  await writeFile(join(libraryDirectoryPath, 'project.json'), JSON.stringify(projectJson));
}

describe('generate-unit-test-reports', (): void => {
  it('discovers library projects with test targets from libraries project.json files', async (): Promise<void> => {
    const temporaryWorkspacePath = await createTemporaryWorkspace();
    await writeLibraryProjectJson(temporaryWorkspacePath, 'api-client', {
      name: 'api-client-lib',
      projectType: 'library',
      targets: {test: {}},
    });
    await writeLibraryProjectJson(temporaryWorkspacePath, 'server', {
      name: 'server',
      projectType: 'application',
      targets: {test: {}},
    });
    await writeLibraryProjectJson(temporaryWorkspacePath, 'config', {
      name: 'config-lib',
      projectType: 'library',
      targets: {build: {}},
    });

    const actualProjects = await discoverTestableLibraryProjects(temporaryWorkspacePath);

    expect(actualProjects).toEqual([{name: 'api-client-lib'}]);
  });

  it('creates stable report file names from sanitized project names and commit SHA values', (): void => {
    const actualFileName = createReportFileName('@wireapp/api client', 'abc123');

    expect(actualFileName).toBe('unit-tests--wireapp-api-client-abc123.log');
  });

  it('creates the required Nx CI test command', (): void => {
    const actualCommand = createNxTestCommand('api-client-lib');

    expect(actualCommand).toEqual({
      command: './bin/yarn',
      commandArguments: ['nx', 'run', 'api-client-lib:test', '--configuration=ci'],
    });
  });

  it.each([
    ['api-client-lib', 'api-client-lib'],
    ['@wireapp/api client', '-wireapp-api-client'],
    ['@wireapp/react.ui_kit', '-wireapp-react.ui_kit'],
  ])('sanitizeProjectNameForFileName() maps "%s" to "%s"', (projectName, expectedSanitizedProjectName): void => {
    const actualSanitizedProjectName = sanitizeProjectNameForFileName(projectName);

    expect(actualSanitizedProjectName).toBe(expectedSanitizedProjectName);
  });
});
