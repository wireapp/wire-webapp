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
 */

import {memo, useEffect, type ComponentProps, type ReactElement} from 'react';

import {act, fireEvent, render, waitFor, type RenderResult} from '@testing-library/react';

import {ConversationContent} from './conversation';
import {ConversationCells} from './conversationCells/conversationCells';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  useCellsSelfUserDriveRole,
} from './conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

import {CONVERSATION_CELLS_STATE} from '../../apiClient/conversation/conversation';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS} from '../../apiClient/team/feature/featureList.types';
import {withThemeAndRootContext} from '../../auth/util/test/testUtil';
import {Config} from '../../Config';
import {driveOffboardingFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {AssetRepository} from '../../repositories/assets/assetRepository';
import {CellsRepository} from '../../repositories/cells/cellsRepository';
import {ConversationRepository} from '../../repositories/conversation/ConversationRepository';
import {MessageRepository} from '../../repositories/conversation/MessageRepository';
import {Conversation} from '../../repositories/entity/Conversation';
import {User} from '../../repositories/entity/User';
import {PropertiesRepository} from '../../repositories/properties/propertiesRepository';
import {PropertiesService} from '../../repositories/properties/propertiesService';
import {SelfService} from '../../repositories/self/SelfService';
import {TeamState} from '../../repositories/team/TeamState';
import {translateForTest} from '../../util/test/translateForTest';
import {MainViewModel, type ViewModelRepositories} from '../../viewModel/mainViewModel';
import {MessageListWrapper} from '../messagesList/messageListWrapper';
import {TitleBar} from '../titleBar';

import {TestFactory} from '../../../../test/helper/TestFactory';

const conversationId = 'conversation';
const conversationDomain = 'example.com';
const filesUrl = `#/conversation/${conversationId}/${conversationDomain}/files`;
const messagesUrl = `#/conversation/${conversationId}/${conversationDomain}`;

const TestConversationCells: typeof ConversationCells = memo(
  (_: ComponentProps<typeof ConversationCells>): ReactElement => {
    const role = useCellsSelfUserDriveRole();

    return <div data-uie-name="files-panel" data-drive-role={role} />;
  },
);

const LoadedMessageList: typeof MessageListWrapper = ({onLoading}) => {
  useEffect(() => {
    onLoading(false);
  }, [onLoading]);

  return null;
};

const EmptyTitleBar: typeof TitleBar = () => {
  return null;
};

const testFactory = new TestFactory();

describe('Conversation', () => {
  let repositories: ViewModelRepositories;
  let mainViewModel: MainViewModel;
  let configSpy: jasmine.Spy;

  beforeAll(async () => {
    const eventRepository = await testFactory.exposeEventActors();
    const searchRepository = await testFactory.exposeSearchActors();
    const storageRepository = await testFactory.exposeStorageActors();
    const propertiesRepository = new PropertiesRepository(new PropertiesService(), new SelfService(), translateForTest);
    const conversationRepository = {
      sendTypingStart: jest.fn(),
      sendTypingStop: jest.fn(),
    } as unknown as ConversationRepository;
    const messageRepository = {sendReadReceipt: jest.fn()} as unknown as MessageRepository;

    repositories = {
      asset: new AssetRepository(),
      cells: new CellsRepository(),
      conversation: conversationRepository,
      event: eventRepository,
      integration: {},
      message: messageRepository,
      properties: propertiesRepository,
      search: searchRepository,
      serverTime: {
        toServerTimestamp: (timestamp: number) => {
          return timestamp;
        },
      },
      storage: storageRepository,
      user: {getUsersByIdsFromDb: jest.fn()},
    } as unknown as ViewModelRepositories;
    mainViewModel = {
      actions: {},
      calling: {callActions: {}, callingRepository: {}},
      content: {conversationRepository, repositories},
    } as unknown as MainViewModel;
    const config = Config.getConfig();
    configSpy = spyOn(Config, 'getConfig').and.returnValue({
      ...config,
      FEATURE: {...config.FEATURE, ENABLE_CELLS: true},
    });
  });

  afterAll(() => {
    configSpy.and.callThrough();
    testFactory.dispose();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  const createConversation = (cellsState: CONVERSATION_CELLS_STATE): Conversation => {
    const conversation = new Conversation(
      conversationId,
      conversationDomain,
      CONVERSATION_PROTOCOL.PROTEUS,
      translateForTest,
    );
    conversation.cellsState(cellsState);
    conversation.teamId = 'team';
    return conversation;
  };

  const renderConversation = (cellsState: CONVERSATION_CELLS_STATE): RenderResult => {
    const teamState = new TeamState();
    teamState.teamFeatures({cells: {status: FEATURE_STATUS.DISABLED}});
    const selfUser = new User('self-user', conversationDomain, translateForTest);
    selfUser.teamId = 'team';
    const activeConversation = createConversation(cellsState);
    activeConversation.selfUser(selfUser);

    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        isFeatureToggleEnabled: featureToggleName => {
          return featureToggleName === driveOffboardingFeatureToggleName;
        },
        mainViewModel,
        translate: translateForTest,
      }),
    );

    return render(
      withThemeAndRootContext(
        <ConversationContent
          activeConversation={activeConversation}
          components={{
            ConversationCells: TestConversationCells,
            MessageListWrapper: LoadedMessageList,
            TitleBar: EmptyTitleBar,
          }}
          openRightSidebar={jest.fn()}
          reloadApp={jest.fn()}
          selfUser={selfUser}
          teamState={teamState}
        />,
        rootProviderWrapper,
      ),
    );
  };

  it('restores the Files route after navigation and reload while team Cells is disabled', async () => {
    window.location.hash = filesUrl;

    const firstView = renderConversation(CONVERSATION_CELLS_STATE.READY);

    expect(await firstView.findByTestId('files-panel')).toHaveAttribute(
      'data-drive-role',
      CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
    );
    expect(firstView.getByRole('tab', {name: 'conversationDetailsActionCellsTitle'})).toHaveAttribute(
      'aria-selected',
      'true',
    );

    firstView.unmount();
    const reloadedView = renderConversation(CONVERSATION_CELLS_STATE.READY);

    expect(await reloadedView.findByTestId('files-panel')).toBeVisible();
    expect(reloadedView.getByRole('tab', {name: 'conversationDetailsActionCellsTitle'})).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('gates Shared Drive by conversation state and keeps the Messages composer usable for viewers', async () => {
    window.location.hash = filesUrl;
    const readyView = renderConversation(CONVERSATION_CELLS_STATE.READY);

    expect(await readyView.findByTestId('files-panel')).toHaveAttribute(
      'data-drive-role',
      CELLS_SELF_USER_DRIVE_ROLE.VIEWER,
    );
    fireEvent.click(readyView.getByRole('tab', {name: 'cells.tableRow.conversationName'}));

    const composer = await readyView.findByTestId('input-message');
    await act(async () => {
      fireEvent.input(composer, {data: 'Message remains available'});
    });
    await waitFor(() => {
      expect(composer).toHaveTextContent('Message remains available');
    });
    expect(window.location.hash).toBe(messagesUrl);

    readyView.unmount();
    const disabledView = renderConversation(CONVERSATION_CELLS_STATE.DISABLED);
    expect(disabledView.queryByRole('tab', {name: 'conversationDetailsActionCellsTitle'})).not.toBeInTheDocument();
  });
});
