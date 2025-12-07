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

import React, {useRef, useState} from 'react';

import {BackendError, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS, StatusCodes} from 'http-status-codes';
import {connect} from 'react-redux';
import {useParams} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {
  COLOR,
  Column,
  Columns,
  Container,
  ContainerXS,
  H1,
  IsMobile,
  Link,
  Logo,
  Muted,
  Overlay,
  QUERY,
  QueryKeys,
  Text,
  useMatchMedia,
} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {LogoFullIcon} from 'Components/Icon';
import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {Page} from './Page';
import {SingleSignOnForm} from './SingleSignOnForm';

import {Config} from '../../Config';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {BackButton} from '../component/BackButton';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {getEnterpriseLoginV2FF} from '../util/helpers';

type Props = React.HTMLAttributes<HTMLDivElement>;

const logger = getLogger('SingleSignOn');

const SingleSignOnComponent = ({hasDefaultSSOCode}: Props & ConnectedProps & DispatchProps) => {
  const ssoWindowRef = useRef<Window>();
  const params = useParams<{code?: string}>();
  const isTablet = useMatchMedia(QUERY[QueryKeys.TABLET_DOWN]);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  const handleSSOWindow = (code: string): Promise<void> => {
    const POPUP_HEIGHT = 520;
    const POPUP_WIDTH = 480;
    const SSO_WINDOW_CLOSE_POLLING_INTERVAL = 1000;

    return new Promise<void>((resolve, reject) => {
      let timerId: number = undefined;
      let onReceiveChildWindowMessage: (event: MessageEvent) => void = undefined;
      let onParentWindowClose: (event: Event) => void = undefined;

      const onChildWindowClose = () => {
        clearInterval(timerId);
        window.removeEventListener('message', onReceiveChildWindowMessage);
        window.removeEventListener('unload', onParentWindowClose);
        setIsOverlayOpen(false);
      };

      onReceiveChildWindowMessage = (event: MessageEvent) => {
        // We need to copy properties to `JSON.stringify` because `event` is not serializable
        const serializedEvent = JSON.stringify({data: event.data, origin: event.origin});
        logger.log(`Received SSO login event from wrapper: ${serializedEvent}`, event);
        const isExpectedOrigin = event.origin === Config.getConfig().BACKEND_REST;
        if (!isExpectedOrigin) {
          onChildWindowClose();
          closeSSOWindow();
          return reject(
            new BackendError(
              `Origin "${event.origin}" of event "${serializedEvent}" not matching "${
                Config.getConfig().BACKEND_REST
              }"`,
              SyntheticErrorLabel.SSO_GENERIC_ERROR,
              HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ),
          );
        }

        const eventType = event.data && event.data.type;
        switch (eventType) {
          case 'AUTH_SUCCESS': {
            onChildWindowClose();
            closeSSOWindow();
            return resolve();
          }
          case 'AUTH_ERROR':
          case 'AUTH_ERROR_COOKIE': {
            onChildWindowClose();
            closeSSOWindow();
            return reject(
              new BackendError(
                `Authentication error: "${JSON.stringify(event.data.payload)}"`,
                event.data.payload.label || SyntheticErrorLabel.SSO_GENERIC_ERROR,
                HTTP_STATUS.UNAUTHORIZED,
              ),
            );
          }
          default: {
            logger.warn(`Received unmatched event type: "${eventType}"`);
          }
        }
      };
      window.addEventListener('message', onReceiveChildWindowMessage, {once: false});

      const childPosition = calculateChildWindowPosition(POPUP_HEIGHT, POPUP_WIDTH);

      ssoWindowRef.current = window.open(
        `${Config.getConfig().BACKEND_REST}/sso/initiate-login/${code}`,
        'WIRE_SSO',
        `
          height=${POPUP_HEIGHT},
          left=${childPosition.left}
          location=no,
          menubar=no,
          resizable=no,
          status=no,
          toolbar=no,
          top=${childPosition.top},
          width=${POPUP_WIDTH}
        `,
      );

      setIsOverlayOpen(true);

      const closeSSOWindow = () => {
        amplify.publish(WebAppEvents.LIFECYCLE.SSO_WINDOW_CLOSE);
        ssoWindowRef.current?.close();
      };

      amplify.subscribe(WebAppEvents.LIFECYCLE.SSO_WINDOW_CLOSED, () => {
        onChildWindowClose();
        reject(new BackendError('', SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR, StatusCodes.INTERNAL_SERVER_ERROR));
      });

      if (ssoWindowRef.current) {
        timerId = window.setInterval(() => {
          if (ssoWindowRef.current && ssoWindowRef.current.closed) {
            onChildWindowClose();
            reject(
              new BackendError('', SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR, StatusCodes.INTERNAL_SERVER_ERROR),
            );
          }
        }, SSO_WINDOW_CLOSE_POLLING_INTERVAL);

        onParentWindowClose = () => {
          closeSSOWindow();
          reject(new BackendError('', SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR, StatusCodes.INTERNAL_SERVER_ERROR));
        };
        window.addEventListener('unload', onParentWindowClose);
      }
    });
  };

  const focusChildWindow = () => {
    amplify.publish(WebAppEvents.LIFECYCLE.SSO_WINDOW_FOCUS);
    ssoWindowRef.current?.focus();
  };

  return (
    <Page withSideBar={isEnterpriseLoginV2Enabled}>
      {isOverlayOpen && (
        <Overlay>
          <Container centerText style={{color: COLOR.WHITE, maxWidth: '330px'}}>
            <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center', marginBottom: '30px'}}>
              <Logo height={24} color={COLOR.WHITE} />
            </div>
            <Text
              style={{fontSize: '0.875rem', fontWeight: 400, marginTop: '32px'}}
              color={COLOR.WHITE}
              data-uie-name="status-overlay-description"
            >
              {t('ssoLogin.overlayDescription')}
            </Text>
            <Link
              block
              center
              style={{
                color: COLOR.WHITE,
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: '24px',
                textDecoration: 'underline',
                textTransform: 'none',
              }}
              onClick={focusChildWindow}
              data-uie-name="do-focus-child-window"
            >
              {t('ssoLogin.overlayFocusLink')}
            </Link>
          </Container>
        </Overlay>
      )}

      {!isEnterpriseLoginV2Enabled && !hasDefaultSSOCode && (
        <IsMobile>
          <div style={{margin: 16}}>
            <BackButton />
          </div>
        </IsMobile>
      )}

      <Container centerText verticalCenter style={{width: '100%', padding: '1rem'}}>
        {isTablet && isEnterpriseLoginV2Enabled && (
          <LogoFullIcon
            aria-hidden="true"
            width={102}
            height={33}
            style={{marginBottom: '80px'}}
            data-uie-name="ui-wire-logo"
          />
        )}
        <AppAlreadyOpen />
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              {!isEnterpriseLoginV2Enabled && !hasDefaultSSOCode && (
                <div style={{margin: 'auto'}}>
                  <BackButton />
                </div>
              )}
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                {isEnterpriseLoginV2Enabled ? (
                  <>
                    <div
                      css={{fontWeight: '500', fontSize: '1.5rem'}}
                      role="heading"
                      aria-level={1}
                      data-page-title
                      tabIndex={-1}
                    >
                      {t('index.welcome', {brandName: Config.getConfig().BACKEND_NAME})}
                    </div>

                    <Text block center data-uie-name="status-email-or-sso-code">
                      {t('ssoLogin.subheadCodeOrEmail')}
                    </Text>

                    <SingleSignOnForm doLogin={handleSSOWindow} initialCode={params.code} />
                  </>
                ) : (
                  <>
                    <H1 center>{t('ssoLogin.headline')}</H1>
                    {Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY ? (
                      <>
                        <Muted block center data-uie-name="status-email-or-sso-code">
                          {t('ssoLogin.subheadCodeOrEmail')}
                        </Muted>

                        <Muted block center data-uie-name="status-email-environment-switch-warning">
                          {t('ssoLogin.subheadEmailEnvironmentSwitchWarning', {
                            brandName: Config.getConfig().BRAND_NAME,
                          })}
                        </Muted>
                      </>
                    ) : (
                      <Muted data-uie-name="status-sso-code">{t('ssoLogin.subheadCode')}</Muted>
                    )}
                    <SingleSignOnForm doLogin={handleSSOWindow} initialCode={params.code} />
                  </>
                )}
              </div>
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
      {!hasDefaultSSOCode && (
        <IsMobile>
          <div style={{minWidth: 48}} />
        </IsMobile>
      )}
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasDefaultSSOCode: AuthSelector.hasDefaultSSOCode(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => bindActionCreators({}, dispatch);

const SingleSignOn = connect(mapStateToProps, mapDispatchToProps)(SingleSignOnComponent);

export {SingleSignOn};
