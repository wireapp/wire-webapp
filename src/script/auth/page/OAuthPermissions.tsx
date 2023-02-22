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
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {Button, ButtonVariant, ContainerXS, H1, H2, Link, Text, Paragraph, Box} from '@wireapp/react-ui-kit';

import {KEY} from 'Util/KeyboardUtil';

import {Page} from './Page';

import {Config} from '../../Config';
import {oauthStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as ClientSelector from '../module/selector/ClientSelector';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

export enum Scope {
  WRITE_CONVERSATIONS = 'write:conversations',
  WRITE_CONVERSATIONS_CODE = 'write:conversations_code',
  READ_SELF = 'read:self',
  READ_FEATURE_CONFIGS = 'read:feature_configs',
}
interface AuthParams {
  client_id: string;
  scope: Scope[];
  redirect_uri: string;
  state: string;
  response_type: string;
}

const OAuthPermissionsComponent = ({
  clients,
  currentSelfClient,
  hasLoadedClients,
  isNewCurrentSelfClient,
  doGetAllClients,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();
  const params = decodeURI(window.location.search.slice(1))
    .split('&')
    .reduce((acc, param) => {
      const [key, value] = param.split('=');
      if (key === 'scope') {
        return {
          ...acc,
          [key]: value.split(' ').filter(scope => Object.values(Scope).includes(scope as Scope)) as Scope[],
        };
      }
      return {...acc, [key]: value};
    }, {} as AuthParams);

  const onContinue = () => {
    // return navigate(ROUTE.SET_EMAIL);
  };

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '100%'}}>
        <H2 center>{_(oauthStrings.headline)}</H2>
        <Text center>{_(oauthStrings.subhead, {app: 'Wire'})} </Text>
        {/* TODO: update to correct app name from BE */}
        {params.scope && (
          <Box style={{marginTop: '24px', marginBottom: '24px'}}>
            <ul>
              {params.scope.map((scope, index) => (
                <li key={index}>
                  <Text>{_(oauthStrings[scope])}</Text>
                </li>
              ))}
            </ul>
          </Box>
        )}
        <Text
          muted
          center
          style={{fontSize: '12px', lineHeight: '16px', display: 'block'}}
          data-uie-name="oauth-detail-learn-more"
        >
          <FormattedMessage
            {...oauthStrings.details}
            values={{
              // eslint-disable-next-line react/display-name
              learnMore: ((...chunks: string[] | React.ReactNode[]) => (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  data-uie-name="go-learn-more"
                  href={Config.getConfig().URL.PRIVACY_POLICY} //update to correct learn more link
                >
                  {chunks}
                </a>
              )) as any,
            }}
          />
        </Text>
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '48px'}}>
          <Button
            variant={ButtonVariant.SECONDARY}
            style={{margin: 'auto', width: 200}}
            type="button"
            onClick={() => {
              window.open('', '_self', '');
              window.close();
            }}
            data-uie-name="do-oauth-cancel"
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === KEY.ESC) {
                window.open('', '_self', '');
                window.close();
              }
            }}
          >
            {_(oauthStrings.cancel)}
          </Button>
          <Button
            style={{margin: 'auto', width: 200}}
            type="button"
            onClick={onContinue}
            data-uie-name="do-oauth-allow"
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === KEY.ENTER) {
                onContinue();
              }
            }}
          >
            {_(oauthStrings.allow)}
          </Button>
        </div>
        <Paragraph center style={{marginTop: 40}}>
          <Link href={Config.getConfig().URL.SUPPORT.HISTORY} target="_blank" data-uie-name="do-history-learn-more">
            <FormattedMessage
              {...oauthStrings.privacyPolicy}
              values={{
                // eslint-disable-next-line react/display-name
                privacypolicy: ((...chunks: string[] | React.ReactNode[]) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    data-uie-name="go-privacy-policy"
                    href={Config.getConfig().URL.PRIVACY_POLICY}
                  >
                    {chunks}
                  </a>
                )) as any,
              }}
            />
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

const OAuthPermissions = connect(mapStateToProps, mapDispatchToProps)(OAuthPermissionsComponent);

export {OAuthPermissions};
