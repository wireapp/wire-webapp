/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {UrlUtil} from '@wireapp/commons';
import * as AuthSelector from '../module/selector/AuthSelector';
import {Button, ButtonVariant, COLOR, ContainerXS, ErrorMessage, Text} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {Navigate, useNavigate} from 'react-router-dom';
import {Config} from '../../Config';
import '../../localization/Localizer';
import {indexStrings, logoutReasonStrings} from '../../strings';
import {QUERY_KEY, ROUTE} from '../route';
import Page from './Page';
import {RootState, bindActionCreators} from '../module/reducer';
import {AnyAction, Dispatch} from 'redux';
import {connect} from 'react-redux';
import SVGProvider from '../util/SVGProvider';
import {SVGIcon} from '@wireapp/react-ui-kit/src/Icon/SVGIcon';
import {createRandomUuid} from 'Util/util';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Index = ({defaultSSOCode}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();
  const [logoutReason, setLogoutReason] = useState<string>();

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (queryLogoutReason) {
      setLogoutReason(queryLogoutReason);
    }
  }, []);

  if (defaultSSOCode) {
    // Redirect to prefilled SSO login if default SSO code is set on backend
    return <Navigate to={`${ROUTE.SSO}/wire-${defaultSSOCode}`} />;
  }

  const features = Config.getConfig().FEATURE;
  if (!features.ENABLE_DOMAIN_DISCOVERY && !features.ENABLE_SSO && !features.ENABLE_ACCOUNT_REGISTRATION) {
    // Navigate directly to email login because it's the only available option on the index page
    return <Navigate to={ROUTE.LOGIN} />;
  }

  const startOauthFlow = () => {
    const state = createRandomUuid();
    localStorage.setItem('oauth_state', state);
    const url = new URL('https://oauth.mocklab.io/oauth/authorize');
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', 'openid profile email');
    url.searchParams.append('client_id', 'TODO');
    url.searchParams.append('state', state);
    url.searchParams.append('redirect_uri', `${Config.getConfig().APP_BASE}/auth#${ROUTE.OAUTH}`);
    location.href = url.toString();
  };

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '380px'}}>
        <SVGIcon
          aria-hidden="true"
          scale={1.3}
          realWidth={78}
          realHeight={25}
          style={{marginBottom: '80px'}}
          data-uie-name="ui-wire-logo"
        >
          <g dangerouslySetInnerHTML={{__html: SVGProvider['logo-full-icon']?.documentElement?.innerHTML}} />
        </SVGIcon>
        <Text
          block
          center
          style={{fontSize: '32px', fontWeight: 300, marginBottom: '48px'}}
          data-uie-name="welcome-text"
        >
          {_(indexStrings.welcome, {brandName: Config.getConfig().BACKEND_NAME})}
        </Text>
        {features.ENABLE_ACCOUNT_REGISTRATION ? (
          <>
            <Button
              type="button"
              onClick={() => navigate(ROUTE.SET_ACCOUNT_TYPE)}
              block
              data-uie-name="go-set-account-type"
            >
              {_(indexStrings.createAccount)}
            </Button>
            <Button type="button" onClick={startOauthFlow} block>
              Login to OAuth provider
            </Button>
            <Button type="button" onClick={() => navigate(ROUTE.LOGIN)} block data-uie-name="go-login">
              {_(indexStrings.logIn)}
            </Button>
            {logoutReason && (
              <ErrorMessage data-uie-name="status-logout-reason">
                <FormattedMessage
                  {...logoutReasonStrings[logoutReason]}
                  values={{
                    newline: <br />,
                  }}
                />
              </ErrorMessage>
            )}
            {(features.ENABLE_SSO || features.ENABLE_DOMAIN_DISCOVERY) && (
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                onClick={() => navigate(ROUTE.SSO)}
                block
                style={{marginTop: '120px'}}
                data-uie-name="go-sso-login"
              >
                {_(features.ENABLE_DOMAIN_DISCOVERY ? indexStrings.enterprise : indexStrings.ssoLogin)}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => navigate(ROUTE.LOGIN)}
              block
              style={{fontSize: '13px'}}
              data-uie-name="go-login"
            >
              {_(indexStrings.logIn)}
            </Button>
            {(features.ENABLE_SSO || features.ENABLE_DOMAIN_DISCOVERY) && (
              <Button
                type="button"
                onClick={() => navigate(ROUTE.SSO)}
                block
                backgroundColor={'transparent'}
                color={COLOR.BLUE}
                style={{border: `1px solid ${COLOR.BLUE}`, fontSize: '13px'}}
                data-uie-name="go-sso-login"
              >
                {_(features.ENABLE_DOMAIN_DISCOVERY ? indexStrings.enterprise : indexStrings.ssoLogin)}
              </Button>
            )}
            {logoutReason && (
              <ErrorMessage data-uie-name="status-logout-reason">
                <FormattedMessage
                  {...logoutReasonStrings[logoutReason]}
                  values={{
                    newline: <br />,
                  }}
                />
              </ErrorMessage>
            )}
          </>
        )}
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  defaultSSOCode: AuthSelector.getDefaultSSOCode(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Index);
