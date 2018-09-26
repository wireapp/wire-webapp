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

import {H2, H3, ContainerXS, COLOR} from '@wireapp/react-ui-kit';
import {unsupportedJoinStrings} from '../../strings';
import WirelessContainer from './WirelessContainer';
import * as RuntimeSelector from '../module/selector/RuntimeSelector';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage, InjectedIntlProps} from 'react-intl';
import {isMobileOs} from '../Runtime';
import * as React from 'react';
import {RootState, ThunkDispatch} from '../module/reducer';

export interface Props extends React.HTMLAttributes<HTMLDivElement> {}

interface ConnectedProps {
  isSupportedBrowser: boolean;
}

interface DispatchProps {}

export const WirelessUnsupportedBrowser: React.SFC<Props & ConnectedProps & InjectedIntlProps> = ({
  children,
  isSupportedBrowser,
  intl: {formatMessage: _},
}) =>
  isSupportedBrowser ? (
    <React.Fragment>{children}</React.Fragment>
  ) : (
    <WirelessContainer>
      <ContainerXS style={{margin: 'auto 0'}}>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...unsupportedJoinStrings.unsupportedJoinHeadline} />
        </H2>
        {isMobileOs() ? (
          <H3 style={{marginBottom: '10px'}}>
            <FormattedHTMLMessage {...unsupportedJoinStrings.unsupportedJoinMobileSubhead} />
          </H3>
        ) : (
          <H3 style={{marginBottom: '10px'}}>
            <FormattedHTMLMessage {...unsupportedJoinStrings.unsupportedJoinSubhead} />
          </H3>
        )}
      </ContainerXS>
    </WirelessContainer>
  );

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => ({
      isSupportedBrowser: RuntimeSelector.isSupportedBrowser(state),
    }),
    (dispatch: ThunkDispatch): DispatchProps => ({})
  )(WirelessUnsupportedBrowser)
);
