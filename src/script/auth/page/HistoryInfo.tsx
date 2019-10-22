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

import {Button, ContainerXS, H1, Link, Paragraph} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedHTMLMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {historyInfoStrings} from '../../strings';
import {Config} from '../config';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {RootState, bindActionCreators} from '../module/reducer';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import * as URLUtil from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const HistoryInfo = ({hasHistory, hasSelfHandle}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const onContinue = () => {
    return hasSelfHandle
      ? window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP))
      : history.push(ROUTE.CHOOSE_HANDLE);
  };
  const headline = hasHistory ? historyInfoStrings.hasHistoryHeadline : historyInfoStrings.noHistoryHeadline;
  const infoText = hasHistory ? historyInfoStrings.hasHistoryInfo : historyInfoStrings.noHistoryInfo;

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '100%'}}>
        <H1 center>{_(headline, {brandName: Config.BRAND_NAME})}</H1>
        <Paragraph center style={{marginBottom: 56}}>
          <FormattedHTMLMessage {...infoText} />
        </Paragraph>
        {!hasHistory && (
          <Paragraph center style={{marginBottom: 40}}>
            <Link
              href={`${EXTERNAL_ROUTE.WIRE_SUPPORT}/hc/articles/207834645`}
              target="_blank"
              data-uie-name="do-history-learn-more"
            >
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
  hasHistory: ClientSelector.hasHistory(state),
  hasSelfHandle: SelfSelector.hasSelfHandle(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HistoryInfo);
