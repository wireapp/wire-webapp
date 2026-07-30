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

import assert from 'node:assert';

import {createEmptySummaryOptions, createPlanSummaryOptions, createSummary} from './releaseAppearanceCommandSummary.ts';
import type {ParsedCommand} from './releaseAppearanceCommandParsing.ts';
import type {ReleaseHistoryPlan} from './releaseHistory.ts';

const betaCommand: ParsedCommand = {
  stage: 'beta',
  releaseTag: '2026-07-21.3-beta.1',
  releaseCommit: 'a'.repeat(40),
};

const commitRange = {
  startTag: '2026-07-01.2-production',
  endTag: '2026-07-21.3-beta.1',
  baseCommit: 'b'.repeat(40),
  endCommit: 'a'.repeat(40),
  commits: ['c'.repeat(40)],
};

describe('release appearance summaries', (): void => {
  it('creates a bootstrap summary without history details', (): void => {
    const summaryOptions = createEmptySummaryOptions(betaCommand);
    const plan: ReleaseHistoryPlan = {kind: 'bootstrap'};
    const planSummaryOptions = createPlanSummaryOptions(betaCommand, plan);

    const summary = createSummary({...summaryOptions, ...planSummaryOptions});

    expect(summary).toContain('- Stage: beta');
    expect(summary).toContain('- Bootstrap: yes');
    expect(summary).toContain('- Preceding Production tag: not applicable');
    expect(summary).toContain('- Beta candidate ranges for Production: not applicable');
  });

  it('renders inspected commits and pull request outcomes', (): void => {
    const summaryOptions = createEmptySummaryOptions(betaCommand);
    const summary = createSummary({
      ...summaryOptions,
      precedingProductionTag: '2026-07-01.2-production',
      candidateRanges: [{candidateTag: betaCommand.releaseTag, commitRange}],
      commitsInspected: ['commit-one'],
      pullRequestsDiscovered: [{number: 8, earliestBetaTag: betaCommand.releaseTag}],
      commentsCreated: 1,
      commentsUpdated: 2,
      commentsUnchanged: 3,
      failedPullRequests: [9],
      commitsWithoutPullRequests: ['commit-two'],
    });

    expect(summary).toContain(
      '- Beta candidate ranges for Production: 2026-07-21.3-beta.1: 2026-07-01.2-production -> 2026-07-21.3-beta.1',
    );
    expect(summary).toContain('- Commits inspected: 1 (commit-one)');
    expect(summary).toContain('- Pull requests discovered: 1 (#8)');
    expect(summary).toContain('- Comments created: 1');
    expect(summary).toContain('- Comments updated: 2');
    expect(summary).toContain('- Comments unchanged: 3');
    expect(summary).toContain('- Failed pull requests: #9');
    expect(summary).toContain('- Commits without associated pull requests: commit-two');
  });

  it('maps a Beta plan to one candidate range', (): void => {
    const plan: ReleaseHistoryPlan = {
      kind: 'beta',
      currentTag: betaCommand.releaseTag,
      precedingProductionTag: '2026-07-01.2-production',
      precedingTag: '2026-07-01.2-production',
      commitRange,
    };

    const result = createPlanSummaryOptions(betaCommand, plan);

    assert(result.bootstrap === false);
    expect(result.candidateRanges).toEqual([{candidateTag: betaCommand.releaseTag, commitRange}]);
  });
});
