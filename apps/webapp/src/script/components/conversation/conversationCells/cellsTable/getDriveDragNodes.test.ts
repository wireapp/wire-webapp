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

import {CellNode, CellNodeType} from '../../../../types/cellNode';

import {getDriveDragNodes, INTERNAL_DRIVE_DRAG_TYPE, type GetDriveDragNodesOptions} from './getDriveDragNodes';

const conversationQualifiedId = {id: 'conversation-id', domain: 'example.com'};

const createNode = (id: string, path: string, type = CellNodeType.FILE): CellNode => {
  return {id, path, type} as CellNode;
};

const createOptions = (): GetDriveDragNodesOptions => {
  const file = createNode('file-id', 'conversation-id@example.com/file.pdf');
  const otherFile = createNode('other-id', 'conversation-id@example.com/other.pdf');
  const destination = createNode('destination-id', 'conversation-id@example.com/Archive', CellNodeType.FOLDER);

  return {
    activeDrag: {nodeIds: [file.id, otherFile.id], scopeKey: 'conversation:/files'},
    dataTransferTypes: [INTERNAL_DRIVE_DRAG_TYPE],
    selectedNodeIds: new Set([file.id, otherFile.id]),
    selectionScopeKey: 'conversation:/files',
    canMoveSelection: true,
    destination,
    nodes: [destination, file, otherFile],
    conversationQualifiedId,
  };
};

describe('getDriveDragNodes', () => {
  it('returns the captured selection when scope and destination are valid', () => {
    const options = createOptions();

    expect(getDriveDragNodes(options)).toEqual(options.nodes.slice(1));
  });

  it.each([
    ['selection scope changed', {selectionScopeKey: 'conversation:/another-folder'}],
    ['selection changed', {selectedNodeIds: new Set(['file-id'])}],
  ])('rejects the drag when the %s', (_reason, changes) => {
    expect(getDriveDragNodes({...createOptions(), ...changes})).toBeNull();
  });

  it('rejects a destination that is not a folder', () => {
    const options = createOptions();

    expect(getDriveDragNodes({...options, destination: createNode('destination-id', 'Archive')})).toBeNull();
  });

  it('rejects a destination that is already the selected files’ current folder', () => {
    const options = createOptions();
    const file = createNode('file-id', 'conversation-id@example.com/Archive/file.pdf');

    expect(
      getDriveDragNodes({
        ...options,
        activeDrag: {nodeIds: [file.id], scopeKey: options.selectionScopeKey},
        selectedNodeIds: new Set([file.id]),
        nodes: [options.destination, file],
      }),
    ).toBeNull();
  });
});
