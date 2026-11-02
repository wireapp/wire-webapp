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
import type {ReactNode} from 'react';
import userEvent from '@testing-library/user-event';

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {BackendError, StatusCode} from '@wireapp/api-client/lib/http/';
import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import {JobsTaskStatus, type RestNode} from 'cells-sdk-ts';

import {
  CellsSelfUserDriveRoleProvider,
  CELLS_SELF_USER_DRIVE_ROLE,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsEmptyBinAction} from './cellsEmptyBinAction';
import {createCellsBinOperationController} from '../../common/cellsBinOperations/cellsBinOperationController';
import {CellsBinOperationsProvider} from '../../common/cellsBinOperations/cellsBinOperationsContext';

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

const renderEmptyBinAction = (
  cellsRepository: CellsRepository,
  {
    enabled = true,
    role = CELLS_SELF_USER_DRIVE_ROLE.EDITOR,
    clock,
    drive = conversationQualifiedId,
    getCurrentCellsPath = () => {
      return 'recycle_bin';
    },
    onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true),
    onEmptyBinSubmitted = jest.fn(),
  }: {
    enabled?: boolean;
    role?: typeof CELLS_SELF_USER_DRIVE_ROLE.EDITOR | typeof CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
    clock?: ReturnType<typeof createDeterministicClock>;
    drive?: typeof conversationQualifiedId;
    getCurrentCellsPath?: () => string;
    onRefreshAfterEmptyBinOutcome?: () => Promise<boolean>;
    onEmptyBinSubmitted?: () => void;
  } = {},
): RenderResult & {controller: ReturnType<typeof createCellsBinOperationController>} => {
  const testClock = clock ?? createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const controller = createCellsBinOperationController({cellsRepository, clock: testClock});
  const rootContext = createRootContextValueForTest({
    translate: translateForTest,
    clock: testClock,
    isFeatureToggleEnabled: featureName => {
      return enabled && featureName === driveBulkActionsFeatureToggleName;
    },
  });
  const rootProvider = createRootProviderWrapperForTest(rootContext);
  const wrapper = ({children}: {children: ReactNode}): ReactNode => {
    return <CellsBinOperationsProvider value={controller}>{rootProvider({children})}</CellsBinOperationsProvider>;
  };

  const rendered = render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={role}>
        <CellsEmptyBinAction
          cellsRepository={cellsRepository}
          conversationQualifiedId={drive}
          getCurrentCellsPath={getCurrentCellsPath}
          onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
          onEmptyBinSubmitted={onEmptyBinSubmitted}
        />
      </CellsSelfUserDriveRoleProvider>
    </StyledApp>,
    {wrapper},
  );

  return Object.assign(rendered, {controller});
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
    expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.completed');
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

  it('continues a confirmed delete after the Bin route changes but does not notify the new view', async () => {
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
    const rendered = renderEmptyBinAction(cellsRepository, {getCurrentCellsPath, onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    expect(lookupNodeByPath).toHaveBeenCalledTimes(1);

    currentPath = 'recycle_bin/nested';
    rendered.rerender(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            getCurrentCellsPath={getCurrentCellsPath}
            onRefreshAfterEmptyBinOutcome={jest.fn().mockResolvedValue(true)}
            onEmptyBinSubmitted={onEmptyBinSubmitted}
          />
        </CellsSelfUserDriveRoleProvider>
      </StyledApp>,
    );
    await act(async () => {
      resolveLookup({
        Path: 'shared-drive@wire.com/recycle_bin',
        Type: 'COLLECTION',
        Uuid: 'bin-folder-uuid',
      });
    });

    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledWith({uuids: ['bin-folder-uuid'], permanently: true});
    });
    expect(onEmptyBinSubmitted).not.toHaveBeenCalled();
    expect(rendered.controller.getSnapshot(conversationQualifiedId)?.path).toBe('recycle_bin');
  });

  it('closes a stale confirmation when the active drive changes', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository();
    const rendered = renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    expect(screen.getByText('cells.emptyBin.description')).toBeInTheDocument();

    rendered.rerender(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={{id: 'other-drive', domain: 'wire.com'}}
            getCurrentCellsPath={() => {
              return 'recycle_bin';
            }}
            onRefreshAfterEmptyBinOutcome={jest.fn().mockResolvedValue(true)}
            onEmptyBinSubmitted={jest.fn()}
          />
        </CellsSelfUserDriveRoleProvider>
      </StyledApp>,
    );

    expect(screen.queryByText('cells.emptyBin.description')).not.toBeInTheDocument();
    expect(cellsRepository.lookupNodeByPath).not.toHaveBeenCalled();
    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
  });

  it('does not notify a different drive when the confirmed delete resolves its target', async () => {
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
    const rendered = renderEmptyBinAction(cellsRepository, {onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    expect(lookupNodeByPath).toHaveBeenCalledTimes(1);

    rendered.rerender(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={{id: 'other-drive', domain: 'wire.com'}}
            getCurrentCellsPath={() => {
              return 'recycle_bin';
            }}
            onRefreshAfterEmptyBinOutcome={jest.fn().mockResolvedValue(true)}
            onEmptyBinSubmitted={onEmptyBinSubmitted}
          />
        </CellsSelfUserDriveRoleProvider>
      </StyledApp>,
    );

    await act(async () => {
      resolveLookup({
        Path: 'shared-drive@wire.com/recycle_bin',
        Type: 'COLLECTION',
        Uuid: 'bin-folder-uuid',
      });
    });
    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledWith({uuids: ['bin-folder-uuid'], permanently: true});
    });

    expect(onEmptyBinSubmitted).not.toHaveBeenCalled();
    expect(rendered.controller.getSnapshot(conversationQualifiedId)?.path).toBe('recycle_bin');
  });

  it('revalidates delete permission before accepting the confirmation', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository();
    const rendered = renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    rendered.rerender(
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            getCurrentCellsPath={() => {
              return 'recycle_bin';
            }}
            onRefreshAfterEmptyBinOutcome={jest.fn().mockResolvedValue(true)}
            onEmptyBinSubmitted={jest.fn()}
          />
        </CellsSelfUserDriveRoleProvider>
      </StyledApp>,
    );

    expect(screen.queryByText('cells.emptyBin.description')).not.toBeInTheDocument();
    expect(cellsRepository.lookupNodeByPath).not.toHaveBeenCalled();
    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
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

  it('reports a rejected delete after resolving the Bin and allows only an explicit retry', async () => {
    const user = userEvent.setup();
    const cellsRepository = createRepository({
      deleteNodes: jest
        .fn()
        .mockRejectedValueOnce(new BackendError('Delete rejected', undefined, StatusCode.FORBIDDEN))
        .mockResolvedValueOnce({Status: 'Performed'}),
    });
    const rendered = renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.bulkDelete.rejected');
    expect(cellsRepository.lookupNodeByPath).toHaveBeenCalledTimes(1);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeEnabled();
    expect(rendered.controller.getSnapshot(conversationQualifiedId)?.targetIds).toEqual(['bin-folder-uuid']);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));

    await waitFor(() => {
      expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(2);
    });
    expect(cellsRepository.lookupNodeByPath).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('status')).toHaveTextContent('cells.emptyBin.status.completed');
  });

  it('keeps an uncertain delete locked after a plain refresh and never replays it', async () => {
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
      expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeDisabled();
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after leaving the Bin view and refreshes on return', async () => {
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
        <StyledApp themeId={THEME_ID.DEFAULT}>
          <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
            <CellsEmptyBinAction
              cellsRepository={cellsRepository}
              conversationQualifiedId={conversationQualifiedId}
              getCurrentCellsPath={getCurrentCellsPath}
              onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
              onEmptyBinSubmitted={onEmptyBinSubmitted}
            />
          </CellsSelfUserDriveRoleProvider>
        </StyledApp>,
      );
    };

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.processing');

    currentPath = 'recycle_bin/nested';
    rerender();
    await act(async () => {
      clock.advanceByMilliseconds(1000);
      await Promise.resolve();
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(2);

    currentPath = 'recycle_bin';
    rerender();
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.completed');
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
    expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.processing');

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
      expect(screen.getByRole('status')).toHaveTextContent('cells.emptyBin.status.completed');
    });
    expect(getBackgroundActionInfo).toHaveBeenCalledTimes(2);
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);
    expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
  });

  it('preserves a confirmed delete across view unmount and remount without replaying it', async () => {
    const user = userEvent.setup();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const getBackgroundActionInfo = jest.fn().mockResolvedValue({Status: JobsTaskStatus.Running});
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
      onRefreshAfterEmptyBinOutcome,
      onEmptyBinSubmitted,
    });
    const action = (
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            getCurrentCellsPath={() => {
              return 'recycle_bin';
            }}
            onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
            onEmptyBinSubmitted={onEmptyBinSubmitted}
          />
        </CellsSelfUserDriveRoleProvider>
      </StyledApp>
    );

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(rendered.controller.getSnapshot(conversationQualifiedId)?.state).toBe('processing');
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);

    rendered.rerender(<StyledApp themeId={THEME_ID.DEFAULT} />);
    getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(rendered.controller.getSnapshot(conversationQualifiedId)?.state).toBe('completed');
    });

    rendered.rerender(action);
    await waitFor(() => {
      expect(onRefreshAfterEmptyBinOutcome).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(rendered.controller.getSnapshot(conversationQualifiedId)?.needsRefresh).toBe(false);
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(onEmptyBinSubmitted).toHaveBeenCalledTimes(1);
  });

  it('rechecks pending work once when the browser returns online', async () => {
    const user = userEvent.setup();
    const getBackgroundActionInfo = jest.fn().mockResolvedValue({Status: JobsTaskStatus.Running});
    const cellsRepository = createRepository({
      deleteNodes: jest.fn().mockResolvedValue({
        Status: 'Background',
        BackgroundActions: [{Name: 'delete', JobUuid: 'delete-job'}],
      }),
      getBackgroundActionInfo,
    });
    const rendered = renderEmptyBinAction(cellsRepository);

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    await waitFor(() => {
      expect(rendered.controller.getSnapshot(conversationQualifiedId)?.state).toBe('processing');
    });

    getBackgroundActionInfo.mockClear();
    getBackgroundActionInfo.mockResolvedValue({Status: JobsTaskStatus.Finished});
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getBackgroundActionInfo).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(rendered.controller.getSnapshot(conversationQualifiedId)?.state).toBe('completed');
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
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
    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'cells.emptyBin.button'})).toBeEnabled();
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
  });
});
