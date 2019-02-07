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

import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
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
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {Link as RRLink} from 'react-router-dom';
import {ssoLoginStrings} from '../../strings';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import EXTERNAL_ROUTE from '../externalRoute';
import ROOT_ACTIONS from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';
import SingleSignOnForm from "./SingleSignOnForm";

interface Props extends React.HTMLAttributes<SingleSignOn>, RouteComponentProps<{}> {
}

interface ConnectedProps {
  hasHistory: boolean;
  hasSelfHandle: boolean;
  isFetching: boolean;
  loginError: Error;
}

interface DispatchProps {
  resetAuthError: () => Promise<void>;
  validateSSOCode: (code: string) => Promise<void>;
  doFinalizeSSOLogin: (options: { clientType: ClientType }) => Promise<void>;
  doGetAllClients: () => Promise<RegisteredClient[]>;
}

interface State {
  code: string;
  isOverlayOpen: boolean;
  persist: boolean;
  ssoError: Error;
  validInputs: {
    [field: string]: boolean;
  };
  validationErrors: Error[];
}

class SingleSignOn extends React.PureComponent<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  private static readonly SSO_CODE_PREFIX = 'wire-';

  private ssoWindow: Window = undefined;
  state: State = {
    code: '',
    isOverlayOpen: false,
    persist: true,
    ssoError: null,
    validInputs: {
      code: true,
    },
    validationErrors: [],
  };

  calculateChildPosition = (childHeight: number, childWidth: number) => {
    const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

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


  navigateChooseHandleOrWebapp = () => {
    return this.props.hasSelfHandle
      ? window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP))
      : this.props.history.push(ROUTE.CHOOSE_HANDLE);
  };




  render() {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {isOverlayOpen} = this.state;
    const backArrow = (
      <Link to={ROUTE.LOGIN} component={RRLink} data-uie-name="go-login">
        <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
      </Link>
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
                  fontWeight: '600',
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
                  <SingleSignOnForm />
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

export default withRouter(
  injectIntl(
    connect(
      (state: RootState, ownProps: Props): ConnectedProps => {
        return {
          hasHistory: ClientSelector.hasHistory(state),
          hasSelfHandle: SelfSelector.hasSelfHandle(state),
          isFetching: AuthSelector.isFetching(state),
          loginError: AuthSelector.getError(state),
        };
      },
      (dispatch: ThunkDispatch): DispatchProps => {
        return {
          doFinalizeSSOLogin: (options: { clientType: ClientType }) =>
            dispatch(ROOT_ACTIONS.authAction.doFinalizeSSOLogin(options)),
          doGetAllClients: () => dispatch(ROOT_ACTIONS.clientAction.doGetAllClients()),
          resetAuthError: () => dispatch(ROOT_ACTIONS.authAction.resetAuthError()),
          validateSSOCode: (code: string) => dispatch(ROOT_ACTIONS.authAction.validateSSOCode(code)),
        };
      }
    )(SingleSignOn)
  )
);
