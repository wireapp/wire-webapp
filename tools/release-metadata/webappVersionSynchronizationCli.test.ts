/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {
  createWebAppVersionSynchronizationOutput,
  serializeWebAppVersionSynchronizationOutput,
} from './webappVersionSynchronizationCli.ts';
import type {WebAppVersionSynchronizationResult} from './webappVersionSynchronizationOrchestration.ts';
import {validateWebAppVersion} from './webappVersion.ts';

const webAppVersionResult = validateWebAppVersion('1.1.0');
if (webAppVersionResult.isErr) {
  throw webAppVersionResult.error;
}

const synchronizationResult: WebAppVersionSynchronizationResult = {
  action: 'created',
  productionTagName: 'v1.1.0',
  webAppVersion: webAppVersionResult.value,
  branchName: 'webapp-version-1.1.0' as WebAppVersionSynchronizationResult['branchName'],
  pullRequestNumber: 123,
  pullRequestUrl: 'https://github.com/wireapp/wire-webapp/pull/123',
};

describe('WebApp version synchronization CLI output', () => {
  it('serializes the stable release version and synchronization PR fields', () => {
    const output = createWebAppVersionSynchronizationOutput(synchronizationResult);

    expect(output).toEqual({
      action: 'created',
      production_tag_name: 'v1.1.0',
      version: '1.1.0',
      branch_name: 'webapp-version-1.1.0',
      pull_request_number: 123,
      pull_request_url: 'https://github.com/wireapp/wire-webapp/pull/123',
    });
    expect(serializeWebAppVersionSynchronizationOutput(output)).toBe(JSON.stringify(output));
  });
});
