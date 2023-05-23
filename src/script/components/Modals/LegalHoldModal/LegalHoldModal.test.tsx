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

import {act, render} from '@testing-library/react';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';

import {LegalHoldModal, LegalHoldModalType} from './LegalHoldModal';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {CallingRepository} from '../../../calling/CallingRepository';
import {ClientRepository} from '../../../client';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {MessageRepository} from '../../../conversation/MessageRepository';
import {CryptographyRepository} from '../../../cryptography/CryptographyRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {SearchRepository} from '../../../search/SearchRepository';
import {SearchService} from '../../../search/SearchService';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserRepository} from '../../../user/UserRepository';

const userRepository = {} as UserRepository;
const testFactory = new TestFactory();
let callRepository: CallingRepository;

beforeAll(() => {
  testFactory.exposeCallingActors().then(injectedCallingRepository => {
    callRepository = injectedCallingRepository;
    return callRepository;
  });
});

const defaultProps = () => ({
  clientRepository: {} as ClientRepository,
  conversationRepository: {
    getAllUsersInConversation: (conversationId: QualifiedId): Promise<User[]> => Promise.resolve([]),
  } as ConversationRepository,
  cryptographyRepository: new CryptographyRepository({} as any),
  messageRepository: {
    updateAllClients: (conversation: Conversation, blockSystemMessage: boolean): Promise<void> => Promise.resolve(),
  } as MessageRepository,
  searchRepository: new SearchRepository(new SearchService(), userRepository),
  teamRepository: {} as TeamRepository,
  selfUser: new User('mocked-id'),
});

describe('LegalHoldModal', () => {
  it('is showRequestModal', () => {
    render(<LegalHoldModal {...defaultProps()} />);
    act(() => {
      useLegalHoldModalState.getState().showRequestModal();
    });

    expect(useLegalHoldModalState.getState().type).toBe(LegalHoldModalType.REQUEST);
  });

  it('is showUser', async () => {
    const props = defaultProps();
    await render(<LegalHoldModal {...props} />);
    const selfConversation = new Conversation(props.selfUser.id);

    await act(() => {
      useLegalHoldModalState.getState().showUsers(false, selfConversation);
    });

    await expect(useLegalHoldModalState.getState().type).toBe(LegalHoldModalType.USERS);
  });
});
