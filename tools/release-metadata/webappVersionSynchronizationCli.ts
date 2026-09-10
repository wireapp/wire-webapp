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

import type {WebAppVersionSynchronizationInspection} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationResult} from './webappVersionSynchronizationOrchestration.ts';

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

type WebAppVersionSynchronizationOutput =
  WebAppVersionSynchronizationInspectionOutput | WebAppVersionSynchronizationResultOutput;

export function createWebAppVersionSynchronizationInspectionOutput(
  inspection: WebAppVersionSynchronizationInspection,
): WebAppVersionSynchronizationInspectionOutput {
  if (inspection.kind === 'available') {
    return {
      state: inspection.kind,
      release_identifier: inspection.releaseIdentifier,
      production_tag_name: inspection.productionTagName,
    };
  }

  if (inspection.kind === 'matching-open' || inspection.kind === 'matching-merged') {
    return {
      state: inspection.kind,
      release_identifier: inspection.releaseIdentifier,
      production_tag_name: inspection.productionTagName,
      webapp_version: inspection.webAppVersion,
      pull_request_number: inspection.pullRequestNumber,
      pull_request_url: inspection.pullRequestUrl,
      branch_name: inspection.branchName,
    };
  }

  if (inspection.kind === 'closed-without-merge') {
    return {
      state: inspection.kind,
      release_identifier: inspection.releaseIdentifier,
      production_tag_name: inspection.productionTagName,
      webapp_version: inspection.webAppVersion,
      pull_request_number: inspection.pullRequestNumber,
      pull_request_url: inspection.pullRequestUrl,
      branch_name: inspection.branchName,
    };
  }

  if (inspection.kind === 'blocked-by-previous-unresolved') {
    return {
      state: inspection.kind,
      release_identifier: inspection.releaseIdentifier,
      production_tag_name: inspection.productionTagName,
      blocking_release_identifier: inspection.blockingReleaseIdentifier,
      blocking_production_tag_name: inspection.blockingProductionTagName,
      blocking_webapp_version: inspection.blockingWebAppVersion,
      blocking_synchronization_state: inspection.blockingSynchronizationState,
      pull_request_number: inspection.pullRequestNumber,
      pull_request_url: inspection.pullRequestUrl,
      branch_name: inspection.branchName,
    };
  }

  if (inspection.kind === 'conflict') {
    return {
      state: inspection.kind,
      release_identifier: inspection.releaseIdentifier,
      production_tag_name: inspection.productionTagName,
      reason: inspection.reason,
    };
  }

  throw new Error('Unknown WebApp version synchronization inspection state');
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

export function serializeWebAppVersionSynchronizationOutput(output: WebAppVersionSynchronizationOutput): string {
  return JSON.stringify(output);
}
