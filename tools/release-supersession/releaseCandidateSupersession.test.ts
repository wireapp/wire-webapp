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

import {
  determineReleaseCandidateState,
  productionOperationJobName,
  selectSupersedableReleaseCandidates,
} from './releaseCandidateSupersession.ts';
import type {
  ReleaseCandidateObservation,
  ReleaseWorkflowJob,
  ReleaseWorkflowRun,
} from './releaseCandidateSupersession.ts';

function createRun(runOptions: Partial<ReleaseWorkflowRun> = {}): ReleaseWorkflowRun {
  return {
    id: 1,
    status: 'in_progress',
    conclusion: null,
    createdAt: '2026-08-19T10:00:00Z',
    ...runOptions,
  };
}

function createObservation(
  runOptions: Partial<ReleaseWorkflowRun> = {},
  jobs: readonly ReleaseWorkflowJob[] = [],
): ReleaseCandidateObservation {
  return {run: createRun(runOptions), jobs};
}

function createProductionJob(jobOptions: Partial<ReleaseWorkflowJob> = {}): ReleaseWorkflowJob {
  return {
    name: productionOperationJobName,
    status: 'queued',
    conclusion: null,
    ...jobOptions,
  };
}

describe('release candidate supersession decisions', () => {
  it('selects older promotable candidates in deterministic creation order', () => {
    const observations = [
      createObservation({id: 30, createdAt: '2026-08-19T10:30:00Z'}),
      createObservation({id: 10, createdAt: '2026-08-19T10:10:00Z'}),
      createObservation({id: 20, createdAt: '2026-08-19T10:20:00Z'}),
    ];

    const actualResult = selectSupersedableReleaseCandidates({currentRunId: 30, observations});

    assert(actualResult.isOk);
    expect(actualResult.value.map(candidate => candidate.run.id)).toEqual([10, 20]);
    expect(actualResult.value.every(candidate => candidate.state === 'superseded')).toBe(true);
  });

  it('selects only runs older than the current run', () => {
    const observations = [
      createObservation({id: 10, createdAt: '2026-08-19T10:10:00Z'}),
      createObservation({id: 20, createdAt: '2026-08-19T10:20:00Z'}),
      createObservation({id: 30, createdAt: '2026-08-19T10:30:00Z'}),
    ];

    const actualResult = selectSupersedableReleaseCandidates({currentRunId: 20, observations});

    assert(actualResult.isOk);
    expect(actualResult.value.map(candidate => candidate.run.id)).toEqual([10]);
  });

  it('uses the run ID as a deterministic tie-breaker for equal creation timestamps', () => {
    const observations = [
      createObservation({id: 30, createdAt: '2026-08-19T10:00:00Z'}),
      createObservation({id: 20, createdAt: '2026-08-19T10:00:00Z'}),
      createObservation({id: 10, createdAt: '2026-08-19T10:00:00Z'}),
    ];

    const actualResult = selectSupersedableReleaseCandidates({currentRunId: 20, observations});

    assert(actualResult.isOk);
    expect(actualResult.value.map(candidate => candidate.run.id)).toEqual([10]);
  });

  it('does not select the current run even when it is still in progress', () => {
    const observations = [createObservation({id: 30})];

    const actualResult = selectSupersedableReleaseCandidates({currentRunId: 30, observations});

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
  });

  it('ignores completed releases without interpreting their job state', () => {
    const completedObservation = createObservation({id: 10, status: 'completed', conclusion: 'success'}, [
      createProductionJob({status: 'completed', conclusion: 'success'}),
    ]);

    const actualResult = selectSupersedableReleaseCandidates({
      currentRunId: 30,
      observations: [completedObservation, createObservation({id: 30})],
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
  });

  it('does not supersede a release whose Production operation is in progress', () => {
    const observation = createObservation({id: 10}, [createProductionJob({status: 'in_progress'})]);

    const actualResult = selectSupersedableReleaseCandidates({
      currentRunId: 30,
      observations: [observation, createObservation({id: 30})],
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
    const actualStateResult = determineReleaseCandidateState(observation);

    assert(actualStateResult.isOk);
    expect(actualStateResult.value).toBe('productionStarted');
  });

  it('does not supersede a release after a Production operation completed', () => {
    const observation = createObservation({id: 10}, [
      createProductionJob({status: 'completed', conclusion: 'failure'}),
    ]);

    const actualResult = selectSupersedableReleaseCandidates({
      currentRunId: 30,
      observations: [observation, createObservation({id: 30})],
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
  });

  it('keeps a release promotable while its Production job is only queued', () => {
    const observation = createObservation({id: 10}, [createProductionJob({status: 'queued'})]);

    const actualResult = selectSupersedableReleaseCandidates({
      currentRunId: 30,
      observations: [observation, createObservation({id: 30})],
    });

    assert(actualResult.isOk);
    expect(actualResult.value.map(candidate => candidate.run.id)).toEqual([10]);
  });

  it('lets the newest verified candidate supersede multiple historical candidates', () => {
    const observations = [
      createObservation({id: 10, createdAt: '2026-08-19T10:10:00Z'}),
      createObservation({id: 20, createdAt: '2026-08-19T10:20:00Z'}),
      createObservation({id: 30, createdAt: '2026-08-19T10:30:00Z'}),
    ];

    const actualResult = selectSupersedableReleaseCandidates({currentRunId: 30, observations});

    assert(actualResult.isOk);
    expect(actualResult.value.map(candidate => candidate.run.id)).toEqual([10, 20]);
  });

  it('fails closed when GitHub returns unexpected or incomplete state', () => {
    const invalidRun = createRun({status: 'in_progress', conclusion: 'success'});

    const actualResult = determineReleaseCandidateState({run: invalidRun, jobs: []});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('has a conclusion');
  });

  it('fails closed when the current workflow run is missing from GitHub state', () => {
    const actualResult = selectSupersedableReleaseCandidates({
      currentRunId: 30,
      observations: [createObservation({id: 10})],
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('is missing from GitHub Actions state');
  });

  it('fails closed when a Production job has no conclusion after completion', () => {
    const invalidJob = createProductionJob({status: 'completed', conclusion: null});

    const actualResult = determineReleaseCandidateState(createObservation({id: 10}, [invalidJob]));

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('has no conclusion');
  });
});
