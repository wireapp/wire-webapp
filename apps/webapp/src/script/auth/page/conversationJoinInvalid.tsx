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

import React, {type FunctionComponent} from 'react';

import {StatusCodes} from 'http-status-codes';
import {FormattedMessage} from 'react-intl';
import {useSelector} from 'react-redux';

import {Config} from '../../Config';
import {useApplicationContext} from '../../page/rootProvider';
import {Button} from '../../uiKit/inputs/button/button';
import {ContainerXS} from '../../uiKit/layout/container/container';
import {H2} from '../../uiKit/typography/heading/heading';
import {Text} from '../../uiKit/typography/text/text';
import {WirelessContainer} from '../component/wirelessContainer';
import {getError} from '../module/selector/conversationSelector';
import {ROUTE} from '../route';
import {getJoinLink, JOIN_LINK_KIND} from '../util/joinLink';

type Props = React.HTMLProps<HTMLDivElement>;

const MeetingJoinInvalid: FunctionComponent = () => {
  const {translate} = useApplicationContext();
  const meetingError = useSelector(getError);
  const unsupported = meetingError?.label === 'meeting-api-unsupported';
  const missing = meetingError?.code === StatusCodes.NOT_FOUND || meetingError?.label === 'meeting-not-found';
  let meetingMessage: 'failed' | 'unsupported' | 'invalid' = 'failed';
  if (unsupported) {
    meetingMessage = 'unsupported';
  } else if (missing) {
    meetingMessage = 'invalid';
  }

  return (
    <WirelessContainer>
      <ContainerXS style={{margin: 'auto'}}>
        <H2 data-uie-name="status-invalid-headline">{translate(`meetingJoin.${meetingMessage}Headline`)}</H2>
        <Text data-uie-name="status-invalid-text">{translate(`meetingJoin.${meetingMessage}Description`)}</Text>
        {!unsupported && !missing && (
          <Button
            onClick={() => {
              window.location.hash = `#${ROUTE.MEETING_JOIN}`;
            }}
          >
            {translate('meetingJoin.retry')}
          </Button>
        )}
      </ContainerXS>
    </WirelessContainer>
  );
};

const ConversationJoinInvalidContent: FunctionComponent = () => {
  const {translate} = useApplicationContext();
  return (
    <WirelessContainer>
      <ContainerXS style={{margin: 'auto'}}>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-invalid-headline">
          <FormattedMessage id="conversationJoin.invalidHeadline" values={{brandName: Config.getConfig().BRAND_NAME}} />
        </H2>
        <Text style={{fontSize: '1rem', marginTop: '10px'}} data-uie-name="status-invalid-text">
          {translate('conversationJoin.invalidSubhead')}
        </Text>
      </ContainerXS>
    </WirelessContainer>
  );
};

const ConversationJoinInvalid: FunctionComponent<Props> = ({}: Props) => {
  return getJoinLink().kind === JOIN_LINK_KIND.MEETING ? <MeetingJoinInvalid /> : <ConversationJoinInvalidContent />;
};

const ConversationJoinFull: FunctionComponent<Props> = ({}: Props) => {
  const {translate} = useApplicationContext();
  return (
    <WirelessContainer>
      <ContainerXS style={{margin: 'auto 0'}}>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-full-headline">
          <FormattedMessage id="conversationJoin.fullConversationHeadline" />
        </H2>
        <Text style={{fontSize: '1rem', marginTop: '10px'}} data-uie-name="status-full-text">
          {translate('conversationJoin.fullConversationSubhead')}
        </Text>
      </ContainerXS>
    </WirelessContainer>
  );
};

export {ConversationJoinInvalid, ConversationJoinFull};
