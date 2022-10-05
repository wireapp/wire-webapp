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

import TestPage from 'Util/test/TestPage';
import {ConversationProtocol} from '@wireapp/api-client/src/conversation/NewConversation';

import ConversationProtocolDetails, {
  ConversationProtocolDetailsProps,
  Ciphersuite,
} from './ConversationProtocolDetails';

class ConversationProtocolDetailsPage extends TestPage<ConversationProtocolDetailsProps> {
  constructor(props: ConversationProtocolDetailsProps) {
    super(ConversationProtocolDetails, props);
  }

  getProtocolName = () => this.get('[data-uie-name="protocol-name"]');
  getCipherSuite = () => this.get('[data-uie-name="cipher-suite"]');
}

describe('ConversationProtocolDetails', () => {
  it('renders the correct infos for the conversation with mls protocol', () => {
    const ConversationProtocolDetails = new ConversationProtocolDetailsPage({
      cipherSuite: Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256,
      protocol: ConversationProtocol.MLS,
    });

    expect(ConversationProtocolDetails.getProtocolName()?.textContent).toBe('mls');
    expect(ConversationProtocolDetails.getCipherSuite()?.textContent).toBe('MLS_128_DHKEMP256_AES128GCM_SHA256_P256');
  });
  it('renders the correct infos for the conversation with proteus protocol', () => {
    const ConversationProtocolDetails = new ConversationProtocolDetailsPage({
      protocol: ConversationProtocol.PROTEUS,
    });

    expect(ConversationProtocolDetails.getProtocolName()?.textContent).toBe('proteus');
  });
});
