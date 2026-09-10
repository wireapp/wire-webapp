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

import {isError, isNonEmptyString, isString, isUndefined} from '@sindresorhus/is';
import {simpleGit} from 'simple-git';
import type {SimpleGit} from 'simple-git';
import {Result, Task, Unit, task} from 'true-myth';
import {z} from 'zod';

import {Buffer} from 'node:buffer';
import {readFile as readFileFromFileSystem, writeFile as writeFileToFileSystem} from 'node:fs/promises';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

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
  readonly prepareLatestMain: () => Task<WebAppVersionSynchronizationMainSnapshot, Error>;
  readonly listExistingBranchNames: (releaseIdentifier: string) => Task<readonly string[], Error>;
  readonly inspectBranch: (
    options: InspectWebAppVersionSynchronizationBranchOptions,
  ) => Task<WebAppVersionSynchronizationBranchInspection | undefined, Error>;
  readonly createBranchFromMain: (options: CreateWebAppVersionSynchronizationBranchOptions) => Task<Unit, Error>;
  readonly readWorkingTreePackageDocuments: () => Task<WebAppPackageDocuments, Error>;
  readonly writePackageDocuments: (
    options: WriteWebAppVersionSynchronizationPackageDocumentsOptions,
  ) => Task<Unit, Error>;
  readonly getWorkingTreeChangedFilePaths: () => Task<readonly string[], Error>;
  readonly commit: (options: CommitWebAppVersionSynchronizationOptions) => Task<string, Error>;
  readonly pushBranch: (options: PushWebAppVersionSynchronizationBranchOptions) => Task<Unit, Error>;
  readonly verifyMainCommit: (mainCommitSha: string) => Task<Unit, Error>;
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
  readonly authentication: WebAppVersionSynchronizationGitAuthentication;
};

export type WebAppVersionSynchronizationGitAuthentication = {
  readonly githubToken: string;
};

export type WebAppVersionSynchronizationFileSystem = {
  readonly readFile: (filePath: string) => Promise<string>;
  readonly writeFile: (filePath: string, fileContents: string) => Promise<void>;
};

export const webAppVersionSynchronizationPackageFilePaths = ['apps/webapp/package.json', 'package.json'] as const;

type RunGitOperationOptions<valueType> = {
  readonly description: string;
  readonly execute: () => Promise<valueType>;
  readonly redactedSecretValues?: readonly string[];
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

type ValidatePackageDocumentVersionChangeOptions = {
  readonly basePackageDocument: unknown;
  readonly branchPackageDocument: unknown;
  readonly packagePath: string;
};

const synchronizationBranchPrefix = 'webapp-version-';
const commitShaPattern = /^[0-9a-f]{40}$/;
const packageJsonIndentationSpaces = 2;
const normalCommitPartCount = 2;
const singleCommitParentCount = 1;
const webAppPackageDocumentSchema = z.record(z.string(), z.unknown());
const githubServerOrigin = 'https://github.com';
const gitAuthenticationHeaderKey = `http.${githubServerOrigin}/.extraheader`;
const gitAuthenticationHeaderPrefix = 'AUTHORIZATION: basic';

function errorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  return 'Unknown Git failure';
}

export function redactWebAppVersionSynchronizationGitFailureMessage(
  failureMessage: string,
  redactedSecretValues: readonly string[],
): string {
  return redactedSecretValues.reduce((redactedMessage, secretValue) => {
    if (isNonEmptyString(secretValue) === false) {
      return redactedMessage;
    }

    return redactedMessage.replaceAll(secretValue, '[REDACTED]');
  }, failureMessage);
}

function createGitHubBasicCredential(githubToken: string): string {
  return Buffer.from(`x-access-token:${githubToken}`, 'utf8').toString('base64');
}

export function createWebAppVersionSynchronizationGitAuthenticationEnvironment(
  authentication: WebAppVersionSynchronizationGitAuthentication,
): Readonly<Record<string, string>> {
  const basicCredential = createGitHubBasicCredential(authentication.githubToken);

  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: gitAuthenticationHeaderKey,
    GIT_CONFIG_VALUE_0: `${gitAuthenticationHeaderPrefix} ${basicCredential}`,
    GIT_TERMINAL_PROMPT: '0',
  };
}

function runGitOperation<valueType>(options: RunGitOperationOptions<valueType>): Task<valueType, Error> {
  const redactedSecretValues = options.redactedSecretValues ?? [];

  return task.tryOrElse(
    (error: unknown): Error => {
      const redactedFailureMessage = redactWebAppVersionSynchronizationGitFailureMessage(
        errorMessage(error),
        redactedSecretValues,
      );

      if (redactedSecretValues.length > 0) {
        return new Error(`${options.description}: ${redactedFailureMessage}`);
      }

      return new Error(`${options.description}: ${redactedFailureMessage}`, {cause: error});
    },
    async (): Promise<valueType> => {
      return options.execute();
    },
  );
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

function removePackageDocumentVersion(packageDocument: WebAppPackageDocument): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(packageDocument).filter(([propertyName]) => {
      return propertyName !== 'version';
    }),
  );
}

function validatePackageDocumentVersionChange(
  options: ValidatePackageDocumentVersionChangeOptions,
): Result<Unit, Error> {
  const basePackageDocumentResult = webAppPackageDocumentSchema.safeParse(options.basePackageDocument);

  if (basePackageDocumentResult.success === false) {
    return Result.err(new Error(`Synchronization branch base has an invalid ${options.packagePath}`));
  }

  const branchPackageDocumentResult = webAppPackageDocumentSchema.safeParse(options.branchPackageDocument);

  if (branchPackageDocumentResult.success === false) {
    return Result.err(new Error(`Synchronization branch tip has an invalid ${options.packagePath}`));
  }

  const basePackageDocumentWithoutVersion = removePackageDocumentVersion(basePackageDocumentResult.data);
  const branchPackageDocumentWithoutVersion = removePackageDocumentVersion(branchPackageDocumentResult.data);

  if (isDeepStrictEqual(basePackageDocumentWithoutVersion, branchPackageDocumentWithoutVersion) === false) {
    return Result.err(new Error(`Synchronization branch changes ${options.packagePath} beyond its version field`));
  }

  return Result.ok();
}

type ReadPackageDocumentAtRevisionOptions = {
  readonly git: SimpleGit;
  readonly revision: string;
  readonly packageFilePath: string;
};

function readPackageDocumentAtRevision(
  options: ReadPackageDocumentAtRevisionOptions,
): Task<WebAppPackageDocument, Error> {
  return runGitOperation({
    description: `Unable to read ${options.packageFilePath} at ${options.revision}`,
    async execute() {
      return options.git.raw(['show', `${options.revision}:${options.packageFilePath}`]);
    },
  }).andThen(packageContents => {
    return parseWebAppVersionSynchronizationPackageDocument(packageContents, options.packageFilePath);
  });
}

function readPackageDocumentsAtRevision(git: SimpleGit, revision: string): Task<WebAppPackageDocuments, Error> {
  return readPackageDocumentAtRevision({
    git,
    revision,
    packageFilePath: 'package.json',
  }).andThen(rootPackageDocument => {
    return readPackageDocumentAtRevision({
      git,
      revision,
      packageFilePath: 'apps/webapp/package.json',
    }).map(webAppPackageDocument => {
      return {rootPackageDocument, webAppPackageDocument};
    });
  });
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
  const {branchInspection} = options;
  const branchNameResult = validateWebAppVersionSynchronizationBranchName(branchInspection.branchName);

  if (branchNameResult.isErr) {
    return Result.err(branchNameResult.error);
  }

  const {value: validatedBranchName} = branchNameResult;

  if (validatedBranchName.releaseIdentifier !== options.expectedReleaseIdentifier) {
    return Result.err(new Error('Synchronization branch belongs to a different release identifier'));
  }

  if (validatedBranchName.webAppVersion !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch contains an unexpected WebApp version'));
  }

  if (branchInspection.mainCommitSha.length === 0) {
    return Result.err(new Error('Synchronization branch has no validated main commit'));
  }

  if (branchInspection.branchTipCommitSha === branchInspection.baseCommitSha) {
    return Result.err(new Error('Synchronization branch tip is not ahead of its base commit'));
  }

  if (branchInspection.commitParentCount !== 1 || branchInspection.isNormalCommit === false) {
    return Result.err(new Error('Synchronization branch must contain exactly one normal commit'));
  }

  if (branchInspection.isBasedOnMainHistory === false) {
    return Result.err(new Error('Synchronization branch base is not part of main history'));
  }

  const changedFilePaths = branchInspection.changedFilePaths.toSorted();

  if (changedFilePaths.join('\n') !== webAppVersionSynchronizationPackageFilePaths.join('\n')) {
    return Result.err(
      new Error(`Synchronization branch changes unexpected files: ${changedFilePaths.join(', ') || 'none'}`),
    );
  }

  const basePackageVersionsResult = validateMatchingWebAppPackageVersions(
    branchInspection.baseRootPackageDocument,
    branchInspection.baseWebAppPackageDocument,
  );

  if (basePackageVersionsResult.isErr) {
    return Result.err(new Error(`Synchronization branch base is invalid: ${basePackageVersionsResult.error.message}`));
  }

  const {value: basePackageVersions} = basePackageVersionsResult;
  const expectedNextVersionResult = resolveNextWebAppVersion(basePackageVersions.rootVersion);

  if (expectedNextVersionResult.isErr) {
    return Result.err(expectedNextVersionResult.error);
  }

  const {value: expectedNextVersion} = expectedNextVersionResult;

  if (expectedNextVersion !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch version does not follow its main base version'));
  }

  const branchPackageVersionsResult = validateMatchingWebAppPackageVersions(
    branchInspection.branchRootPackageDocument,
    branchInspection.branchWebAppPackageDocument,
  );

  if (branchPackageVersionsResult.isErr) {
    return Result.err(
      new Error(`Synchronization branch package files are invalid: ${branchPackageVersionsResult.error.message}`),
    );
  }

  const {value: branchPackageVersions} = branchPackageVersionsResult;

  if (branchPackageVersions.rootVersion !== options.expectedWebAppVersion) {
    return Result.err(new Error('Synchronization branch package files contain an unexpected version'));
  }

  const rootPackageDocumentChangeResult = validatePackageDocumentVersionChange({
    basePackageDocument: branchInspection.baseRootPackageDocument,
    branchPackageDocument: branchInspection.branchRootPackageDocument,
    packagePath: 'package.json',
  });

  if (rootPackageDocumentChangeResult.isErr) {
    return Result.err(rootPackageDocumentChangeResult.error);
  }

  const webAppPackageDocumentChangeResult = validatePackageDocumentVersionChange({
    basePackageDocument: branchInspection.baseWebAppPackageDocument,
    branchPackageDocument: branchInspection.branchWebAppPackageDocument,
    packagePath: 'apps/webapp/package.json',
  });

  if (webAppPackageDocumentChangeResult.isErr) {
    return Result.err(webAppPackageDocumentChangeResult.error);
  }

  return Result.ok(validatedBranchName);
}

export function createSimpleGitWebAppVersionSynchronizationClient(
  options: CreateWebAppVersionSynchronizationGitClientOptions,
): WebAppVersionSynchronizationGitClient {
  const git = simpleGit(options.repositoryPath);
  const authenticationEnvironment = createWebAppVersionSynchronizationGitAuthenticationEnvironment(
    options.authentication,
  );
  const authenticatedGit = simpleGit(options.repositoryPath).env(authenticationEnvironment);
  const basicCredential = createGitHubBasicCredential(options.authentication.githubToken);
  const redactedAuthenticationValues = [options.authentication.githubToken, basicCredential];

  function readCurrentMainCommit(): Task<string, Error> {
    return runGitOperation({
      description: 'Unable to read origin/main commit',
      async execute() {
        return git.raw(['rev-parse', 'refs/remotes/origin/main']);
      },
    }).andThen(commitOutput => {
      return parseCommitSha(commitOutput, 'origin/main');
    });
  }

  function readBranchNamesFromRemote(branchPrefix: string): Task<readonly string[], Error> {
    return runGitOperation({
      description: 'Unable to list remote WebApp version synchronization branches',
      async execute() {
        return git.raw(['ls-remote', '--heads', 'origin']);
      },
    }).map(remoteBranchesOutput => {
      return [...parseRemoteBranchNames(remoteBranchesOutput, branchPrefix)].toSorted();
    });
  }

  function readPackageContentsFromWorkingTree(packageFilePath: string): Task<WebAppPackageDocument, Error> {
    return runGitOperation({
      description: `Unable to read ${packageFilePath}`,
      async execute() {
        return options.fileSystem.readFile(resolve(options.repositoryPath, packageFilePath));
      },
    }).andThen(packageContents => {
      return parseWebAppVersionSynchronizationPackageDocument(packageContents, packageFilePath);
    });
  }

  function readPackageDocumentsFromWorkingTree(): Task<WebAppPackageDocuments, Error> {
    return readPackageContentsFromWorkingTree('package.json').andThen(rootPackageDocument => {
      return readPackageContentsFromWorkingTree('apps/webapp/package.json').map(webAppPackageDocument => {
        return {rootPackageDocument, webAppPackageDocument};
      });
    });
  }

  type ResolveBranchReferenceOptions = {
    readonly inspectOptions: InspectWebAppVersionSynchronizationBranchOptions;
    readonly git: SimpleGit;
  };

  type InspectBranchReferenceOptions = ResolveBranchReferenceOptions & {
    readonly branchReference: string;
  };

  function resolveBranchReference(options: ResolveBranchReferenceOptions): Task<string | undefined, Error> {
    return runGitOperation({
      description: `Unable to inspect whether branch ${options.inspectOptions.branchName} exists remotely`,
      async execute() {
        return options.git.raw(['ls-remote', '--heads', 'origin', options.inspectOptions.branchName]);
      },
    }).andThen(remoteBranchOutput => {
      const remoteBranchNames = parseRemoteBranchNames(
        remoteBranchOutput,
        `${synchronizationBranchPrefix}${options.inspectOptions.branchName.slice(synchronizationBranchPrefix.length)}`,
      );

      if (remoteBranchNames.has(options.inspectOptions.branchName)) {
        return runGitOperation({
          description: `Unable to fetch synchronization branch ${options.inspectOptions.branchName}`,
          async execute() {
            return options.git.raw([
              'fetch',
              '--no-tags',
              'origin',
              `${options.inspectOptions.branchName}:refs/remotes/origin/${options.inspectOptions.branchName}`,
            ]);
          },
        }).map(() => {
          return `refs/remotes/origin/${options.inspectOptions.branchName}`;
        });
      }

      return runGitOperation({
        description: `Unable to inspect local synchronization branches`,
        async execute() {
          return options.git.branchLocal();
        },
      }).map(localBranches => {
        if (localBranches.all.includes(options.inspectOptions.branchName)) {
          return `refs/heads/${options.inspectOptions.branchName}`;
        }

        return undefined;
      });
    });
  }

  function inspectBranchReference(
    options: InspectBranchReferenceOptions,
  ): Task<WebAppVersionSynchronizationBranchInspection, Error> {
    return runGitOperation({
      description: `Unable to read synchronization branch ${options.inspectOptions.branchName} tip`,
      async execute() {
        return options.git.raw(['rev-parse', options.branchReference]);
      },
    }).andThen(branchTipCommitOutput => {
      const branchTipCommitResult = parseCommitSha(
        branchTipCommitOutput,
        `synchronization branch ${options.inspectOptions.branchName}`,
      );

      if (branchTipCommitResult.isErr) {
        return Task.reject<WebAppVersionSynchronizationBranchInspection, Error>(branchTipCommitResult.error);
      }

      const {value: branchTipCommitSha} = branchTipCommitResult;

      return runGitOperation({
        description: `Unable to validate synchronization branch ${options.inspectOptions.branchName} tip`,
        async execute() {
          return options.git.raw(['cat-file', '-t', branchTipCommitSha]);
        },
      }).andThen(commitTypeOutput => {
        return runGitOperation({
          description: `Unable to read synchronization branch ${options.inspectOptions.branchName} history`,
          async execute() {
            return options.git.raw(['rev-list', '--parents', '-n', '1', options.branchReference]);
          },
        }).andThen(parentCommitOutput => {
          const parentCommitParts = parentCommitOutput.trim().split(/\s+/);
          const baseCommitSha = parentCommitParts.at(1);
          const basedOnMainHistoryTask = isString(baseCommitSha)
            ? runGitOperation({
                description: `Unable to validate synchronization branch ${options.inspectOptions.branchName} base`,
                async execute() {
                  return options.git.raw(['merge-base', baseCommitSha, options.inspectOptions.mainCommitSha]);
                },
              }).map(mergeBaseOutput => {
                return mergeBaseOutput.trim() === baseCommitSha;
              })
            : Task.resolve(false);
          const changedFilePathsTask = isString(baseCommitSha)
            ? runGitOperation({
                description: `Unable to inspect synchronization branch ${options.inspectOptions.branchName} changes`,
                async execute() {
                  return options.git.raw(['diff', '--name-only', `${baseCommitSha}..${branchTipCommitSha}`]);
                },
              }).map(parseChangedFilePaths)
            : Task.resolve<readonly string[], Error>([]);
          const basePackageDocumentsTask = isString(baseCommitSha)
            ? readPackageDocumentsAtRevision(options.git, baseCommitSha)
            : Task.resolve<WebAppPackageDocuments | undefined, Error>(undefined);

          return basedOnMainHistoryTask.andThen(isBasedOnMainHistory => {
            return changedFilePathsTask.andThen(changedFilePaths => {
              return basePackageDocumentsTask.andThen(basePackageDocuments => {
                return readPackageDocumentsAtRevision(options.git, branchTipCommitSha).map(branchPackageDocuments => {
                  return createBranchInspection({
                    branchName: options.inspectOptions.branchName,
                    mainCommitSha: options.inspectOptions.mainCommitSha,
                    branchTipCommitSha,
                    parentCommitOutput,
                    isBasedOnMainHistory: isBasedOnMainHistory && commitTypeOutput.trim() === 'commit',
                    changedFilePaths,
                    basePackageDocuments,
                    branchPackageDocuments,
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  function inspectRemoteOrLocalBranch(
    inspectOptions: InspectWebAppVersionSynchronizationBranchOptions,
  ): Task<WebAppVersionSynchronizationBranchInspection | undefined, Error> {
    return resolveBranchReference({git, inspectOptions}).andThen(branchReference => {
      if (isUndefined(branchReference)) {
        return Task.resolve<WebAppVersionSynchronizationBranchInspection | undefined, Error>(undefined);
      }

      return inspectBranchReference({git, inspectOptions, branchReference});
    });
  }

  function writePackageDocument(packageFilePath: string, packageDocument: WebAppPackageDocument): Task<Unit, Error> {
    return runGitOperation({
      description: `Unable to write ${packageFilePath}`,
      async execute() {
        await options.fileSystem.writeFile(
          resolve(options.repositoryPath, packageFilePath),
          createPackageDocumentContents(packageDocument),
        );
      },
    }).map(() => Unit);
  }

  return {
    prepareLatestMain() {
      return runGitOperation({
        description: 'Unable to inspect Git working tree',
        async execute() {
          return git.status();
        },
      })
        .andThen(status => {
          if (status.isClean() === false) {
            return Result.err(new Error('Git working tree must be clean before WebApp version synchronization'));
          }

          return runGitOperation({
            description: 'Unable to fetch origin/main',
            async execute() {
              return git.raw(['fetch', '--no-tags', 'origin', 'main']);
            },
          });
        })
        .andThen(() => {
          return runGitOperation({
            description: 'Unable to checkout origin/main',
            async execute() {
              return git.raw(['switch', '--detach', 'refs/remotes/origin/main']);
            },
          });
        })
        .andThen(() => {
          return readCurrentMainCommit();
        })
        .andThen(commitSha => {
          return readPackageDocumentsAtRevision(git, commitSha).map(packageDocuments => {
            return {
              commitSha,
              rootPackageDocument: packageDocuments.rootPackageDocument,
              webAppPackageDocument: packageDocuments.webAppPackageDocument,
            };
          });
        });
    },

    listExistingBranchNames(releaseIdentifier) {
      const branchNameResult = createWebAppVersionSynchronizationBranchName(releaseIdentifier, '1.0.0');

      if (branchNameResult.isErr) {
        return Task.reject<readonly string[], Error>(branchNameResult.error);
      }

      const {value: bootstrapBranchName} = branchNameResult;
      const branchPrefix = bootstrapBranchName.slice(0, -'1.0.0'.length);

      return readBranchNamesFromRemote(branchPrefix).andThen(remoteBranchNames => {
        return runGitOperation({
          description: 'Unable to inspect local synchronization branches',
          async execute() {
            return git.branchLocal();
          },
        }).map(localBranches => {
          const localBranchNames = localBranches.all.filter(branchName => {
            return branchName.startsWith(branchPrefix);
          });

          return [...new Set([...remoteBranchNames, ...localBranchNames])].toSorted();
        });
      });
    },

    inspectBranch(inspectOptions) {
      const branchNameResult = validateWebAppVersionSynchronizationBranchName(inspectOptions.branchName);

      if (branchNameResult.isErr) {
        return Task.reject<WebAppVersionSynchronizationBranchInspection | undefined, Error>(branchNameResult.error);
      }

      return inspectRemoteOrLocalBranch(inspectOptions);
    },

    createBranchFromMain(createBranchOptions) {
      const branchNameResult = validateWebAppVersionSynchronizationBranchName(createBranchOptions.branchName);

      if (branchNameResult.isErr) {
        return Task.reject<Unit, Error>(branchNameResult.error);
      }

      return readCurrentMainCommit().andThen(mainCommitSha => {
        if (mainCommitSha !== createBranchOptions.mainCommitSha) {
          return Result.err(new Error('origin/main changed before synchronization branch creation'));
        }

        return runGitOperation({
          description: `Unable to create synchronization branch ${createBranchOptions.branchName}`,
          async execute() {
            return git.raw(['switch', '--create', createBranchOptions.branchName, createBranchOptions.mainCommitSha]);
          },
        }).map(() => Unit);
      });
    },

    readWorkingTreePackageDocuments() {
      return readPackageDocumentsFromWorkingTree();
    },

    writePackageDocuments(writeOptions) {
      return writePackageDocument('package.json', writeOptions.rootPackageDocument).andThen(() => {
        return writePackageDocument('apps/webapp/package.json', writeOptions.webAppPackageDocument);
      });
    },

    getWorkingTreeChangedFilePaths() {
      return runGitOperation({
        description: 'Unable to inspect Git working tree',
        async execute() {
          return git.status();
        },
      }).map(status => {
        return status.files.map(file => file.path).toSorted();
      });
    },

    commit(commitOptions) {
      return runGitOperation({
        description: 'Unable to stage WebApp package documents',
        async execute() {
          return git.raw(['add', '--', ...webAppVersionSynchronizationPackageFilePaths]);
        },
      })
        .andThen(() => {
          return runGitOperation({
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
        })
        .andThen(() => {
          return runGitOperation({
            description: 'Unable to read WebApp synchronization commit',
            async execute() {
              return git.raw(['rev-parse', 'HEAD']);
            },
          });
        })
        .andThen(commitShaOutput => {
          return parseCommitSha(commitShaOutput, 'WebApp synchronization commit');
        });
    },

    pushBranch(pushOptions) {
      return runGitOperation({
        description: `Unable to push synchronization branch ${pushOptions.branchName}`,
        async execute() {
          return authenticatedGit.raw([
            'push',
            'origin',
            `${pushOptions.branchName}:refs/heads/${pushOptions.branchName}`,
          ]);
        },
        redactedSecretValues: redactedAuthenticationValues,
      }).map(() => Unit);
    },

    verifyMainCommit(mainCommitSha) {
      return runGitOperation({
        description: 'Unable to refresh origin/main before synchronization mutation',
        async execute() {
          return git.raw(['fetch', '--no-tags', 'origin', 'main']);
        },
      })
        .andThen(() => {
          return readCurrentMainCommit();
        })
        .andThen(currentMainCommitSha => {
          if (currentMainCommitSha !== mainCommitSha) {
            return Result.err(new Error('origin/main changed during WebApp version synchronization'));
          }

          return Result.ok(Unit);
        });
    },
  };
}
