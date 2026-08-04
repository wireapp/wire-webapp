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

import {readFile} from 'node:fs/promises';

function readWorkflowJob(workflowContents: string, jobIdentifier: string): string {
  const jobStart = workflowContents.indexOf(`  ${jobIdentifier}:`);
  expect(jobStart).not.toBe(-1);

  const followingJobMatch = /\n  [a-z0-9_]+:\n/gu.exec(workflowContents.slice(jobStart + 1));
  const jobEnd = followingJobMatch === null ? workflowContents.length : jobStart + 1 + followingJobMatch.index;
  return workflowContents.slice(jobStart, jobEnd);
}

describe('Release WebApp release-appearance workflow jobs', () => {
  it.each(['comment_beta_release_appearances', 'comment_production_release_appearances'])(
    'executes tooling from github.sha while passing the application release SHA as data for %s',
    async (commentJobIdentifier: string) => {
      const workflowContents = await readFile('.github/workflows/release-webapp.yml', 'utf8');
      const jobContents = readWorkflowJob(workflowContents, commentJobIdentifier);

      expect(jobContents).toContain('fetch-depth: 0');
      expect(jobContents).toContain('fetch-tags: true');
      expect(jobContents).toContain('ref: ${{ github.sha }}');
      expect(jobContents).toContain('WORKFLOW_TOOLING_COMMIT_SHA: ${{ github.sha }}');
      expect(jobContents).toContain('RELEASE_COMMIT_SHA: ${{ needs.build_artifact.outputs.release_commit_sha }}');
      expect(jobContents).not.toContain('ref: ${{ needs.build_artifact.outputs.release_commit_sha }}');
    },
  );
});
