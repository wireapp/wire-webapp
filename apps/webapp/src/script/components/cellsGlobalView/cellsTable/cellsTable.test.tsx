/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
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

import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ThemeProvider} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsTable} from './cellsTable';

import {CELLS_SELF_USER_DRIVE_ROLE} from '../../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import type {JSX} from '@emotion/react/jsx-runtime';

const translateSelectionForTest: Translate = (key, substitutions) => {
  if (key === 'cells.selection.selectedCount') {
    return `${substitutions?.count} selected`;
  }
  if (key === 'cells.selection.selectItem') {
    return `Select ${substitutions?.name}`;
  }
  if (key === 'cells.selection.clear') {
    return 'Clear selection';
  }
  return translateForTest(key);
};

const createNode = (id: string, type: CellNodeType): CellNode => {
  return {
    id,
    path: `/${id}`,
    name: `${id} name`,
    sizeMb: '1 MB',
    uploadedAtTimestamp: 0,
    owner: 'Owner',
    conversationName: 'Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    selfUserDriveRole: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    extension: '',
    type,
  };
};

type RenderCellsTableResult = {
  rerenderWithNodes: (nodes: CellNode[]) => void;
  rerenderWithScope: (scopeKey: string) => void;
};
const renderCellsTable = (
  selectionEnabled = true,
  selectionScopeKey = 'filters:none',
  isBulkActionsEnabled = true,
): RenderCellsTableResult => {
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateSelectionForTest,
      isFeatureToggleEnabled: featureToggleName => {
        return isBulkActionsEnabled && featureToggleName === driveBulkActionsFeatureToggleName;
      },
    }),
  );
  const renderTable = (nodes: CellNode[], scopeKey = selectionScopeKey): JSX.Element => {
    return (
      <ThemeProvider>
        <CellsTable
          nodes={nodes}
          cellsRepository={{} as CellsRepository}
          getDirectionFor={() => {
            return undefined;
          }}
          isSortingEnabled
          onToggleSort={jest.fn()}
          selectionEnabled={selectionEnabled}
          selectionScopeKey={scopeKey}
          selectionBarAnchor={document.body}
        />
      </ThemeProvider>
    );
  };
  const {rerender} = render(
    renderTable([createNode('folder', CellNodeType.FOLDER), createNode('file', CellNodeType.FILE)]),
    {wrapper},
  );

  return {
    rerenderWithNodes: (nodes: CellNode[]) => {
      return rerender(renderTable(nodes));
    },
    rerenderWithScope: (scopeKey: string) => {
      return rerender(
        renderTable([createNode('folder', CellNodeType.FOLDER), createNode('file', CellNodeType.FILE)], scopeKey),
      );
    },
  };
};

describe('CellsTable selection', () => {
  it('selects files and folders, updates the count, and clears all selected rows', () => {
    renderCellsTable();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveAccessibleName('Select folder name');

    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();

    fireEvent.click(screen.getByRole('button', {name: 'Clear selection'}));
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    const clearedCheckboxes = screen.getAllByRole('checkbox');
    expect(clearedCheckboxes[0]).not.toBeChecked();
    expect(clearedCheckboxes[1]).not.toBeChecked();
  });

  it('preserves selection when opening a file from row options', async () => {
    const user = userEvent.setup();
    renderCellsTable();
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', {name: 'cells.options.label'})[1]);
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.open'}));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('clears selected items when the active filter scope changes', () => {
    const {rerenderWithScope} = renderCellsTable();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    rerenderWithScope('filters:tag-two');

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
  });

  it('removes selected items and count when a refresh removes nodes', () => {
    const {rerenderWithNodes} = renderCellsTable();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    rerenderWithNodes([createNode('file', CellNodeType.FILE)]);

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('hides selection controls when the Drive bulk actions feature flag is off', () => {
    renderCellsTable(true, 'filters:none', false);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not render selection controls for active search results', () => {
    renderCellsTable(false);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
