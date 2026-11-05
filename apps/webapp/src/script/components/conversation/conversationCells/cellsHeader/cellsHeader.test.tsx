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

import {act, render, screen, waitFor, type RenderResult} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {JobsTaskStatus, TreeNodeType} from 'cells-sdk-ts';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import type {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../util/test/translateForTest';

import {CellsHeader} from './cellsHeader';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';

const cellsNewItemButtonLabel = 'cells.newItemMenu.button';
const filter = {
  type: 'toggle' as const,
  id: 'sharedViaLink' as const,
  label: 'Public links',
  isActive: false,
  onToggle: jest.fn(),
};

const defaultProperties = {
  onRefresh: jest.fn(),
  onRefreshAfterEmptyBinOutcome: jest.fn().mockResolvedValue(true),
  onEmptyBinSubmitted: jest.fn(),
  getCurrentCellsPath: getCellsFilesPath,
  conversationName: 'Project Alpha',
  conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
  cellsRepository: {} as CellsRepository,
  isSearchViewOpen: true,
  isInRecycleBin: false,
  onOpenSearchView: jest.fn(),
  searchValue: '',
  onSearchChange: jest.fn(),
  onSearchClear: jest.fn(),
  onUploadFiles: jest.fn(),
  onUploadFolder: jest.fn(),
  isUploadFilesEnabled: false,
  filters: [filter],
  showViewerPermission: false,
};

const renderCellsHeader = (
  properties: Partial<typeof defaultProperties> & {
    clock?: ReturnType<typeof createDeterministicClock>;
    onSelectionBarAnchorChange?: (anchor: HTMLDivElement | null) => void;
  } = {},
  isBulkActionsEnabled = true,
): RenderResult => {
  const {clock, ...headerProperties} = properties;
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      clock,
      isFeatureToggleEnabled: featureToggleName => {
        return isBulkActionsEnabled && featureToggleName === driveBulkActionsFeatureToggleName;
      },
    }),
  );

  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsHeader {...defaultProperties} {...headerProperties} />
    </StyledApp>,
    {wrapper},
  );
};

describe('CellsHeader', () => {
  it('keeps the breadcrumb strip clickable while providing a selection overlay anchor', () => {
    const onSelectionBarAnchorChange = jest.fn();
    const {container} = renderCellsHeader({isSearchViewOpen: false, onSelectionBarAnchorChange});

    const anchor = onSelectionBarAnchorChange.mock.calls.find(([element]) => {
      return element !== null;
    })?.[0];

    expect(anchor?.parentElement).toBe(container.querySelector('[data-uie-name="cells-selection-overlay-row"]'));
    expect(anchor).toHaveStyle({pointerEvents: 'none'});
  });

  it('navigates to the Drive root when clicking the root breadcrumb from a nested folder', async () => {
    const originalHash = window.location.hash;
    window.location.hash = '#/conversation/conversation-id/wire.com/files/wire-cells-web/folder';

    try {
      renderCellsHeader({isSearchViewOpen: false});

      await userEvent.click(screen.getByRole('button', {name: 'cells.breadcrumb.files'}));

      expect(window.location.hash).toBe('#/conversation/conversation-id/wire.com/files');
    } finally {
      window.location.hash = originalHash;
    }
  });

  it('does not render a selection overlay anchor when the feature flag is off', () => {
    const onSelectionBarAnchorChange = jest.fn();
    renderCellsHeader({isSearchViewOpen: false, onSelectionBarAnchorChange}, false);

    expect(onSelectionBarAnchorChange).not.toHaveBeenCalled();
  });

  it('hides search and filters while viewing the recycle bin', () => {
    renderCellsHeader({isInRecycleBin: true});

    expect(screen.queryByRole('textbox', {name: 'cells.search.placeholder'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Public links'})).not.toBeInTheDocument();
  });

  it('shows Empty Bin at the Bin root even when the current page has no visible rows', () => {
    renderCellsHeader({
      getCurrentCellsPath: () => {
        return 'recycle_bin';
      },
      isInRecycleBin: true,
      isSearchViewOpen: false,
    });

    const emptyBinButton = screen.getByRole('button', {name: 'cells.emptyBin.button'});
    const headerButtons = screen.getAllByRole('button');

    expect(emptyBinButton).toBeInTheDocument();
    expect(headerButtons.indexOf(emptyBinButton)).toBeLessThan(
      headerButtons.indexOf(screen.getByRole('button', {name: 'cells.refreshButton'})),
    );
  });

  it('reports a failed Empty Bin refresh instead of treating it as successful', async () => {
    const cellsRepository = {
      lookupNodeByPath: jest.fn().mockResolvedValue({Type: TreeNodeType.Collection, Uuid: 'bin-root'}),
      deleteNodes: jest.fn().mockResolvedValue({Status: 'Performed', BackgroundActions: []}),
    } as unknown as CellsRepository;
    const onRefresh = jest.fn();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(false);
    renderCellsHeader({
      cellsRepository,
      getCurrentCellsPath: () => {
        return 'recycle_bin';
      },
      isInRecycleBin: true,
      isSearchViewOpen: false,
      onRefresh,
      onRefreshAfterEmptyBinOutcome,
    });

    await userEvent.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await userEvent.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.emptyBin.refreshFailed');
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('keeps background Empty Bin work alive across nested Bin navigation', async () => {
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    let currentPath = 'recycle_bin';
    const getCurrentCellsPath = (): string => {
      return currentPath;
    };
    const getBackgroundActionInfo = jest
      .fn()
      .mockResolvedValueOnce({Status: JobsTaskStatus.Running})
      .mockResolvedValueOnce({Status: JobsTaskStatus.Finished});
    const cellsRepository = {
      lookupNodeByPath: jest.fn().mockResolvedValue({Type: TreeNodeType.Collection, Uuid: 'bin-root'}),
      deleteNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
      }),
      getBackgroundActionInfo,
    } as unknown as CellsRepository;
    const onEmptyBinSubmitted = jest.fn();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    const properties = {
      ...defaultProperties,
      cellsRepository,
      getCurrentCellsPath,
      isInRecycleBin: true,
      isSearchViewOpen: false,
      onEmptyBinSubmitted,
      onRefreshAfterEmptyBinOutcome,
    };
    const rendered = renderCellsHeader({...properties, clock}, true);
    const rerender = (): void => {
      rendered.rerender(
        <StyledApp themeId={THEME_ID.DEFAULT}>
          <CellsHeader {...properties} />
        </StyledApp>,
      );
    };

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.processing');

    currentPath = 'recycle_bin/folder';
    rerender();
    expect(screen.queryByRole('button', {name: 'cells.emptyBin.button'})).not.toBeInTheDocument();
    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await Promise.resolve();
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);

    currentPath = 'recycle_bin';
    rerender();
    await waitFor(() => {
      expect(screen.getByText('cells.emptyBin.status.completed')).toBeInTheDocument();
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
  });

  it('does not show Empty Bin below the Bin root', () => {
    renderCellsHeader({
      getCurrentCellsPath: () => {
        return 'recycle_bin/folder';
      },
      isInRecycleBin: true,
      isSearchViewOpen: false,
    });

    expect(screen.queryByRole('button', {name: 'cells.emptyBin.button'})).not.toBeInTheDocument();
  });

  it('keeps search and filters available outside the recycle bin', () => {
    renderCellsHeader();

    expect(screen.getByRole('textbox', {name: 'cells.search.placeholder'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Public links'})).toBeInTheDocument();
  });

  it('renders the viewer permission banner when restricted', () => {
    renderCellsHeader({showViewerPermission: true, isSearchViewOpen: false});

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('conversationFileUploadRestrictedOverlayDescription')).toBeInTheDocument();
  });

  it('renders the new-item menu outside the recycle bin', () => {
    renderCellsHeader({isSearchViewOpen: false});

    expect(screen.getByRole('button', {name: cellsNewItemButtonLabel})).toBeInTheDocument();
  });

  it('opens the file picker from the new-item menu', async () => {
    const onUploadFiles = jest.fn();
    renderCellsHeader({isSearchViewOpen: false, onUploadFiles, isUploadFilesEnabled: true});

    await userEvent.click(screen.getByRole('button', {name: cellsNewItemButtonLabel}));
    await userEvent.click(screen.getByRole('menuitem', {name: 'cells.newItemMenu.uploadFile'}));

    expect(onUploadFiles).toHaveBeenCalledTimes(1);
  });

  it('opens the folder picker from the new-item menu', async () => {
    const onUploadFolder = jest.fn();
    renderCellsHeader({isSearchViewOpen: false, onUploadFolder, isUploadFilesEnabled: true});

    await userEvent.click(screen.getByRole('button', {name: cellsNewItemButtonLabel}));
    await userEvent.click(screen.getByRole('menuitem', {name: 'cells.newItemMenu.uploadFolder'}));

    expect(onUploadFolder).toHaveBeenCalledTimes(1);
  });

  it('hides the file picker menu item when direct upload is disabled', async () => {
    renderCellsHeader({isSearchViewOpen: false, isUploadFilesEnabled: false});

    await userEvent.click(screen.getByRole('button', {name: cellsNewItemButtonLabel}));

    expect(screen.queryByRole('menuitem', {name: 'cells.newItemMenu.uploadFile'})).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', {name: 'cells.newItemMenu.uploadFolder'})).not.toBeInTheDocument();
  });

  it('does not render the new-item menu in the recycle bin', () => {
    renderCellsHeader({isInRecycleBin: true, isSearchViewOpen: false});

    expect(screen.queryByRole('button', {name: cellsNewItemButtonLabel})).not.toBeInTheDocument();
  });
});
