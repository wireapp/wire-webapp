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

import {H2, H3, Container, COLOR} from '@wireapp/react-ui-kit';
import {unsupportedStrings} from '../../strings';
import WirelessContainer from '../component/WirelessContainer';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import Runtime from '../Runtime';
import React from 'react';

const runtime = new Runtime();

export const UnsupportedBrowser = ({children, intl: {formatMessage: _}}) =>
  runtime.isSupportedBrowser() ? (
    children
  ) : (
    <WirelessContainer>
      <Container verticalCenter>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...unsupportedStrings.headline} />
        </H2>
        <H3 style={{marginBottom: '10px'}}>
          <FormattedHTMLMessage {...unsupportedStrings.subhead} />
        </H3>
      </Container>
    </WirelessContainer>
  );

export default injectIntl(connect(state => ({}))(UnsupportedBrowser));
