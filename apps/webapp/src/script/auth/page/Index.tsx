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

import React, {useCallback, useEffect, useState} from 'react';

import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';
import {container} from 'tsyringe';

import {UrlUtil} from '@wireapp/commons';
import {Button, ButtonVariant, ContainerXS, ErrorMessage, Text} from '@wireapp/react-ui-kit';

import {LogoFullIcon} from 'Components/Icon';
import {useSingleInstance} from 'Hooks/useSingleInstance';
import {Core} from 'src/script/service/CoreSingleton';
import {isDataDogEnabled} from 'Util/DataDog';
import {getWebEnvironment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Config} from '../../Config';
import '../../localization/Localizer';
import {actionRoot} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {getEnterpriseLoginV2FF} from '../util/helpers';
import {logoutReasonStrings} from '../util/logoutUtil';
import {getPrefixedSSOCode} from '../util/urlUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const IndexComponent = ({defaultSSOCode, doInit}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();
  const {hasOtherInstance} = useSingleInstance();
  const core = container.resolve(Core);
  const [logoutReason, setLogoutReason] = useState<string>();

  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (queryLogoutReason) {
      setLogoutReason(queryLogoutReason);
    }
  }, []);

  const immediateLogin = useCallback(async () => {
    await doInit({isImmediateLogin: true, shouldValidateLocalClient: true});
    // Check if the user is already logged in
    if (!hasOtherInstance && core.getLocalClient()) {
      navigate(ROUTE.HISTORY_INFO);
    }
  }, [core, doInit, navigate, hasOtherInstance]);

  useEffect(() => {
    if (Config.getConfig().FEATURE.ENABLE_AUTO_LOGIN) {
      void immediateLogin();
    }
  }, [immediateLogin]);

  if (defaultSSOCode || isEnterpriseLoginV2Enabled) {
    // Redirect to prefilled SSO login if default SSO code is set on backend
    // or if enterprise login v2 is enabled
    return <Navigate to={`${ROUTE.SSO}/${getPrefixedSSOCode(defaultSSOCode)}`} />;
  }

  const features = Config.getConfig().FEATURE;
  if (!features.ENABLE_DOMAIN_DISCOVERY && !features.ENABLE_SSO && !features.ENABLE_ACCOUNT_REGISTRATION) {
    // Navigate directly to email login because it's the only available option on the index page
    return <Navigate to={ROUTE.LOGIN} />;
  }

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{width: '380px'}}>
        <LogoFullIcon
          aria-hidden="true"
          width={102}
          height={33}
          style={{marginBottom: '80px'}}
          data-uie-name="ui-wire-logo"
        />
        <Text
          block
          center
          style={{fontSize: '2rem', fontWeight: 300, marginBottom: '48px'}}
          data-uie-name="welcome-text"
        >
          {t('index.welcome', {brandName: Config.getConfig().BACKEND_NAME})}
        </Text>

        {!getWebEnvironment().isProduction && isDataDogEnabled() && (
          <Text
            block
            center
            style={{fontSize: '0.75rem', fontWeight: 300, marginBottom: '48px'}}
            data-uie-name="disclaimer"
          >
            <FormattedMessage
              id="index.disclaimer"
              values={{
                link: (
                  <a href="https://app.wire.com" rel="noopener noreferrer">
                    wire.com
                  </a>
                ),
              }}
            />
          </Text>
        )}

        {features.ENABLE_ACCOUNT_REGISTRATION && (
          <Button
            type="button"
            onClick={() => navigate(ROUTE.SET_ACCOUNT_TYPE)}
            block
            data-uie-name="go-set-account-type"
          >
            {t('index.createAccount')}
          </Button>
        )}
        <Button type="button" onClick={() => navigate(ROUTE.LOGIN)} block data-uie-name="go-login">
          {t('index.login')}
        </Button>
        {logoutReason && (
          <ErrorMessage data-uie-name="status-logout-reason">
            <FormattedMessage
              id={logoutReasonStrings[logoutReason]}
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
            {t(features.ENABLE_DOMAIN_DISCOVERY ? 'index.enterprise' : 'index.ssoLogin')}
          </Button>
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
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doInit: actionRoot.authAction.doInit,
    },
    dispatch,
  );

const Index = connect(mapStateToProps, mapDispatchToProps)(IndexComponent);

export {Index};
