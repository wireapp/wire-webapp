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

import type {ProjectGraph} from '@nx/devkit';

import {
  createCombinedReport,
  createManifest,
  createNxTestCommand,
  createProjectReport,
  createReportFileName,
  findTestableProjects,
  runProjectTestReports,
  sanitizeProjectNameForFileName,
} from './generateUnitTestReports';
import type {ProjectTestResult, ReportSettings, TestableProject} from './generateUnitTestReports';

const reportSettings: ReportSettings = {
  branchName: 'dev',
  combinedReportFile: 'unit-tests.log',
  commitSha: 'abc123',
  reportsDirectory: 'unit-test-reports',
  runDate: '2026-07-10T12:00:00.000Z',
  workspaceRoot: '/workspace',
};

function createProjectGraph(): ProjectGraph {
  return {
    dependencies: {},
    externalNodes: {},
    nodes: {
      webapp: {
        data: {root: 'apps/webapp', projectType: 'application', targets: {test: {}}},
        name: 'webapp',
        type: 'app',
      },
      server: {
        data: {root: 'apps/server', projectType: 'application', targets: {test: {}}},
        name: 'server',
        type: 'app',
      },
      nestedLibrary: {
        data: {root: 'libraries/client/nested', projectType: 'library', targets: {test: {}}},
        name: 'nested-library',
        type: 'lib',
      },
      untestableLibrary: {
        data: {root: 'libraries/config', projectType: 'library', targets: {build: {}}},
        name: 'untestable-library',
        type: 'lib',
      },
    },
  } as ProjectGraph;
}

function createProjectTestResult(project: TestableProject, exitCode: number, output: string): ProjectTestResult {
  return {
    command: createNxTestCommand(project.name),
    exitCode,
    output,
    project,
    reportFileName: createReportFileName(project.name, reportSettings.commitSha),
    status: exitCode === 0 ? 'passed' : 'failed',
  };
}

describe('generate-unit-test-reports', (): void => {
  it('discovers application, library, and nested projects with test targets in deterministic order', (): void => {
    const actualProjects = findTestableProjects(createProjectGraph());

    expect(actualProjects).toEqual([
      {name: 'nested-library', root: 'libraries/client/nested', type: 'lib'},
      {name: 'server', root: 'apps/server', type: 'app'},
      {name: 'webapp', root: 'apps/webapp', type: 'app'},
    ]);
  });

  it('creates the canonical verbose Nx CI test command', (): void => {
    const actualCommand = createNxTestCommand('webapp');

    expect(actualCommand).toEqual({
      command: './bin/yarn',
      commandArguments: ['nx', 'run', 'webapp:test', '--configuration=ci', '--verbose'],
    });
  });

  it('creates stable report file names from sanitized project names and commit SHA values', (): void => {
    const actualFileName = createReportFileName('@wireapp/api client', 'abc123');

    expect(actualFileName).toBe('unit-tests--wireapp-api-client-abc123.log');
  });

  it.each([
    ['api-client-lib', 'api-client-lib'],
    ['@wireapp/api client', '-wireapp-api-client'],
    ['@wireapp/react.ui_kit', '-wireapp-react.ui_kit'],
  ])('sanitizeProjectNameForFileName() maps "%s" to "%s"', (projectName, expectedSanitizedProjectName): void => {
    const actualSanitizedProjectName = sanitizeProjectNameForFileName(projectName);

    expect(actualSanitizedProjectName).toBe(expectedSanitizedProjectName);
  });

  it('writes consistent metadata into project reports and the manifest', (): void => {
    const projectTestResults = [
      createProjectTestResult({name: 'server', root: 'apps/server', type: 'app'}, 0, 'server output'),
      createProjectTestResult({name: 'webapp', root: 'apps/webapp', type: 'app'}, 1, 'webapp output'),
    ];
    const actualProjectReport = createProjectReport(projectTestResults[0], reportSettings);
    const actualManifest = createManifest(projectTestResults, reportSettings);

    expect(actualProjectReport).toContain('BRANCH = dev');
    expect(actualProjectReport).toContain('COMMIT SHA = abc123');
    expect(actualProjectReport).toContain('TEST RUN DATE = 2026-07-10T12:00:00.000Z');
    expect(actualProjectReport).toContain('STATUS = passed');
    expect(actualManifest).toEqual({
      branch: 'dev',
      commitSha: 'abc123',
      overallStatus: 'failed',
      projects: [
        {
          command: './bin/yarn nx run server:test --configuration=ci --verbose',
          exitCode: 0,
          name: 'server',
          reportFileName: 'unit-tests-server-abc123.log',
          status: 'passed',
        },
        {
          command: './bin/yarn nx run webapp:test --configuration=ci --verbose',
          exitCode: 1,
          name: 'webapp',
          reportFileName: 'unit-tests-webapp-abc123.log',
          status: 'failed',
        },
      ],
      runDate: '2026-07-10T12:00:00.000Z',
    });
  });

  it('creates a combined report with every project once in sorted order and explicit delimiters', (): void => {
    const projectTestResults = [
      createProjectTestResult({name: 'webapp', root: 'apps/webapp', type: 'app'}, 0, 'webapp output'),
      createProjectTestResult({name: 'server', root: 'apps/server', type: 'app'}, 0, 'server output'),
    ];
    const actualCombinedReport = createCombinedReport(projectTestResults, reportSettings);

    expect(actualCombinedReport).toContain('===== BEGIN PROJECT: server =====');
    expect(actualCombinedReport).toContain('===== END PROJECT: server =====');
    expect(actualCombinedReport).toContain('===== BEGIN PROJECT: webapp =====');
    expect(actualCombinedReport.indexOf('BEGIN PROJECT: server')).toBeLessThan(
      actualCombinedReport.indexOf('BEGIN PROJECT: webapp'),
    );
    expect((actualCombinedReport.match(/===== BEGIN PROJECT:/g) ?? []).length).toBe(2);
  });

  it('continues after failures and returns a failing result for the failed project', async (): Promise<void> => {
    const testableProjects = [
      {name: 'first-project', root: 'libraries/first', type: 'lib'},
      {name: 'second-project', root: 'libraries/second', type: 'lib'},
    ] satisfies readonly TestableProject[];
    const executedProjectNames: string[] = [];
    const projectTestResults = await runProjectTestReports(
      testableProjects,
      reportSettings,
      async (_command, commandArguments) => {
        const projectName = commandArguments[2].split(':')[0];
        executedProjectNames.push(projectName);

        return {exitCode: projectName === 'first-project' ? 1 : 0, output: `${projectName} output`};
      },
    );

    expect(executedProjectNames).toEqual(['first-project', 'second-project']);
    expect(projectTestResults.map((projectTestResult): string => projectTestResult.status)).toEqual([
      'failed',
      'passed',
    ]);
    expect(createManifest(projectTestResults, reportSettings).overallStatus).toBe('failed');
  });
});
