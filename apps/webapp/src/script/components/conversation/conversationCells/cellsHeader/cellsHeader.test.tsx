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

import type {ReactElement} from 'react';

import {act, render, screen, waitFor, type RenderResult} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {JobsTaskStatus, TreeNodeType} from 'cells-sdk-ts';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import en from '../../../../../i18n/en-US.json';

import type {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {setStrings, translate} from '../../../../util/localizerUtil';
import {translateForTest} from '../../../../util/test/translateForTest';

import {CellsHeader} from './cellsHeader';
import type {SharedDriveUploadController} from '../sharedDriveUploadController';
import {SharedDriveUploadStatusProvider} from '../sharedDriveUploadStatusContext';
import {SharedDriveUploadStatusPopupHost} from '../sharedDriveUploadStatusPopupHost';
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
  onEmptyBinInProgressChange: jest.fn(),
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

const uploadStatusController = {
  snapshots: () => {
    return [];
  },
  subscribe: () => {
    return () => {
      return undefined;
    };
  },
} as unknown as SharedDriveUploadController;

// The status popup host is rendered next to the header so bulk action progress is observable.
const createHeaderTree = (properties: Partial<typeof defaultProperties>): ReactElement => {
  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <SharedDriveUploadStatusProvider>
        <CellsHeader {...defaultProperties} {...properties} />
        <SharedDriveUploadStatusPopupHost
          controller={uploadStatusController}
          conversationQualifiedId="conversation@example.com"
          isEnabled
          isFileTabActive
        />
      </SharedDriveUploadStatusProvider>
    </StyledApp>
  );
};

const renderCellsHeader = (
  properties: Partial<typeof defaultProperties> & {
    clock?: ReturnType<typeof createDeterministicClock>;
    onSelectionBarAnchorChange?: (anchor: HTMLDivElement | null) => void;
  } = {},
  isBulkActionsEnabled = true,
  translateFunction: typeof translate | typeof translateForTest = translateForTest,
): RenderResult => {
  const {clock, ...headerProperties} = properties;
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateFunction,
      clock,
      isFeatureToggleEnabled: featureToggleName => {
        return isBulkActionsEnabled && featureToggleName === driveBulkActionsFeatureToggleName;
      },
    }),
  );

  return render(createHeaderTree(headerProperties), {wrapper});
};

describe('CellsHeader', () => {
  afterEach(() => {
    setStrings({});
  });

  it.each([
    ['MFA feature - Administration & Identity', 'MFA feature - Administration & Identity files'],
    ['R&amp;D', 'R&amp;D files'],
    ['<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)> files'],
  ])('renders conversation name %s as plain breadcrumb text', (conversationName, expectedLabel) => {
    setStrings({en});
    const {container} = renderCellsHeader(
      {
        conversationName,
        getCurrentCellsPath: () => {
          return 'wire-cells-web/Mocks';
        },
        isSearchViewOpen: false,
      },
      true,
      translate,
    );

    expect(screen.getByRole('button', {name: expectedLabel})).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

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
      rendered.rerender(createHeaderTree(properties));
    };

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('cells.emptyBin.status.processing')).toBeInTheDocument();

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

  it('keeps a dismissed viewer permission banner hidden when reopening the conversation', async () => {
    const dismissedKey = 'conversation-viewer-permission-banner-dismissed:conversation-id@wire.com';
    sessionStorage.removeItem(dismissedKey);
    const view = renderCellsHeader({showViewerPermission: true, isSearchViewOpen: false});

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('conversationFileUploadRestrictedOverlayDescription')).toBeInTheDocument();
    expect(screen.getByText('conversationViewerPermissionBannerMessagesAllowed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'accessibility.rightPanel.close'}));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    view.unmount();
    renderCellsHeader({showViewerPermission: true, isSearchViewOpen: false});
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    renderCellsHeader({
      showViewerPermission: true,
      isSearchViewOpen: false,
      conversationQualifiedId: {id: 'another-conversation', domain: 'wire.com'},
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    sessionStorage.removeItem(dismissedKey);
    sessionStorage.removeItem('conversation-viewer-permission-banner-dismissed:another-conversation@wire.com');
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
