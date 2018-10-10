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
import * as React from 'react';
import {FormattedHTMLMessage, InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {conversationJoinStrings} from '../../strings';
import WirelessContainer from '../component/WirelessContainer';
import WirelessUnsupportedBrowser from '../component/WirelessUnsupportedBrowser';
import {RootState, ThunkDispatch} from '../module/reducer';

interface Props extends React.HTMLAttributes<ConversationJoinInvalid> {}

interface ConnectedProps {}

interface DispatchProps {}

interface State {}

class ConversationJoinInvalid extends React.PureComponent<
  Props & ConnectedProps & DispatchProps & InjectedIntlProps,
  State
> {
  state = {};

  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    return (
      <WirelessUnsupportedBrowser>
        <WirelessContainer>
          <ContainerXS style={{margin: 'auto 0'}}>
            <H2
              style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
              color={COLOR.GRAY}
              data-uie-name="status-invalid-headline"
            >
              <FormattedHTMLMessage {...conversationJoinStrings.invalidHeadline} />
            </H2>
            <Text style={{fontSize: '16px', marginTop: '10px'}} data-uie-name="status-invalid-text">
              {_(conversationJoinStrings.invalidSubhead)}
            </Text>
          </ContainerXS>
        </WirelessContainer>
      </WirelessUnsupportedBrowser>
    );
  }
}

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => {
      return {};
    },
    (dispatch: ThunkDispatch): DispatchProps => {
      return {};
    }
  )(ConversationJoinInvalid)
);
