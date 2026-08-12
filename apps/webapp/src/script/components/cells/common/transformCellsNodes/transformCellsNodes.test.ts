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

import {CELLS_SELF_USER_DRIVE_ROLE} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {Conversation} from 'Repositories/entity/Conversation';

import {transformCellsNodes} from './transformCellsNodes';

const createStubNode = (properties: Partial<RestNode> = {}): RestNode =>
  ({
    Path: 'conversation@example.com/report.pdf',
    Type: 'LEAF',
    Uuid: 'node-id',
    ContextWorkspace: {Uuid: 'conversation@example.com'},
    ...properties,
  }) as RestNode;

describe('transformCellsNodes', () => {
  it('preserves backend tag order in the cell model', () => {
    const nodeWithTags = createStubNode({
      UserMetadata: [{Namespace: 'usermeta-tags', JsonValue: JSON.stringify('Zulu, alpha, Beta')}],
    });

    const [node] = transformCellsNodes({nodes: [nodeWithTags], users: []});

    expect(node.tags).toEqual(['Zulu', 'alpha', 'Beta']);
  });

  it.each([
    {label: 'null', size: null},
    {label: 'missing', size: undefined},
  ])('presents a $label folder size as zero bytes', ({size}) => {
    const emptyFolder = createStubNode({Type: 'COLLECTION', Size: size} as Partial<RestNode>);

    const [node] = transformCellsNodes({nodes: [emptyFolder], users: []});

    expect(node.sizeMb).toBe('0 B');
  });

  it.each([
    {label: 'null', size: null},
    {label: 'missing', size: undefined},
  ])('preserves a $label file size as unknown', ({size}) => {
    const fileWithoutSize = createStubNode({Size: size} as Partial<RestNode>);

    const [node] = transformCellsNodes({nodes: [fileWithoutSize], users: []});

    expect(node.sizeMb).toBe('-');
  });

  it('enriches a node with its conversation when conversations are provided', () => {
    const conversation = {qualifiedId: {domain: 'example.com', id: 'conversation'}} as Conversation;

    const [node] = transformCellsNodes({nodes: [createStubNode()], users: [], conversations: [conversation]});

    expect(node.conversation).toBe(conversation);
  });

  it('marks a node as editor when the conversation and self user belong to the same team', () => {
    const conversation = {
      qualifiedId: {domain: 'example.com', id: 'conversation'},
      teamId: 'team-a',
    } as Conversation;

    const [node] = transformCellsNodes({
      nodes: [createStubNode()],
      users: [],
      conversations: [conversation],
      selfUserTeamId: 'team-a',
    });

    expect(node.selfUserDriveRole).toBe(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);
  });

  it('marks a node as viewer when the conversation and self user belong to different teams', () => {
    const conversation = {
      qualifiedId: {domain: 'example.com', id: 'conversation'},
      teamId: 'team-a',
    } as Conversation;

    const [node] = transformCellsNodes({
      nodes: [createStubNode()],
      users: [],
      conversations: [conversation],
      selfUserTeamId: 'team-b',
    });

    expect(node.selfUserDriveRole).toBe(CELLS_SELF_USER_DRIVE_ROLE.VIEWER);
  });

  it('leaves the conversation absent when conversations and workspace context are not provided', () => {
    const nodeWithoutWorkspace = createStubNode({ContextWorkspace: undefined});

    const [node] = transformCellsNodes({nodes: [nodeWithoutWorkspace], users: []});

    expect(node.conversation).toBeUndefined();
    expect(node.selfUserDriveRole).toBe(CELLS_SELF_USER_DRIVE_ROLE.EDITOR);
  });
});
