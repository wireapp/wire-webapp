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

import {isUndefined} from '@sindresorhus/is';
import {Maybe, Result, Task, Unit} from 'true-myth';

import {
  resolveNextWebAppVersion,
  updateWebAppPackageDocuments,
  validateMatchingWebAppPackageVersions,
} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {
  createWebAppVersionSynchronizationBranchName,
  createWebAppVersionSynchronizationPullRequestBody,
  createWebAppVersionSynchronizationPullRequestTitle,
  parseWebAppVersionSynchronizationPullRequest,
  resolveWebAppVersionSynchronizationState,
  validateWebAppVersionSynchronizationBranchName,
} from './webappVersionSynchronization.ts';
import type {
  WebAppVersionSynchronizationBranchName,
  WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';
import {
  validateWebAppVersionSynchronizationBranch,
  webAppVersionSynchronizationPackageFilePaths,
} from './webappVersionSynchronizationGit.ts';
import type {
  CommitWebAppVersionSynchronizationOptions,
  WebAppVersionSynchronizationBranchInspection,
  WebAppVersionSynchronizationGitClient,
  WebAppVersionSynchronizationMainSnapshot,
} from './webappVersionSynchronizationGit.ts';
import type {WebAppVersionSynchronizationGitHubClient} from './webappVersionSynchronizationGitHubClient.ts';

export type InspectWebAppVersionSynchronizationOptions = {
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
};

export type WebAppVersionSynchronizationDependencies = {
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
  readonly gitClient: WebAppVersionSynchronizationGitClient;
};

export type SynchronizeWebAppVersionOptions = {
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly commitAuthorName: string;
  readonly commitAuthorEmail: string;
  readonly dependencies: WebAppVersionSynchronizationDependencies;
};

export type WebAppVersionSynchronizationAction = 'created' | 'already-open' | 'already-merged' | 'recovered';

export type WebAppVersionSynchronizationResult = {
  readonly action: WebAppVersionSynchronizationAction;
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly webAppVersion: WebAppVersion;
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
};

type SynchronizationRequestDetails = {
  readonly title: string;
  readonly body: string;
};

type AllocateWebAppVersionOptions = {
  readonly synchronizationOptions: SynchronizeWebAppVersionOptions;
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
};

type SynchronizeBranchOptions = AllocateWebAppVersionOptions & {
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly webAppVersion: WebAppVersion;
};

type CreatePullRequestOptions = SynchronizeBranchOptions & {
  readonly action: 'created' | 'recovered';
};

type ExistingSynchronizationDetails = {
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly webAppVersion: WebAppVersion;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly branchName: WebAppVersionSynchronizationBranchName;
};

export function inspectWebAppVersionSynchronization(
  options: InspectWebAppVersionSynchronizationOptions,
): Task<WebAppVersionSynchronizationInspection, Error> {
  return options.githubClient.listPullRequests().andThen(pullRequests => {
    return resolveWebAppVersionSynchronizationState(options.releaseIdentifier, options.productionTagName, pullRequests);
  });
}

function createResultFromExistingInspection(
  action: 'already-open' | 'already-merged',
  inspection: ExistingSynchronizationDetails,
): Result<Maybe<WebAppVersionSynchronizationResult>, Error> {
  return Result.ok(
    Maybe.just({
      action,
      releaseIdentifier: inspection.releaseIdentifier,
      productionTagName: inspection.productionTagName,
      webAppVersion: inspection.webAppVersion,
      branchName: inspection.branchName,
      pullRequestNumber: inspection.pullRequestNumber,
      pullRequestUrl: inspection.pullRequestUrl,
    }),
  );
}

function resolveInspectionOutcome(
  inspection: WebAppVersionSynchronizationInspection,
): Result<Maybe<WebAppVersionSynchronizationResult>, Error> {
  if (inspection.kind === 'available') {
    return Result.ok(Maybe.nothing<WebAppVersionSynchronizationResult>());
  }

  if (inspection.kind === 'matching-open') {
    return createResultFromExistingInspection('already-open', inspection);
  }

  if (inspection.kind === 'matching-merged') {
    return createResultFromExistingInspection('already-merged', inspection);
  }

  if (inspection.kind === 'closed-without-merge') {
    return Result.err(
      new Error(
        `WebApp version synchronization pull request #${inspection.pullRequestNumber} for ${inspection.releaseIdentifier} was closed without merging: ${inspection.pullRequestUrl}`,
      ),
    );
  }

  if (inspection.kind === 'blocked-by-previous-unresolved') {
    return Result.err(
      new Error(
        `WebApp version synchronization is blocked by ${inspection.blockingSynchronizationState} pull request #${inspection.pullRequestNumber} for ${inspection.blockingReleaseIdentifier}: ${inspection.pullRequestUrl}`,
      ),
    );
  }

  if (inspection.kind === 'conflict') {
    return Result.err(
      new Error(`WebApp version synchronization conflict for ${inspection.releaseIdentifier}: ${inspection.reason}`),
    );
  }

  return Result.err(new Error('Unknown WebApp version synchronization state'));
}

function resolveCurrentSynchronizationOutcome(
  options: SynchronizeWebAppVersionOptions,
): Task<Maybe<WebAppVersionSynchronizationResult>, Error> {
  return inspectWebAppVersionSynchronization({
    releaseIdentifier: options.releaseIdentifier,
    productionTagName: options.productionTagName,
    githubClient: options.dependencies.githubClient,
  }).andThen(resolveInspectionOutcome);
}

function createSynchronizationRequestDetails(
  releaseIdentifier: string,
  productionTagName: string,
  webAppVersion: WebAppVersion,
): Result<SynchronizationRequestDetails, Error> {
  const titleResult = createWebAppVersionSynchronizationPullRequestTitle(webAppVersion);

  if (titleResult.isErr) {
    return Result.err(titleResult.error);
  }

  const {value: title} = titleResult;

  const bodyResult = createWebAppVersionSynchronizationPullRequestBody({
    releaseIdentifier,
    productionTagName,
    webAppVersion,
  });

  if (bodyResult.isErr) {
    return Result.err(bodyResult.error);
  }

  const {value: body} = bodyResult;

  return Result.ok({title, body});
}

function validateExpectedWorkingTreeChanges(changedFilePaths: readonly string[]): Result<Unit, Error> {
  const sortedChangedFilePaths = changedFilePaths.toSorted();
  const expectedChangedFilePaths = webAppVersionSynchronizationPackageFilePaths.toSorted();

  if (sortedChangedFilePaths.join('\n') !== expectedChangedFilePaths.join('\n')) {
    return Result.err(
      new Error(
        `WebApp version synchronization changes unexpected files: ${sortedChangedFilePaths.join(', ') || 'none'}`,
      ),
    );
  }

  return Result.ok();
}

function prepareSynchronizationCommit(options: SynchronizeBranchOptions): Task<Unit, Error> {
  const updateResult = updateWebAppPackageDocuments({
    rootPackageDocument: options.mainSnapshot.rootPackageDocument,
    webAppPackageDocument: options.mainSnapshot.webAppPackageDocument,
    targetVersion: options.webAppVersion,
  });

  if (updateResult.isErr) {
    return Task.reject<Unit, Error>(updateResult.error);
  }

  const {value: updatedPackageDocuments} = updateResult;

  const gitClient = options.synchronizationOptions.dependencies.gitClient;

  return gitClient
    .writePackageDocuments(updatedPackageDocuments)
    .andThen(() => {
      return gitClient.readWorkingTreePackageDocuments();
    })
    .andThen(workingTreePackageDocuments => {
      const packageVersionsResult = validateMatchingWebAppPackageVersions(
        workingTreePackageDocuments.rootPackageDocument,
        workingTreePackageDocuments.webAppPackageDocument,
      );

      if (packageVersionsResult.isErr) {
        return Task.reject<readonly string[], Error>(packageVersionsResult.error);
      }

      const {value: packageVersions} = packageVersionsResult;

      if (packageVersions.rootVersion !== options.webAppVersion) {
        return Task.reject<readonly string[], Error>(
          new Error('Working tree package documents contain an unexpected WebApp version'),
        );
      }

      return gitClient.getWorkingTreeChangedFilePaths();
    })
    .andThen(validateExpectedWorkingTreeChanges);
}

function createPullRequestForBranch(
  options: CreatePullRequestOptions,
): Task<WebAppVersionSynchronizationResult, Error> {
  const requestDetailsResult = createSynchronizationRequestDetails(
    options.synchronizationOptions.releaseIdentifier,
    options.synchronizationOptions.productionTagName,
    options.webAppVersion,
  );

  if (requestDetailsResult.isErr) {
    return Task.reject<WebAppVersionSynchronizationResult, Error>(requestDetailsResult.error);
  }

  const {value: requestDetails} = requestDetailsResult;

  return options.synchronizationOptions.dependencies.githubClient
    .createPullRequest({
      title: requestDetails.title,
      body: requestDetails.body,
      headBranch: options.branchName,
    })
    .andThen(pullRequest => {
      const synchronizationRecordResult = parseWebAppVersionSynchronizationPullRequest(pullRequest);

      if (synchronizationRecordResult.isErr) {
        return Task.reject<WebAppVersionSynchronizationResult, Error>(synchronizationRecordResult.error);
      }

      const {value: synchronizationRecordMaybe} = synchronizationRecordResult;

      if (synchronizationRecordMaybe.isNothing) {
        return Task.reject<WebAppVersionSynchronizationResult, Error>(
          new Error('Created WebApp version synchronization pull request has no synchronization marker'),
        );
      }

      const {value: synchronizationRecord} = synchronizationRecordMaybe;

      if (
        synchronizationRecord.marker.releaseIdentifier !== options.synchronizationOptions.releaseIdentifier ||
        synchronizationRecord.marker.productionTagName !== options.synchronizationOptions.productionTagName ||
        synchronizationRecord.marker.webAppVersion !== options.webAppVersion ||
        synchronizationRecord.pullRequest.state !== 'open'
      ) {
        return Task.reject<WebAppVersionSynchronizationResult, Error>(
          new Error('Created pull request does not match the requested WebApp synchronization'),
        );
      }

      const branchNameResult = createWebAppVersionSynchronizationBranchName(
        synchronizationRecord.marker.releaseIdentifier,
        synchronizationRecord.marker.webAppVersion,
      );

      if (branchNameResult.isErr) {
        return Task.reject<WebAppVersionSynchronizationResult, Error>(branchNameResult.error);
      }

      const {value: validatedBranchName} = branchNameResult;

      if (validatedBranchName !== options.branchName) {
        return Task.reject<WebAppVersionSynchronizationResult, Error>(
          new Error('Created pull request uses an unexpected synchronization branch'),
        );
      }

      return Result.ok({
        action: options.action,
        releaseIdentifier: synchronizationRecord.marker.releaseIdentifier,
        productionTagName: synchronizationRecord.marker.productionTagName,
        webAppVersion: synchronizationRecord.marker.webAppVersion,
        branchName: validatedBranchName,
        pullRequestNumber: synchronizationRecord.pullRequest.number,
        pullRequestUrl: synchronizationRecord.pullRequest.url,
      });
    });
}

function recoverExistingBranch(
  options: SynchronizeBranchOptions,
  branchInspection: WebAppVersionSynchronizationBranchInspection,
): Task<WebAppVersionSynchronizationResult, Error> {
  const branchValidationResult = validateWebAppVersionSynchronizationBranch({
    branchInspection,
    expectedReleaseIdentifier: options.synchronizationOptions.releaseIdentifier,
    expectedWebAppVersion: options.webAppVersion,
  });

  if (branchValidationResult.isErr) {
    return Task.reject<WebAppVersionSynchronizationResult, Error>(branchValidationResult.error);
  }

  const gitClient = options.synchronizationOptions.dependencies.gitClient;

  return gitClient
    .verifyMainCommit(options.mainSnapshot.commitSha)
    .andThen(() => {
      return resolveCurrentSynchronizationOutcome(options.synchronizationOptions);
    })
    .andThen(currentSynchronizationOutcome => {
      if (currentSynchronizationOutcome.isJust) {
        const {value: synchronizationResult} = currentSynchronizationOutcome;

        return Result.ok(synchronizationResult);
      }

      return createPullRequestForBranch({...options, action: 'recovered'});
    });
}

function createNewSynchronizationBranch(
  options: SynchronizeBranchOptions,
): Task<WebAppVersionSynchronizationResult, Error> {
  const gitClient = options.synchronizationOptions.dependencies.gitClient;

  return gitClient
    .createBranchFromMain({
      branchName: options.branchName,
      mainCommitSha: options.mainSnapshot.commitSha,
    })
    .andThen(() => {
      return prepareSynchronizationCommit(options);
    })
    .andThen(() => {
      return resolveCurrentSynchronizationOutcome(options.synchronizationOptions);
    })
    .andThen(currentSynchronizationOutcome => {
      if (currentSynchronizationOutcome.isJust) {
        const {value: synchronizationResult} = currentSynchronizationOutcome;

        return Task.resolve<WebAppVersionSynchronizationResult, Error>(synchronizationResult);
      }

      const commitOptions: CommitWebAppVersionSynchronizationOptions = {
        message: `Update WebApp version to ${options.webAppVersion}`,
        authorName: options.synchronizationOptions.commitAuthorName,
        authorEmail: options.synchronizationOptions.commitAuthorEmail,
      };

      return gitClient
        .commit(commitOptions)
        .andThen(() => {
          return gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
        })
        .andThen(() => {
          return gitClient.pushBranch({branchName: options.branchName});
        })
        .andThen(() => {
          return gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
        })
        .andThen(() => {
          return resolveCurrentSynchronizationOutcome(options.synchronizationOptions);
        })
        .andThen(latestSynchronizationOutcome => {
          if (latestSynchronizationOutcome.isJust) {
            const {value: synchronizationResult} = latestSynchronizationOutcome;

            return Result.ok(synchronizationResult);
          }

          return createPullRequestForBranch({...options, action: 'created'});
        });
    });
}

function allocateAndSynchronizeWebAppVersion(
  options: AllocateWebAppVersionOptions,
): Task<WebAppVersionSynchronizationResult, Error> {
  const packageVersionsResult = validateMatchingWebAppPackageVersions(
    options.mainSnapshot.rootPackageDocument,
    options.mainSnapshot.webAppPackageDocument,
  );

  if (packageVersionsResult.isErr) {
    return Task.reject<WebAppVersionSynchronizationResult, Error>(packageVersionsResult.error);
  }

  const {value: packageVersions} = packageVersionsResult;

  const webAppVersionResult = resolveNextWebAppVersion(packageVersions.rootVersion);

  if (webAppVersionResult.isErr) {
    return Task.reject<WebAppVersionSynchronizationResult, Error>(webAppVersionResult.error);
  }

  const {value: webAppVersion} = webAppVersionResult;

  const expectedBranchNameResult = createWebAppVersionSynchronizationBranchName(
    options.synchronizationOptions.releaseIdentifier,
    webAppVersion,
  );

  if (expectedBranchNameResult.isErr) {
    return Task.reject<WebAppVersionSynchronizationResult, Error>(expectedBranchNameResult.error);
  }

  const {value: expectedBranchName} = expectedBranchNameResult;

  return options.synchronizationOptions.dependencies.gitClient
    .listExistingBranchNames(options.synchronizationOptions.releaseIdentifier)
    .andThen(existingBranchNames => {
      if (existingBranchNames.length > 1) {
        return Task.reject<SynchronizeBranchOptions, Error>(
          new Error(
            `Multiple WebApp version synchronization branches exist for ${options.synchronizationOptions.releaseIdentifier}`,
          ),
        );
      }

      const existingBranchName = existingBranchNames.at(0);
      const branchName = existingBranchName ?? expectedBranchName;
      const branchNameResult = validateWebAppVersionSynchronizationBranchName(branchName);

      if (branchNameResult.isErr) {
        return Task.reject<SynchronizeBranchOptions, Error>(branchNameResult.error);
      }

      const {value: validatedBranchName} = branchNameResult;

      if (validatedBranchName.releaseIdentifier !== options.synchronizationOptions.releaseIdentifier) {
        return Task.reject<SynchronizeBranchOptions, Error>(
          new Error('Existing synchronization branch belongs to a different release identifier'),
        );
      }

      if (validatedBranchName.webAppVersion !== webAppVersion) {
        return Task.reject<SynchronizeBranchOptions, Error>(
          new Error('Existing synchronization branch contains an unexpected WebApp version'),
        );
      }

      return Result.ok({
        ...options,
        branchName: validatedBranchName.branchName,
        webAppVersion,
      });
    })
    .andThen(branchOptions => {
      return options.synchronizationOptions.dependencies.gitClient
        .inspectBranch({
          branchName: branchOptions.branchName,
          mainCommitSha: options.mainSnapshot.commitSha,
        })
        .andThen(branchInspection => {
          if (isUndefined(branchInspection) === false) {
            return recoverExistingBranch(branchOptions, branchInspection);
          }

          return createNewSynchronizationBranch(branchOptions);
        });
    });
}

export function synchronizeWebAppVersion(
  options: SynchronizeWebAppVersionOptions,
): Task<WebAppVersionSynchronizationResult, Error> {
  return resolveCurrentSynchronizationOutcome(options).andThen(initialSynchronizationOutcome => {
    if (initialSynchronizationOutcome.isJust) {
      const {value: synchronizationResult} = initialSynchronizationOutcome;

      return Task.resolve<WebAppVersionSynchronizationResult, Error>(synchronizationResult);
    }

    return options.dependencies.gitClient.prepareLatestMain().andThen(mainSnapshot => {
      return resolveCurrentSynchronizationOutcome(options).andThen(postPreparationSynchronizationOutcome => {
        if (postPreparationSynchronizationOutcome.isJust) {
          const {value: synchronizationResult} = postPreparationSynchronizationOutcome;

          return Result.ok(synchronizationResult);
        }

        return allocateAndSynchronizeWebAppVersion({synchronizationOptions: options, mainSnapshot});
      });
    });
  });
}
