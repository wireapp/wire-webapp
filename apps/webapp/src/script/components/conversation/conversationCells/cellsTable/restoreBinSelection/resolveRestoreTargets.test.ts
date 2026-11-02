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

import {Maybe} from 'true-myth';

import {CellsSelfUserDriveRole} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {resolveRestoreTargets} from './resolveRestoreTargets';

const createBinNode = (
  pathInBin: string,
  type: CellNodeType = CellNodeType.FILE,
  selfUserDriveRole: CellsSelfUserDriveRole = 'editor',
): CellNode => {
  const name = pathInBin.split('/').pop() ?? pathInBin;
  return {
    id: `id-${pathInBin}`,
    path: `conversation-id/recycle_bin/${pathInBin}`,
    name,
    sizeMb: '',
    sizeBytes: Maybe.nothing(),
    uploadedAtTimestamp: 0,
    owner: '',
    conversationName: '',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole,
    extension: '',
    type,
  };
};

describe('resolveRestoreTargets', () => {
  it('restores selected top-level Bin items as themselves', () => {
    const file = createBinNode('file.txt');
    const folder = createBinNode('Folder', CellNodeType.FOLDER);

    const result = resolveRestoreTargets({selectedNodes: [file, folder]});

    expect(result.targets).toEqual([
      {kind: 'selected', node: file},
      {kind: 'selected', node: folder},
    ]);
    expect(result.hasParentRestore).toBe(false);
    expect(result.canRestore).toBe(true);
  });

  it('targets the deleted root parent for an item nested in a deleted folder', () => {
    const nested = createBinNode('Folder/sub/child.txt');

    const result = resolveRestoreTargets({selectedNodes: [nested]});

    expect(result.targets).toEqual([{kind: 'parent', rootParentName: 'Folder', selectedNodes: [nested]}]);
    expect(result.hasParentRestore).toBe(true);
  });

  it('restores a shared root parent only once for several nested selections', () => {
    const first = createBinNode('Folder/a.txt');
    const second = createBinNode('Folder/sub/b.txt');

    const result = resolveRestoreTargets({selectedNodes: [first, second]});

    expect(result.targets).toEqual([{kind: 'parent', rootParentName: 'Folder', selectedNodes: [first, second]}]);
  });

  it('does not add a parent target when the root folder is selected together with its children', () => {
    const folder = createBinNode('Folder', CellNodeType.FOLDER);
    const nested = createBinNode('Folder/a.txt');

    const result = resolveRestoreTargets({selectedNodes: [nested, folder]});

    expect(result.targets).toEqual([{kind: 'selected', node: folder}]);
    expect(result.hasParentRestore).toBe(false);
  });

  it('keeps separate parent targets for different root parents', () => {
    const inFirst = createBinNode('First/a.txt');
    const inSecond = createBinNode('Second/b.txt');

    const result = resolveRestoreTargets({selectedNodes: [inFirst, inSecond]});

    expect(result.targets.map(target => {return (target.kind === 'parent' ? target.rootParentName : null)})).toEqual([
      'First',
      'Second',
    ]);
  });

  it('does not allow restore when the selected item is a viewer', () => {
    const result = resolveRestoreTargets({selectedNodes: [createBinNode('file.txt', CellNodeType.FILE, 'viewer')]});

    expect(result.canRestore).toBe(false);
  });

  it('does not allow restore when any item behind a shared parent is not restorable', () => {
    const allowed = createBinNode('Folder/a.txt');
    const denied = createBinNode('Folder/b.txt', CellNodeType.FILE, 'viewer');

    const result = resolveRestoreTargets({selectedNodes: [allowed, denied]});

    expect(result.canRestore).toBe(false);
  });

  it('does not allow restore for an empty selection', () => {
    expect(resolveRestoreTargets({selectedNodes: []}).canRestore).toBe(false);
  });

  it('does not allow restore for a node outside the Bin', () => {
    const outsideBin: CellNode = {...createBinNode('file.txt'), path: 'conversation-id/Drive/file.txt'};

    expect(resolveRestoreTargets({selectedNodes: [outsideBin]}).canRestore).toBe(false);
  });
});
