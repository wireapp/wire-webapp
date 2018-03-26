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
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {historyInfoStrings} from '../../strings';
import Page from './Page';
import {H1, Link, ContainerXS, Button, Paragraph} from '@wireapp/react-ui-kit';
import * as ClientSelector from '../module/selector/ClientSelector';
import EXTERNAL_ROUTE from '../externalRoute';
import * as URLUtil from '../util/urlUtil';
import * as NotificationAction from '../module/action/NotificationAction';

function HistoryInfo({hasHistory, intl: {formatMessage: _}, ...connected}) {
  const onContinue = () => {
    connected.resetHistoryCheck().then(() => window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP)));
  };
  const headline = hasHistory ? historyInfoStrings.hasHistoryHeadline : historyInfoStrings.noHistoryHeadline;
  const infoText = hasHistory ? historyInfoStrings.hasHistoryInfo : historyInfoStrings.noHistoryInfo;
  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '100%'}}>
        <H1 center>{_(headline)}</H1>
        <Paragraph center style={{marginBottom: 56}}>
          <FormattedHTMLMessage {...infoText} />
        </Paragraph>
        {!hasHistory && (
          <Paragraph center style={{marginBottom: 40}}>
            <Link>{_(historyInfoStrings.learnMore)}</Link>
          </Paragraph>
        )}
        <Button onClick={onContinue}>{_(historyInfoStrings.ok)}</Button>
      </ContainerXS>
    </Page>
  );
}

export default injectIntl(
  connect(
    state => ({
      hasHistory: ClientSelector.hasHistory(state),
    }),
    {...NotificationAction}
  )(HistoryInfo)
);
