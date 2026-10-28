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

import {isArray, isObject, isString} from '@sindresorhus/is';

import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {basename, join, relative, sep} from 'node:path';
import process from 'node:process';

const defaultReportsDirectory = 'target/unit-test-reports';
const defaultCombinedReportFile = 'target/unit-tests.log';
const manifestJsonIndentationSpaces = 2;

export type TestableProject = {
  readonly jestConfigFile: string;
  readonly name: string;
  readonly root: string;
  readonly type: 'app' | 'lib' | 'tool';
};

export type JestTestCommand = {
  readonly command: string;
  readonly commandArguments: readonly string[];
};

export type ReportSettings = {
  readonly branchName: string;
  readonly commitSha: string;
  readonly combinedReportFile: string;
  readonly reportsDirectory: string;
  readonly runDate: string;
  readonly workspaceRoot: string;
};

export type ProjectTestResult = {
  readonly command: JestTestCommand;
  readonly exitCode: number;
  readonly output: string;
  readonly project: TestableProject;
  readonly reportFileName: string;
  readonly status: 'passed' | 'failed';
};

export type UnitTestReportManifest = {
  readonly branch: string;
  readonly commitSha: string;
  readonly overallStatus: 'passed' | 'failed';
  readonly projects: readonly {
    readonly command: string;
    readonly exitCode: number;
    readonly name: string;
    readonly reportFileName: string;
    readonly status: 'passed' | 'failed';
  }[];
  readonly runDate: string;
};

type CommandExecutionResult = {
  readonly exitCode: number;
  readonly output: string;
};

type RunCommand = (
  command: string,
  commandArguments: readonly string[],
  workspaceRoot: string,
) => Promise<CommandExecutionResult>;

export function sanitizeProjectNameForFileName(projectName: string): string {
  return projectName.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
}

export function createReportFileName(projectName: string, commitSha: string): string {
  return `unit-tests-${sanitizeProjectNameForFileName(projectName)}-${commitSha}.log`;
}

export function createJestConfigCommand(): JestTestCommand {
  return {
    command: 'npx',
    commandArguments: ['jest', '--config', './jest.config.js', '--showConfig'],
  };
}

function findJestConfigFile(projectRoot: string, workspaceRoot: string): string {
  const projectDirectory = join(workspaceRoot, projectRoot);
  const candidateConfigFiles =
    projectRoot === '.'
      ? [join(workspaceRoot, 'tools/jest.config.js')]
      : [join(projectDirectory, 'jest.config.js'), join(projectDirectory, 'jest.config.ts')];

  for (const candidateConfigFile of candidateConfigFiles) {
    if (existsSync(candidateConfigFile)) {
      return relative(workspaceRoot, candidateConfigFile);
    }
  }

  throw new Error(`Jest configuration not found for project root: ${projectRoot}`);
}

export function findTestableProjects(jestConfigOutput: string, workspaceRoot: string): readonly TestableProject[] {
  const jsonStartIndex = jestConfigOutput.indexOf('{');

  if (jsonStartIndex === -1) {
    throw new Error('Jest did not return project configuration JSON');
  }

  const parsedJestConfiguration: unknown = JSON.parse(jestConfigOutput.slice(jsonStartIndex));

  if (!isObject(parsedJestConfiguration)) {
    throw new Error('Jest project configuration output is invalid');
  }

  const jestConfigurationRecord = parsedJestConfiguration as Record<string, unknown>;
  const projectConfigurations = jestConfigurationRecord['configs'];

  if (!isArray(projectConfigurations)) {
    throw new Error('Jest project configuration output is invalid');
  }

  const testableProjects = projectConfigurations.map((projectConfiguration): TestableProject => {
    if (!isObject(projectConfiguration)) {
      throw new Error('Jest project configuration is invalid');
    }

    const projectConfigurationRecord = projectConfiguration as Record<string, unknown>;
    const rootDirectory = projectConfigurationRecord['rootDir'];

    if (!isString(rootDirectory)) {
      throw new Error('Jest project configuration is missing its root directory');
    }

    const projectRoot = relative(workspaceRoot, rootDirectory).split(sep).join('/') || '.';
    const displayName = projectConfigurationRecord['displayName'];
    const displayNameRecord = isObject(displayName) ? (displayName as Record<string, unknown>) : undefined;
    const projectDisplayName = displayNameRecord?.['name'];
    const projectName = isString(projectDisplayName) ? projectDisplayName : basename(projectRoot);
    let projectType: TestableProject['type'];

    if (projectRoot.startsWith('apps/')) {
      projectType = 'app';
    } else if (projectRoot.startsWith('libraries/')) {
      projectType = 'lib';
    } else {
      projectType = 'tool';
    }

    return {
      jestConfigFile: findJestConfigFile(projectRoot, workspaceRoot),
      name: projectName,
      root: projectRoot,
      type: projectType,
    };
  });

  return testableProjects.toSorted((leftProject, rightProject): number => {
    return leftProject.name.localeCompare(rightProject.name);
  });
}

export async function discoverTestableProjects(): Promise<readonly TestableProject[]> {
  const jestConfigCommand = createJestConfigCommand();
  const commandResult = await runCommandAndCaptureOutput(
    jestConfigCommand.command,
    jestConfigCommand.commandArguments,
    process.cwd(),
  );

  if (commandResult.exitCode !== 0) {
    throw new Error('Failed to discover Jest projects');
  }

  return findTestableProjects(commandResult.output, process.cwd());
}

function readRequiredEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function readReportSettings(): ReportSettings {
  return {
    branchName: readRequiredEnvironmentValue('BRANCH'),
    commitSha: readRequiredEnvironmentValue('TESTED_COMMIT_SHA'),
    combinedReportFile: process.env.UNIT_TEST_REPORT_FILE ?? defaultCombinedReportFile,
    reportsDirectory: process.env.UNIT_TEST_REPORTS_DIRECTORY ?? defaultReportsDirectory,
    runDate: new Date().toISOString(),
    workspaceRoot: process.cwd(),
  };
}

export function createCommandText(jestTestCommand: JestTestCommand): string {
  return [jestTestCommand.command, ...jestTestCommand.commandArguments].join(' ');
}

export function createProjectReport(projectTestResult: ProjectTestResult, reportSettings: ReportSettings): string {
  const commandText = createCommandText(projectTestResult.command);

  return [
    '===== REPORT METADATA =====',
    `PROJECT = ${projectTestResult.project.name}`,
    `PROJECT ROOT = ${projectTestResult.project.root}`,
    `PROJECT TYPE = ${projectTestResult.project.type ?? 'unknown'}`,
    `BRANCH = ${reportSettings.branchName}`,
    `COMMIT SHA = ${reportSettings.commitSha}`,
    `TEST RUN DATE = ${reportSettings.runDate}`,
    `COMMAND = ${commandText}`,
    `EXIT CODE = ${projectTestResult.exitCode}`,
    `STATUS = ${projectTestResult.status}`,
    '===== END REPORT METADATA =====',
    '',
    projectTestResult.output,
  ].join('\n');
}

export function createManifest(
  projectTestResults: readonly ProjectTestResult[],
  reportSettings: ReportSettings,
): UnitTestReportManifest {
  return {
    branch: reportSettings.branchName,
    commitSha: reportSettings.commitSha,
    overallStatus: projectTestResults.every((projectTestResult): boolean => {
      return projectTestResult.status === 'passed';
    })
      ? 'passed'
      : 'failed',
    projects: sortProjectTestResults(projectTestResults).map(projectTestResult => {
      return {
        command: createCommandText(projectTestResult.command),
        exitCode: projectTestResult.exitCode,
        name: projectTestResult.project.name,
        reportFileName: projectTestResult.reportFileName,
        status: projectTestResult.status,
      };
    }),
    runDate: reportSettings.runDate,
  };
}

export function createCombinedReport(
  projectTestResults: readonly ProjectTestResult[],
  reportSettings: ReportSettings,
): string {
  return sortProjectTestResults(projectTestResults)
    .map((projectTestResult): string => {
      return [
        `===== BEGIN PROJECT: ${projectTestResult.project.name} =====`,
        createProjectReport(projectTestResult, reportSettings),
        `===== END PROJECT: ${projectTestResult.project.name} =====`,
      ].join('\n');
    })
    .join('\n\n');
}

function sortProjectTestResults(projectTestResults: readonly ProjectTestResult[]): readonly ProjectTestResult[] {
  return projectTestResults.toSorted((leftProjectTestResult, rightProjectTestResult): number => {
    return leftProjectTestResult.project.name.localeCompare(rightProjectTestResult.project.name);
  });
}

export function createJestTestCommand(testableProject: TestableProject): JestTestCommand {
  const coverageArguments = testableProject.type === 'tool' ? [] : ['--coverage'];

  return {
    command: 'npx',
    commandArguments: [
      'jest',
      '--config',
      testableProject.jestConfigFile,
      '--ci',
      '--verbose',
      '--maxWorkers=2',
      ...coverageArguments,
    ],
  };
}

export async function runProjectTestReports(
  testableProjects: readonly TestableProject[],
  reportSettings: ReportSettings,
  runCommand: RunCommand,
): Promise<readonly ProjectTestResult[]> {
  const projectTestResults: ProjectTestResult[] = [];

  for (const testableProject of testableProjects) {
    const jestTestCommand = createJestTestCommand(testableProject);
    console.info(`\n==> ${createCommandText(jestTestCommand)}`);
    const commandExecutionResult = await runCommand(
      jestTestCommand.command,
      jestTestCommand.commandArguments,
      reportSettings.workspaceRoot,
    );

    projectTestResults.push({
      command: jestTestCommand,
      exitCode: commandExecutionResult.exitCode,
      output: commandExecutionResult.output,
      project: testableProject,
      reportFileName: createReportFileName(testableProject.name, reportSettings.commitSha),
      status: commandExecutionResult.exitCode === 0 ? 'passed' : 'failed',
    });
  }

  return projectTestResults;
}

async function writeReports(
  projectTestResults: readonly ProjectTestResult[],
  reportSettings: ReportSettings,
): Promise<void> {
  await mkdir(reportSettings.reportsDirectory, {recursive: true});

  await Promise.all(
    projectTestResults.map(async (projectTestResult): Promise<void> => {
      await writeFile(
        join(reportSettings.reportsDirectory, projectTestResult.reportFileName),
        createProjectReport(projectTestResult, reportSettings),
      );
    }),
  );
  await writeFile(
    join(reportSettings.reportsDirectory, 'manifest.json'),
    `${JSON.stringify(createManifest(projectTestResults, reportSettings), null, manifestJsonIndentationSpaces)}\n`,
  );
  await writeFile(reportSettings.combinedReportFile, createCombinedReport(projectTestResults, reportSettings));
}

function runCommandAndCaptureOutput(
  command: string,
  commandArguments: readonly string[],
  workspaceRoot: string,
): Promise<CommandExecutionResult> {
  return new Promise((resolveCommand): void => {
    let commandHasFailedToStart = false;
    let commandOutput = '';
    const childProcess = spawn(command, commandArguments, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
    });

    childProcess.stdout.on('data', (outputChunk: Buffer): void => {
      process.stdout.write(outputChunk);
      commandOutput += outputChunk.toString();
    });

    childProcess.stderr.on('data', (outputChunk: Buffer): void => {
      process.stderr.write(outputChunk);
      commandOutput += outputChunk.toString();
    });

    childProcess.on('error', (error: Error): void => {
      commandHasFailedToStart = true;
      const errorMessage = `Failed to start command: ${error.message}\n`;
      process.stderr.write(errorMessage);
      commandOutput += errorMessage;
      resolveCommand({exitCode: 1, output: commandOutput});
    });

    childProcess.on('close', (exitCode: number | null): void => {
      if (!commandHasFailedToStart) {
        resolveCommand({exitCode: exitCode ?? 1, output: commandOutput});
      }
    });
  });
}

async function main(): Promise<void> {
  try {
    const reportSettings = readReportSettings();
    const testableProjects = await discoverTestableProjects();

    if (testableProjects.length === 0) {
      throw new Error('No Jest projects found');
    }

    if (process.argv.includes('--list-projects')) {
      for (const testableProject of testableProjects) {
        console.info(testableProject.name);
      }

      return;
    }

    const projectTestResults = await runProjectTestReports(
      testableProjects,
      reportSettings,
      runCommandAndCaptureOutput,
    );
    await writeReports(projectTestResults, reportSettings);
    const failedProjectNames = projectTestResults
      .filter((projectTestResult): boolean => {
        return projectTestResult.status === 'failed';
      })
      .map((projectTestResult): string => {
        return projectTestResult.project.name;
      });

    if (failedProjectNames.length > 0) {
      console.error(`Unit test failures: ${failedProjectNames.join(', ')}`);
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
