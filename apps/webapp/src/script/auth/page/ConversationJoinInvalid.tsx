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

import React from 'react';

import {FormattedMessage, useIntl} from 'react-intl';

import {ContainerXS, H2, Text} from '@wireapp/react-ui-kit';

import {Config} from '../../Config';
import {conversationJoinStrings} from '../../strings';
import {UnsupportedBrowser} from '../component/UnsupportedBrowser';
import {WirelessContainer} from '../component/WirelessContainer';

type Props = React.HTMLProps<HTMLDivElement>;

const ConversationJoinInvalid = ({}: Props) => {
  const {formatMessage: _} = useIntl();
  return (
    <UnsupportedBrowser isTemporaryGuest>
      <WirelessContainer>
        <ContainerXS style={{margin: 'auto 0'}}>
          <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-invalid-headline">
            <FormattedMessage
              {...conversationJoinStrings.invalidHeadline}
              values={{
                brandName: Config.getConfig().BRAND_NAME,
              }}
            />
          </H2>
          <Text style={{fontSize: '1rem', marginTop: '10px'}} data-uie-name="status-invalid-text">
            {_(conversationJoinStrings.invalidSubhead)}
          </Text>
        </ContainerXS>
      </WirelessContainer>
    </UnsupportedBrowser>
  );
};

const ConversationJoinFull = ({}: Props) => {
  const {formatMessage: _} = useIntl();
  return (
    <UnsupportedBrowser isTemporaryGuest>
      <WirelessContainer>
        <ContainerXS style={{margin: 'auto 0'}}>
          <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-full-headline">
            <FormattedMessage {...conversationJoinStrings.fullConversationHeadline} />
          </H2>
          <Text style={{fontSize: '1rem', marginTop: '10px'}} data-uie-name="status-full-text">
            {_(conversationJoinStrings.fullConversationSubhead)}
          </Text>
        </ContainerXS>
      </WirelessContainer>
    </UnsupportedBrowser>
  );
};

export {ConversationJoinInvalid, ConversationJoinFull};
