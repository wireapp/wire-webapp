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
  prepareReleaseAppearanceComment,
  releaseAppearanceCommentMarker,
  renderReleaseAppearanceComment,
  selectBetaDiscoveryRange,
  selectPreviousBetaTag,
  selectPreviousProductionBaseline,
  selectProductionDiscoveryRange,
} from './releaseAppearance';
import type {ReleaseAppearanceCommentState, ReleaseAppearanceValue} from './releaseAppearance';

import assert from 'node:assert';
import {Maybe} from 'true-myth';

const currentReleaseCommitHash = '1111111111111111111111111111111111111111';
const previousProductionCommitHash = '2222222222222222222222222222222222222222';
const previousBetaCommitHash = '3333333333333333333333333333333333333333';
const previousBetaMergeBaseCommitHash = '4444444444444444444444444444444444444444';

type CommentStateOverrides = {
  readonly beta?: ReleaseAppearanceValue;
  readonly production?: ReleaseAppearanceValue;
};

function createCommentState(overrides: CommentStateOverrides = {}): ReleaseAppearanceCommentState {
  return {
    beta: Maybe.of(overrides.beta),
    production: Maybe.of(overrides.production),
  };
}

describe('release appearance metadata', () => {
  it('uses the preceding Production baseline for Beta candidate 1', () => {
    const actualRangeResult = selectBetaDiscoveryRange({
      currentBetaTagName: '2026-07-21.3-beta.1',
      currentBetaTagCreatedAtSeconds: 300,
      currentCommitHash: currentReleaseCommitHash,
      betaTagRelationships: [],
      existingBetaTagNames: ['2026-07-20.4-beta.9'],
      productionTagRelationships: [
        {
          commitDistanceFromMergeBase: 4,
          mergeBaseCommitHash: previousProductionCommitHash,
          tagCommitHash: previousProductionCommitHash,
          tagName: '2026-07-20.4-production',
          tagCreatedAtSeconds: 100,
        },
      ],
    });

    assert(actualRangeResult.isOk);
    expect(actualRangeResult.value).toEqual({
      kind: 'range',
      range: {
      baselineCommitHash: previousProductionCommitHash,
      baselineTagName: '2026-07-20.4-production',
      mergeBaseCommitHash: previousProductionCommitHash,
      revisionRange: `${previousProductionCommitHash}..${currentReleaseCommitHash}`,
      },
    });
  });

  it('uses Beta candidate 1 as the baseline for candidate 2', () => {
    const actualRangeResult = selectBetaDiscoveryRange({
      currentBetaTagName: '2026-07-21.3-beta.2',
      currentBetaTagCreatedAtSeconds: 300,
      currentCommitHash: currentReleaseCommitHash,
      betaTagRelationships: [
        {
          commitDistanceFromMergeBase: 2,
          mergeBaseCommitHash: previousBetaMergeBaseCommitHash,
          tagCommitHash: previousBetaCommitHash,
          tagName: '2026-07-21.3-beta.1',
          tagCreatedAtSeconds: 200,
        },
      ],
      existingBetaTagNames: ['2026-07-21.3-beta.1'],
      productionTagRelationships: [],
    });

    assert(actualRangeResult.isOk);
    expect(actualRangeResult.value).toEqual({
      kind: 'range',
      range: {
      baselineCommitHash: previousBetaCommitHash,
      baselineTagName: '2026-07-21.3-beta.1',
      mergeBaseCommitHash: previousBetaMergeBaseCommitHash,
      revisionRange: `${previousBetaMergeBaseCommitHash}..${currentReleaseCommitHash}`,
      },
    });
  });

  it('selects Beta candidate 9 before candidate 10 numerically', () => {
    const actualPreviousTagResult = selectPreviousBetaTag('2026-07-21.3-beta.10', [
      '2026-07-21.3-beta.2',
      '2026-07-21.3-beta.9',
      '2026-07-21.3-beta.10',
      '2026-07-21.3-beta.11',
    ]);

    assert(actualPreviousTagResult.isOk);
    expect(
      actualPreviousTagResult.value
        .map(candidateTag => {
          return candidateTag.tagName;
        })
        .unwrapOr(''),
    ).toBe('2026-07-21.3-beta.9');
  });

  it('ignores Beta tags from another release identifier', () => {
    const actualPreviousTagResult = selectPreviousBetaTag('2026-07-21.3-beta.2', [
      '2026-07-20.4-beta.99',
      '2026-07-21.3-beta.1',
    ]);

    assert(actualPreviousTagResult.isOk);
    expect(
      actualPreviousTagResult.value
        .map(candidateTag => {
          return candidateTag.tagName;
        })
        .unwrapOr(''),
    ).toBe('2026-07-21.3-beta.1');
  });

  it('selects the latest Production tag by annotated tag creation order', () => {
    const actualBaselineResult = selectPreviousProductionBaseline({
      currentReleaseIdentifier: '2026-07-21.3',
      currentTagCreatedAtSeconds: 400,
      currentTagName: '2026-07-21.3-production',
      productionTagRelationships: [
        {
          commitDistanceFromMergeBase: 8,
          mergeBaseCommitHash: previousBetaMergeBaseCommitHash,
          tagCommitHash: previousProductionCommitHash,
          tagName: '2026-07-19.1-production',
          tagCreatedAtSeconds: 300,
        },
        {
          commitDistanceFromMergeBase: 3,
          mergeBaseCommitHash: previousBetaCommitHash,
          tagCommitHash: previousBetaCommitHash,
          tagName: '2026-07-20.4-production',
          tagCreatedAtSeconds: 200,
        },
      ],
    });

    assert(actualBaselineResult.isOk);
    expect(actualBaselineResult.value.kind).toBe('baseline');
    assert(actualBaselineResult.value.kind === 'baseline');
    expect(actualBaselineResult.value.relationship.tagName).toBe('2026-07-19.1-production');
  });

  it('returns an explicit bootstrap result when no preceding Production tag exists', () => {
    const actualBaselineResult = selectPreviousProductionBaseline({
      currentReleaseIdentifier: '2026-07-21.3',
      currentTagCreatedAtSeconds: 100,
      currentTagName: '2026-07-21.3-production',
      productionTagRelationships: [],
    });

    assert(actualBaselineResult.isOk);
    expect(actualBaselineResult.value).toEqual({kind: 'bootstrap'});
  });

  it('uses a merge base when the preceding Production tag is not an ancestor', () => {
    const actualRangeResult = selectProductionDiscoveryRange({
      currentCommitHash: currentReleaseCommitHash,
      currentProductionTagCreatedAtSeconds: 300,
      currentProductionTagName: '2026-07-21.3-production',
      productionTagRelationships: [
        {
          commitDistanceFromMergeBase: 5,
          mergeBaseCommitHash: previousBetaMergeBaseCommitHash,
          tagCommitHash: previousProductionCommitHash,
          tagName: '2026-07-20.4-production',
          tagCreatedAtSeconds: 200,
        },
      ],
    });

    assert(actualRangeResult.isOk);
    assert(actualRangeResult.value.kind === 'range');
    expect(actualRangeResult.value.range.mergeBaseCommitHash).toBe(previousBetaMergeBaseCommitHash);
  });

  it('does not replace an existing Beta value', () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        beta: {
          tagName: '2026-07-21.3-beta.1',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
        },
      }),
    );

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: existingCommentBody, commentId: 10}],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.2',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/2',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value).toEqual({
      action: 'unchanged',
      body: existingCommentBody,
      commentId: 10,
    });
  });

  it('renders the required fallback for an environment without a deployment', () => {
    const actualComment = renderReleaseAppearanceComment(createCommentState());

    expect(actualComment).toContain('| Beta | Not yet deployed |');
    expect(actualComment).toContain('| Production | Not yet deployed |');
  });

  it('adds Production to an existing Beta comment without inventing Beta state', () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        beta: {
          tagName: '2026-07-21.3-beta.1',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
        },
      }),
    );

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: existingCommentBody, commentId: 10}],
      environment: 'production',
      tagName: '2026-07-21.3-production',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/3',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value).toEqual({
      action: 'update',
      body: renderReleaseAppearanceComment(
        createCommentState({
          beta: {
            tagName: '2026-07-21.3-beta.1',
            workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
          },
          production: {
            tagName: '2026-07-21.3-production',
            workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/3',
          },
        }),
      ),
      commentId: 10,
    });
  });

  it('does not replace an existing Production value', () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        production: {
          tagName: '2026-07-20.4-production',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/4',
        },
      }),
    );

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: existingCommentBody, commentId: 11}],
      environment: 'production',
      tagName: '2026-07-21.3-production',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/5',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value).toEqual({
      action: 'unchanged',
      body: existingCommentBody,
      commentId: 11,
    });
  });

  it('does not write a completely unchanged comment', () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        beta: {
          tagName: '2026-07-21.3-beta.1',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
        },
        production: {
          tagName: '2026-07-21.3-production',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/3',
        },
      }),
    );

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: existingCommentBody, commentId: 12}],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.2',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/6',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value.action).toBe('unchanged');
  });

  it('treats multiple marker comments as an error', () => {
    const markerCommentBody = renderReleaseAppearanceComment(createCommentState());

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [
        {body: markerCommentBody, commentId: 13},
        {body: markerCommentBody, commentId: 14},
      ],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.1',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/7',
    });

    assert(actualCommentResult.isErr);
  });

  it('ignores comments without the automation marker and creates a new marked comment', () => {
    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: 'Human-maintained release note', commentId: 15}],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.1',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/8',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value.action).toBe('create');
    expect(actualCommentResult.value.body).toContain('wire-webapp-release-appearance:v1');
  });

  it('reports malformed machine-readable state safely', () => {
    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: `${releaseAppearanceCommentMarker}{not-json}-->`, commentId: 16}],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.1',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/9',
    });

    assert(actualCommentResult.isErr);
    expect(actualCommentResult.error.message).toContain('invalid JSON state');
  });

  it('reports unsupported machine-readable state versions safely', () => {
    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: `${releaseAppearanceCommentMarker}{"version":2}-->`, commentId: 17}],
      environment: 'beta',
      tagName: '2026-07-21.3-beta.1',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/10',
    });

    assert(actualCommentResult.isErr);
    expect(actualCommentResult.error.message).toContain('invalid state');
  });

  it('uses the fixed test marker and warning while ignoring the production marker', () => {
    const existingProductionComment = renderReleaseAppearanceComment(createCommentState());
    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: existingProductionComment, commentId: 18}],
      commentMode: 'test',
      environment: 'beta',
      tagName: '2026-07-21.3-beta.1',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/11',
    });

    assert(actualCommentResult.isOk);
    expect(actualCommentResult.value.action).toBe('create');
    expect(actualCommentResult.value.body).toContain('wire-webapp-release-appearance-test:v1');
    expect(actualCommentResult.value.body).toContain('It does not represent an actual deployment.');
    expect(actualCommentResult.value.body).toContain('| Beta | 2026-07-21.3-beta.1 |');
  });

  it('rejects legacy Production tags in immutable state', () => {
    const actualComment = renderReleaseAppearanceComment(
      createCommentState({
        production: {
          tagName: '2026-07-20-production.0',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/12',
        },
      }),
    );

    const actualCommentResult = prepareReleaseAppearanceComment({
      comments: [{body: actualComment, commentId: 19}],
      environment: 'production',
      tagName: '2026-07-21.3-production',
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/13',
    });

    assert(actualCommentResult.isErr);
    expect(actualCommentResult.error.message).toContain('invalid state');
  });
});
