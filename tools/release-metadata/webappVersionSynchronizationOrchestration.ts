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
import {match, P} from 'ts-pattern';

import {
  compareWebAppVersions,
  updateWebAppPackageDocuments,
  validateMatchingWebAppPackageVersions,
} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {
  createWebAppVersionSynchronizationRequest,
  createWebAppVersionSynchronizationBranchName,
  createWebAppVersionSynchronizationPullRequestBody,
  createWebAppVersionSynchronizationPullRequestTitle,
  parseWebAppVersionSynchronizationRecord,
  resolveWebAppVersionSynchronizationState,
} from './webappVersionSynchronization.ts';
import type {
  WebAppVersionSynchronizationInspection,
  WebAppVersionSynchronizationBranchName,
  WebAppVersionSynchronizationPullRequest,
  WebAppVersionSynchronizationRequest,
} from './webappVersionSynchronization.ts';
import {validateWebAppVersionSynchronizationBranch} from './webappVersionSynchronizationGit.ts';
import type {
  CommitWebAppVersionSynchronizationOptions,
  WebAppVersionSynchronizationBranchInspection,
  WebAppVersionSynchronizationGitClient,
  WebAppVersionSynchronizationMainSnapshot,
} from './webappVersionSynchronizationGit.ts';
import type {WebAppVersionSynchronizationGitHubClient} from './webappVersionSynchronizationGitHubClient.ts';

export type WebAppVersionSynchronizationDependencies = {
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
  readonly gitClient: WebAppVersionSynchronizationGitClient;
};

export type WebAppVersionSynchronizationOptions = {
  readonly productionTagName: string;
  readonly commitAuthorName: string;
  readonly commitAuthorEmail: string;
};

export type WebAppVersionSynchronizationAction = 'created' | 'already-open' | 'already-merged' | 'recovered';

export type WebAppVersionSynchronizationResult = {
  readonly action: WebAppVersionSynchronizationAction;
  readonly productionTagName: string;
  readonly webAppVersion: WebAppVersion;
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
};

type SynchronizationResultWithPullRequest = {
  readonly action: WebAppVersionSynchronizationAction;
  readonly pullRequestNumber: number;
};

type SynchronizeBranchOptions = {
  readonly request: WebAppVersionSynchronizationRequest;
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  readonly branchName: WebAppVersionSynchronizationBranchName;
};

type PrepareSynchronizationCommitOptions = {
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  readonly webAppVersion: WebAppVersion;
};

type PrepareSynchronizationCommitDependencies = {
  readonly gitClient: WebAppVersionSynchronizationGitClient;
};

type CommitAndPushSynchronizationBranchOptions = Omit<PrepareSynchronizationCommitOptions, 'mainSnapshot'> & {
  readonly mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly commitAuthorName: string;
  readonly commitAuthorEmail: string;
};

type CreateSynchronizationPullRequestOptions = SynchronizeBranchOptions & {
  readonly action: 'created' | 'recovered';
};

type CreateSynchronizationResultFromPullRequestOptions = {
  readonly synchronizationPullRequestOptions: CreateSynchronizationPullRequestOptions;
  readonly pullRequest: WebAppVersionSynchronizationPullRequest;
};

type EnsureSynchronizationLabelOptions<ResultType extends SynchronizationResultWithPullRequest> = {
  readonly synchronizationResult: ResultType;
};

type EnsureSynchronizationLabelDependencies = {
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
};

type EnsureSynchronizationLabelForMaybeResultOptions = {
  readonly synchronizationResultMaybe: Maybe<WebAppVersionSynchronizationResult>;
};

type ResolveInspectionOptions = {
  readonly inspection: WebAppVersionSynchronizationInspection;
  readonly request: WebAppVersionSynchronizationRequest;
};

type MatchingWebAppVersionSynchronizationInspection = Extract<
  WebAppVersionSynchronizationInspection,
  {readonly kind: 'matching-open' | 'matching-merged'}
>;

type ResolveCurrentOutcomeOptions = {
  readonly request: WebAppVersionSynchronizationRequest;
};

type RecoverSynchronizationBranchOptions = SynchronizeBranchOptions & {
  readonly branchInspection: WebAppVersionSynchronizationBranchInspection;
};

type CreateSynchronizationBranchOptions = SynchronizeBranchOptions & {
  readonly commitAuthorName: string;
  readonly commitAuthorEmail: string;
};

type CreateSynchronizationPullRequestDependencies = {
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
};

type RecoverSynchronizationBranchDependencies = WebAppVersionSynchronizationDependencies;

type CreateSynchronizationBranchDependencies = WebAppVersionSynchronizationDependencies;

type ReconcileAndSynchronizeWebAppVersionOptions = Omit<CreateSynchronizationBranchOptions, 'branchName'>;

const synchronizationPackageFilePaths = ['apps/webapp/package.json', 'package.json'] as const;

function createExistingSynchronizationResult(
  action: 'already-open' | 'already-merged',
  inspection: MatchingWebAppVersionSynchronizationInspection,
): Result<Maybe<WebAppVersionSynchronizationResult>, Error> {
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

function resolveInspectionOutcome(
  options: ResolveInspectionOptions,
): Result<Maybe<WebAppVersionSynchronizationResult>, Error> {
  const {inspection, request} = options;

  return match(inspection)
    .with({kind: 'available'}, () => {
      return Result.ok(Maybe.nothing<WebAppVersionSynchronizationResult>());
    })
    .with({kind: 'matching-open'}, matchingInspection => {
      return createExistingSynchronizationResult('already-open', matchingInspection);
    })
    .with({kind: 'matching-merged'}, matchingInspection => {
      return createExistingSynchronizationResult('already-merged', matchingInspection);
    })
    .with({kind: 'closed-without-merge'}, closedInspection => {
      return Result.err(
        new Error(
          `WebApp version synchronization pull request #${closedInspection.pullRequestNumber} for ${request.productionTagName} was closed without merging: ${closedInspection.pullRequestUrl}`,
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

function ensureSynchronizationLabel<ResultType extends SynchronizationResultWithPullRequest>(
  options: EnsureSynchronizationLabelOptions<ResultType>,
  dependencies: EnsureSynchronizationLabelDependencies,
): Task<ResultType, Error> {
  const {synchronizationResult} = options;

  return match(synchronizationResult.action)
    .with('already-merged', () => {
      return Task.resolve(synchronizationResult);
    })
    .with(P.union('created', 'recovered', 'already-open'), () => {
      return dependencies.githubClient
        .ensurePullRequestSemVerNoneLabel(synchronizationResult.pullRequestNumber)
        .map(() => {
          return synchronizationResult;
        });
    })
    .exhaustive();
}

function ensureSynchronizationLabelForMaybeResult(
  options: EnsureSynchronizationLabelForMaybeResultOptions,
  dependencies: EnsureSynchronizationLabelDependencies,
): Task<Maybe<WebAppVersionSynchronizationResult>, Error> {
  return options.synchronizationResultMaybe.match({
    Just(synchronizationResult) {
      return ensureSynchronizationLabel({synchronizationResult}, dependencies).map(() => {
        return Maybe.just(synchronizationResult);
      });
    },
    Nothing() {
      return Task.resolve(Maybe.nothing<WebAppVersionSynchronizationResult>());
    },
  });
}

function resolveCurrentSynchronizationOutcome(
  options: ResolveCurrentOutcomeOptions,
  dependencies: WebAppVersionSynchronizationDependencies,
): Task<Maybe<WebAppVersionSynchronizationResult>, Error> {
  const {request} = options;

  return dependencies.githubClient.listPullRequests().andThen(pullRequests => {
    const inspectionResult = resolveWebAppVersionSynchronizationState({request, pullRequests});
    if (inspectionResult.isErr) {
      return Task.reject(inspectionResult.error);
    }

    const outcomeResult = resolveInspectionOutcome({inspection: inspectionResult.value, request});
    if (outcomeResult.isErr) {
      return Task.reject(outcomeResult.error);
    }

    return ensureSynchronizationLabelForMaybeResult(
      {synchronizationResultMaybe: outcomeResult.value},
      {githubClient: dependencies.githubClient},
    );
  });
}

function validateExpectedPackageFileChanges(changedFilePaths: readonly string[]): Result<Unit, Error> {
  const actualChangedFilePaths = changedFilePaths.toSorted();
  const expectedChangedFilePaths = [...synchronizationPackageFilePaths].toSorted();
  if (actualChangedFilePaths.join('\n') !== expectedChangedFilePaths.join('\n')) {
    return Result.err(
      new Error(
        `WebApp version synchronization changes unexpected files: ${actualChangedFilePaths.join(', ') || 'none'}`,
      ),
    );
  }

  return Result.ok(Unit);
}

function prepareSynchronizationCommit(
  options: PrepareSynchronizationCommitOptions,
  dependencies: PrepareSynchronizationCommitDependencies,
): Task<Unit, Error> {
  const packageDocumentsResult = updateWebAppPackageDocuments({
    rootPackageDocument: options.mainSnapshot.rootPackageDocument,
    webAppPackageDocument: options.mainSnapshot.webAppPackageDocument,
    targetVersion: options.webAppVersion,
  });
  if (packageDocumentsResult.isErr) {
    return Task.reject(packageDocumentsResult.error);
  }

  return dependencies.gitClient
    .writePackageDocuments(packageDocumentsResult.value)
    .andThen(() => {
      return dependencies.gitClient.readWorkingTreePackageDocuments();
    })
    .andThen(packageDocuments => {
      const packageVersionsResult = validateMatchingWebAppPackageVersions(
        packageDocuments.rootPackageDocument,
        packageDocuments.webAppPackageDocument,
      );
      if (packageVersionsResult.isErr) {
        return Task.reject(packageVersionsResult.error);
      }

      if (packageVersionsResult.value.rootVersion !== options.webAppVersion) {
        return Task.reject(new Error('Working tree package documents contain an unexpected WebApp version'));
      }

      return dependencies.gitClient.getWorkingTreeChangedFilePaths();
    })
    .andThen(validateExpectedPackageFileChanges);
}

function commitAndPushSynchronizationBranch(
  options: CommitAndPushSynchronizationBranchOptions,
  dependencies: PrepareSynchronizationCommitDependencies,
): Task<Unit, Error> {
  const commitOptions: CommitWebAppVersionSynchronizationOptions = {
    message: `Update WebApp version to ${options.webAppVersion}`,
    authorName: options.commitAuthorName,
    authorEmail: options.commitAuthorEmail,
  };

  return dependencies.gitClient
    .commit(commitOptions)
    .andThen(() => {
      return dependencies.gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
    })
    .andThen(() => {
      return dependencies.gitClient.pushBranch({branchName: options.branchName});
    })
    .andThen(() => {
      return dependencies.gitClient.verifyMainCommit(options.mainSnapshot.commitSha);
    })
    .map(() => {
      return Unit;
    });
}

function createSynchronizationResultFromPullRequest(
  options: CreateSynchronizationResultFromPullRequestOptions,
  dependencies: CreateSynchronizationPullRequestDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const {synchronizationPullRequestOptions, pullRequest} = options;
  const recordResult = parseWebAppVersionSynchronizationRecord(pullRequest);
  if (recordResult.isErr) {
    return Task.reject(recordResult.error);
  }

  if (recordResult.value.isNothing) {
    return Task.reject(new Error('Created WebApp version synchronization pull request has no valid marker'));
  }

  const record = recordResult.value.value;
  if (
    record.marker.productionTagName !== synchronizationPullRequestOptions.request.productionTagName ||
    record.marker.webAppVersion !== synchronizationPullRequestOptions.request.webAppVersion ||
    record.pullRequest.state !== 'open' ||
    record.pullRequest.headBranch !== synchronizationPullRequestOptions.branchName
  ) {
    return Task.reject(new Error('Created pull request does not match the requested WebApp version synchronization'));
  }

  const synchronizationResult: WebAppVersionSynchronizationResult = {
    action: synchronizationPullRequestOptions.action,
    productionTagName: record.marker.productionTagName,
    webAppVersion: record.marker.webAppVersion,
    branchName: synchronizationPullRequestOptions.branchName,
    pullRequestNumber: record.pullRequest.number,
    pullRequestUrl: record.pullRequest.url,
  };

  return ensureSynchronizationLabel({synchronizationResult}, {githubClient: dependencies.githubClient});
}

function createSynchronizationPullRequest(
  options: CreateSynchronizationPullRequestOptions,
  dependencies: CreateSynchronizationPullRequestDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const titleResult = createWebAppVersionSynchronizationPullRequestTitle(options.request.webAppVersion);
  if (titleResult.isErr) {
    return Task.reject(titleResult.error);
  }

  const bodyResult = createWebAppVersionSynchronizationPullRequestBody(options.request.productionTagName);
  if (bodyResult.isErr) {
    return Task.reject(bodyResult.error);
  }

  return dependencies.githubClient
    .createPullRequest({title: titleResult.value, body: bodyResult.value, headBranch: options.branchName})
    .andThen(pullRequest => {
      return createSynchronizationResultFromPullRequest(
        {synchronizationPullRequestOptions: options, pullRequest},
        dependencies,
      );
    });
}

function recoverExistingSynchronizationBranch(
  options: RecoverSynchronizationBranchOptions,
  dependencies: RecoverSynchronizationBranchDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const branchValidationResult = validateWebAppVersionSynchronizationBranch({
    branchInspection: options.branchInspection,
    expectedProductionTagName: options.request.productionTagName,
    expectedWebAppVersion: options.request.webAppVersion,
  });
  if (branchValidationResult.isErr) {
    return Task.reject(branchValidationResult.error);
  }

  return dependencies.gitClient
    .verifyMainCommit(options.mainSnapshot.commitSha)
    .andThen(() => {
      return resolveCurrentSynchronizationOutcome({request: options.request}, dependencies);
    })
    .andThen(currentSynchronizationResultMaybe => {
      if (currentSynchronizationResultMaybe.isJust) {
        return Result.ok(currentSynchronizationResultMaybe.value);
      }

      return createSynchronizationPullRequest(
        {...options, action: 'recovered'},
        {githubClient: dependencies.githubClient},
      );
    });
}

function createSynchronizationBranch(
  options: CreateSynchronizationBranchOptions,
  dependencies: CreateSynchronizationBranchDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const {mainSnapshot, request, branchName} = options;
  const gitClient = dependencies.gitClient;

  return gitClient
    .createBranchFromMain({branchName, mainCommitSha: mainSnapshot.commitSha})
    .andThen(() => {
      return prepareSynchronizationCommit({mainSnapshot, webAppVersion: request.webAppVersion}, {gitClient});
    })
    .andThen(() => {
      return resolveCurrentSynchronizationOutcome({request}, dependencies);
    })
    .andThen(existingResultMaybe => {
      if (existingResultMaybe.isJust) {
        return Result.ok(existingResultMaybe.value);
      }

      return commitAndPushSynchronizationBranch(
        {
          mainSnapshot,
          webAppVersion: request.webAppVersion,
          branchName,
          commitAuthorName: options.commitAuthorName,
          commitAuthorEmail: options.commitAuthorEmail,
        },
        {gitClient},
      )
        .andThen(() => {
          return resolveCurrentSynchronizationOutcome({request}, dependencies);
        })
        .andThen(latestResultMaybe => {
          if (latestResultMaybe.isJust) {
            return Result.ok(latestResultMaybe.value);
          }

          return createSynchronizationPullRequest(
            {...options, action: 'created'},
            {githubClient: dependencies.githubClient},
          );
        });
    });
}

function reconcileAndSynchronizeWebAppVersion(
  options: ReconcileAndSynchronizeWebAppVersionOptions,
  dependencies: WebAppVersionSynchronizationDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const packageVersionsResult = validateMatchingWebAppPackageVersions(
    options.mainSnapshot.rootPackageDocument,
    options.mainSnapshot.webAppPackageDocument,
  );
  if (packageVersionsResult.isErr) {
    return Task.reject(packageVersionsResult.error);
  }

  const comparisonResult = compareWebAppVersions(
    packageVersionsResult.value.rootVersion,
    options.request.webAppVersion,
  );
  if (comparisonResult.isErr) {
    return Task.reject(comparisonResult.error);
  }

  if (comparisonResult.value === 0) {
    return Task.reject(
      new Error(
        `WebApp package metadata already equals ${options.request.webAppVersion} but no matching synchronization record exists`,
      ),
    );
  }

  if (comparisonResult.value > 0) {
    return Task.reject(
      new Error(
        `Refusing to downgrade WebApp package metadata from ${packageVersionsResult.value.rootVersion} to ${options.request.webAppVersion}`,
      ),
    );
  }

  const branchNameResult = createWebAppVersionSynchronizationBranchName(options.request.webAppVersion);
  if (branchNameResult.isErr) {
    return Task.reject(branchNameResult.error);
  }

  const branchName = branchNameResult.value;
  const branchOptions: SynchronizeBranchOptions = {...options, branchName};

  return dependencies.gitClient
    .inspectBranch({branchName, mainCommitSha: options.mainSnapshot.commitSha})
    .andThen(branchInspection => {
      if (!isUndefined(branchInspection)) {
        return recoverExistingSynchronizationBranch({...branchOptions, branchInspection}, dependencies);
      }

      return createSynchronizationBranch(
        {
          ...branchOptions,
          commitAuthorName: options.commitAuthorName,
          commitAuthorEmail: options.commitAuthorEmail,
        },
        dependencies,
      );
    });
}

function synchronizeAgainstLatestMain(
  options: WebAppVersionSynchronizationOptions & {readonly request: WebAppVersionSynchronizationRequest},
  dependencies: WebAppVersionSynchronizationDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const {request} = options;

  return dependencies.gitClient.prepareLatestMain().andThen(mainSnapshot => {
    return resolveCurrentSynchronizationOutcome({request}, dependencies).andThen(existingResultMaybe => {
      if (existingResultMaybe.isJust) {
        return Result.ok(existingResultMaybe.value);
      }

      return reconcileAndSynchronizeWebAppVersion(
        {
          request,
          mainSnapshot,
          commitAuthorName: options.commitAuthorName,
          commitAuthorEmail: options.commitAuthorEmail,
        },
        dependencies,
      );
    });
  });
}

export function synchronizeWebAppVersion(
  options: WebAppVersionSynchronizationOptions,
  dependencies: WebAppVersionSynchronizationDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  const requestResult = createWebAppVersionSynchronizationRequest(options.productionTagName);
  if (requestResult.isErr) {
    return Task.reject(requestResult.error);
  }

  const request = requestResult.value;
  return resolveCurrentSynchronizationOutcome({request}, dependencies).andThen(existingResultMaybe => {
    if (existingResultMaybe.isJust) {
      return Task.resolve(existingResultMaybe.value);
    }

    return synchronizeAgainstLatestMain({...options, request}, dependencies);
  });
}
