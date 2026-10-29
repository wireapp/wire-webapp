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

import type {RestPerformActionResponse} from 'cells-sdk-ts';

type BulkMoveOutcomeEvidence = 'complete' | 'partial' | 'unknown';

export const getBulkMoveOutcomeEvidence = (
  affectedNodes: RestPerformActionResponse['AffectedNodes'],
  expectedNodeIds: string[],
): BulkMoveOutcomeEvidence => {
  if (affectedNodes === undefined) {
    return 'unknown';
  }

  const affectedNodeIds = affectedNodes.map(({Uuid}) => {
    return Uuid;
  });
  const affectedNodeIdSet = new Set(affectedNodeIds);
  if (affectedNodeIdSet.size !== affectedNodeIds.length) {
    return 'unknown';
  }

  const expectedNodeIdSet = new Set(expectedNodeIds);
  const missingExpectedNodes = expectedNodeIds.some(nodeId => {
    return !affectedNodeIdSet.has(nodeId);
  });
  if (!missingExpectedNodes) {
    return 'complete';
  }

  const includesUnexpectedNodes = affectedNodeIds.some(nodeId => {
    return !expectedNodeIdSet.has(nodeId);
  });
  return includesUnexpectedNodes ? 'unknown' : 'partial';
};
