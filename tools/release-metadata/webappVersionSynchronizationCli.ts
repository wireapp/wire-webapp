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

import {match, P} from 'ts-pattern';

import type {
  SemVerWebAppVersionSynchronizationInspection,
  WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';
import type {
  SemVerWebAppVersionSynchronizationResult,
  WebAppVersionSynchronizationResult,
} from './webappVersionSynchronizationOrchestration.ts';

export type WebAppVersionSynchronizationInspectionOutput =
  | {
      readonly state: 'available';
      readonly release_identifier: string;
      readonly production_tag_name: string;
    }
  | {
      readonly state: 'matching-open' | 'matching-merged' | 'closed-without-merge';
      readonly release_identifier: string;
      readonly production_tag_name: string;
      readonly webapp_version: string;
      readonly pull_request_number: number;
      readonly pull_request_url: string;
      readonly branch_name: string;
    }
  | {
      readonly state: 'blocked-by-previous-unresolved';
      readonly release_identifier: string;
      readonly production_tag_name: string;
      readonly blocking_release_identifier: string;
      readonly blocking_production_tag_name: string;
      readonly blocking_webapp_version: string;
      readonly blocking_synchronization_state: 'open' | 'closed-without-merge';
      readonly pull_request_number: number;
      readonly pull_request_url: string;
      readonly branch_name: string;
    }
  | {
      readonly state: 'conflict';
      readonly release_identifier: string;
      readonly production_tag_name: string;
      readonly reason: string;
    };

export type WebAppVersionSynchronizationResultOutput = {
  readonly action: WebAppVersionSynchronizationResult['action'];
  readonly release_identifier: string;
  readonly production_tag_name: string;
  readonly webapp_version: string;
  readonly branch_name: string;
  readonly pull_request_number: number;
  readonly pull_request_url: string;
};

export type SemVerWebAppVersionSynchronizationInspectionOutput =
  | {
      readonly state: 'available';
      readonly production_tag_name: string;
      readonly webapp_version: string;
    }
  | {
      readonly state: 'matching-open' | 'matching-merged' | 'closed-without-merge';
      readonly production_tag_name: string;
      readonly webapp_version: string;
      readonly pull_request_number: number;
      readonly pull_request_url: string;
      readonly branch_name: string;
    }
  | {
      readonly state: 'blocked-by-previous-unresolved';
      readonly production_tag_name: string;
      readonly webapp_version: string;
      readonly blocking_production_tag_name: string;
      readonly blocking_webapp_version: string;
      readonly blocking_synchronization_state: 'open' | 'closed-without-merge';
      readonly pull_request_number: number;
      readonly pull_request_url: string;
      readonly branch_name: string;
    }
  | {
      readonly state: 'conflict';
      readonly production_tag_name: string;
      readonly webapp_version: string;
      readonly reason: string;
    };

export type SemVerWebAppVersionSynchronizationResultOutput = {
  readonly action: SemVerWebAppVersionSynchronizationResult['action'];
  readonly production_tag_name: string;
  readonly webapp_version: string;
  readonly branch_name: string;
  readonly pull_request_number: number;
  readonly pull_request_url: string;
};

type WebAppVersionSynchronizationOutput =
  | WebAppVersionSynchronizationInspectionOutput
  | WebAppVersionSynchronizationResultOutput
  | SemVerWebAppVersionSynchronizationInspectionOutput
  | SemVerWebAppVersionSynchronizationResultOutput;

export function createWebAppVersionSynchronizationInspectionOutput(
  inspection: WebAppVersionSynchronizationInspection,
): WebAppVersionSynchronizationInspectionOutput {
  return match(inspection)
    .with({kind: 'available'}, availableInspection => {
      return {
        state: availableInspection.kind,
        release_identifier: availableInspection.releaseIdentifier,
        production_tag_name: availableInspection.productionTagName,
      };
    })
    .with({kind: P.union('matching-open', 'matching-merged', 'closed-without-merge')}, existingInspection => {
      return {
        state: existingInspection.kind,
        release_identifier: existingInspection.releaseIdentifier,
        production_tag_name: existingInspection.productionTagName,
        webapp_version: existingInspection.webAppVersion,
        pull_request_number: existingInspection.pullRequestNumber,
        pull_request_url: existingInspection.pullRequestUrl,
        branch_name: existingInspection.branchName,
      };
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedInspection => {
      return {
        state: blockedInspection.kind,
        release_identifier: blockedInspection.releaseIdentifier,
        production_tag_name: blockedInspection.productionTagName,
        blocking_release_identifier: blockedInspection.blockingReleaseIdentifier,
        blocking_production_tag_name: blockedInspection.blockingProductionTagName,
        blocking_webapp_version: blockedInspection.blockingWebAppVersion,
        blocking_synchronization_state: blockedInspection.blockingSynchronizationState,
        pull_request_number: blockedInspection.pullRequestNumber,
        pull_request_url: blockedInspection.pullRequestUrl,
        branch_name: blockedInspection.branchName,
      };
    })
    .with({kind: 'conflict'}, conflictingInspection => {
      return {
        state: conflictingInspection.kind,
        release_identifier: conflictingInspection.releaseIdentifier,
        production_tag_name: conflictingInspection.productionTagName,
        reason: conflictingInspection.reason,
      };
    })
    .exhaustive();
}

export function createWebAppVersionSynchronizationResultOutput(
  synchronizationResult: WebAppVersionSynchronizationResult,
): WebAppVersionSynchronizationResultOutput {
  return {
    action: synchronizationResult.action,
    release_identifier: synchronizationResult.releaseIdentifier,
    production_tag_name: synchronizationResult.productionTagName,
    webapp_version: synchronizationResult.webAppVersion,
    branch_name: synchronizationResult.branchName,
    pull_request_number: synchronizationResult.pullRequestNumber,
    pull_request_url: synchronizationResult.pullRequestUrl,
  };
}

export function createSemVerWebAppVersionSynchronizationInspectionOutput(
  inspection: SemVerWebAppVersionSynchronizationInspection,
): SemVerWebAppVersionSynchronizationInspectionOutput {
  return match(inspection)
    .with({kind: 'available'}, availableInspection => {
      return {
        state: availableInspection.kind,
        production_tag_name: availableInspection.productionTagName,
        webapp_version: availableInspection.webAppVersion,
      };
    })
    .with({kind: P.union('matching-open', 'matching-merged', 'closed-without-merge')}, existingInspection => {
      return {
        state: existingInspection.kind,
        production_tag_name: existingInspection.productionTagName,
        webapp_version: existingInspection.webAppVersion,
        pull_request_number: existingInspection.pullRequestNumber,
        pull_request_url: existingInspection.pullRequestUrl,
        branch_name: existingInspection.branchName,
      };
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedInspection => {
      return {
        state: blockedInspection.kind,
        production_tag_name: blockedInspection.productionTagName,
        webapp_version: blockedInspection.webAppVersion,
        blocking_production_tag_name: blockedInspection.blockingProductionTagName,
        blocking_webapp_version: blockedInspection.blockingWebAppVersion,
        blocking_synchronization_state: blockedInspection.blockingSynchronizationState,
        pull_request_number: blockedInspection.pullRequestNumber,
        pull_request_url: blockedInspection.pullRequestUrl,
        branch_name: blockedInspection.branchName,
      };
    })
    .with({kind: 'conflict'}, conflictingInspection => {
      return {
        state: conflictingInspection.kind,
        production_tag_name: conflictingInspection.productionTagName,
        webapp_version: conflictingInspection.webAppVersion,
        reason: conflictingInspection.reason,
      };
    })
    .exhaustive();
}

export function createSemVerWebAppVersionSynchronizationResultOutput(
  synchronizationResult: SemVerWebAppVersionSynchronizationResult,
): SemVerWebAppVersionSynchronizationResultOutput {
  return {
    action: synchronizationResult.action,
    production_tag_name: synchronizationResult.productionTagName,
    webapp_version: synchronizationResult.webAppVersion,
    branch_name: synchronizationResult.branchName,
    pull_request_number: synchronizationResult.pullRequestNumber,
    pull_request_url: synchronizationResult.pullRequestUrl,
  };
}

export function serializeWebAppVersionSynchronizationOutput(output: WebAppVersionSynchronizationOutput): string {
  return JSON.stringify(output);
}
