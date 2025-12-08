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

import React, {useEffect} from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/index';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {Button, ContainerXS, Link, Paragraph, Text} from '@wireapp/react-ui-kit';

import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Config} from '../../Config';
import {actionRoot} from '../module/action/';
import {bindActionCreators, RootState} from '../module/reducer';
import * as ClientSelector from '../module/selector/ClientSelector';
import {ROUTE} from '../route';
import {getEnterpriseLoginV2FF} from '../util/helpers';

type Props = React.HTMLProps<HTMLDivElement>;

const HistoryInfoComponent = ({
  clients,
  currentSelfClient,
  hasLoadedClients,
  isNewCurrentSelfClient,
  doGetAllClients,
}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();
  const shouldLoadClients = !hasLoadedClients && isNewCurrentSelfClient;
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();
  const onContinue = () => {
    return navigate(ROUTE.SET_EMAIL);
  };

  useEffect(() => {
    if (shouldLoadClients) {
      doGetAllClients();
    }
  }, [doGetAllClients, shouldLoadClients]);

  /**
   * Show history screen when a new client was created and there is at least one previously registered client
   */
  const shouldShowHistoryInfo =
    isNewCurrentSelfClient &&
    (clients.length > 1 || (currentSelfClient && currentSelfClient.type === ClientType.TEMPORARY));

  if (shouldLoadClients) {
    return null;
  }

  if (!shouldShowHistoryInfo) {
    return <Navigate to={ROUTE.SET_EMAIL} />;
  }

  return (
    <Page withSideBar={isEnterpriseLoginV2Enabled}>
      <ContainerXS centerText verticalCenter style={{width: '100%', maxWidth: '20rem'}}>
        <Text fontSize="1.5rem" css={{fontWeight: '500'}} center>
          {t('historyInfo.noHistoryHeadline', {brandName: Config.getConfig().BRAND_NAME})}
        </Text>
        <Paragraph center style={{marginBottom: '1rem'}}>
          <FormattedMessage
            id="historyInfo.noHistoryInfo"
            values={{
              newline: <br />,
            }}
          />
        </Paragraph>
        <Button
          style={{margin: 'auto', width: 200}}
          type="button"
          onClick={onContinue}
          data-uie-name="do-history-confirm"
          onKeyDown={event => handleEnterDown(event, onContinue)}
        >
          {t('historyInfo.ok')}
        </Button>
        <Paragraph center style={{marginTop: '1rem'}}>
          <Link href={Config.getConfig().URL.SUPPORT.HISTORY} target="_blank" data-uie-name="do-history-learn-more">
            {t('historyInfo.learnMore')}
          </Link>
        </Paragraph>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  clients: ClientSelector.getClients(state),
  isFeching: ClientSelector.isFetching(state),
  currentSelfClient: ClientSelector.getCurrentSelfClient(state),
  hasLoadedClients: ClientSelector.hasLoadedClients(state),
  isNewCurrentSelfClient: ClientSelector.isNewCurrentSelfClient(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doGetAllClients: actionRoot.clientAction.doGetAllClients,
    },
    dispatch,
  );

const HistoryInfo = connect(mapStateToProps, mapDispatchToProps)(HistoryInfoComponent);

export {HistoryInfo};
