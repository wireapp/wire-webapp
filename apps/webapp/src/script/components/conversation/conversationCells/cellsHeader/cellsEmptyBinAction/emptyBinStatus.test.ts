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

import {JobsTaskStatus} from 'cells-sdk-ts';

import {getEmptyBinOutcome} from './emptyBinStatus';

describe('getEmptyBinOutcome', () => {
  it('reports completion only when every delete job finished', () => {
    expect(getEmptyBinOutcome([JobsTaskStatus.Finished, JobsTaskStatus.Finished])).toBe('completed');
  });

  it('keeps the action pending while any job is non-terminal', () => {
    expect(getEmptyBinOutcome([JobsTaskStatus.Finished, JobsTaskStatus.Running])).toBe('processing');
  });

  it('reports partial completion when some jobs failed after others finished', () => {
    expect(getEmptyBinOutcome([JobsTaskStatus.Finished, JobsTaskStatus.Error])).toBe('partial');
  });

  it('reports failure when all terminal jobs failed or were interrupted', () => {
    expect(getEmptyBinOutcome([JobsTaskStatus.Error, JobsTaskStatus.Interrupted])).toBe('failed');
  });

  it('does not report success when status is missing or unknown', () => {
    expect(getEmptyBinOutcome([JobsTaskStatus.Unknown])).toBe('processing');
    expect(getEmptyBinOutcome([undefined])).toBe('processing');
  });
});
