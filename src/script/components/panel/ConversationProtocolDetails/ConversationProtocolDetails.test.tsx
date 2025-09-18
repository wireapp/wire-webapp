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
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';

import {Ciphersuite} from '@wireapp/core';

import {ConversationProtocolDetails} from './ConversationProtocolDetails';

describe('ConversationProtocolDetails', () => {
  it('renders the correct infos for the conversation with mls protocol', () => {
    const props = {
      cipherSuite: Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256,
      protocol: ConversationProtocol.MLS,
    };

    const {queryByText} = render(<ConversationProtocolDetails {...props} />);

    expect(queryByText('MLS')).not.toBeNull();
    expect(queryByText('MLS_128_DHKEMP256_AES128GCM_SHA256_P256')).not.toBeNull();
  });

  it('renders the correct infos for the conversation with proteus protocol', () => {
    const props = {
      protocol: ConversationProtocol.PROTEUS,
    };

    const {queryByText} = render(<ConversationProtocolDetails {...props} />);

    expect(queryByText('PROTEUS')).not.toBeNull();
  });
});
