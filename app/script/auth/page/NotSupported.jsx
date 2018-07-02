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

import * as TrackingAction from '../module/action/TrackingAction';
import {getLanguage} from '../module/selector/LanguageSelector';
import React from 'react';
import {Paragraph, Text, Logo, ContainerXS} from '@wireapp/react-ui-kit';
import {connect} from 'react-redux';
import {indexStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import Page from './Page';

function NotSupported({intl: {formatMessage: _}}) {
  return (
    <Page>
      <ContainerXS centerText verticalCenter>
        <Logo scale={1.68} data-uie-name="ui-wire-logo" />
        <Paragraph center>{_(indexStrings.claim)}</Paragraph>
        <Text>{_(indexStrings.loginInfo)}</Text>
      </ContainerXS>
    </Page>
  );
}

export default injectIntl(
  connect(
    state => ({language: getLanguage(state)}),
    {...TrackingAction}
  )(NotSupported)
);
