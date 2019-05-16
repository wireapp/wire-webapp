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

import {
  ArrowIcon,
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
  Text,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {RouteComponentProps, withRouter} from 'react-router';
import {ssoLoginStrings} from '../../strings';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {RouterLink} from '../component/RouterLink';
import {Config} from '../config';
import {BackendError} from '../module/action/BackendError';
import {ROUTE} from '../route';
import {Page} from './Page';
import {SingleSignOnForm} from './SingleSignOnForm';

interface Props extends React.HTMLAttributes<_SingleSignOn>, RouteComponentProps<{}> {}

interface State {
  isOverlayOpen: boolean;
}

class _SingleSignOn extends React.PureComponent<Props & InjectedIntlProps, State> {
  private ssoWindow: Window = undefined;
  state: State = {
    isOverlayOpen: false,
  };

  handleSSOWindow = (code: string) => {
    const POPUP_HEIGHT = 520;
    const POPUP_WIDTH = 480;
    const SSO_WINDOW_CLOSE_POLLING_INTERVAL = 1000;

    return new Promise((resolve, reject) => {
      let timerId: number = undefined;
      let onReceiveChildWindowMessage: (event: MessageEvent) => void = undefined;
      let onParentWindowClose: (event: Event) => void = undefined;

      const onChildWindowClose = () => {
        clearInterval(timerId);
        window.removeEventListener('message', onReceiveChildWindowMessage);
        window.removeEventListener('unload', onParentWindowClose);
        this.setState({isOverlayOpen: false});
      };

      onReceiveChildWindowMessage = (event: MessageEvent) => {
        const isExpectedOrigin = event.origin === Config.BACKEND_REST;
        if (!isExpectedOrigin) {
          onChildWindowClose();
          this.ssoWindow.close();
          return reject(
            new BackendError({
              code: 500,
              label: BackendError.LABEL.SSO_GENERIC_ERROR,
              message: `Origin "${event.origin}" of event "${JSON.stringify(event)}" not matching "${
                Config.BACKEND_REST
              }"`,
            })
          );
        }

        const eventType = event.data && event.data.type;
        switch (eventType) {
          case 'AUTH_SUCCESS': {
            onChildWindowClose();
            this.ssoWindow.close();
            return resolve();
          }
          case 'AUTH_ERROR': {
            onChildWindowClose();
            this.ssoWindow.close();
            return reject(
              new BackendError({
                code: 401,
                label: event.data.payload.label,
                message: `Authentication error: "${JSON.stringify(event.data.payload)}"`,
              })
            );
          }
          default: {
            onChildWindowClose();
            this.ssoWindow.close();
            return reject(
              new BackendError({
                code: 500,
                label: BackendError.LABEL.SSO_GENERIC_ERROR,
                message: `Unmatched event type: "${JSON.stringify(event)}"`,
              })
            );
          }
        }
      };
      window.addEventListener('message', onReceiveChildWindowMessage, {once: true});

      const childPosition = this.calculateChildPosition(POPUP_HEIGHT, POPUP_WIDTH);

      this.ssoWindow = window.open(
        `${Config.BACKEND_REST}/sso/initiate-login/${code}`,
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
        `
      );

      this.setState({isOverlayOpen: true});

      if (this.ssoWindow) {
        timerId = window.setInterval(() => {
          if (this.ssoWindow && this.ssoWindow.closed) {
            onChildWindowClose();
            reject(new BackendError({code: 500, label: BackendError.LABEL.SSO_USER_CANCELLED_ERROR}));
          }
        }, SSO_WINDOW_CLOSE_POLLING_INTERVAL);

        onParentWindowClose = () => {
          this.ssoWindow.close();
          reject(new BackendError({code: 500, label: BackendError.LABEL.SSO_USER_CANCELLED_ERROR}));
        };
        window.addEventListener('unload', onParentWindowClose);
      }
    });
  };

  calculateChildPosition = (childHeight: number, childWidth: number) => {
    const screenLeft = window.screenLeft || window.screenX;
    const screenTop = window.screenTop || window.screenY;

    const hasInnerMeasurements = window.innerHeight && window.innerWidth;

    const parentHeight = hasInnerMeasurements
      ? window.innerHeight
      : document.documentElement.clientHeight || window.screen.height;
    const parentWidth = hasInnerMeasurements
      ? window.innerWidth
      : document.documentElement.clientWidth || window.screen.width;

    const left = parentWidth / 2 - childWidth / 2 + screenLeft;
    const top = parentHeight / 2 - childHeight / 2 + screenTop;
    return {left, top};
  };

  focusChildWindow = () => this.ssoWindow && this.ssoWindow.focus();

  render(): JSX.Element {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {isOverlayOpen} = this.state;
    const backArrow = (
      <RouterLink to={ROUTE.LOGIN} data-uie-name="go-login">
        <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
      </RouterLink>
    );
    return (
      <Page>
        {isOverlayOpen && (
          <Overlay>
            <Container centerText style={{color: COLOR.WHITE, maxWidth: '330px'}}>
              <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center', marginBottom: '30px'}}>
                <Logo height={24} color={COLOR.WHITE} />
              </div>
              <Text
                style={{fontSize: '14px', fontWeight: 400, marginTop: '32px'}}
                color={COLOR.WHITE}
                data-uie-name="status-overlay-description"
              >
                {_(ssoLoginStrings.overlayDescription)}
              </Text>
              <Link
                block
                center
                style={{
                  color: COLOR.WHITE,
                  fontSize: '14px',
                  fontWeight: 600,
                  marginTop: '24px',
                  textDecoration: 'underline',
                  textTransform: 'none',
                }}
                onClick={this.focusChildWindow}
                data-uie-name="do-focus-child-window"
              >
                {_(ssoLoginStrings.overlayFocusLink)}
              </Link>
            </Container>
          </Overlay>
        )}
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <AppAlreadyOpen />
          <Columns>
            <IsMobile not>
              <Column style={{display: 'flex'}}>
                <div style={{margin: 'auto'}}>{backArrow}</div>
              </Column>
            </IsMobile>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <div>
                  <H1 center>{_(ssoLoginStrings.headline)}</H1>
                  <Muted>{_(ssoLoginStrings.subhead)}</Muted>
                  <SingleSignOnForm handleSSOWindow={this.handleSSOWindow} />
                </div>
              </ContainerXS>
            </Column>
            <Column />
          </Columns>
        </Container>
      </Page>
    );
  }
}

export const SingleSignOn = withRouter(injectIntl(_SingleSignOn));
