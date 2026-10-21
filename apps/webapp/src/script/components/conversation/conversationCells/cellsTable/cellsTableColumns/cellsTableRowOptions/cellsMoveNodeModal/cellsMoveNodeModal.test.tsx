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

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  type Matcher,
  type SelectorMatcherOptions,
  type waitForOptions,
  type MatcherOptions,
  type ByRoleMatcher,
  type ByRoleOptions,
} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {RestNode} from 'cells-sdk-ts';
import {noop} from 'noop-esm';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {CellNode} from 'src/script/types/cellNode';
import {translateForTest} from 'Util/test/translateForTest';

import {CellsMoveNodeModal} from './cellsMoveNodeModal';
import type {JSX} from '@emotion/react/jsx-runtime';
import type {Container} from 'react-dom/client';
import type {OptionsReceived} from '@testing-library/dom/node_modules/pretty-format';

const withTheme = (component: ReactNode): JSX.Element => {
  return <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;
};

describe('CellsMoveNodeModal', () => {
  const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.com'};
  const nodeToMove = {path: 'wire-cells-web/source/file.txt'} as CellNode;
  const destinationFolder = {
    Type: 'COLLECTION',
    Uuid: 'destination-folder',
    Path: 'wire-cells-web/destination',
  } as RestNode;
  let cellsRepository: jest.Mocked<CellsRepository>;
  let onClose: jest.Mock;
  let navigateToPath: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    cellsRepository = {
      getAllNodes: jest.fn().mockResolvedValue({Nodes: []}),
      moveNode: jest.fn().mockResolvedValue(undefined),
      createFolder: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onClose = jest.fn();
    navigateToPath = jest.fn();
  });

  type RenderMoveModalResult = {
    setIsOpen: (nextIsOpen: boolean) => void;
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (
      baseElement?: Container | (Element | Document) | Array<Container | (Element | Document)> | undefined,
      maxLength?: number | undefined,
      options?: OptionsReceived | undefined,
    ) => void;
    rerender: (ui: React.ReactNode) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
    getByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    findByLabelText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByLabelText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByPlaceholderText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByPlaceholderText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    findByText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByAltText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByAltText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByTitle: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByTitle: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByDisplayValue: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByDisplayValue: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement;
    getAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
    queryByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement | null;
    queryAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
    findByRole: (
      role: ByRoleMatcher,
      options?: ByRoleOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByRole: (
      role: ByRoleMatcher,
      options?: ByRoleOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByTestId: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByTestId: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
  };
  const renderMoveModal = (
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
    isOpen = true,
    isBulkActionsEnabled = true,
  ): RenderMoveModalResult => {
    const rootContext = createRootContextValueForTest({
      isFeatureToggleEnabled: featureToggleName => {
        return isBulkActionsEnabled && featureToggleName === driveBulkActionsFeatureToggleName;
      },
      translate: translateForTest,
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      clock,
    });
    const wrapper = createRootProviderWrapperForTest(rootContext);

    const createModal = (isOpen: boolean): JSX.Element => {
      return withTheme(
        <CellsMoveNodeModal
          isOpen={isOpen}
          onClose={onClose}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          conversationName="Engineering"
          nodeToMove={nodeToMove}
          navigateToPath={navigateToPath}
        />,
      );
    };
    const rendered = render(createModal(isOpen), {wrapper});

    return {
      ...rendered,
      setIsOpen: (nextIsOpen: boolean) => {
        rendered.rerender(createModal(nextIsOpen));
      },
    };
  };

  it('moves to the chosen folder and closes after the single-item move succeeds', async () => {
    cellsRepository.getAllNodes.mockResolvedValueOnce({Nodes: [destinationFolder]}).mockResolvedValueOnce({Nodes: []});
    renderMoveModal();

    fireEvent.click(await screen.findByRole('button', {name: 'destination'}));
    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });

    const moveButton = screen.getByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(cellsRepository.moveNode).toHaveBeenCalledWith({
      currentPath: nodeToMove.path,
      targetPath: 'conversation-id@wire.com/destination',
    });
    expect(navigateToPath).toHaveBeenCalledWith({conversationQualifiedId, path: 'destination'});
  });

  it('keeps the flag-off folder load behavior', async () => {
    cellsRepository.getAllNodes.mockRejectedValue(new Error('folder load failed'));
    renderMoveModal(createDeterministicClock({initialUnixEpochMicroseconds: 0n}), true, false);
    const moveButton = screen.getByRole('button', {name: 'cells.moveNodeModal.moveButton'});

    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the folder load error and disables Move when the flag is on', async () => {
    cellsRepository.getAllNodes.mockRejectedValue(new Error('folder load failed'));
    renderMoveModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.newItemMenuModalForm.genericError');
    expect(screen.getByRole('button', {name: 'cells.moveNodeModal.moveButton'})).toBeDisabled();
  });

  it('keeps the flag-off move behavior when the operation fails', async () => {
    cellsRepository.moveNode.mockRejectedValue(new Error('move failed'));
    renderMoveModal(createDeterministicClock({initialUnixEpochMicroseconds: 0n}), true, false);
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(navigateToPath).toHaveBeenCalledWith({conversationQualifiedId, path: getCellsFilesPath()});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the modal open and shows an error when the single-item move fails', async () => {
    cellsRepository.moveNode.mockRejectedValue(new Error('move failed'));
    renderMoveModal();
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(moveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('cells.newItemMenuModalForm.genericError');
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });

  it('resets a stale move error when the modal is reopened', async () => {
    cellsRepository.moveNode.mockRejectedValue(new Error('move failed'));
    const {setIsOpen} = renderMoveModal();
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(moveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('cells.newItemMenuModalForm.genericError');

    setIsOpen(false);
    setIsOpen(true);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows loading and disables Move while destination folders reload', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    cellsRepository.getAllNodes.mockResolvedValueOnce({Nodes: [destinationFolder]});
    let resolveReload: (response: {Nodes: RestNode[]}) => void = noop;
    cellsRepository.getAllNodes.mockReturnValueOnce(
      new Promise(resolve => {
        resolveReload = resolve;
      }),
    );
    renderMoveModal(clock);
    const destinationButton = await screen.findByRole('button', {name: 'destination'});
    const moveButton = await screen.findByRole('button', {name: 'cells.moveNodeModal.moveButton'});
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });

    fireEvent.click(destinationButton);
    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });

    act(() => {
      clock.advanceByMilliseconds(999);
    });
    expect(screen.getByRole('status')).toHaveTextContent('cells.moveNodeModal.loading');
    expect(moveButton).toBeDisabled();
    expect(cellsRepository.moveNode).not.toHaveBeenCalled();

    await act(async () => {
      resolveReload({Nodes: []});
    });
    await waitFor(() => {
      expect(moveButton).toBeEnabled();
    });
  });

  it('returns to the picker and shows the created folder after refreshing the list', async () => {
    cellsRepository.getAllNodes
      .mockResolvedValueOnce({Nodes: []})
      .mockResolvedValueOnce({Nodes: [{...destinationFolder, Uuid: 'reports', Path: 'wire-cells-web/Reports'}]});
    renderMoveModal();
    fireEvent.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    fireEvent.change(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), {
      target: {value: 'Reports'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));
    await waitFor(() => {
      expect(cellsRepository.getAllNodes).toHaveBeenCalledTimes(2);
    });

    expect(cellsRepository.createFolder).toHaveBeenCalledWith({
      path: 'conversation-id@wire.com',
      name: 'Reports',
    });
    expect(await screen.findByRole('button', {name: 'Reports'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.moveNodeModal.moveButton'})).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });

  it('keeps the folder form open and shows an error when folder creation fails', async () => {
    cellsRepository.createFolder.mockRejectedValue(new Error('folder creation failed'));
    renderMoveModal();
    fireEvent.click(await screen.findByRole('button', {name: 'cells.moveNodeModal.createFolder.hintButton'}));

    fireEvent.change(screen.getByLabelText('cells.newItemMenuModal.labelFolder'), {
      target: {value: 'Reports'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'}));

    expect(await screen.findByText('cells.newItemMenuModalForm.genericError')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.newItemMenuModal.primaryAction'})).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(navigateToPath).not.toHaveBeenCalled();
  });
});
