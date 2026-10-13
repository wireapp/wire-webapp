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
import {match} from 'ts-pattern';

import type {StableWebAppTagName} from './webappReleaseIdentity.ts';
import {
  compareWebAppVersions,
  resolveNextWebAppVersion,
  updateWebAppPackageDocuments,
  validateMatchingWebAppPackageVersions,
} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {
  createWebAppVersionSynchronizationBranchName,
  createWebAppVersionSynchronizationPullRequestBody,
  createWebAppVersionSynchronizationPullRequestTitle,
  createSemVerWebAppVersionSynchronizationBranchName,
  createSemVerWebAppVersionSynchronizationPullRequestBody,
  parseWebAppVersionSynchronizationRecord,
  parseWebAppVersionSynchronizationPullRequest,
  resolveSemVerWebAppVersionSynchronizationStateForRequest,
  resolveWebAppVersionSynchronizationState,
  validateWebAppVersionSynchronizationBranchName,
} from './webappVersionSynchronization.ts';
import type {
  SemVerWebAppVersionSynchronizationInspection,
  WebAppVersionSynchronizationRequest,
  WebAppVersionSynchronizationBranchName,
  WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';
import {
  validateWebAppVersionSynchronizationBranch,
  validateSemVerWebAppVersionSynchronizationBranch,
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

export type InspectSemVerWebAppVersionSynchronizationOptions = {
  readonly synchronizationRequest: Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'semver'}>;
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
};

export type SynchronizeSemVerWebAppVersionOptions = {
  readonly synchronizationRequest: Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'semver'}>;
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

export type SemVerWebAppVersionSynchronizationResult = {
  readonly action: WebAppVersionSynchronizationAction;
  readonly productionTagName: StableWebAppTagName;
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

type PrepareSynchronizationCommitOptions = {
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  readonly webAppVersion: WebAppVersion;
  readonly gitClient: WebAppVersionSynchronizationGitClient;
};

type CommitAndPushSynchronizationBranchOptions = PrepareSynchronizationCommitOptions & {
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly commitAuthorName: string;
  readonly commitAuthorEmail: string;
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
  return match(inspection)
    .with({kind: 'available'}, () => {
      return Result.ok(Maybe.nothing<WebAppVersionSynchronizationResult>());
    })
    .with({kind: 'matching-open'}, matchingInspection => {
      return createResultFromExistingInspection('already-open', matchingInspection);
    })
    .with({kind: 'matching-merged'}, matchingInspection => {
      return createResultFromExistingInspection('already-merged', matchingInspection);
    })
    .with({kind: 'closed-without-merge'}, closedInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization pull request #${closedInspection.pullRequestNumber} for ${closedInspection.releaseIdentifier} was closed without merging: ${closedInspection.pullRequestUrl}`,
        ),
      );
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization is blocked by ${blockedInspection.blockingSynchronizationState} pull request #${blockedInspection.pullRequestNumber} for ${blockedInspection.blockingReleaseIdentifier}: ${blockedInspection.pullRequestUrl}`,
        ),
      );
    })
    .with({kind: 'conflict'}, conflictingInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization conflict for ${conflictingInspection.releaseIdentifier}: ${conflictingInspection.reason}`,
        ),
      );
    })
    .exhaustive();
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

function prepareSynchronizationCommit(options: PrepareSynchronizationCommitOptions): Task<Unit, Error> {
  const updateResult = updateWebAppPackageDocuments({
    rootPackageDocument: options.mainSnapshot.rootPackageDocument,
    webAppPackageDocument: options.mainSnapshot.webAppPackageDocument,
    targetVersion: options.webAppVersion,
  });

  if (updateResult.isErr) {
    return Task.reject<Unit, Error>(updateResult.error);
  }

  const {value: updatedPackageDocuments} = updateResult;

  return options.gitClient
    .writePackageDocuments(updatedPackageDocuments)
    .andThen(() => {
      return options.gitClient.readWorkingTreePackageDocuments();
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

      return options.gitClient.getWorkingTreeChangedFilePaths();
    })
    .andThen(validateExpectedWorkingTreeChanges);
}

function commitAndPushSynchronizationBranch(options: CommitAndPushSynchronizationBranchOptions): Task<Unit, Error> {
  const commitOptions: CommitWebAppVersionSynchronizationOptions = {
    message: `Update WebApp version to ${options.webAppVersion}`,
    authorName: options.commitAuthorName,
    authorEmail: options.commitAuthorEmail,
  };

  return options.gitClient
    .commit(commitOptions)
    .andThen(() => {
      return options.gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
    })
    .andThen(() => {
      return options.gitClient.pushBranch({branchName: options.branchName});
    })
    .andThen(() => {
      return options.gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
    })
    .map(() => {
      return Unit;
    });
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
      return prepareSynchronizationCommit({
        mainSnapshot: options.mainSnapshot,
        webAppVersion: options.webAppVersion,
        gitClient: options.synchronizationOptions.dependencies.gitClient,
      });
    })
    .andThen(() => {
      return resolveCurrentSynchronizationOutcome(options.synchronizationOptions);
    })
    .andThen(currentSynchronizationOutcome => {
      if (currentSynchronizationOutcome.isJust) {
        const {value: synchronizationResult} = currentSynchronizationOutcome;

        return Task.resolve<WebAppVersionSynchronizationResult, Error>(synchronizationResult);
      }

      return commitAndPushSynchronizationBranch({
        mainSnapshot: options.mainSnapshot,
        webAppVersion: options.webAppVersion,
        gitClient,
        branchName: options.branchName,
        commitAuthorName: options.synchronizationOptions.commitAuthorName,
        commitAuthorEmail: options.synchronizationOptions.commitAuthorEmail,
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
          if (!isUndefined(branchInspection)) {
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

type SemVerSynchronizationRequest = Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'semver'}>;

type SemVerSynchronizationBranchOptions = {
  readonly synchronizationOptions: SynchronizeSemVerWebAppVersionOptions;
  readonly synchronizationRequest: SemVerSynchronizationRequest;
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  readonly branchName: WebAppVersionSynchronizationBranchName;
};

export function inspectSemVerWebAppVersionSynchronization(
  options: InspectSemVerWebAppVersionSynchronizationOptions,
): Task<SemVerWebAppVersionSynchronizationInspection, Error> {
  return options.githubClient.listPullRequests().andThen(pullRequests => {
    return resolveSemVerWebAppVersionSynchronizationStateForRequest(options.synchronizationRequest, pullRequests);
  });
}

function createResultFromExistingSemVerInspection(
  action: 'already-open' | 'already-merged',
  inspection: Extract<
    SemVerWebAppVersionSynchronizationInspection,
    {readonly kind: 'matching-open' | 'matching-merged'}
  >,
): Result<Maybe<SemVerWebAppVersionSynchronizationResult>, Error> {
  return Result.ok(
    Maybe.just({
      action,
      productionTagName: inspection.productionTagName,
      webAppVersion: inspection.webAppVersion,
      branchName: inspection.branchName,
      pullRequestNumber: inspection.pullRequestNumber,
      pullRequestUrl: inspection.pullRequestUrl,
    }),
  );
}

function resolveSemVerInspectionOutcome(
  inspection: SemVerWebAppVersionSynchronizationInspection,
): Result<Maybe<SemVerWebAppVersionSynchronizationResult>, Error> {
  return match(inspection)
    .with({kind: 'available'}, () => {
      return Result.ok(Maybe.nothing<SemVerWebAppVersionSynchronizationResult>());
    })
    .with({kind: 'matching-open'}, matchingInspection => {
      return createResultFromExistingSemVerInspection('already-open', matchingInspection);
    })
    .with({kind: 'matching-merged'}, matchingInspection => {
      return createResultFromExistingSemVerInspection('already-merged', matchingInspection);
    })
    .with({kind: 'closed-without-merge'}, closedInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization pull request #${closedInspection.pullRequestNumber} for ${closedInspection.productionTagName} was closed without merging: ${closedInspection.pullRequestUrl}`,
        ),
      );
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization is blocked by ${blockedInspection.blockingSynchronizationState} pull request #${blockedInspection.pullRequestNumber} for ${blockedInspection.blockingProductionTagName}: ${blockedInspection.pullRequestUrl}`,
        ),
      );
    })
    .with({kind: 'conflict'}, conflictingInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization conflict for ${conflictingInspection.productionTagName}: ${conflictingInspection.reason}`,
        ),
      );
    })
    .exhaustive();
}

function resolveCurrentSemVerSynchronizationOutcome(
  synchronizationOptions: SynchronizeSemVerWebAppVersionOptions,
  synchronizationRequest: SemVerSynchronizationRequest,
): Task<Maybe<SemVerWebAppVersionSynchronizationResult>, Error> {
  return synchronizationOptions.dependencies.githubClient.listPullRequests().andThen(pullRequests => {
    return resolveSemVerWebAppVersionSynchronizationStateForRequest(synchronizationRequest, pullRequests).andThen(
      resolveSemVerInspectionOutcome,
    );
  });
}

function createSemVerPullRequestForBranch(
  options: SemVerSynchronizationBranchOptions & {readonly action: 'created' | 'recovered'},
): Task<SemVerWebAppVersionSynchronizationResult, Error> {
  const titleResult = createWebAppVersionSynchronizationPullRequestTitle(options.synchronizationRequest.webAppVersion);
  const bodyResult = createSemVerWebAppVersionSynchronizationPullRequestBody(
    options.synchronizationRequest.productionTagName,
  );

  if (titleResult.isErr) {
    return Task.reject(titleResult.error);
  }

  if (bodyResult.isErr) {
    return Task.reject(bodyResult.error);
  }

  return options.synchronizationOptions.dependencies.githubClient
    .createPullRequest({
      title: titleResult.value,
      body: bodyResult.value,
      headBranch: options.branchName,
    })
    .andThen(pullRequest => {
      const synchronizationRecordResult = parseWebAppVersionSynchronizationRecord(pullRequest);

      if (synchronizationRecordResult.isErr) {
        return Task.reject<SemVerWebAppVersionSynchronizationResult, Error>(synchronizationRecordResult.error);
      }

      const synchronizationRecordMaybe = synchronizationRecordResult.value;

      if (synchronizationRecordMaybe.isNothing || synchronizationRecordMaybe.value.kind !== 'semver') {
        return Task.reject<SemVerWebAppVersionSynchronizationResult, Error>(
          new Error('Created WebApp SemVer synchronization pull request has no valid SemVer marker'),
        );
      }

      const {value: synchronizationRecord} = synchronizationRecordMaybe;

      if (
        synchronizationRecord.marker.productionTagName !== options.synchronizationRequest.productionTagName ||
        synchronizationRecord.marker.webAppVersion !== options.synchronizationRequest.webAppVersion ||
        synchronizationRecord.pullRequest.state !== 'open' ||
        synchronizationRecord.pullRequest.headBranch !== options.branchName
      ) {
        return Task.reject<SemVerWebAppVersionSynchronizationResult, Error>(
          new Error('Created pull request does not match the requested WebApp SemVer synchronization'),
        );
      }

      return Result.ok({
        action: options.action,
        productionTagName: synchronizationRecord.marker.productionTagName,
        webAppVersion: synchronizationRecord.marker.webAppVersion,
        branchName: options.branchName,
        pullRequestNumber: synchronizationRecord.pullRequest.number,
        pullRequestUrl: synchronizationRecord.pullRequest.url,
      });
    });
}

function recoverExistingSemVerBranch(
  options: SemVerSynchronizationBranchOptions,
  branchInspection: WebAppVersionSynchronizationBranchInspection,
): Task<SemVerWebAppVersionSynchronizationResult, Error> {
  const branchValidationResult = validateSemVerWebAppVersionSynchronizationBranch({
    branchInspection,
    expectedProductionTagName: options.synchronizationRequest.productionTagName,
    expectedWebAppVersion: options.synchronizationRequest.webAppVersion,
  });

  if (branchValidationResult.isErr) {
    return Task.reject(branchValidationResult.error);
  }

  return options.synchronizationOptions.dependencies.gitClient
    .verifyMainCommit(options.mainSnapshot.commitSha)
    .andThen(() => {
      return resolveCurrentSemVerSynchronizationOutcome(options.synchronizationOptions, options.synchronizationRequest);
    })
    .andThen(currentSynchronizationOutcome => {
      if (currentSynchronizationOutcome.isJust) {
        return Result.ok(currentSynchronizationOutcome.value);
      }

      return createSemVerPullRequestForBranch({...options, action: 'recovered'});
    });
}

function createNewSemVerSynchronizationBranch(
  options: SemVerSynchronizationBranchOptions,
): Task<SemVerWebAppVersionSynchronizationResult, Error> {
  const gitClient = options.synchronizationOptions.dependencies.gitClient;

  return gitClient
    .createBranchFromMain({branchName: options.branchName, mainCommitSha: options.mainSnapshot.commitSha})
    .andThen(() => {
      return prepareSynchronizationCommit({
        mainSnapshot: options.mainSnapshot,
        webAppVersion: options.synchronizationRequest.webAppVersion,
        gitClient,
      });
    })
    .andThen(() => {
      return resolveCurrentSemVerSynchronizationOutcome(options.synchronizationOptions, options.synchronizationRequest);
    })
    .andThen(currentSynchronizationOutcome => {
      if (currentSynchronizationOutcome.isJust) {
        return Result.ok(currentSynchronizationOutcome.value);
      }

      return commitAndPushSynchronizationBranch({
        mainSnapshot: options.mainSnapshot,
        webAppVersion: options.synchronizationRequest.webAppVersion,
        gitClient,
        branchName: options.branchName,
        commitAuthorName: options.synchronizationOptions.commitAuthorName,
        commitAuthorEmail: options.synchronizationOptions.commitAuthorEmail,
      })
        .andThen(() => {
          return resolveCurrentSemVerSynchronizationOutcome(
            options.synchronizationOptions,
            options.synchronizationRequest,
          );
        })
        .andThen(latestSynchronizationOutcome => {
          if (latestSynchronizationOutcome.isJust) {
            return Result.ok(latestSynchronizationOutcome.value);
          }

          return createSemVerPullRequestForBranch({...options, action: 'created'});
        });
    });
}

function reconcileAndSynchronizeSemVerWebAppVersion(
  options: Omit<SemVerSynchronizationBranchOptions, 'branchName'>,
): Task<SemVerWebAppVersionSynchronizationResult, Error> {
  const packageVersionsResult = validateMatchingWebAppPackageVersions(
    options.mainSnapshot.rootPackageDocument,
    options.mainSnapshot.webAppPackageDocument,
  );

  if (packageVersionsResult.isErr) {
    return Task.reject(packageVersionsResult.error);
  }

  const versionComparisonResult = compareWebAppVersions(
    packageVersionsResult.value.rootVersion,
    options.synchronizationRequest.webAppVersion,
  );

  if (versionComparisonResult.isErr) {
    return Task.reject(versionComparisonResult.error);
  }

  if (versionComparisonResult.value === 0) {
    return Task.reject(
      new Error(
        `WebApp package metadata already equals ${options.synchronizationRequest.webAppVersion} but no matching synchronization record exists`,
      ),
    );
  }

  if (versionComparisonResult.value > 0) {
    return Task.reject(
      new Error(
        `Refusing to downgrade WebApp package metadata from ${packageVersionsResult.value.rootVersion} to ${options.synchronizationRequest.webAppVersion}`,
      ),
    );
  }

  const branchNameResult = createSemVerWebAppVersionSynchronizationBranchName(
    options.synchronizationRequest.webAppVersion,
  );

  if (branchNameResult.isErr) {
    return Task.reject(branchNameResult.error);
  }

  const branchName = branchNameResult.value;
  const branchOptions: SemVerSynchronizationBranchOptions = {...options, branchName};

  return options.synchronizationOptions.dependencies.gitClient
    .inspectBranch({branchName, mainCommitSha: options.mainSnapshot.commitSha})
    .andThen(branchInspection => {
      if (!isUndefined(branchInspection)) {
        return recoverExistingSemVerBranch(branchOptions, branchInspection);
      }

      return createNewSemVerSynchronizationBranch(branchOptions);
    });
}

export function synchronizeSemVerWebAppVersion(
  options: SynchronizeSemVerWebAppVersionOptions,
): Task<SemVerWebAppVersionSynchronizationResult, Error> {
  const synchronizationRequest = options.synchronizationRequest;

  return resolveCurrentSemVerSynchronizationOutcome(options, synchronizationRequest).andThen(
    initialSynchronizationOutcome => {
      if (initialSynchronizationOutcome.isJust) {
        return Task.resolve(initialSynchronizationOutcome.value);
      }

      return options.dependencies.gitClient.prepareLatestMain().andThen(mainSnapshot => {
        return resolveCurrentSemVerSynchronizationOutcome(options, synchronizationRequest).andThen(
          postPreparationSynchronizationOutcome => {
            if (postPreparationSynchronizationOutcome.isJust) {
              return Result.ok(postPreparationSynchronizationOutcome.value);
            }

            return reconcileAndSynchronizeSemVerWebAppVersion({
              synchronizationOptions: options,
              synchronizationRequest,
              mainSnapshot,
            });
          },
        );
      });
    },
  );
}
