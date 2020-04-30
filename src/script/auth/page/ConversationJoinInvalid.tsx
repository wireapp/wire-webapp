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

import {COLOR, ContainerXS, H2, Text} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {Config} from '../../Config';
import {conversationJoinStrings} from '../../strings';
import UnsupportedBrowser from '../component/UnsupportedBrowser';
import WirelessContainer from '../component/WirelessContainer';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const ConversationJoinInvalid = ({}: Props) => {
  const {formatMessage: _} = useIntl();
  return (
    <UnsupportedBrowser isTemporaryGuest>
      <WirelessContainer>
        <ContainerXS style={{margin: 'auto 0'}}>
          <H2
            style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
            color={COLOR.GRAY}
            data-uie-name="status-invalid-headline"
          >
            <FormattedMessage
              {...conversationJoinStrings.invalidHeadline}
              values={{
                brandName: Config.getConfig().BRAND_NAME,
                // eslint-disable-next-line react/display-name
                newline: <br />,
                // eslint-disable-next-line react/display-name
                strong: (...chunks: any[]) => <strong style={{color: 'black'}}>{chunks}</strong>,
              }}
            />
          </H2>
          <Text style={{fontSize: '16px', marginTop: '10px'}} data-uie-name="status-invalid-text">
            {_(conversationJoinStrings.invalidSubhead)}
          </Text>
        </ContainerXS>
      </WirelessContainer>
    </UnsupportedBrowser>
  );
};

export default ConversationJoinInvalid;
