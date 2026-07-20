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

import type {Maybe} from 'true-myth';

export type BuildMetadata = {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
};

export type BuildMetadataInput = {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
};

export function createBuildMetadata(buildMetadataInput: BuildMetadataInput): BuildMetadata {
  return {
    version: buildMetadataInput.version,
    commit: buildMetadataInput.commit,
    builtAt: buildMetadataInput.builtAt,
  };
}

export function getShortCommitSha(commitSha: string): string {
  return commitSha.slice(0, 7) || 'unknown';
}

export function resolveBuildVersion(explicitVersion: Maybe<string>, commitSha: string): string {
  return explicitVersion.unwrapOr(`dev-${getShortCommitSha(commitSha)}`);
}
