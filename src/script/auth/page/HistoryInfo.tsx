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

import {ClientType} from '@wireapp/api-client/src/client';
import {Button, ContainerXS, H1, Link, Paragraph} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {historyInfoStrings} from '../../strings';
import {RootState} from '../module/reducer';
import * as ClientSelector from '../module/selector/ClientSelector';
import {ROUTE} from '../route';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const HistoryInfo = ({hasHistory, clients, currentSelfClient, isNewCurrentSelfClient}: Props & ConnectedProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();

  const onContinue = () => {
    return history.push(ROUTE.SET_EMAIL);
  };
  const headline = hasHistory ? historyInfoStrings.hasHistoryHeadline : historyInfoStrings.noHistoryHeadline;
  const infoText = hasHistory ? historyInfoStrings.hasHistoryInfo : historyInfoStrings.noHistoryInfo;

  /**
   * Show history screen when a new client was created and:
   *   1. database contains at least one event
   *   2. there is at least one previously registered client
   *   3. new local client is temporary
   */
  const shouldShowHistoryInfo =
    isNewCurrentSelfClient &&
    (hasHistory || clients.length > 1 || (currentSelfClient && currentSelfClient.type === ClientType.TEMPORARY));

  if (!shouldShowHistoryInfo) {
    history.push(ROUTE.SET_EMAIL);
    return null;
  }

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '100%'}}>
        <H1 center>{_(headline, {brandName: Config.getConfig().BRAND_NAME})}</H1>
        <Paragraph center style={{marginBottom: 56}}>
          <FormattedMessage
            {...infoText}
            values={{
              newline: <br />,
            }}
          />
        </Paragraph>
        {!hasHistory && (
          <Paragraph center style={{marginBottom: 40}}>
            <Link href={Config.getConfig().URL.SUPPORT.HISTORY} target="_blank" data-uie-name="do-history-learn-more">
              {_(historyInfoStrings.learnMore)}
            </Link>
          </Paragraph>
        )}
        <Button
          onClick={onContinue}
          autoFocus
          data-uie-name="do-history-confirm"
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
              onContinue();
            }
          }}
        >
          {_(historyInfoStrings.ok)}
        </Button>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  clients: ClientSelector.getClients(state),
  currentSelfClient: ClientSelector.getCurrentSelfClient(state),
  hasHistory: ClientSelector.hasHistory(state),
  isNewCurrentSelfClient: ClientSelector.isNewCurrentSelfClient(state),
});

export default connect(mapStateToProps)(HistoryInfo);
