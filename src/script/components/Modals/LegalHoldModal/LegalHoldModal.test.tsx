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

import {render, waitFor} from '@testing-library/react';
import {amplify} from 'amplify';

import LegalHoldModal from './LegalHoldModal';

import {CallingRepository} from '../../../calling/CallingRepository';
import {ClientRepository} from '../../../client/ClientRepository';
import {MessageRepository} from '../../../conversation/MessageRepository';
import {CryptographyRepository} from '../../../cryptography/CryptographyRepository';
import {LegalHoldModalState} from '../../../legal-hold/LegalHoldModalState';
import {SearchRepository} from '../../../search/SearchRepository';
import {SearchService} from '../../../search/SearchService';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserRepository} from '../../../user/UserRepository';

import {TestFactory} from '../../../../../test/helper/TestFactory';

const userRepository = {} as UserRepository;
const testFactory = new TestFactory();
let callingRepository: CallingRepository;

beforeAll(() => {
  testFactory.exposeCallingActors().then(injectedCallingRepository => {
    callingRepository = injectedCallingRepository;
    return callingRepository;
  });
});

const defaultProps = {
  callingRepository,
  clientRepository: {} as ClientRepository,
  conversationRepository: testFactory.conversation_repository,
  cryptographyRepository: new CryptographyRepository({} as any),
  messageRepository: {} as MessageRepository,
  searchRepository: new SearchRepository(new SearchService(), userRepository),
  teamRepository: {} as TeamRepository,
};

describe('LegalHoldModal', () => {
  it('is showRequestModal', async () => {
    spyOn(amplify, 'subscribe').and.returnValue(undefined);
    await render(<LegalHoldModal {...defaultProps} />);
    await waitFor(() => {
      expect(amplify.subscribe).toHaveBeenCalledWith(LegalHoldModalState.SHOW_REQUEST, expect.anything());
    });
  });

  it('is showUser', async () => {
    spyOn(amplify, 'subscribe').and.returnValue(undefined);
    await render(<LegalHoldModal {...defaultProps} />);
    await waitFor(() => {
      expect(amplify.subscribe).toHaveBeenCalledWith(LegalHoldModalState.SHOW_DETAILS, expect.anything());
    });
  });
});
