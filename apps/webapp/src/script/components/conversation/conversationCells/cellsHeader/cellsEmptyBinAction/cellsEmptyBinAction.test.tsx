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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import {JobsTaskStatus, type RestNode} from 'cells-sdk-ts';

import {
  CellsSelfUserDriveRoleProvider,
  CELLS_SELF_USER_DRIVE_ROLE,
} from '../../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import type {CellsRepository} from '../../../../../repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from '../../../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../util/test/translateForTest';

import {SharedDriveUploadStatusPopupHost} from '../../sharedDriveUploadStatusPopupHost';
import {SharedDriveUploadStatusProvider} from '../../sharedDriveUploadStatusContext';
import type {SharedDriveUploadController} from '../../sharedDriveUploadController';

import {CellsEmptyBinAction} from './cellsEmptyBinAction';

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

const conversationQualifiedId = {id: 'shared-drive', domain: 'wire.com'};

const createRepository = (overrides: Partial<CellsRepository> = {}): CellsRepository => {
  return {
    lookupNodeByPath: jest.fn().mockResolvedValue({
      Path: 'shared-drive@wire.com/recycle_bin',
      Type: 'COLLECTION',
      Uuid: 'bin-folder-uuid',
    }),
    deleteNodes: jest.fn().mockResolvedValue({Status: 'Performed'}),
    getBackgroundActionInfo: jest.fn(),
    ...overrides,
  } as unknown as CellsRepository;
};

interface EmptyBinTreeProps {
  readonly cellsRepository: CellsRepository;
  readonly role: typeof CELLS_SELF_USER_DRIVE_ROLE.EDITOR | typeof CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
  readonly getCurrentCellsPath: () => string;
  readonly onRefreshAfterEmptyBinOutcome: () => Promise<boolean>;
  readonly onEmptyBinSubmitted: () => void;
  readonly onInProgressChange: (isInProgress: boolean) => void;
}

const createEmptyBinTree = ({
  cellsRepository,
  role,
  getCurrentCellsPath,
  onRefreshAfterEmptyBinOutcome,
  onEmptyBinSubmitted,
  onInProgressChange,
}: EmptyBinTreeProps): ReactElement => {
  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <SharedDriveUploadStatusProvider>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={role}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            getCurrentCellsPath={getCurrentCellsPath}
            onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
            onEmptyBinSubmitted={onEmptyBinSubmitted}
            onInProgressChange={onInProgressChange}
          />
        </CellsSelfUserDriveRoleProvider>
        <SharedDriveUploadStatusPopupHost
          controller={uploadStatusController}
          conversationQualifiedId={`${conversationQualifiedId.id}@${conversationQualifiedId.domain}`}
          isEnabled
          isFileTabActive
        />
      </SharedDriveUploadStatusProvider>
    </StyledApp>
  );
};

const renderEmptyBinAction = (
  cellsRepository: CellsRepository,
  {
    enabled = true,
    role = CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    clock,
    getCurrentCellsPath = () => {
      return 'recycle_bin';
    },
    onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true),
    onEmptyBinSubmitted = jest.fn(),
    onInProgressChange = jest.fn(),
  }: {
    enabled?: boolean;
    role?: typeof CELLS_SELF_USER_DRIVE_ROLE.EDITOR | typeof CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
    clock?: ReturnType<typeof createDeterministicClock>;
    getCurrentCellsPath?: () => string;
    onRefreshAfterEmptyBinOutcome?: () => Promise<boolean>;
    onEmptyBinSubmitted?: () => void;
    onInProgressChange?: (isInProgress: boolean) => void;
  } = {},
): RenderResult => {
  const rootContext = createRootContextValueForTest({
    translate: translateForTest,
    clock,
    isFeatureToggleEnabled: featureName => {
      return enabled && featureName === driveBulkActionsFeatureToggleName;
    },
  });
  const wrapper = createRootProviderWrapperForTest(rootContext);

  return render(
    createEmptyBinTree({
      cellsRepository,
      role,
      getCurrentCellsPath,
      onRefreshAfterEmptyBinOutcome,
      onEmptyBinSubmitted,
      onInProgressChange,
    }),
    {wrapper},
  );
};

describe('CellsEmptyBinAction', () => {
  it('shows a no-count confirmation and cancel sends no request', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    const onEmptyBinSubmitted = jest.fn();
    renderEmptyBinAction(cellsRepository, {onRefreshAfterEmptyBinOutcome, onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));

    expect(screen.getByText('cells.emptyBin.description')).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.cancel'}));

    expect(cellsRepository.lookupNodeByPath).not.toHaveBeenCalled();
    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
    expect(onEmptyBinSubmitted).not.toHaveBeenCalled();
    expect(onRefreshAfterEmptyBinOutcome).not.toHaveBeenCalled();
  });

  it('resolves the current Bin root and permanently deletes it once on confirmation', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    const onEmptyBinSubmitted = jest.fn();
    renderEmptyBinAction(cellsRepository, {onRefreshAfterEmptyBinOutcome, onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    });
    expect(cellsRepository.lookupNodeByPath).toHaveBeenCalledTimes(1);
    expect(cellsRepository.lookupNodeByPath).toHaveBeenLastCalledWith({
      path: 'shared-drive@wire.com/recycle_bin',
    });
    expect(cellsRepository.deleteNodes).toHaveBeenLastCalledWith({
      uuids: ['bin-folder-uuid'],
      permanently: true,
    });
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('cells.emptyBin.status.completed')).toBeInTheDocument();
  });

  it('shows progress in the status popup while the Bin is being emptied', async () => {
    const user = userEvent.setup();
    let resolveDelete: (response: {Status: string}) => void = () => {
      return undefined;
    };
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockReturnValue(
        new Promise<{Status: string}>(resolve => {
          resolveDelete = resolve;
        }),
      ) as unknown as CellsRepository['deleteNodes'],
    });
    renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByText('cells.emptyBin.status.processing')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', {name: 'cells.bulkMove.processing'})).toBeInTheDocument();

    await act(async () => {
      resolveDelete({Status: 'Performed'});
    });
    expect(await screen.findByText('cells.emptyBin.status.completed')).toBeInTheDocument();
  });

  it('signals that it is in progress from submission until the Bin is emptied', async () => {
    const user = userEvent.setup();
    const onInProgressChange = jest.fn();
    renderEmptyBinAction(createRepository(), {onInProgressChange});
    expect(onInProgressChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    await waitFor(() => {
      expect(onInProgressChange).toHaveBeenCalledWith(true);
    });
    await waitFor(() => {
      expect(onInProgressChange).toHaveBeenLastCalledWith(false);
    });
  });

  it('keeps signalling in progress while the outcome needs review, until the Bin is refreshed', async () => {
    const user = userEvent.setup();
    const onInProgressChange = jest.fn();
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({Status: 'Background'}) as unknown as CellsRepository['deleteNodes'],
    });
    renderEmptyBinAction(cellsRepository, {onInProgressChange});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await screen.findByRole('button', {name: 'cells.emptyBin.refreshBin'});
    expect(onInProgressChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.refreshBin'}));

    await waitFor(() => {
      expect(onInProgressChange).toHaveBeenLastCalledWith(false);
    });
  });

  it('releases the in-progress signal when the Bin view is left while the outcome is unresolved', async () => {
    const user = userEvent.setup();
    const onInProgressChange = jest.fn();
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({Status: 'Background'}) as unknown as CellsRepository['deleteNodes'],
    });
    const rendered = renderEmptyBinAction(cellsRepository, {onInProgressChange});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await screen.findByRole('button', {name: 'cells.emptyBin.refreshBin'});
    expect(onInProgressChange).toHaveBeenLastCalledWith(true);

    rendered.unmount();

    expect(onInProgressChange).toHaveBeenLastCalledWith(false);
  });

  it('does not render outside the Bin root, for viewers, or when the feature is disabled', () => {
    renderEmptyBinAction(createRepository(), {
      getCurrentCellsPath: () => {
        return 'recycle_bin/nested';
      },
    });
    expect(screen.queryByRole('button', {name: 'cells.emptyBin.button'})).not.toBeInTheDocument();

    renderEmptyBinAction(createRepository(), {role: CELLS_SELF_USER_DRIVE_ROLE.VIEWER});
    expect(screen.queryByRole('button', {name: 'cells.emptyBin.button'})).not.toBeInTheDocument();

    renderEmptyBinAction(createRepository(), {enabled: false});
    expect(screen.queryByRole('button', {name: 'cells.emptyBin.button'})).not.toBeInTheDocument();
  });

  it('keeps the action available when current Bin rows are not passed to the action', () => {
    renderEmptyBinAction(createRepository());

    expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeInTheDocument();
  });

  it('does not submit if the Bin route changes while resolving the current root', async () => {
    const user = userEvent.setup();
    let currentPath = 'recycle_bin';
    const getCurrentCellsPath = (): string => {
      return currentPath;
    };
    let resolveLookup: (node: RestNode) => void = () => {
      return undefined;
    };
    const lookupNodeByPath = jest.fn().mockImplementation(() => {
      return new Promise<RestNode>(resolve => {
        resolveLookup = resolve;
      });
    });
    const cellsRepository = createRepository({lookupNodeByPath});
    const onEmptyBinSubmitted = jest.fn();
    renderEmptyBinAction(cellsRepository, {getCurrentCellsPath, onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    expect(lookupNodeByPath).toHaveBeenCalledTimes(1);

    currentPath = 'recycle_bin/nested';
    await act(async () => {
      resolveLookup({
        Path: 'shared-drive@wire.com/recycle_bin',
        Type: 'COLLECTION',
        Uuid: 'bin-folder-uuid',
      });
    });

    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
    expect(onEmptyBinSubmitted).not.toHaveBeenCalled();
  });

  it('rechecks delete permission before submitting a resolved Bin root', async () => {
    const user = userEvent.setup();
    let resolveLookup: (node: RestNode) => void = () => {
      return undefined;
    };
    const lookupNodeByPath = jest.fn().mockImplementation(() => {
      return new Promise<RestNode>(resolve => {
        resolveLookup = resolve;
      });
    });
    const cellsRepository = createRepository({lookupNodeByPath});
    const onEmptyBinSubmitted = jest.fn();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    const rendered = renderEmptyBinAction(cellsRepository, {onEmptyBinSubmitted, onRefreshAfterEmptyBinOutcome});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    rendered.rerender(
      createEmptyBinTree({
        cellsRepository,
        role: CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
        getCurrentCellsPath: () => {
          return 'recycle_bin';
        },
        onRefreshAfterEmptyBinOutcome,
        onEmptyBinSubmitted,
        onInProgressChange: jest.fn(),
      }),
    );
    await act(async () => {
      resolveLookup({
        Path: 'shared-drive@wire.com/recycle_bin',
        Type: 'COLLECTION',
        Uuid: 'bin-folder-uuid',
      });
    });

    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
    expect(onEmptyBinSubmitted).not.toHaveBeenCalled();
  });

  it('reports an unavailable Bin lookup without issuing a delete', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository({
      lookupNodeByPath: jest.fn().mockRejectedValue(new Error('File not found')),
    });
    renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.emptyBin.status.lookup-error');
    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
  });

  it('does not automatically retry an uncertain delete request', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockRejectedValue(new Error('Connection lost')),
    });
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    renderEmptyBinAction(cellsRepository, {onRefreshAfterEmptyBinOutcome});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.emptyBin.status.unknown');
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeDisabled();

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.refreshBin'}));

    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeEnabled();
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
  });

  it('resumes polling after returning to the same Bin view', async () => {
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
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
      }),
      getBackgroundActionInfo,
    });
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    const onEmptyBinSubmitted = jest.fn();
    const rendered = renderEmptyBinAction(cellsRepository, {
      clock,
      getCurrentCellsPath,
      onRefreshAfterEmptyBinOutcome,
      onEmptyBinSubmitted,
    });
    const rerender = (): void => {
      rendered.rerender(
        createEmptyBinTree({
          cellsRepository,
          role: CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
          getCurrentCellsPath: getCurrentCellsPath,
          onRefreshAfterEmptyBinOutcome,
          onEmptyBinSubmitted,
          onInProgressChange: jest.fn(),
        }),
      );
    };

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('cells.emptyBin.status.processing')).toBeInTheDocument();

    currentPath = 'recycle_bin/nested';
    rerender();
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

  it('retries a failed status lookup without repeating the delete request', async () => {
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const getBackgroundActionInfo = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary status lookup failure'))
      .mockResolvedValueOnce({Status: JobsTaskStatus.Finished});
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
      }),
      getBackgroundActionInfo,
    });
    const onEmptyBinSubmitted = jest.fn();
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    renderEmptyBinAction(cellsRepository, {clock, onEmptyBinSubmitted, onRefreshAfterEmptyBinOutcome});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('cells.emptyBin.status.processing')).toBeInTheDocument();

    await act(async () => {
      clock.advanceByMilliseconds(999);
      await Promise.resolve();
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);

    await act(async () => {
      clock.advanceByMilliseconds(1);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('cells.emptyBin.status.completed')).toBeInTheDocument();
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
  });

  it('reports partial background failure, refreshes the Bin, and requires review before another action', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [
          {Name: 'delete', JobUuid: 'delete-job-1'},
          {Name: 'delete', JobUuid: 'delete-job-2'},
        ],
      }),
      getBackgroundActionInfo: jest
        .fn()
        .mockResolvedValueOnce({Status: JobsTaskStatus.Finished})
        .mockResolvedValueOnce({Status: JobsTaskStatus.Error}),
    });
    const onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true);
    renderEmptyBinAction(cellsRepository, {onRefreshAfterEmptyBinOutcome});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.emptyBin.status.partial');
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(cellsRepository.getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeDisabled();

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.refreshBin'}));

    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeEnabled();
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
  });
});
