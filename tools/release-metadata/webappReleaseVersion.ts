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

import {maybe, Result} from 'true-myth';

import type {PullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
import {incrementWebAppVersion} from './webappVersion.ts';
import type {WebAppVersion, WebAppVersionBump} from './webappVersion.ts';

const versionBumpPrecedence: readonly WebAppVersionBump[] = ['major', 'minor', 'patch'];

export function resolveWebAppVersionBump(
  releaseImpacts: readonly PullRequestReleaseImpact[],
): Result<WebAppVersionBump, Error> {
  const effectiveVersionBump = maybe.find(versionBump => {
    return releaseImpacts.includes(versionBump);
  }, versionBumpPrecedence);

  return effectiveVersionBump.match({
    Just(versionBump) {
      return Result.ok(versionBump);
    },
    Nothing() {
      return Result.err(new Error('No release-impacting WebApp changes are present'));
    },
  });
}

export function resolveNextWebAppReleaseVersion(
  currentVersion: string,
  releaseImpacts: readonly PullRequestReleaseImpact[],
): Result<WebAppVersion, Error> {
  return resolveWebAppVersionBump(releaseImpacts).andThen(versionBump => {
    return incrementWebAppVersion(currentVersion, versionBump);
  });
}
