import {Maybe} from 'true-myth';

import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {isBulkMoveValid} from './validateBulkMove';

const conversationQualifiedId = {id: 'conversation-id', domain: 'example.com'};

const createNode = (path: string, type: CellNodeType): CellNode => {
  return {
    id: path,
    path,
    name: path.split('/').pop() ?? path,
    sizeMb: '1 MB',
    sizeBytes: Maybe.nothing(),
    uploadedAtTimestamp: 0,
    owner: 'Owner',
    conversationName: 'Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole: 'editor',
    extension: '',
    type,
  };
};

describe('isBulkMoveValid', () => {
  it('allows a selection of unrelated files and folders to move into a valid destination', () => {
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [
          createNode('Drive/file.txt', CellNodeType.FILE),
          createNode('Drive/Folder', CellNodeType.FOLDER),
        ],
        destinationPath: 'Drive/Archive',
      }),
    ).toBe(true);
  });

  it('rejects a selection containing a folder and its child without deduplicating', () => {
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [
          createNode('Drive/Folder', CellNodeType.FOLDER),
          createNode('Drive/Folder/child.txt', CellNodeType.FILE),
        ],
        destinationPath: 'Drive/Archive',
      }),
    ).toBe(false);
  });

  it.each(['Drive/Folder', 'Drive/Folder/child'])('rejects moving a folder into %s', destinationPath => {
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [createNode('Drive/Folder', CellNodeType.FOLDER)],
        destinationPath,
      }),
    ).toBe(false);
  });

  it('rejects traversal paths and duplicate selected paths', () => {
    const selectedNodes = [createNode('Drive/file.txt', CellNodeType.FILE)];

    expect(isBulkMoveValid({conversationQualifiedId, selectedNodes, destinationPath: '../other-drive'})).toBe(false);
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [...selectedNodes, createNode('Drive/file.txt', CellNodeType.FILE)],
        destinationPath: 'Drive/Archive',
      }),
    ).toBe(false);
  });

  it('rejects nodes explicitly associated with a different conversation', () => {
    const node = createNode('Drive/file.txt', CellNodeType.FILE);
    node.conversation = {qualifiedId: {id: 'another-conversation', domain: 'example.com'}} as CellNode['conversation'];

    expect(isBulkMoveValid({conversationQualifiedId, selectedNodes: [node], destinationPath: 'Drive/Archive'})).toBe(
      false,
    );
  });

  it('rejects destinations qualified to a different conversation', () => {
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [createNode('Drive/file.txt', CellNodeType.FILE)],
        destinationPath: 'other@example.com/Drive/Archive',
      }),
    ).toBe(false);
  });

  it('allows moving to the drive root', () => {
    expect(
      isBulkMoveValid({
        conversationQualifiedId,
        selectedNodes: [createNode('Drive/file.txt', CellNodeType.FILE)],
        destinationPath: '',
      }),
    ).toBe(true);
  });
});
