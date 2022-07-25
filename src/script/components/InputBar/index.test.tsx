/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
import {createRandomUuid} from 'Util/util';

import {Config} from 'src/script/Config';
import {TestFactory} from '../../../../test/helper/TestFactory';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {AssetRepository} from '../../assets/AssetRepository';
import {AssetService} from '../../assets/AssetService';
import {Conversation} from '../../entity/Conversation';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {EventRepository} from '../../event/EventRepository';
import {SearchRepository} from '../../search/SearchRepository';
import {StorageRepository} from '../../storage';
import InputBar from 'Components/InputBar/index';
import {EmojiInputViewModel} from '../../view_model/content/EmojiInputViewModel';
import {MessageRepository} from '../../conversation/MessageRepository';
import {User} from '../../entity/User';

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;
let eventRepository: EventRepository;
let searchRepository: SearchRepository;
let storageRepository: StorageRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });

  testFactory.exposeEventActors().then(factory => {
    eventRepository = factory;
    return eventRepository;
  });

  testFactory.exposeSearchActors().then(factory => {
    searchRepository = factory;
    return searchRepository;
  });

  testFactory.exposeStorageActors().then(factory => {
    storageRepository = factory;
    return storageRepository;
  });

  spyOn(Config, 'getConfig').and.returnValue({
    ALLOWED_IMAGE_TYPES: [],
    FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
  });
});

const getDefaultProps = () => ({
  assetRepository: new AssetRepository(new AssetService()),
  conversationEntity: new Conversation(createRandomUuid()),
  conversationRepository,
  emojiInput: {} as EmojiInputViewModel,
  eventRepository,
  messageRepository: {} as MessageRepository,
  searchRepository,
  storageRepository,
  teamState: new TeamState(),
  userState: {
    self: () => new User('id'),
  } as UserState,
});

describe('InputBar', () => {
  const testMessage = 'Write custom text message';

  it('has passed value', async () => {
    const promise = Promise.resolve();
    const props = getDefaultProps();
    const {container} = render(<InputBar {...props} />);
    await act(() => promise);

    const textArea = await container.querySelector('textarea[data-uie-name="input-message"]');

    if (textArea) {
      fireEvent.change(textArea, {target: {value: testMessage}});
    }

    await waitFor(() => {
      expect((textArea as HTMLTextAreaElement).value).toBe(testMessage);
    });
  });
});
