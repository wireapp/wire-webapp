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

import {FC, ReactNode, useEffect} from 'react';

import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {IntlProvider} from 'react-intl';
import {connect} from 'react-redux';
import {HashRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {ContainerXS, Loading, StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {ClientManager} from './ClientManager';
import {ConversationJoin} from './ConversationJoin';
import {ConversationJoinInvalid} from './ConversationJoinInvalid';
import {CreatePersonalAccount} from './CreatePersonalAccount';
import {CustomBackend} from './CustomBackend';
import {CustomEnvironmentRedirect} from './CustomEnvironmentRedirect';
import {HistoryInfo} from './HistoryInfo';
import {Index} from './Index';
import {Login} from './Login';
import {OAuthPermissions} from './OAuthPermissions';
import {SetAccountType} from './SetAccountType';
import {SetEmail} from './SetEmail';
import {SetEntropyPage} from './SetEntropyPage';
import {SetHandle} from './SetHandle';
import {SetPassword} from './SetPassword';
import {SingleSignOn} from './SingleSignOn';
import {Success} from './Success';
import {VerifyEmailCode} from './VerifyEmailCode';
import {VerifyEmailLink} from './VerifyEmailLink';

import {Config} from '../../Config';
import {RouteA11y} from '../component/RouteA11y';
import {mapLanguage, normalizeLanguage} from '../localeConfig';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {ROUTE} from '../route';
import {getOAuthQueryString} from '../util/oauthUtil';

interface RootProps {}

const Title: FC<{title: string; children: ReactNode}> = ({title, children}) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
};

const RootComponent: FC<RootProps & ConnectedProps & DispatchProps> = ({
  isAuthenticated,
  language,
  isFetchingSSOSettings,
  doGetSSOSettings,
}) => {
  // Injects the helper class used by useRouteA11y so programmatic focus targets (for screen readers)
  // lose their outlines while the focus trap is active.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `.sr-only-focus:focus, .sr-only-focus:focus-visible { outline: none !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    // Force the hash url to have a initial `/` (see https://stackoverflow.com/a/71864506)
    const forceSlashAfterHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#/')) {
        window.location.hash = `#/${hash.slice(1)}`;
      }
    };

    forceSlashAfterHash();

    window.addEventListener('hashchange', forceSlashAfterHash);
    return () => {
      window.removeEventListener('hashchange', forceSlashAfterHash);
    };
  }, []);

  useEffect(() => {
    doGetSSOSettings();
  }, []);

  const loadLanguage = (language: string) => {
    return require(`I18n/${mapLanguage(language)}.json`);
  };

  const navigate = (route: string): null => {
    window.location.assign(pathWithParams(route));
    return null;
  };

  const isAuthenticatedCheck = (page: ReactNode): ReactNode =>
    page ? (isAuthenticated ? page : navigate('/auth')) : null;

  const isOAuthCheck = (page: ReactNode): ReactNode => {
    if (page) {
      if (isAuthenticated) {
        return page;
      }

      const queryString = getOAuthQueryString(window.location);
      return queryString ? <Navigate to={`${ROUTE.LOGIN}/${queryString}`} /> : <Navigate to={ROUTE.LOGIN} />;
    }
    return null;
  };

  const ProtectedHistoryInfo = () => isAuthenticatedCheck(<HistoryInfo />);
  const ProtectedClientManager = () => isAuthenticatedCheck(<ClientManager />);

  const ProtectedSetHandle = () => isAuthenticatedCheck(<SetHandle />);
  const ProtectedSetEmail = () => isAuthenticatedCheck(<SetEmail />);
  const ProtectedSetPassword = () => isAuthenticatedCheck(<SetPassword />);
  const ProtectedOAuthPermissions = () => isOAuthCheck(<OAuthPermissions />);

  // Send user back to index page after e2ei oauth redirect
  // This is needed because the oauth redirect is only done by logged in users
  // and the user would otherwise be stuck on login page without getting logged in
  if (window.location.hash.includes(ROUTE.E2EI_OAUTH_REDIRECT)) {
    navigate(ROUTE.INDEX);
  }

  const brandName = Config.getConfig().BRAND_NAME;
  return (
    <IntlProvider locale={normalizeLanguage(language)} messages={loadLanguage(language)}>
      <StyledApp
        themeId={THEME_ID.DEFAULT}
        style={{alignContent: 'center', height: '100%', minHeight: '100vh', display: 'flex'}}
      >
        {isFetchingSSOSettings ? (
          <ContainerXS centerText verticalCenter style={{justifyContent: 'center'}}>
            <Loading />
          </ContainerXS>
        ) : (
          <Router>
            <RouteA11y />
            <Routes>
              <Route
                path={ROUTE.INDEX}
                element={
                  <Title title={`${t('authLandingPageTitleP1')} ${brandName} . ${t('authLandingPageTitleP2')}`}>
                    <Index />
                  </Title>
                }
              />
              <Route path={ROUTE.CLIENTS} element={<ProtectedClientManager />} />
              <Route path={ROUTE.CONVERSATION_JOIN_INVALID} element={<ConversationJoinInvalid />} />
              <Route path={ROUTE.CONVERSATION_JOIN} element={<ConversationJoin />} />
              <Route path={ROUTE.HISTORY_INFO} element={<ProtectedHistoryInfo />} />
              <Route path={`${ROUTE.AUTHORIZE}`} element={<ProtectedOAuthPermissions />} />
              <Route path={ROUTE.CUSTOM_BACKEND} element={<CustomBackend />} />
              <Route path={ROUTE.SUCCESS} element={<Success />} />
              <Route
                path={`${ROUTE.LOGIN}/*`}
                element={
                  <Title title={`${t('authLoginTitle')} . ${brandName}`}>
                    <Login />
                  </Title>
                }
              />
              <Route
                path={ROUTE.SET_ACCOUNT_TYPE}
                element={
                  <Title title={`${t('authAccCreationTitle')} . ${brandName}`}>
                    <SetAccountType />
                  </Title>
                }
              />
              <Route path={ROUTE.SET_EMAIL} element={<ProtectedSetEmail />} />
              <Route
                path={ROUTE.SET_HANDLE}
                element={
                  <Title title={`${t('authSetUsername')} . ${brandName}`}>
                    <ProtectedSetHandle />
                  </Title>
                }
              />
              <Route
                path={ROUTE.SET_PASSWORD}
                element={
                  <Title title={`${t('authForgotPasswordTitle')} . ${brandName}`}>
                    <ProtectedSetPassword />
                  </Title>
                }
              />
              <Route path={`${ROUTE.SSO}`}>
                <Route
                  path=""
                  element={
                    <Title title={`${t('authLoginTitle')} . ${brandName}`}>
                      <SingleSignOn />
                    </Title>
                  }
                />
                <Route
                  path=":code"
                  element={
                    <Title title={`${t('authSSOLoginTitle')} . ${brandName}`}>
                      <SingleSignOn />
                    </Title>
                  }
                />
              </Route>
              <Route path={ROUTE.VERIFY_EMAIL_LINK} element={<VerifyEmailLink />} />
              <Route path={ROUTE.CUSTOM_ENV_REDIRECT} element={<CustomEnvironmentRedirect />} />
              {Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY && (
                <Route path={ROUTE.SET_ENTROPY} element={<SetEntropyPage />} />
              )}
              {Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
                <Route path={ROUTE.VERIFY_EMAIL_CODE} element={<VerifyEmailCode />} />
              )}
              {Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
                <Route path={ROUTE.CREATE_ACCOUNT} element={<CreatePersonalAccount />} />
              )}
              <Route path="*" element={<Navigate to={ROUTE.INDEX} replace />} />
            </Routes>
          </Router>
        )}
      </StyledApp>
    </IntlProvider>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isAuthenticated: AuthSelector.isAuthenticated(state),
  isFetchingSSOSettings: AuthSelector.isFetchingSSOSettings(state),
  language: LanguageSelector.getLanguage(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doGetSSOSettings: ROOT_ACTIONS.authAction.doGetSSOSettings,
    },
    dispatch,
  );

const Root = connect(mapStateToProps, mapDispatchToProps)(RootComponent);

export {Root};
