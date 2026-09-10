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

import {
  createWebAppVersionSynchronizationInspectionOutput,
  createWebAppVersionSynchronizationResultOutput,
  serializeWebAppVersionSynchronizationOutput,
} from './webappVersionSynchronizationCli.ts';
import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppVersionSynchronizationResult} from './webappVersionSynchronizationOrchestration.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {createWebAppVersionSynchronizationBranchName} from './webappVersionSynchronization.ts';
import type {
  WebAppVersionSynchronizationBranchName,
  WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';

const pullRequestDetails = {
  pullRequestNumber: 123,
  pullRequestUrl: 'https://github.com/wireapp/wire-webapp/pull/123',
};

function createWebAppVersion(version: string): WebAppVersion {
  const versionResult = validateWebAppVersion(version);

  if (versionResult.isErr) {
    throw versionResult.error;
  }

  const {value: validatedVersion} = versionResult;

  return validatedVersion;
}

function createSynchronizationBranchName(): WebAppVersionSynchronizationBranchName {
  const branchNameResult = createWebAppVersionSynchronizationBranchName('2026-09-09.1', '1.0.0');

  if (branchNameResult.isErr) {
    throw branchNameResult.error;
  }

  const {value: branchName} = branchNameResult;

  return branchName;
}

describe('WebApp version synchronization CLI output', () => {
  it('serializes an available inspection', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'available',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
    };

    const output = createWebAppVersionSynchronizationInspectionOutput(inspection);

    expect(output).toEqual({
      state: 'available',
      release_identifier: '2026-09-09.1',
      production_tag_name: '2026-09-09.1-production',
    });
  });

  it.each(['matching-open', 'matching-merged', 'closed-without-merge'] as const)(
    'serializes a %s inspection with synchronization details',
    state => {
      const inspection: WebAppVersionSynchronizationInspection = {
        kind: state,
        releaseIdentifier: '2026-09-09.1',
        productionTagName: '2026-09-09.1-production',
        webAppVersion: createWebAppVersion('1.0.0'),
        branchName: createSynchronizationBranchName(),
        ...pullRequestDetails,
      };

      const output = createWebAppVersionSynchronizationInspectionOutput(inspection);

      expect(output).toEqual({
        state,
        release_identifier: '2026-09-09.1',
        production_tag_name: '2026-09-09.1-production',
        webapp_version: '1.0.0',
        pull_request_number: 123,
        pull_request_url: 'https://github.com/wireapp/wire-webapp/pull/123',
        branch_name: createSynchronizationBranchName(),
      });
    },
  );

  it('serializes a previous open synchronization blocker', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'blocked-by-previous-open',
      releaseIdentifier: '2026-09-16.1',
      productionTagName: '2026-09-16.1-production',
      blockingReleaseIdentifier: '2026-09-09.1',
      blockingProductionTagName: '2026-09-09.1-production',
      blockingWebAppVersion: createWebAppVersion('1.0.0'),
      branchName: createSynchronizationBranchName(),
      ...pullRequestDetails,
    };

    const output = createWebAppVersionSynchronizationInspectionOutput(inspection);

    expect(output).toEqual({
      state: 'blocked-by-previous-open',
      release_identifier: '2026-09-16.1',
      production_tag_name: '2026-09-16.1-production',
      blocking_release_identifier: '2026-09-09.1',
      blocking_production_tag_name: '2026-09-09.1-production',
      blocking_webapp_version: '1.0.0',
      pull_request_number: 123,
      pull_request_url: 'https://github.com/wireapp/wire-webapp/pull/123',
      branch_name: createSynchronizationBranchName(),
    });
  });

  it('serializes a synchronization conflict', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'conflict',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      reason: 'Multiple synchronization records exist',
    };

    const output = createWebAppVersionSynchronizationInspectionOutput(inspection);

    expect(output).toEqual({
      state: 'conflict',
      release_identifier: '2026-09-09.1',
      production_tag_name: '2026-09-09.1-production',
      reason: 'Multiple synchronization records exist',
    });
  });

  it('serializes a synchronization action', () => {
    const synchronizationResult: WebAppVersionSynchronizationResult = {
      action: 'created',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      webAppVersion: createWebAppVersion('1.0.0'),
      branchName: createSynchronizationBranchName(),
      ...pullRequestDetails,
    };

    const output = createWebAppVersionSynchronizationResultOutput(synchronizationResult);

    expect(output).toEqual({
      action: 'created',
      release_identifier: '2026-09-09.1',
      production_tag_name: '2026-09-09.1-production',
      webapp_version: '1.0.0',
      branch_name: createSynchronizationBranchName(),
      pull_request_number: 123,
      pull_request_url: 'https://github.com/wireapp/wire-webapp/pull/123',
    });
  });

  it('serializes output as one JSON document', () => {
    const output = serializeWebAppVersionSynchronizationOutput({
      state: 'available',
      release_identifier: '2026-09-09.1',
      production_tag_name: '2026-09-09.1-production',
    });

    expect(JSON.parse(output)).toEqual({
      state: 'available',
      release_identifier: '2026-09-09.1',
      production_tag_name: '2026-09-09.1-production',
    });
  });
});
