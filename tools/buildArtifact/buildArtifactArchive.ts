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

import {execFileSync} from 'node:child_process';

import type {BuildArtifactHtmlDocument} from './buildArtifactMetadata.ts';

export function readBuildArtifactArchiveFile(artifactPath: string, archiveFilePath: string): string {
  return execFileSync('unzip', ['-p', artifactPath, archiveFilePath], {encoding: 'utf8'});
}

export function readBuildArtifactHtmlDocuments(artifactPath: string): readonly BuildArtifactHtmlDocument[] {
  const archiveFilePaths = execFileSync('unzip', ['-Z1', artifactPath], {encoding: 'utf8'})
    .split('\n')
    .filter(archiveFilePath => {
      return archiveFilePath.startsWith('static/') && archiveFilePath.endsWith('.html');
    });

  return archiveFilePaths.map(archiveFilePath => {
    return {
      archiveFilePath,
      contents: readBuildArtifactArchiveFile(artifactPath, archiveFilePath),
    };
  });
}

export function readBuildArtifactMetadata(artifactPath: string): unknown {
  return JSON.parse(readBuildArtifactArchiveFile(artifactPath, 'version.json'));
}
