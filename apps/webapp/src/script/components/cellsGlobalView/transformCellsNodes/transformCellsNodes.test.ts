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

import {RestNode} from 'cells-sdk-ts';

import {transformCellsNodes} from './transformCellsNodes';

const createNodeWithTags = (tags: string): RestNode =>
  ({
    Path: 'conversation@example.com/report.pdf',
    Type: 'LEAF',
    Uuid: 'node-id',
    ContextWorkspace: {Uuid: 'conversation@example.com'},
    UserMetadata: [{Namespace: 'usermeta-tags', JsonValue: JSON.stringify(tags)}],
  }) as RestNode;

describe('transformCellsNodes', () => {
  it('renders All Files tags alphabetically', () => {
    const [node] = transformCellsNodes({
      nodes: [createNodeWithTags('Zulu, alpha, Beta')],
      users: [],
      conversations: [],
    });

    expect(node.tags).toEqual(['alpha', 'Beta', 'Zulu']);
  });
});
