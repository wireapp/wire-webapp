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
import ko from 'knockout';

import {LegalHoldModal, LegalHoldModalType} from './LegalHoldModal';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {CallingRepository} from '../../../calling/CallingRepository';
import {ClientRepository} from '../../../client/ClientRepository';
import {CryptographyRepository} from '../../../cryptography/CryptographyRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {useAppMainState} from '../../../page/state';
import {SearchRepository} from '../../../search/SearchRepository';
import {SearchService} from '../../../search/SearchService';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserRepository} from '../../../user/UserRepository';
import {UserState} from '../../../user/UserState';

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
    getAllUsersInConversation: () => [],
  } as any,
  cryptographyRepository: new CryptographyRepository({} as any),
  messageRepository: {
    updateAllClients: jest.fn(),
  } as any,
  searchRepository: new SearchRepository(new SearchService(), userRepository),
  teamRepository: {} as TeamRepository,
  userState: {
    ...new UserState(),
    self: ko.observable(new User('mocked-id')),
  },
});

describe('LegalHoldModal', () => {
  it('is showRequestModal', () => {
    render(<LegalHoldModal {...defaultProps()} />);
    act(() => {
      useAppMainState.getState().legalHoldModal.showRequestModal();
    });

    expect(useAppMainState.getState().legalHoldModal.type).toBe(LegalHoldModalType.REQUEST);
  });

  it('is showUser', async () => {
    const props = defaultProps();
    await render(<LegalHoldModal {...props} />);
    const selfConversation = new Conversation(props.userState.self().id);

    await act(() => {
      useAppMainState.getState().legalHoldModal.showUsers(false, selfConversation);
    });

    await expect(useAppMainState.getState().legalHoldModal.type).toBe(LegalHoldModalType.USERS);
  });
});
