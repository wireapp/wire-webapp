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

import {getBulkMoveOutcomeEvidence} from './getBulkMoveOutcomeEvidence';

describe('getBulkMoveOutcomeEvidence', () => {
  it.each([
    {description: 'absent evidence', affectedIds: undefined, expected: 'unknown'},
    {description: 'all selected items', affectedIds: ['a', 'b'], expected: 'complete'},
    {description: 'reordered items', affectedIds: ['b', 'a'], expected: 'complete'},
    {description: 'a subset of selected items', affectedIds: ['a'], expected: 'partial'},
    {description: 'no affected items', affectedIds: [], expected: 'partial'},
    {description: 'duplicate evidence', affectedIds: ['a', 'a', 'b'], expected: 'unknown'},
    {description: 'unrelated evidence with a missing item', affectedIds: ['a', 'c'], expected: 'unknown'},
    {description: 'all selected items plus another item', affectedIds: ['a', 'b', 'c'], expected: 'complete'},
  ])('classifies $description as $expected', ({affectedIds, expected}) => {
    const affectedNodes = affectedIds?.map(Uuid => {
      return {Uuid, Path: `Drive/${Uuid}`};
    });

    expect(getBulkMoveOutcomeEvidence(affectedNodes, ['a', 'b'])).toBe(expected);
  });
});
