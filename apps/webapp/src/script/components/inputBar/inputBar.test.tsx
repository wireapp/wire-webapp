/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {act, fireEvent, render, waitFor, type RenderResult} from '@testing-library/react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';

import {FileWithPreview} from '../conversation/useFilesUploadState/useFilesUploadState';
import {InputBar} from './';
import {AssetRepository} from '../../repositories/assets/assetRepository';
import {CellsRepository} from '../../repositories/cells/cellsRepository';
import {ConversationRepository} from '../../repositories/conversation/ConversationRepository';
import {MessageRepository} from '../../repositories/conversation/MessageRepository';
import {Conversation} from '../../repositories/entity/Conversation';
import {User} from '../../repositories/entity/User';
import {EventRepository} from '../../repositories/event/EventRepository';
import {PropertiesRepository} from '../../repositories/properties/propertiesRepository';
import {PropertiesService} from '../../repositories/properties/propertiesService';
import {SearchRepository} from '../../repositories/search/searchRepository';
import {SelfService} from '../../repositories/self/SelfService';
import {StorageRepository} from '../../repositories/storage';
import {TeamState} from '../../repositories/team/TeamState';
import {withThemeAndRootContext} from '../../auth/util/test/testUtil';
import {Config} from '../../Config';
import {disableMessagePreprocessingFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {translate} from '../../util/localizerUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {createUuid} from '../../util/uuid';

import {TestFactory} from '../../../../test/helper/TestFactory';
import {translateForTest} from '../../util/test/translateForTest';
import type {ReactNode} from 'react';

jest.mock('../avatar', () => {
  return {
    AVATAR_SIZE: {X_LARGE: 'avatar-xl'},
    Avatar: () => {
      return <div data-uie-name="mock-avatar" />;
    },
  };
});

const testFactory = new TestFactory();
const defaultConfig = {
  ALLOWED_IMAGE_TYPES: [],
  FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*'], ENABLE_CELLS: true},
};

let eventRepository: EventRepository;
let getConfigSpy: jasmine.Spy;
let searchRepository: SearchRepository;
let storageRepository: StorageRepository;

describe('InputBar', () => {
  beforeAll(async () => {
    eventRepository = await testFactory.exposeEventActors();

    searchRepository = await testFactory.exposeSearchActors();

    storageRepository = await testFactory.exposeStorageActors();

    getConfigSpy = spyOn(Config, 'getConfig').and.returnValue(defaultConfig);
  });

  let propertiesRepository: PropertiesRepository;
  type CreateRootProviderWrapperResult = (properties: {readonly children: ReactNode}) => ReactNode;
  const createRootProviderWrapper = (): CreateRootProviderWrapperResult => {
    return createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
      }),
    );
  };

  type GetDefaultPropsResult = {
    assetRepository: AssetRepository;
    conversation: Conversation;
    cellsRepository: CellsRepository;
    files: FileWithPreview[];
    conversationRepository: ConversationRepository;
    eventRepository: EventRepository;
    messageRepository: MessageRepository;
    openGiphy: jest.Mock<any, any, any>;
    propertiesRepository: PropertiesRepository;
    searchRepository: SearchRepository;
    storageRepository: StorageRepository;
    isCellsEnabled: boolean;
    teamState: TeamState;
    selfUser: User;
    onShiftTab: jest.Mock<any, any, any>;
    uploadDroppedFiles: jest.Mock<any, any, any>;
    uploadImages: jest.Mock<any, any, any>;
    uploadPastedFiles: jest.Mock<any, any, any>;
    uploadFiles: jest.Mock<any, any, any>;
    onCellImageUpload: jest.Mock<any, any, any>;
    onCellAssetUpload: jest.Mock<any, any, any>;
  };
  const getDefaultProps = (): GetDefaultPropsResult => {
    return {
      assetRepository: new AssetRepository(),
      conversation: new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      cellsRepository: new CellsRepository(),
      files: [] as FileWithPreview[],
      conversationRepository: {
        sendTypingStart: jest.fn(),
        sendTypingStop: jest.fn(),
      } as unknown as ConversationRepository,
      eventRepository,
      messageRepository: {} as MessageRepository,
      openGiphy: jest.fn(),
      propertiesRepository,
      searchRepository,
      storageRepository,
      isCellsEnabled: false,
      teamState: new TeamState(),
      selfUser: new User('id', '', translateForTest),
      onShiftTab: jest.fn(),
      uploadDroppedFiles: jest.fn(),
      uploadImages: jest.fn(),
      uploadPastedFiles: jest.fn(),
      uploadFiles: jest.fn(),
      onCellImageUpload: jest.fn(),
      onCellAssetUpload: jest.fn(),
    };
  };

  beforeEach(() => {
    const propertiesService = new PropertiesService();
    const selfService = new SelfService();
    propertiesRepository = new PropertiesRepository(propertiesService, selfService, translate);
  });

  afterEach(() => {
    getConfigSpy.and.returnValue(defaultConfig);
    jest.clearAllMocks();
  });

  const testMessage = 'text';
  const pngFile = new File(['(⌐□_□)'], 'wire-example-image.png', {type: 'image/png'});

  function renderInputBar(properties: ReturnType<typeof getDefaultProps>): ReturnType<typeof render> {
    return render(withThemeAndRootContext(<InputBar {...properties} />, createRootProviderWrapper()));
  }

  it('hides cells upload buttons for viewers', () => {
    const props = getDefaultProps();
    props.isCellsEnabled = true;
    props.teamState.teamFeatures({cells: {status: FEATURE_STATUS.ENABLED}});
    props.conversation.teamId = 'conversation-team';
    props.conversation.cellsState(CONVERSATION_CELLS_STATE.READY);
    props.selfUser.teamId = 'guest-team';

    const {container} = renderInputBar(props);

    expect(container.querySelector('[data-uie-name="do-share-image"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-uie-name="do-share-file"]')).not.toBeInTheDocument();
  });

  it('shows cells upload buttons for editors', () => {
    const props = getDefaultProps();
    props.isCellsEnabled = true;
    props.teamState.teamFeatures({cells: {status: FEATURE_STATUS.ENABLED}});
    props.conversation.teamId = 'conversation-team';
    props.conversation.cellsState(CONVERSATION_CELLS_STATE.READY);
    props.selfUser.teamId = 'conversation-team';

    const {container} = renderInputBar(props);

    expect(container.querySelector('[data-uie-name="do-share-image"]')).toBeInTheDocument();
    expect(container.querySelector('[data-uie-name="do-share-file"]')).toBeInTheDocument();
  });

  it('hides Cells upload buttons when the team feature is disabled and restores them when enabled', () => {
    const props = getDefaultProps();
    props.isCellsEnabled = true;
    props.teamState.teamFeatures({cells: {status: FEATURE_STATUS.DISABLED}});
    props.conversation.teamId = 'conversation-team';
    props.conversation.cellsState(CONVERSATION_CELLS_STATE.READY);
    props.selfUser.teamId = 'conversation-team';

    const {container} = renderInputBar(props);

    expect(container.querySelector('[data-uie-name="do-share-image"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-uie-name="do-share-file"]')).not.toBeInTheDocument();

    act(() => {
      props.teamState.teamFeatures({cells: {status: FEATURE_STATUS.ENABLED}});
    });

    expect(container.querySelector('[data-uie-name="do-share-image"]')).toBeInTheDocument();
    expect(container.querySelector('[data-uie-name="do-share-file"]')).toBeInTheDocument();
  });

  it('has passed value', async () => {
    const props = getDefaultProps();
    const {getByTestId} = renderInputBar(props);

    await new Promise(resolve => {
      return setTimeout(resolve);
    });
    const inputBar = getByTestId('input-message');

    expect(inputBar).not.toBeNull();

    await act(async () => {
      fireEvent.input(inputBar, {data: testMessage});
    });

    expect(inputBar.textContent).toBe(testMessage);
  });

  it('hides markdown formatting controls when message preprocessing is disabled', () => {
    getConfigSpy.and.returnValue({
      ...defaultConfig,
      FEATURE: {...defaultConfig.FEATURE, ENABLE_MESSAGE_FORMAT_BUTTONS: true},
    });

    const renderWithMessagePreprocessingDisabled = (isDisabled: boolean): RenderResult => {
      const featureToggleRootContextValue = createRootContextValueForTest({
        isFeatureToggleEnabled: (featureToggleName: string) => {
          return featureToggleName === disableMessagePreprocessingFeatureToggleName && isDisabled;
        },
        translate: translateForTest,
      });
      const featureToggleRootProviderWrapper = createRootProviderWrapperForTest(featureToggleRootContextValue);

      return render(withThemeAndRootContext(<InputBar {...getDefaultProps()} />, featureToggleRootProviderWrapper));
    };

    const preprocessingEnabled = renderWithMessagePreprocessingDisabled(false);
    expect(preprocessingEnabled.container.querySelector('[data-uie-name="format-text"]')).not.toBeNull();
    preprocessingEnabled.unmount();

    const preprocessingDisabled = renderWithMessagePreprocessingDisabled(true);
    expect(preprocessingDisabled.container.querySelector('[data-uie-name="format-text"]')).toBeNull();
  });

  it.skip('typing request is sent if the typing indicator mode is enabled and user is typing', async () => {
    const props = getDefaultProps();
    const {getByTestId, container} = renderInputBar(props);
    const inputBar = getByTestId('input-message');

    fireEvent.keyDown(container, {key: 'Enter', code: 'Enter'});
    act(() => {
      fireEvent.input(inputBar, {data: testMessage});
      fireEvent.keyPress(inputBar, {key: 'Enter', code: 'Enter'});
    });

    await waitFor(() => {
      expect(inputBar.textContent).toBe(testMessage);
    });

    const property = PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE;
    const defaultValue = property.defaultValue;

    expect(propertiesRepository.typingIndicatorMode()).toBe(defaultValue);
    expect(props.conversationRepository.sendTypingStart).toHaveBeenCalledTimes(1);
  });

  it('typing request is not sent when user is typing but the typing indicator mode is disabled', async () => {
    const props = getDefaultProps();
    const {getByTestId} = renderInputBar(props);
    const inputBar = getByTestId('input-message');
    const property = PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE;
    const defaultValue = property.defaultValue;

    act(() => {
      propertiesRepository.setProperty(property.key, !defaultValue);
    });
    expect(propertiesRepository.typingIndicatorMode()).not.toBe(defaultValue);

    await new Promise(resolve => {
      return setTimeout(resolve);
    });
    await act(async () => {
      fireEvent.input(inputBar, {data: testMessage});
    });

    await waitFor(() => {
      expect(inputBar.textContent).toBe(testMessage);
    });
    expect(props.conversationRepository.sendTypingStart).not.toHaveBeenCalled();
    expect(props.conversationRepository.sendTypingStop).not.toHaveBeenCalled();
  });

  it('has pasted image', async () => {
    const promise = Promise.resolve();
    const props = getDefaultProps();
    const {getByTestId, queryByTestId} = renderInputBar(props);
    await promise;

    const textArea = getByTestId('input-message');

    expect(textArea).not.toBeNull();
    expect(queryByTestId('pasted-file-controls')).toBeNull();

    fireEvent.paste(document, {
      clipboardData: {
        files: [pngFile],
        types: ['image/png'],
      },
    });

    await waitFor(() => {
      const pastedFileControls = getByTestId('pasted-file-controls');
      expect(pastedFileControls).toBeDefined();
    });
  });
});
