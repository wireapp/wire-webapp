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

const conversationQualifiedId = {id: 'shared-drive', domain: 'wire.com'};
const originalHash = window.location.hash;

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
    isRootRecycleBinPath = true,
    onRefreshAfterEmptyBinOutcome = jest.fn().mockResolvedValue(true),
    onEmptyBinSubmitted = jest.fn(),
  }: {
    enabled?: boolean;
    role?: typeof CELLS_SELF_USER_DRIVE_ROLE.EDITOR | typeof CELLS_SELF_USER_DRIVE_ROLE.VIEWER;
    isRootRecycleBinPath?: boolean;
    onRefreshAfterEmptyBinOutcome?: () => Promise<boolean>;
    onEmptyBinSubmitted?: () => void;
  } = {},
): RenderResult => {
  window.location.hash = '#/conversation/shared-drive/wire.com/files/recycle_bin';
  const rootContext = createRootContextValueForTest({
    translate: translateForTest,
    isFeatureToggleEnabled: featureName => {
      return enabled && featureName === driveBulkActionsFeatureToggleName;
    },
  });
  const wrapper = createRootProviderWrapperForTest(rootContext);

  return render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={role}>
        <CellsEmptyBinAction
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          isRootRecycleBinPath={isRootRecycleBinPath}
          onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
          onEmptyBinSubmitted={onEmptyBinSubmitted}
        />
      </CellsSelfUserDriveRoleProvider>
    </StyledApp>,
    {wrapper},
  );
};

describe('CellsEmptyBinAction', () => {
  afterEach(() => {
    window.location.hash = originalHash;
  });

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
    renderEmptyBinAction(createRepository(), {isRootRecycleBinPath: false});
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
    renderEmptyBinAction(cellsRepository, {onEmptyBinSubmitted});

    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.button'}));
    await user.click(screen.getByRole('button', {name: 'cells.emptyBin.confirm'}));
    expect(lookupNodeByPath).toHaveBeenCalledTimes(1);

    window.location.hash = '#/conversation/shared-drive/wire.com/files/recycle_bin/nested';
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
      <StyledApp themeId={THEME_ID.DEFAULT}>
        <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.VIEWER}>
          <CellsEmptyBinAction
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            isRootRecycleBinPath
            onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
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
