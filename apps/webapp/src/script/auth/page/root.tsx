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

import {FC, ReactNode, useEffect, useMemo} from 'react';

import is from '@sindresorhus/is';
import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {IntlProvider} from 'react-intl';
import {connect} from 'react-redux';
import {HashRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {FireAndForgetInvoker} from '@wireapp/core';
import {ContainerXS, Loading, StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {createWallClock} from 'src/script/clock/wallClock';
import {RootProvider} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {ClientManager} from './clientmanager';
import {ConversationJoin} from './conversationjoin';
import {ConversationJoinInvalid} from './conversationjoininvalid';
import {CreatePersonalAccount} from './createpersonalaccount';
import {CustomBackend} from './custombackend';
import {CustomEnvironmentRedirect} from './customenvironmentredirect';
import {HistoryInfo} from './historyinfo';
import {Index} from './';
import {Login} from './login/login';
import {SingleSignOn} from './login/singlesignon';
import {OAuthPermissions} from './oauthpermissions';
import {SetAccountType} from './setaccounttype';
import {SetEmail} from './setEmail';
import {SetEntropyPage} from './setentropypage';
import {SetHandle} from './setHandle';
import {SetPassword} from './setpassword';
import {Success} from './success';
import {VerifyEmailCode} from './verifyemailcode';
import {VerifyEmailLink} from './verifyemaillink';

import {Config} from '../../config';
import {MainViewModel} from '../../viewModel/mainviewmodel';
import {RouteA11y} from '../component/routea11y';
import {mapLanguage, normalizeLanguage} from '../localeConfig';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/authselector';
import * as LanguageSelector from '../module/selector/languageselector';
import {ROUTE} from '../route';
import {getOAuthQueryString} from '../util/oauthUtil';

interface RootProps {
  translate: Translate;
}

const authFireAndForgetInvoker: FireAndForgetInvoker = {
  fireAndForget(asyncAction) {
    void asyncAction();
  },
  async waitUntilAllSettled(): Promise<void> {
    return undefined;
  },
};

function createAuthMainViewModel(): MainViewModel {
  return {} as MainViewModel;
}

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
  translate,
}) => {
  const rootContextValue = useMemo(() => {
    return {
      fireAndForgetInvoker: authFireAndForgetInvoker,
      mainViewModel: createAuthMainViewModel(),
      wallClock: createWallClock(),
      doesApplicationNeedForceReload: false,
      isFeatureToggleEnabled() {
        return false;
      },
      translate,
      applicationNavigation: {
        get currentPathname(): string {
          return window.location.pathname;
        },
        get currentSearch(): string {
          return window.location.search;
        },
        get currentHash(): string {
          return window.location.hash;
        },
        navigateTo(url: string): void {
          window.location.assign(url);
        },
      },
    };
  }, [translate]);
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
    void doGetSSOSettings();
  }, [doGetSSOSettings]);

  const loadLanguage = (language: string) => {
    return require(`I18n/${mapLanguage(language)}.json`);
  };

  const navigate = (route: string): null => {
    window.location.assign(pathWithParams(route));
    return null;
  };

  const isAuthenticatedCheck = (page: ReactNode): ReactNode => {
    return isAuthenticated ? page : navigate('/auth');
  };

  const isOAuthCheck = (page: ReactNode): ReactNode => {
    if (isAuthenticated) {
      return page;
    }

    const queryString = getOAuthQueryString(window.location);
    return is.nonEmptyString(queryString) ? (
      <Navigate to={`${ROUTE.LOGIN}/${queryString}`} />
    ) : (
      <Navigate to={ROUTE.LOGIN} />
    );
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
      <RootProvider value={rootContextValue}>
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
                    <Title
                      title={`${translate('authLandingPageTitleP1')} ${brandName} . ${translate('authLandingPageTitleP2')}`}
                    >
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
                    <Title title={`${translate('authLoginTitle')} . ${brandName}`}>
                      <Login />
                    </Title>
                  }
                />
                <Route
                  path={ROUTE.SET_ACCOUNT_TYPE}
                  element={
                    <Title title={`${translate('authAccCreationTitle')} . ${brandName}`}>
                      <SetAccountType />
                    </Title>
                  }
                />
                <Route path={ROUTE.SET_EMAIL} element={<ProtectedSetEmail />} />
                <Route
                  path={ROUTE.SET_HANDLE}
                  element={
                    <Title title={`${translate('authSetUsername')} . ${brandName}`}>
                      <ProtectedSetHandle />
                    </Title>
                  }
                />
                <Route
                  path={ROUTE.SET_PASSWORD}
                  element={
                    <Title title={`${translate('authForgotPasswordTitle')} . ${brandName}`}>
                      <ProtectedSetPassword />
                    </Title>
                  }
                />
                <Route path={`${ROUTE.SSO}`}>
                  <Route
                    path=""
                    element={
                      <Title title={`${translate('authLoginTitle')} . ${brandName}`}>
                        <SingleSignOn />
                      </Title>
                    }
                  />
                  <Route
                    path=":code"
                    element={
                      <Title title={`${translate('authSSOLoginTitle')} . ${brandName}`}>
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
      </RootProvider>
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
