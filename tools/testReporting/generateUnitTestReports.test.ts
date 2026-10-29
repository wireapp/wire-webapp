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

import {
  createCombinedReport,
  createJestTestCommand,
  createManifest,
  createProjectReport,
  createReportFileName,
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

function createProjectTestResult(project: TestableProject, exitCode: number, output: string): ProjectTestResult {
  return {
    command: createJestTestCommand(project),
    exitCode,
    output,
    project,
    reportFileName: createReportFileName(project.name, reportSettings.commitSha),
    status: exitCode === 0 ? 'passed' : 'failed',
  };
}

describe('generate-unit-test-reports', (): void => {
  it('creates a native Jest CI test command for each project', (): void => {
    const actualCommand = createJestTestCommand({
      jestConfigFile: 'apps/webapp/jest.config.ts',
      name: 'webapp',
      root: 'apps/webapp',
      type: 'app',
    });

    expect(actualCommand).toEqual({
      command: 'npx',
      commandArguments: [
        'jest',
        '--config',
        'apps/webapp/jest.config.ts',
        '--ci',
        '--verbose',
        '--maxWorkers=2',
        '--coverage',
      ],
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
      createProjectTestResult(
        {jestConfigFile: 'apps/server/jest.config.js', name: 'server', root: 'apps/server', type: 'app'},
        0,
        'server output',
      ),
      createProjectTestResult(
        {jestConfigFile: 'apps/webapp/jest.config.ts', name: 'webapp', root: 'apps/webapp', type: 'app'},
        1,
        'webapp output',
      ),
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
          command: 'npx jest --config apps/server/jest.config.js --ci --verbose --maxWorkers=2 --coverage',
          exitCode: 0,
          name: 'server',
          reportFileName: 'unit-tests-server-abc123.log',
          status: 'passed',
        },
        {
          command: 'npx jest --config apps/webapp/jest.config.ts --ci --verbose --maxWorkers=2 --coverage',
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
      createProjectTestResult(
        {jestConfigFile: 'apps/webapp/jest.config.ts', name: 'webapp', root: 'apps/webapp', type: 'app'},
        0,
        'webapp output',
      ),
      createProjectTestResult(
        {jestConfigFile: 'apps/server/jest.config.js', name: 'server', root: 'apps/server', type: 'app'},
        0,
        'server output',
      ),
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
      {jestConfigFile: 'libraries/first/jest.config.js', name: 'first-project', root: 'libraries/first', type: 'lib'},
      {
        jestConfigFile: 'libraries/second/jest.config.js',
        name: 'second-project',
        root: 'libraries/second',
        type: 'lib',
      },
    ] satisfies readonly TestableProject[];
    const executedProjectNames: string[] = [];
    const projectTestResults = await runProjectTestReports(
      testableProjects,
      reportSettings,
      async (command, commandArguments) => {
        expect(command).toBe('npx');

        const projectName = commandArguments.includes('libraries/first/jest.config.js')
          ? 'first-project'
          : 'second-project';
        executedProjectNames.push(projectName);

        return {exitCode: projectName === 'first-project' ? 1 : 0, output: `${projectName} output`};
      },
    );

    expect(executedProjectNames).toEqual(['first-project', 'second-project']);
    expect(
      projectTestResults.map((projectTestResult): string => {
        return projectTestResult.status;
      }),
    ).toEqual(['failed', 'passed']);
    expect(createManifest(projectTestResults, reportSettings).overallStatus).toBe('failed');
  });
});
