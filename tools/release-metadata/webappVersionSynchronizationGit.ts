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

import {isError, isNonEmptyString, isString} from '@sindresorhus/is';
import {simpleGit} from 'simple-git';
import type {SimpleGit} from 'simple-git';
import {Result, Unit} from 'true-myth';
import {z} from 'zod';

import {readFile as readFileFromFileSystem, writeFile as writeFileToFileSystem} from 'node:fs/promises';
import {resolve} from 'node:path';

import {resolveNextWebAppVersion, validateMatchingWebAppPackageVersions} from './webappVersion.ts';
import type {WebAppPackageDocument, WebAppPackageDocuments} from './webappVersion.ts';
import {
  createWebAppVersionSynchronizationBranchName,
  validateWebAppVersionSynchronizationBranchName,
} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationBranch} from './webappVersionSynchronization.ts';

export type WebAppVersionSynchronizationMainSnapshot = {
  readonly commitSha: string;
  readonly rootPackageDocument: WebAppPackageDocument;
  readonly webAppPackageDocument: WebAppPackageDocument;
};

export type WebAppVersionSynchronizationBranchInspection = {
  readonly branchName: string;
  readonly mainCommitSha: string;
  readonly branchTipCommitSha: string;
  readonly baseCommitSha: string;
  readonly commitParentCount: number;
  readonly isNormalCommit: boolean;
  readonly isBasedOnMainHistory: boolean;
  readonly changedFilePaths: readonly string[];
  readonly baseRootPackageDocument: unknown;
  readonly baseWebAppPackageDocument: unknown;
  readonly branchRootPackageDocument: unknown;
  readonly branchWebAppPackageDocument: unknown;
};

export type ValidateWebAppVersionSynchronizationBranchOptions = {
  readonly branchInspection: WebAppVersionSynchronizationBranchInspection;
  readonly expectedReleaseIdentifier: string;
  readonly expectedWebAppVersion: string;
};

export type WebAppVersionSynchronizationGitClient = {
  readonly prepareLatestMain: () => Promise<Result<WebAppVersionSynchronizationMainSnapshot, Error>>;
  readonly listExistingBranchNames: (releaseIdentifier: string) => Promise<Result<readonly string[], Error>>;
  readonly inspectBranch: (
    options: InspectWebAppVersionSynchronizationBranchOptions,
  ) => Promise<Result<WebAppVersionSynchronizationBranchInspection | undefined, Error>>;
  readonly createBranchFromMain: (
    options: CreateWebAppVersionSynchronizationBranchOptions,
  ) => Promise<Result<Unit, Error>>;
  readonly readWorkingTreePackageDocuments: () => Promise<Result<WebAppPackageDocuments, Error>>;
  readonly writePackageDocuments: (
    options: WriteWebAppVersionSynchronizationPackageDocumentsOptions,
  ) => Promise<Result<Unit, Error>>;
  readonly getWorkingTreeChangedFilePaths: () => Promise<Result<readonly string[], Error>>;
  readonly commit: (options: CommitWebAppVersionSynchronizationOptions) => Promise<Result<string, Error>>;
  readonly pushBranch: (options: PushWebAppVersionSynchronizationBranchOptions) => Promise<Result<Unit, Error>>;
  readonly verifyMainCommit: (mainCommitSha: string) => Promise<Result<Unit, Error>>;
};

export type InspectWebAppVersionSynchronizationBranchOptions = {
  readonly branchName: string;
  readonly mainCommitSha: string;
};

export type CreateWebAppVersionSynchronizationBranchOptions = {
  readonly branchName: string;
  readonly mainCommitSha: string;
};

export type WriteWebAppVersionSynchronizationPackageDocumentsOptions = WebAppPackageDocuments;

export type CommitWebAppVersionSynchronizationOptions = {
  readonly message: string;
  readonly authorName: string;
  readonly authorEmail: string;
};

export type PushWebAppVersionSynchronizationBranchOptions = {
  readonly branchName: string;
};

export type CreateWebAppVersionSynchronizationGitClientOptions = {
  readonly repositoryPath: string;
  readonly fileSystem: WebAppVersionSynchronizationFileSystem;
};

export type WebAppVersionSynchronizationFileSystem = {
  readonly readFile: (filePath: string) => Promise<string>;
  readonly writeFile: (filePath: string, fileContents: string) => Promise<void>;
};

export const webAppVersionSynchronizationPackageFilePaths = ['apps/webapp/package.json', 'package.json'] as const;

type RunGitCommandOptions = {
  readonly description: string;
  readonly execute: () => Promise<string>;
};

type CreateBranchInspectionOptions = {
  readonly branchName: string;
  readonly mainCommitSha: string;
  readonly branchTipCommitSha: string;
  readonly parentCommitOutput: string;
  readonly isBasedOnMainHistory: boolean;
  readonly changedFilePaths: readonly string[];
  readonly basePackageDocuments: WebAppPackageDocuments | undefined;
  readonly branchPackageDocuments: WebAppPackageDocuments | undefined;
};

const synchronizationBranchPrefix = 'webapp-version-';
const commitShaPattern = /^[0-9a-f]{40}$/;
const packageJsonIndentationSpaces = 2;
const normalCommitPartCount = 2;
const singleCommitParentCount = 1;
const webAppPackageDocumentSchema = z.record(z.string(), z.unknown());

function errorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  return 'Unknown Git failure';
}

async function runGitCommand(options: RunGitCommandOptions): Promise<Result<string, Error>> {
  try {
    return Result.ok(await options.execute());
  } catch (error: unknown) {
    return Result.err(new Error(`${options.description}: ${errorMessage(error)}`, {cause: error}));
  }
}

export function parseWebAppVersionSynchronizationPackageDocument(
  packageContents: string,
  packagePath: string,
): Result<WebAppPackageDocument, Error> {
  if (isNonEmptyString(packageContents) === false) {
    return Result.err(new Error(`Empty package document: ${packagePath}`));
  }

  try {
    const packageDocumentResult = webAppPackageDocumentSchema.safeParse(JSON.parse(packageContents));

    if (packageDocumentResult.success === false) {
      return Result.err(new Error(`Invalid package document: ${packagePath}: ${packageDocumentResult.error.message}`));
    }

    return Result.ok(packageDocumentResult.data);
  } catch (error: unknown) {
    return Result.err(new Error(`Malformed package document: ${packagePath}: ${errorMessage(error)}`, {cause: error}));
  }
}

function parsePackageDocumentPaths(
  contents: readonly string[],
  paths: readonly string[],
): Result<WebAppPackageDocuments, Error> {
  const rootPackageContents = contents.at(0);
  const webAppPackageContents = contents.at(1);

  if (isString(rootPackageContents) === false || isString(webAppPackageContents) === false) {
    return Result.err(new Error('Git did not return both WebApp package documents'));
  }

  const rootPackageDocumentResult = parseWebAppVersionSynchronizationPackageDocument(rootPackageContents, paths[0]);
  const webAppPackageDocumentResult = parseWebAppVersionSynchronizationPackageDocument(webAppPackageContents, paths[1]);

  if (rootPackageDocumentResult.isErr) {
    return Result.err(rootPackageDocumentResult.error);
  }

  if (webAppPackageDocumentResult.isErr) {
    return Result.err(webAppPackageDocumentResult.error);
  }

  return Result.ok({
    rootPackageDocument: rootPackageDocumentResult.value,
    webAppPackageDocument: webAppPackageDocumentResult.value,
  });
}

function createPackageDocumentContents(packageDocument: WebAppPackageDocument): string {
  return `${JSON.stringify(packageDocument, null, packageJsonIndentationSpaces)}\n`;
}

function parseRemoteBranchNames(remoteBranchesOutput: string, branchPrefix: string): ReadonlySet<string> {
  return new Set(
    remoteBranchesOutput.split('\n').flatMap(remoteBranchLine => {
      const remoteBranchFields = remoteBranchLine.split('\t');
      const remoteReference = remoteBranchFields.at(1);

      if (isString(remoteReference) === false || remoteReference.startsWith('refs/heads/') === false) {
        return [];
      }

      const branchName = remoteReference.slice('refs/heads/'.length);

      if (branchName.startsWith(branchPrefix) === false) {
        return [];
      }

      return [branchName];
    }),
  );
}

function parseCommitSha(commitOutput: string, description: string): Result<string, Error> {
  const commitSha = commitOutput.trim();

  if (commitShaPattern.test(commitSha) === false) {
    return Result.err(new Error(`Malformed Git commit returned for ${description}`));
  }

  return Result.ok(commitSha);
}

function parseChangedFilePaths(changedFilesOutput: string): readonly string[] {
  return changedFilesOutput
    .split('\n')
    .map(changedFilePath => {
      return changedFilePath.trim();
    })
    .filter(changedFilePath => {
      return changedFilePath.length > 0;
    })
    .toSorted();
}

async function readPackageDocumentsAtRevision(
  git: SimpleGit,
  revision: string,
): Promise<Result<WebAppPackageDocuments, Error>> {
  const packageContents: string[] = [];

  for (const packageFilePath of ['package.json', 'apps/webapp/package.json']) {
    const packageContentsResult = await runGitCommand({
      description: `Unable to read ${packageFilePath} at ${revision}`,
      async execute() {
        return git.raw(['show', `${revision}:${packageFilePath}`]);
      },
    });

    if (packageContentsResult.isErr) {
      return Result.err(packageContentsResult.error);
    }

    packageContents.push(packageContentsResult.value);
  }

  return parsePackageDocumentPaths(packageContents, ['package.json', 'apps/webapp/package.json']);
}

function createBranchInspection(options: CreateBranchInspectionOptions): WebAppVersionSynchronizationBranchInspection {
  const parentCommitParts = options.parentCommitOutput
    .trim()
    .split(/\s+/)
    .filter(part => {
      return part.length > 0;
    });
  const isNormalCommit =
    parentCommitParts.length === normalCommitPartCount && parentCommitParts[0] === options.branchTipCommitSha;

  return {
    branchName: options.branchName,
    mainCommitSha: options.mainCommitSha,
    branchTipCommitSha: options.branchTipCommitSha,
    baseCommitSha: parentCommitParts.at(1) ?? '',
    commitParentCount: Math.max(parentCommitParts.length - singleCommitParentCount, 0),
    isNormalCommit,
    isBasedOnMainHistory: options.isBasedOnMainHistory,
    changedFilePaths: options.changedFilePaths,
    baseRootPackageDocument: options.basePackageDocuments?.rootPackageDocument,
    baseWebAppPackageDocument: options.basePackageDocuments?.webAppPackageDocument,
    branchRootPackageDocument: options.branchPackageDocuments?.rootPackageDocument,
    branchWebAppPackageDocument: options.branchPackageDocuments?.webAppPackageDocument,
  };
}

export function createRuntimeWebAppVersionSynchronizationFileSystem(): WebAppVersionSynchronizationFileSystem {
  return {
    async readFile(filePath) {
      return readFileFromFileSystem(filePath, 'utf8');
    },
    async writeFile(filePath, fileContents) {
      await writeFileToFileSystem(filePath, fileContents, 'utf8');
    },
  };
}

export function validateWebAppVersionSynchronizationBranch(
  options: ValidateWebAppVersionSynchronizationBranchOptions,
): Result<WebAppVersionSynchronizationBranch, Error> {
  const branchNameResult = validateWebAppVersionSynchronizationBranchName(options.branchInspection.branchName);

  if (branchNameResult.isErr) {
    return Result.err(branchNameResult.error);
  }

  if (branchNameResult.value.releaseIdentifier !== options.expectedReleaseIdentifier) {
    return Result.err(new Error('Synchronization branch belongs to a different release identifier'));
  }

  if (branchNameResult.value.webAppVersion !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch contains an unexpected WebApp version'));
  }

  if (options.branchInspection.mainCommitSha.length === 0) {
    return Result.err(new Error('Synchronization branch has no validated main commit'));
  }

  if (options.branchInspection.branchTipCommitSha === options.branchInspection.baseCommitSha) {
    return Result.err(new Error('Synchronization branch tip is not ahead of its base commit'));
  }

  if (options.branchInspection.commitParentCount !== 1 || options.branchInspection.isNormalCommit === false) {
    return Result.err(new Error('Synchronization branch must contain exactly one normal commit'));
  }

  if (options.branchInspection.isBasedOnMainHistory === false) {
    return Result.err(new Error('Synchronization branch base is not part of main history'));
  }

  const changedFilePaths = options.branchInspection.changedFilePaths.toSorted();

  if (changedFilePaths.join('\n') !== webAppVersionSynchronizationPackageFilePaths.join('\n')) {
    return Result.err(
      new Error(`Synchronization branch changes unexpected files: ${changedFilePaths.join(', ') || 'none'}`),
    );
  }

  const basePackageVersionsResult = validateMatchingWebAppPackageVersions(
    options.branchInspection.baseRootPackageDocument,
    options.branchInspection.baseWebAppPackageDocument,
  );

  if (basePackageVersionsResult.isErr) {
    return Result.err(new Error(`Synchronization branch base is invalid: ${basePackageVersionsResult.error.message}`));
  }

  const expectedNextVersionResult = resolveNextWebAppVersion(basePackageVersionsResult.value.rootVersion);

  if (expectedNextVersionResult.isErr) {
    return Result.err(expectedNextVersionResult.error);
  }

  if (expectedNextVersionResult.value !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch version does not follow its main base version'));
  }

  const branchPackageVersionsResult = validateMatchingWebAppPackageVersions(
    options.branchInspection.branchRootPackageDocument,
    options.branchInspection.branchWebAppPackageDocument,
  );

  if (branchPackageVersionsResult.isErr) {
    return Result.err(
      new Error(`Synchronization branch package files are invalid: ${branchPackageVersionsResult.error.message}`),
    );
  }

  if (branchPackageVersionsResult.value.rootVersion !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch package files contain an unexpected version'));
  }

  return Result.ok(branchNameResult.value);
}

export function createSimpleGitWebAppVersionSynchronizationClient(
  options: CreateWebAppVersionSynchronizationGitClientOptions,
): WebAppVersionSynchronizationGitClient {
  const git = simpleGit(options.repositoryPath);

  async function readCurrentMainCommit(): Promise<Result<string, Error>> {
    const commitOutputResult = await runGitCommand({
      description: 'Unable to read origin/main commit',
      async execute() {
        return git.raw(['rev-parse', 'refs/remotes/origin/main']);
      },
    });

    if (commitOutputResult.isErr) {
      return Result.err(commitOutputResult.error);
    }

    return parseCommitSha(commitOutputResult.value, 'origin/main');
  }

  async function readBranchNamesFromRemote(branchPrefix: string): Promise<Result<readonly string[], Error>> {
    const remoteBranchesResult = await runGitCommand({
      description: 'Unable to list remote WebApp version synchronization branches',
      async execute() {
        return git.raw(['ls-remote', '--heads', 'origin']);
      },
    });

    if (remoteBranchesResult.isErr) {
      return Result.err(remoteBranchesResult.error);
    }

    return Result.ok([...parseRemoteBranchNames(remoteBranchesResult.value, branchPrefix)].toSorted());
  }

  async function readPackageDocumentsFromWorkingTree(): Promise<Result<WebAppPackageDocuments, Error>> {
    const packageContents: string[] = [];

    for (const packageFilePath of ['package.json', 'apps/webapp/package.json']) {
      try {
        packageContents.push(await options.fileSystem.readFile(resolve(options.repositoryPath, packageFilePath)));
      } catch (error: unknown) {
        return Result.err(new Error(`Unable to read ${packageFilePath}: ${errorMessage(error)}`, {cause: error}));
      }
    }

    return parsePackageDocumentPaths(packageContents, ['package.json', 'apps/webapp/package.json']);
  }

  async function inspectRemoteOrLocalBranch(
    inspectOptions: InspectWebAppVersionSynchronizationBranchOptions,
  ): Promise<Result<WebAppVersionSynchronizationBranchInspection | undefined, Error>> {
    const remoteBranchOutputResult = await runGitCommand({
      description: `Unable to inspect whether branch ${inspectOptions.branchName} exists remotely`,
      async execute() {
        return git.raw(['ls-remote', '--heads', 'origin', inspectOptions.branchName]);
      },
    });

    if (remoteBranchOutputResult.isErr) {
      return Result.err(remoteBranchOutputResult.error);
    }

    const remoteBranchNames = parseRemoteBranchNames(
      remoteBranchOutputResult.value,
      `${synchronizationBranchPrefix}${inspectOptions.branchName.slice(synchronizationBranchPrefix.length)}`,
    );
    const remoteBranchExists = remoteBranchNames.has(inspectOptions.branchName);
    let branchReference: string;

    if (remoteBranchExists) {
      const fetchBranchResult = await runGitCommand({
        description: `Unable to fetch synchronization branch ${inspectOptions.branchName}`,
        async execute() {
          return git.raw([
            'fetch',
            '--no-tags',
            'origin',
            `${inspectOptions.branchName}:refs/remotes/origin/${inspectOptions.branchName}`,
          ]);
        },
      });

      if (fetchBranchResult.isErr) {
        return Result.err(fetchBranchResult.error);
      }

      branchReference = `refs/remotes/origin/${inspectOptions.branchName}`;
    } else {
      const localBranches = await git.branchLocal();

      if (localBranches.all.includes(inspectOptions.branchName) === false) {
        return Result.ok(undefined);
      }

      branchReference = `refs/heads/${inspectOptions.branchName}`;
    }

    const branchTipCommitOutputResult = await runGitCommand({
      description: `Unable to read synchronization branch ${inspectOptions.branchName} tip`,
      async execute() {
        return git.raw(['rev-parse', branchReference]);
      },
    });

    if (branchTipCommitOutputResult.isErr) {
      return Result.err(branchTipCommitOutputResult.error);
    }

    const branchTipCommitResult = parseCommitSha(
      branchTipCommitOutputResult.value,
      `synchronization branch ${inspectOptions.branchName}`,
    );

    if (branchTipCommitResult.isErr) {
      return Result.err(branchTipCommitResult.error);
    }

    const commitTypeResult = await runGitCommand({
      description: `Unable to validate synchronization branch ${inspectOptions.branchName} tip`,
      async execute() {
        return git.raw(['cat-file', '-t', branchTipCommitResult.value]);
      },
    });

    if (commitTypeResult.isErr) {
      return Result.err(commitTypeResult.error);
    }

    const parentCommitOutputResult = await runGitCommand({
      description: `Unable to read synchronization branch ${inspectOptions.branchName} history`,
      async execute() {
        return git.raw(['rev-list', '--parents', '-n', '1', branchReference]);
      },
    });

    if (parentCommitOutputResult.isErr) {
      return Result.err(parentCommitOutputResult.error);
    }

    const parentCommitParts = parentCommitOutputResult.value.trim().split(/\s+/);
    const baseCommitSha = parentCommitParts.at(1);
    let isBasedOnMainHistory = false;

    if (isString(baseCommitSha)) {
      const mergeBaseResult = await runGitCommand({
        description: `Unable to validate synchronization branch ${inspectOptions.branchName} base`,
        async execute() {
          return git.raw(['merge-base', baseCommitSha, inspectOptions.mainCommitSha]);
        },
      });

      isBasedOnMainHistory = mergeBaseResult.isOk && mergeBaseResult.value.trim() === baseCommitSha;
    }

    const changedFilePathsResult = isString(baseCommitSha)
      ? await runGitCommand({
          description: `Unable to inspect synchronization branch ${inspectOptions.branchName} changes`,
          async execute() {
            return git.raw(['diff', '--name-only', `${baseCommitSha}..${branchTipCommitResult.value}`]);
          },
        })
      : Result.ok('');

    if (changedFilePathsResult.isErr) {
      return Result.err(changedFilePathsResult.error);
    }

    const basePackageDocuments = isString(baseCommitSha)
      ? await readPackageDocumentsAtRevision(git, baseCommitSha)
      : Result.ok<WebAppPackageDocuments | undefined, Error>(undefined);
    const branchPackageDocuments = await readPackageDocumentsAtRevision(git, branchTipCommitResult.value);

    if (basePackageDocuments.isErr) {
      return Result.err(basePackageDocuments.error);
    }

    if (branchPackageDocuments.isErr) {
      return Result.err(branchPackageDocuments.error);
    }

    return Result.ok(
      createBranchInspection({
        branchName: inspectOptions.branchName,
        mainCommitSha: inspectOptions.mainCommitSha,
        branchTipCommitSha: branchTipCommitResult.value,
        parentCommitOutput: parentCommitOutputResult.value,
        isBasedOnMainHistory: isBasedOnMainHistory && commitTypeResult.value.trim() === 'commit',
        changedFilePaths: parseChangedFilePaths(changedFilePathsResult.value),
        basePackageDocuments: basePackageDocuments.value,
        branchPackageDocuments: branchPackageDocuments.value,
      }),
    );
  }

  return {
    async prepareLatestMain() {
      const status = await git.status();

      if (status.isClean() === false) {
        return Result.err(new Error('Git working tree must be clean before WebApp version synchronization'));
      }

      const fetchMainResult = await runGitCommand({
        description: 'Unable to fetch origin/main',
        async execute() {
          return git.raw(['fetch', '--no-tags', 'origin', 'main']);
        },
      });

      if (fetchMainResult.isErr) {
        return Result.err(fetchMainResult.error);
      }

      const checkoutMainResult = await runGitCommand({
        description: 'Unable to checkout origin/main',
        async execute() {
          return git.raw(['switch', '--detach', 'refs/remotes/origin/main']);
        },
      });

      if (checkoutMainResult.isErr) {
        return Result.err(checkoutMainResult.error);
      }

      const mainCommitResult = await readCurrentMainCommit();

      if (mainCommitResult.isErr) {
        return Result.err(mainCommitResult.error);
      }

      const packageDocumentsResult = await readPackageDocumentsAtRevision(git, mainCommitResult.value);

      if (packageDocumentsResult.isErr) {
        return Result.err(packageDocumentsResult.error);
      }

      return Result.ok({
        commitSha: mainCommitResult.value,
        rootPackageDocument: packageDocumentsResult.value.rootPackageDocument,
        webAppPackageDocument: packageDocumentsResult.value.webAppPackageDocument,
      });
    },

    async listExistingBranchNames(releaseIdentifier) {
      const branchNameResult = createWebAppVersionSynchronizationBranchName(releaseIdentifier, '1.0.0');

      if (branchNameResult.isErr) {
        return Result.err(branchNameResult.error);
      }

      const branchPrefix = branchNameResult.value.slice(0, -'1.0.0'.length);
      const remoteBranchNamesResult = await readBranchNamesFromRemote(branchPrefix);

      if (remoteBranchNamesResult.isErr) {
        return Result.err(remoteBranchNamesResult.error);
      }

      const localBranches = await git.branchLocal();
      const localBranchNames = localBranches.all.filter(branchName => {
        return branchName.startsWith(branchPrefix);
      });

      return Result.ok([...new Set([...remoteBranchNamesResult.value, ...localBranchNames])].toSorted());
    },

    async inspectBranch(inspectOptions) {
      const branchNameResult = validateWebAppVersionSynchronizationBranchName(inspectOptions.branchName);

      if (branchNameResult.isErr) {
        return Result.err(branchNameResult.error);
      }

      return inspectRemoteOrLocalBranch(inspectOptions);
    },

    async createBranchFromMain(createBranchOptions) {
      const branchNameResult = validateWebAppVersionSynchronizationBranchName(createBranchOptions.branchName);

      if (branchNameResult.isErr) {
        return Result.err(branchNameResult.error);
      }

      const mainCommitResult = await readCurrentMainCommit();

      if (mainCommitResult.isErr) {
        return Result.err(mainCommitResult.error);
      }

      if (mainCommitResult.value !== createBranchOptions.mainCommitSha) {
        return Result.err(new Error('origin/main changed before synchronization branch creation'));
      }

      const createBranchResult = await runGitCommand({
        description: `Unable to create synchronization branch ${createBranchOptions.branchName}`,
        async execute() {
          return git.raw(['switch', '--create', createBranchOptions.branchName, createBranchOptions.mainCommitSha]);
        },
      });

      if (createBranchResult.isErr) {
        return Result.err(createBranchResult.error);
      }

      return Result.ok();
    },

    async readWorkingTreePackageDocuments() {
      return readPackageDocumentsFromWorkingTree();
    },

    async writePackageDocuments(writeOptions) {
      const packageFiles = [
        {
          path: 'package.json',
          document: writeOptions.rootPackageDocument,
        },
        {
          path: 'apps/webapp/package.json',
          document: writeOptions.webAppPackageDocument,
        },
      ];

      try {
        for (const packageFile of packageFiles) {
          await options.fileSystem.writeFile(
            resolve(options.repositoryPath, packageFile.path),
            createPackageDocumentContents(packageFile.document),
          );
        }
      } catch (error: unknown) {
        return Result.err(
          new Error(`Unable to write WebApp package documents: ${errorMessage(error)}`, {cause: error}),
        );
      }

      return Result.ok();
    },

    async getWorkingTreeChangedFilePaths() {
      try {
        const status = await git.status();

        return Result.ok(status.files.map(file => file.path).toSorted());
      } catch (error: unknown) {
        return Result.err(new Error(`Unable to inspect Git working tree: ${errorMessage(error)}`, {cause: error}));
      }
    },

    async commit(commitOptions) {
      const addResult = await runGitCommand({
        description: 'Unable to stage WebApp package documents',
        async execute() {
          return git.raw(['add', '--', ...webAppVersionSynchronizationPackageFilePaths]);
        },
      });

      if (addResult.isErr) {
        return Result.err(addResult.error);
      }

      const commitResult = await runGitCommand({
        description: 'Unable to commit WebApp version synchronization',
        async execute() {
          return git.raw([
            '-c',
            `user.name=${commitOptions.authorName}`,
            '-c',
            `user.email=${commitOptions.authorEmail}`,
            'commit',
            '--message',
            commitOptions.message,
            '--',
            ...webAppVersionSynchronizationPackageFilePaths,
          ]);
        },
      });

      if (commitResult.isErr) {
        return Result.err(commitResult.error);
      }

      const commitShaResult = await runGitCommand({
        description: 'Unable to read WebApp synchronization commit',
        async execute() {
          return git.raw(['rev-parse', 'HEAD']);
        },
      });

      if (commitShaResult.isErr) {
        return Result.err(commitShaResult.error);
      }

      return parseCommitSha(commitShaResult.value, 'WebApp synchronization commit');
    },

    async pushBranch(pushOptions) {
      const pushResult = await runGitCommand({
        description: `Unable to push synchronization branch ${pushOptions.branchName}`,
        async execute() {
          return git.raw(['push', 'origin', `${pushOptions.branchName}:refs/heads/${pushOptions.branchName}`]);
        },
      });

      if (pushResult.isErr) {
        return Result.err(pushResult.error);
      }

      return Result.ok();
    },

    async verifyMainCommit(mainCommitSha) {
      const fetchMainResult = await runGitCommand({
        description: 'Unable to refresh origin/main before synchronization mutation',
        async execute() {
          return git.raw(['fetch', '--no-tags', 'origin', 'main']);
        },
      });

      if (fetchMainResult.isErr) {
        return Result.err(fetchMainResult.error);
      }

      const currentMainCommitResult = await readCurrentMainCommit();

      if (currentMainCommitResult.isErr) {
        return Result.err(currentMainCommitResult.error);
      }

      if (currentMainCommitResult.value !== mainCommitSha) {
        return Result.err(new Error('origin/main changed during WebApp version synchronization'));
      }

      return Result.ok();
    },
  };
}
