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

import {H1, H2, H3, Text, Container, ContainerXS, COLOR, Loading, Logo} from '@wireapp/react-ui-kit';
import {unsupportedStrings} from '../../strings';
import WirelessContainer from './WirelessContainer';
import * as RuntimeSelector from '../module/selector/RuntimeSelector';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage, InjectedIntlProps, FormattedMessage} from 'react-intl';
import * as React from 'react';
import {RootState, Api} from '../module/reducer';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';

interface UnsupportedProps extends React.HTMLAttributes<HTMLDivElement> {
  headline: FormattedMessage.MessageDescriptor;
  subhead: FormattedMessage.MessageDescriptor;
}

const UnsupportedMessage: React.SFC<UnsupportedProps> = ({headline, subhead}) => (
  <ContainerXS verticalCenter centerText>
    <Logo height={20} />
    <H1 center style={{marginBottom: '48px', marginTop: '24px'}}>
      <FormattedHTMLMessage {...headline} />
    </H1>
    <Text center>
      <FormattedHTMLMessage {...subhead} />
    </Text>
  </ContainerXS>
);

export interface Props extends React.HTMLAttributes<HTMLDivElement> {}

interface ConnectedProps {
  hasCookieSupport: boolean;
  hasIndexedDbSupport: boolean;
  isCheckingSupport: boolean;
  isSupportedBrowser: boolean;
}

interface DispatchProps {}

export const UnsupportedBrowser: React.SFC<Props & ConnectedProps & InjectedIntlProps> = ({
  children,
  hasCookieSupport,
  hasIndexedDbSupport,
  isCheckingSupport,
  isSupportedBrowser,
}) => {
  if (!isSupportedBrowser) {
    return (
      <WirelessContainer>
        <Container verticalCenter>
          <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
            <FormattedHTMLMessage {...unsupportedStrings.headlineBrowser} />
          </H2>
          <H3 style={{marginBottom: '10px'}}>
            <FormattedHTMLMessage {...unsupportedStrings.subheadBrowser} />
          </H3>
        </Container>
      </WirelessContainer>
    );
  }

  if (isCheckingSupport) {
    return (
      <ContainerXS centerText verticalCenter style={{justifyContent: 'center'}}>
        <Loading />
      </ContainerXS>
    );
  }

  if (!hasCookieSupport) {
    return (
      <UnsupportedMessage headline={unsupportedStrings.headlineCookies} subhead={unsupportedStrings.subheadCookies} />
    );
  }

  if (!hasIndexedDbSupport) {
    return (
      <UnsupportedMessage
        headline={unsupportedStrings.headlineIndexedDb}
        subhead={unsupportedStrings.subheadIndexedDb}
      />
    );
  }

  return <React.Fragment>{children}</React.Fragment>;
};

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => ({
      hasCookieSupport: RuntimeSelector.hasCookieSupport(state),
      hasIndexedDbSupport: RuntimeSelector.hasIndexedDbSupport(state),
      isCheckingSupport: RuntimeSelector.isChecking(state),
      isSupportedBrowser: RuntimeSelector.isSupportedBrowser(state),
    }),
    (dispatch: ThunkDispatch<RootState, Api, AnyAction>): DispatchProps => ({})
  )(UnsupportedBrowser)
);
