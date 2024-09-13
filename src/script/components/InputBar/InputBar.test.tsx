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

import {act, fireEvent, render, waitFor} from '@testing-library/react';

import {InputBar} from 'Components/InputBar/index';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {Config} from 'src/script/Config';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {SelfService} from 'src/script/self/SelfService';
import {createUuid} from 'Util/uuid';

import {TestFactory} from '../../../../test/helper/TestFactory';
import {AssetRepository} from '../../assets/AssetRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {MessageRepository} from '../../conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {User} from '../../entity/User';
import {EventRepository} from '../../event/EventRepository';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {SearchRepository} from '../../search/SearchRepository';
import {StorageRepository} from '../../storage';
import {TeamState} from '../../team/TeamState';

const testFactory = new TestFactory();

let eventRepository: EventRepository;
let searchRepository: SearchRepository;
let storageRepository: StorageRepository;

beforeAll(async () => {
  await testFactory.exposeEventActors().then(factory => {
    eventRepository = factory;
    return eventRepository;
  });

  await testFactory.exposeSearchActors().then(factory => {
    searchRepository = factory;
    return searchRepository;
  });

  await testFactory.exposeStorageActors().then(factory => {
    storageRepository = factory;
    return storageRepository;
  });

  spyOn(Config, 'getConfig').and.returnValue({
    ALLOWED_IMAGE_TYPES: [],
    FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
  });
});

describe('InputBar', () => {
  let propertiesRepository: PropertiesRepository;

  const getDefaultProps = () => ({
    assetRepository: new AssetRepository(),
    conversation: new Conversation(createUuid()),
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
    teamState: new TeamState(),
    selfUser: new User('id'),
    onShiftTab: jest.fn(),
    uploadDroppedFiles: jest.fn(),
    uploadImages: jest.fn(),
    uploadFiles: jest.fn(),
  });

  beforeEach(() => {
    const propertiesService = new PropertiesService();
    const selfService = new SelfService();
    propertiesRepository = new PropertiesRepository(propertiesService, selfService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const testMessage = 'text';
  const pngFile = new File(['(⌐□_□)'], 'wire-example-image.png', {type: 'image/png'});

  it('has passed value', async () => {
    const props = getDefaultProps();
    const {getByTestId} = render(withTheme(<InputBar {...props} />));

    await new Promise(resolve => setTimeout(resolve));
    const inputBar = getByTestId('input-message');

    expect(inputBar).not.toBeNull();

    await act(async () => {
      fireEvent.input(inputBar, {data: testMessage});
    });

    expect(inputBar.textContent).toBe(testMessage);
  });

  it.skip('typing request is sent if the typing indicator mode is enabled and user is typing', async () => {
    const props = getDefaultProps();
    const {getByTestId, container} = render(withTheme(<InputBar {...props} />));
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
    const {getByTestId} = render(withTheme(<InputBar {...props} />));
    const inputBar = getByTestId('input-message');
    const property = PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE;
    const defaultValue = property.defaultValue;

    act(() => {
      propertiesRepository.setProperty(property.key, !defaultValue);
    });
    expect(propertiesRepository.typingIndicatorMode()).not.toBe(defaultValue);

    await new Promise(resolve => setTimeout(resolve));
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
    const {getByTestId, queryByTestId} = render(withTheme(<InputBar {...props} />));
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
