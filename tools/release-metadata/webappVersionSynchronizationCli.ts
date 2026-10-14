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

import type {WebAppVersionSynchronizationResult} from './webappVersionSynchronizationOrchestration.ts';

export type WebAppVersionSynchronizationOutput = {
  readonly action: WebAppVersionSynchronizationResult['action'];
  readonly production_tag_name: string;
  readonly version: string;
  readonly branch_name: string;
  readonly pull_request_number: number;
  readonly pull_request_url: string;
};

export function createWebAppVersionSynchronizationOutput(
  synchronizationResult: WebAppVersionSynchronizationResult,
): WebAppVersionSynchronizationOutput {
  return {
    action: synchronizationResult.action,
    production_tag_name: synchronizationResult.productionTagName,
    version: synchronizationResult.webAppVersion,
    branch_name: synchronizationResult.branchName,
    pull_request_number: synchronizationResult.pullRequestNumber,
    pull_request_url: synchronizationResult.pullRequestUrl,
  };
}

export function serializeWebAppVersionSynchronizationOutput(output: WebAppVersionSynchronizationOutput): string {
  return JSON.stringify(output);
}
