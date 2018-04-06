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
import WirelessContainer from '../component/WirelessContainer';
import * as RuntimeSelector from '../module/selector/RuntimeSelector';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import Runtime from '../Runtime';
import React from 'react';

const runtime = new Runtime();

const showUnsupportedMessage = (headline, subhead) => (
  <Container verticalCenter centerText>
    <Logo height="20" />
    <H1 center style={{marginBottom: '48px', marginTop: '24px'}}>
      <FormattedHTMLMessage {...headline} />
    </H1>
    <Text center>
      <FormattedHTMLMessage {...subhead} />
    </Text>
  </Container>
);

export const UnsupportedBrowser = ({children, hasCookieSupport, hasIndexedDbSupport, isCheckingSupport}) => {
  if (!runtime.isSupportedBrowser()) {
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
    return showUnsupportedMessage(unsupportedStrings.headlineCookies, unsupportedStrings.subheadCookies);
  }

  if (!hasIndexedDbSupport) {
    return showUnsupportedMessage(unsupportedStrings.headlineIndexedDb, unsupportedStrings.subheadIndexedDb);
  }

  return children;
};

export default injectIntl(
  connect(state => ({
    hasCookieSupport: RuntimeSelector.hasCookieSupport(state),
    hasIndexedDbSupport: RuntimeSelector.hasIndexedDbSupport(state),
    isCheckingSupport: RuntimeSelector.isChecking(state),
  }))(UnsupportedBrowser)
);
