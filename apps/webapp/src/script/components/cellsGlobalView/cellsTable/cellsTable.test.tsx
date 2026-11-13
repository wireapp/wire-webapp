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

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Maybe} from 'true-myth';

import {CellsTable} from './cellsTable';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {CellsRepository} from '../../../repositories/cells/cellsRepository';
import {CellNode, CellNodeType} from '../../../types/cellNode';
import {THEME_ID} from '../../../uiKit/identity/theme/theme';
import {StyledApp} from '../../../uiKit/layout/styledApp/styledApp';
import {translateForTest} from '../../../util/test/translateForTest';
import {CELLS_SELF_USER_DRIVE_ROLE} from '../../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

const createNode = (id: string, type: CellNodeType): CellNode => {
  return {
    id,
    path: `/${id}`,
    name: `${id} name`,
    sizeMb: '1 MB',
    sizeBytes: Maybe.nothing(),
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

const renderCellsTable = (themeId = THEME_ID.LIGHT, featureTogglesEnabled = true, onToggleSort = jest.fn()): void => {
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: () => {
        return featureTogglesEnabled;
      },
    }),
  );

  render(
    <StyledApp themeId={themeId}>
      <CellsTable
        nodes={[createNode('folder', CellNodeType.FOLDER), createNode('file', CellNodeType.FILE)]}
        cellsRepository={{} as CellsRepository}
        getDirectionFor={() => {
          return undefined;
        }}
        isSortingEnabled
        onToggleSort={onToggleSort}
      />
    </StyledApp>,
    {wrapper},
  );
};

describe.each([THEME_ID.LIGHT, THEME_ID.DARK])('global Files table in the %s theme', themeId => {
  it.each([true, false])('shows files and folders without bulk selection when feature toggles are %s', enabled => {
    renderCellsTable(themeId, enabled);

    expect(screen.getByRole('row', {name: /file name/})).toBeInTheDocument();
    expect(screen.getByRole('row', {name: /folder name/})).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'cells.selection.clear'})).not.toBeInTheDocument();
  });

  it('opens a file from row options without offering bulk selection', async () => {
    const user = userEvent.setup();
    renderCellsTable(themeId);

    await user.click(screen.getAllByRole('button', {name: 'cells.options.label'})[1]);
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.open'}));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('keeps name sorting available without a selection column', async () => {
    const user = userEvent.setup();
    const onToggleSort = jest.fn();
    renderCellsTable(themeId, true, onToggleSort);

    await user.click(screen.getByRole('button', {name: 'cells.tableRow.name'}));

    expect(onToggleSort).toHaveBeenCalledWith('name');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
