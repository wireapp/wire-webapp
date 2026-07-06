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

import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir, readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import process from 'node:process';
import type {WriteStream} from 'node:fs';

const defaultReportsDirectory = 'unit-test-reports';
const projectJsonFileName = 'project.json';

type UnknownProjectJson = {
  readonly name?: unknown;
  readonly projectType?: unknown;
  readonly targets?: unknown;
};

type TestableLibraryProject = {
  readonly name: string;
};

type NxTestCommand = {
  readonly command: string;
  readonly commandArguments: readonly string[];
};

type ReportSettings = {
  readonly branchName: string;
  readonly commitSha: string;
  readonly reportsDirectory: string;
  readonly workspaceRoot: string;
};

type PackageUnitTestResult = {
  readonly exitCode: number;
  readonly projectName: string;
};

export function sanitizeProjectNameForFileName(projectName: string): string {
  return projectName.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
}

export function createReportFileName(projectName: string, commitSha: string): string {
  return `unit-tests-${sanitizeProjectNameForFileName(projectName)}-${commitSha}.log`;
}

export function createNxTestCommand(projectName: string): NxTestCommand {
  return {
    command: './bin/yarn',
    commandArguments: ['nx', 'run', `${projectName}:test`, '--configuration=ci'],
  };
}

export async function discoverTestableLibraryProjects(
  workspaceRoot: string,
): Promise<readonly TestableLibraryProject[]> {
  const librariesDirectory = join(workspaceRoot, 'libraries');
  const libraryDirectoryEntries = await readdir(librariesDirectory, {withFileTypes: true});
  const discoveredProjects: TestableLibraryProject[] = [];

  for (const libraryDirectoryEntry of libraryDirectoryEntries) {
    if (!libraryDirectoryEntry.isDirectory()) {
      continue;
    }

    const projectJsonFilePath = join(librariesDirectory, libraryDirectoryEntry.name, projectJsonFileName);
    const projectJson = await readProjectJson(projectJsonFilePath);

    if (isTestableLibraryProject(projectJson)) {
      discoveredProjects.push({
        name: projectJson.name,
      });
    }
  }

  return discoveredProjects.toSorted((leftProject, rightProject): number => {
    return leftProject.name.localeCompare(rightProject.name);
  });
}

async function readProjectJson(projectJsonFilePath: string): Promise<UnknownProjectJson> {
  try {
    return JSON.parse(await readFile(projectJsonFilePath, 'utf8')) as UnknownProjectJson;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

function isTestableLibraryProject(projectJson: UnknownProjectJson): projectJson is UnknownProjectJson & {
  readonly name: string;
  readonly targets: Record<string, unknown>;
} {
  return (
    typeof projectJson.name === 'string' &&
    projectJson.projectType === 'library' &&
    typeof projectJson.targets === 'object' &&
    projectJson.targets !== null &&
    typeof (projectJson.targets as Record<string, unknown>).test === 'object' &&
    (projectJson.targets as Record<string, unknown>).test !== null
  );
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
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
    reportsDirectory: process.env.UNIT_TEST_REPORTS_DIRECTORY ?? defaultReportsDirectory,
    workspaceRoot: process.cwd(),
  };
}

function selectProjects(discoveredProjects: readonly TestableLibraryProject[]): readonly TestableLibraryProject[] {
  const requestedProjectName = process.env.ONLY_PROJECT;

  if (!requestedProjectName) {
    return discoveredProjects;
  }

  const requestedProject = discoveredProjects.find((project): boolean => {
    return project.name === requestedProjectName;
  });

  if (!requestedProject) {
    throw new Error(`No testable library project found for: ${requestedProjectName}`);
  }

  return [requestedProject];
}

async function runPackageUnitTestReports(reportSettings: ReportSettings): Promise<readonly PackageUnitTestResult[]> {
  const discoveredProjects = await discoverTestableLibraryProjects(reportSettings.workspaceRoot);
  const selectedProjects = selectProjects(discoveredProjects);

  if (selectedProjects.length === 0) {
    throw new Error('No testable library projects found');
  }

  if (process.argv.includes('--list-projects')) {
    for (const project of selectedProjects) {
      console.log(project.name);
    }

    return [];
  }

  await mkdir(reportSettings.reportsDirectory, {recursive: true});

  const testResults: PackageUnitTestResult[] = [];

  for (const project of selectedProjects) {
    testResults.push(await runPackageUnitTestReport(project, reportSettings));
  }

  return testResults;
}

async function runPackageUnitTestReport(
  project: TestableLibraryProject,
  reportSettings: ReportSettings,
): Promise<PackageUnitTestResult> {
  const {command, commandArguments} = createNxTestCommand(project.name);
  const commandText = [command, ...commandArguments].join(' ');
  const reportFilePath = join(
    reportSettings.reportsDirectory,
    createReportFileName(project.name, reportSettings.commitSha),
  );
  const reportWriteStream = createWriteStream(reportFilePath, {flags: 'w'});

  reportWriteStream.write(`PROJECT = ${project.name}\n`);
  reportWriteStream.write(`BRANCH = ${reportSettings.branchName}\n`);
  reportWriteStream.write(`COMMIT SHA = ${reportSettings.commitSha}\n`);
  reportWriteStream.write(`TEST RUN DATE = ${new Date().toISOString()}\n`);
  reportWriteStream.write(`COMMAND = ${commandText}\n\n`);

  console.log(`\n==> ${commandText}`);

  const exitCode = await runCommand(command, commandArguments, reportWriteStream, reportSettings.workspaceRoot);

  reportWriteStream.write(`\nEXIT CODE = ${exitCode}\n`);
  await closeWriteStream(reportWriteStream);

  return {
    exitCode,
    projectName: project.name,
  };
}

function runCommand(
  command: string,
  commandArguments: readonly string[],
  reportWriteStream: WriteStream,
  workspaceRoot: string,
): Promise<number> {
  return new Promise((resolveCommand): void => {
    let commandHasFailedToStart = false;
    const childProcess = spawn(command, commandArguments, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
    });

    childProcess.stdout.on('data', (outputChunk: Buffer): void => {
      process.stdout.write(outputChunk);
      reportWriteStream.write(outputChunk);
    });

    childProcess.stderr.on('data', (outputChunk: Buffer): void => {
      process.stderr.write(outputChunk);
      reportWriteStream.write(outputChunk);
    });

    childProcess.on('error', (error: Error): void => {
      commandHasFailedToStart = true;
      const errorMessage = `Failed to start command: ${error.message}\n`;
      process.stderr.write(errorMessage);
      reportWriteStream.write(errorMessage);
      resolveCommand(1);
    });

    childProcess.on('close', (exitCode: number | null): void => {
      if (!commandHasFailedToStart) {
        resolveCommand(exitCode ?? 1);
      }
    });
  });
}

function closeWriteStream(reportWriteStream: WriteStream): Promise<void> {
  return new Promise((resolveClose, rejectClose): void => {
    reportWriteStream.on('error', rejectClose);
    reportWriteStream.end(resolveClose);
  });
}

async function main(): Promise<void> {
  try {
    const testResults = await runPackageUnitTestReports(readReportSettings());
    const failedProjectNames = testResults
      .filter((testResult): boolean => {
        return testResult.exitCode !== 0;
      })
      .map((testResult): string => {
        return testResult.projectName;
      });

    if (failedProjectNames.length > 0) {
      console.error(`Package unit test failures: ${failedProjectNames.join(', ')}`);
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
