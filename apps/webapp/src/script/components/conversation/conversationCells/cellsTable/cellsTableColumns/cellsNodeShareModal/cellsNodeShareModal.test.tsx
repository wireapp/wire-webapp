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

import {ReactNode} from 'react';

import {render} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {createFireAndForgetInvokerForTest} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {CellShareModalContent} from './cellsNodeShareModal';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

const withTheme = (component: ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

describe('CellShareModalContent', () => {
  const conversationId = 'conversation-id';
  const nodeId = 'node-id';

  const createNode = (): CellNode => ({
    id: nodeId,
    name: 'file.pdf',
    path: '/file.pdf',
    mimeType: 'application/pdf',
    sizeMb: '1',
    extension: 'pdf',
    uploadedAtTimestamp: Date.now(),
    owner: 'owner',
    conversationName: 'Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    type: CellNodeType.FILE,
  });

  const createCellsRepository = (): CellsRepository =>
    ({
      createPublicLink: jest.fn(),
      getPublicLink: jest.fn(),
      deletePublicLink: jest.fn(),
      updatePublicLink: jest.fn(),
    }) as unknown as CellsRepository;

  beforeEach(() => {
    useCellsStore.getState().clearAll({conversationId});
    useCellsStore.getState().setNodes({conversationId, nodes: [createNode()]});
  });

  it('renders conversation share modal outside RootProvider when fireAndForgetInvoker is provided', () => {
    expect(() =>
      render(
        withTheme(
          <CellShareModalContent
            type="file"
            uuid={nodeId}
            conversationId={conversationId}
            cellsRepository={createCellsRepository()}
            fireAndForgetInvoker={createFireAndForgetInvokerForTest()}
            modalId="modal-id"
            translate={key => {
              return key;
            }}
          />,
        ),
      ),
    ).not.toThrow('RootContext has not been set');
  });
});
