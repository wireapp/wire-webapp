/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {render} from '@testing-library/react';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Ciphersuite} from '@wireapp/core';

import {translateForTest} from '../../../util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';

import {ConversationProtocolDetails} from './conversationProtocolDetails';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('ConversationProtocolDetails', () => {
  it.each([
    [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256, 'MLS_128_DHKEMP256_AES128GCM_SHA256_P256'],
    [Ciphersuite.Mls256Mlkem1024Aes256gcmSha384Mldsa87, 'MLS_256_MLKEM1024_AES256GCM_SHA384_MLDSA87'],
    [65535, '65535'],
  ])('renders cipher suite %s as %s', (cipherSuite, cipherSuiteName) => {
    const props = {
      cipherSuite,
      protocol: CONVERSATION_PROTOCOL.MLS,
    };

    const {queryByText} = render(<ConversationProtocolDetails {...props} />, {wrapper: rootProviderWrapper});

    expect(queryByText('MLS')).not.toBeNull();
    expect(queryByText(cipherSuiteName)).not.toBeNull();
  });

  it('renders the correct infos for the conversation with proteus protocol', () => {
    const props = {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
    };

    const {queryByText} = render(<ConversationProtocolDetails {...props} />, {wrapper: rootProviderWrapper});

    expect(queryByText('PROTEUS')).not.toBeNull();
  });
});
