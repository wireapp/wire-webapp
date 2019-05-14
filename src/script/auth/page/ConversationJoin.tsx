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

import {RegisterData} from '@wireapp/api-client/dist/commonjs/auth';
import {ConversationEvent} from '@wireapp/api-client/dist/commonjs/event';
import {
  Button,
  COLOR,
  ContainerXS,
  ErrorMessage,
  Form,
  H2,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  Link,
  RoundIconButton,
  Small,
  Text,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {FormattedHTMLMessage, InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Redirect, RouteComponentProps, withRouter} from 'react-router';

import {noop} from 'Util/util';

import {conversationJoinStrings} from '../../strings';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {RouterLink} from '../component/RouterLink';
import {UnsupportedBrowser} from '../component/UnsupportedBrowser';
import {WirelessContainer} from '../component/WirelessContainer';
import {Config} from '../config';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {isPwaSupportedBrowser} from '../Runtime';
import * as AccentColor from '../util/AccentColor';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as StringUtil from '../util/stringUtil';
import {getURLParameter, hasURLParameter, pathWithParams} from '../util/urlUtil';

interface Props extends React.HTMLAttributes<_ConversationJoin>, RouteComponentProps {}

interface ConnectedProps {
  error: Error;
  isAuthenticated: boolean;
  isFetching: boolean;
  isTemporaryGuest: boolean;
  selfName: string;
}

interface DispatchProps {
  doCheckConversationCode: (conversationCode: string, conversationKey: string) => Promise<void>;
  doJoinConversationByCode: (conversationKey: string, conversationCode: string) => Promise<ConversationEvent>;
  doInit: (options: {}) => Promise<void>;
  doRegisterWireless: (registrationData: {}, options: {}) => Promise<void>;
  doLogout: () => Promise<void>;
  setLastEventDate: (date: Date) => Promise<void>;
}

interface State {
  accentColor: AccentColor.AccentColor;
  conversationCode: string;
  conversationKey: string;
  enteredName: string;
  error: Error;
  expiresIn: number;
  forceNewTemporaryGuestAccount: boolean;
  isValidLink: boolean;
  isValidName: boolean;
  showCookiePolicyBanner: boolean;
}

type CombinedProps = Props & ConnectedProps & DispatchProps & InjectedIntlProps;

class _ConversationJoin extends React.Component<CombinedProps, State> {
  nameInput: React.RefObject<any> = React.createRef();
  state: State = {
    accentColor: AccentColor.random(),
    conversationCode: null,
    conversationKey: null,
    enteredName: '',
    error: null,
    expiresIn: undefined,
    forceNewTemporaryGuestAccount: false,
    isValidLink: true,
    isValidName: true,
    showCookiePolicyBanner: true,
  };

  readAndUpdateParamsFromUrl = (nextProps: CombinedProps) => {
    if (this.isPwaEnabled()) {
      this.setState({forceNewTemporaryGuestAccount: true});
    }
    const conversationCode = getURLParameter(QUERY_KEY.CONVERSATION_CODE);
    const conversationKey = getURLParameter(QUERY_KEY.CONVERSATION_KEY);
    const expiresIn = parseInt(getURLParameter(QUERY_KEY.JOIN_EXPIRES), 10) || undefined;

    const codeParamChanged = conversationCode !== this.state.conversationCode;
    const keyParamChanged = conversationKey !== this.state.conversationKey;
    const expiresInParamChanged = expiresIn !== this.state.expiresIn;
    const urlParamChanged = codeParamChanged || keyParamChanged || expiresInParamChanged;

    if (urlParamChanged) {
      Promise.resolve()
        .then(() => {
          this.setState((state, props) => ({
            ...state,
            conversationCode,
            conversationKey,
            expiresIn,
            isValidLink: true,
          }));
        })
        .then(() => this.props.doCheckConversationCode(conversationKey, conversationCode))
        .catch(error => {
          this.setState((state, props) => ({
            ...state,
            isValidLink: false,
          }));
        });
    }
  };

  componentDidMount = () => {
    this.props
      .doInit({shouldValidateLocalClient: true})
      .catch(noop)
      .then(() => this.readAndUpdateParamsFromUrl(this.props));
  };

  componentWillReceiveProps = (nextProps: CombinedProps) => this.readAndUpdateParamsFromUrl(nextProps);

  onOpenWireClick = () => {
    this.props
      .doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode)
      .then(() => this.routeToApp());
  };

  isPwaEnabled = () => {
    const pwaAware = hasURLParameter(QUERY_KEY.PWA_AWARE);
    return Config.URL.MOBILE_BASE && pwaAware && isPwaSupportedBrowser();
  };

  routeToApp = () => {
    const redirectLocation = this.isPwaEnabled()
      ? pathWithParams(EXTERNAL_ROUTE.PWA_LOGIN, QUERY_KEY.IMMEDIATE_LOGIN)
      : pathWithParams(EXTERNAL_ROUTE.WEBAPP);
    window.location.replace(redirectLocation);
  };

  handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    this.nameInput.current.value = this.nameInput.current.value.trim();
    if (!this.nameInput.current.checkValidity()) {
      this.setState({
        error: ValidationError.handleValidationState('name', this.nameInput.current.validity),
        isValidName: false,
      });
    } else {
      Promise.resolve(this.nameInput.current.value)
        .then(name => name.trim())
        .then(name => {
          const registrationData = {
            accent_id: this.state.accentColor.id,
            expires_in: this.state.expiresIn,
            name,
          };
          return this.props.doRegisterWireless(registrationData, {
            shouldInitializeClient: !this.isPwaEnabled(),
          });
        })
        .then(() => this.props.doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode))
        .then(conversationEvent => this.props.setLastEventDate(new Date(conversationEvent.time)))
        .then(() => this.routeToApp())
        .catch(error => {
          if (error.label) {
            switch (error.label) {
              default: {
                const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
                  error.label.endsWith(errorType)
                );
                if (!isValidationError) {
                  this.props.doLogout();
                  throw error;
                }
              }
            }
          } else {
            this.props.doLogout();
            throw error;
          }
        });
    }
    this.nameInput.current.focus();
  };

  isConversationFullError = (error: BackendError) =>
    error && error.label && error.label === BackendError.CONVERSATION_ERRORS.CONVERSATION_TOO_MANY_MEMBERS;

  resetErrors = () => this.setState({error: null, isValidName: true});

  renderActivatedAccount = () => {
    const {
      selfName,
      intl: {formatMessage: _},
    } = this.props;
    const {error} = this.state;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <AppAlreadyOpen fullscreen={this.isPwaEnabled()} />
        <H2
          style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
          color={COLOR.GRAY}
          data-uie-name="status-join-headline"
        >
          {selfName ? (
            <FormattedHTMLMessage
              {...conversationJoinStrings.existentAccountHeadline}
              values={{brandName: Config.BRAND_NAME, name: StringUtil.capitalize(selfName)}}
            />
          ) : (
            <FormattedHTMLMessage {...conversationJoinStrings.headline} values={{brandName: Config.BRAND_NAME}} />
          )}
        </H2>
        <Text block style={{fontSize: '16px', marginTop: '10px'}}>
          {_(conversationJoinStrings.existentAccountSubhead)}
        </Text>
        <Button style={{marginTop: 16}} onClick={this.onOpenWireClick} data-uie-name="do-open">
          {_(conversationJoinStrings.existentAccountOpenButton, {brandName: Config.BRAND_NAME})}
        </Button>
        <ErrorMessage data-uie-name="error-message">
          {error ? parseValidationErrors(error) : parseError(this.props.error)}
        </ErrorMessage>
        <Small block>
          <Link
            onClick={() => this.setState({...this.state, forceNewTemporaryGuestAccount: true})}
            textTransform={'none'}
            data-uie-name="go-join"
          >
            {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
          </Link>
          {` ${_(conversationJoinStrings.existentAccountJoinWithoutText)}`}
        </Small>
      </ContainerXS>
    );
  };

  renderTemporaryGuestAccount = () => {
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {enteredName, isValidName, error} = this.state;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <AppAlreadyOpen fullscreen={this.isPwaEnabled()} />
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.headline} values={{brandName: Config.BRAND_NAME}} />
        </H2>
        <Text style={{fontSize: '16px', marginTop: '10px'}}>
          <FormattedHTMLMessage {...conversationJoinStrings.subhead} />
        </Text>
        <Form style={{marginTop: 30}}>
          <InputSubmitCombo>
            <Input
              name="name"
              autoComplete="username"
              value={enteredName}
              ref={this.nameInput}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                this.resetErrors();
                this.setState({enteredName: event.target.value});
              }}
              placeholder={_(conversationJoinStrings.namePlaceholder)}
              autoFocus
              maxLength={64}
              minLength={2}
              pattern=".{2,64}"
              required
              data-uie-name="enter-name"
            />
            <RoundIconButton
              disabled={!enteredName || !isValidName}
              type="submit"
              formNoValidate
              icon={ICON_NAME.ARROW}
              onClick={this.handleSubmit}
              data-uie-name="do-next"
            />
          </InputSubmitCombo>
          <ErrorMessage data-uie-name="error-message">
            {error ? parseValidationErrors(error) : parseError(this.props.error)}
          </ErrorMessage>
        </Form>
        {!this.isPwaEnabled() && (
          <Small block>
            {`${_(conversationJoinStrings.hasAccount)} `}
            <RouterLink
              to={`${ROUTE.LOGIN}/${this.state.conversationKey}/${this.state.conversationCode}`}
              textTransform={'none'}
              data-uie-name="go-login"
            >
              {_(conversationJoinStrings.loginLink)}
            </RouterLink>
          </Small>
        )}
      </ContainerXS>
    );
  };

  renderFullConversation = () => {
    const {
      intl: {formatMessage: _},
    } = this.props;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <H2
          style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
          color={COLOR.GRAY}
          data-uie-name="status-full-headline"
        >
          <FormattedHTMLMessage
            {...conversationJoinStrings.fullConversationHeadline}
            values={{brandName: Config.BRAND_NAME}}
          />
        </H2>
        <Text style={{fontSize: '16px', marginTop: '10px'}} data-uie-name="status-full-text">
          {_(conversationJoinStrings.fullConversationSubhead)}
        </Text>
      </ContainerXS>
    );
  };

  renderJoin = () => {
    const {error, isAuthenticated, isTemporaryGuest} = this.props;
    const {isValidLink, forceNewTemporaryGuestAccount} = this.state;

    if (!isValidLink) {
      return <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />;
    }
    if (this.isConversationFullError(error as BackendError)) {
      return this.renderFullConversation();
    }
    const renderTemporaryGuestAccountCreation = !isAuthenticated || isTemporaryGuest || forceNewTemporaryGuestAccount;
    return renderTemporaryGuestAccountCreation ? this.renderTemporaryGuestAccount() : this.renderActivatedAccount();
  };

  render(): JSX.Element {
    return (
      <UnsupportedBrowser isTemporaryGuest>
        <WirelessContainer
          showCookiePolicyBanner={this.state.showCookiePolicyBanner}
          onCookiePolicyBannerClose={() => this.setState({...this.state, showCookiePolicyBanner: false})}
        >
          {this.renderJoin()}
        </WirelessContainer>
      </UnsupportedBrowser>
    );
  }
}

export const ConversationJoin = withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => ({
        error: ConversationSelector.getError(state),
        isAuthenticated: AuthSelector.isAuthenticated(state),
        isFetching: ConversationSelector.isFetching(state),
        isTemporaryGuest: SelfSelector.isTemporaryGuest(state),
        selfName: SelfSelector.getSelfName(state),
      }),
      (dispatch: ThunkDispatch): DispatchProps => ({
        doCheckConversationCode: (conversationCode: string, conversationKey: string) =>
          dispatch(ROOT_ACTIONS.conversationAction.doCheckConversationCode(conversationCode, conversationKey)),
        doInit: (options: {isImmediateLogin: boolean; shouldValidateLocalClient: boolean}) =>
          dispatch(ROOT_ACTIONS.authAction.doInit(options)),
        doJoinConversationByCode: (conversationKey: string, conversationCode: string) =>
          dispatch(ROOT_ACTIONS.conversationAction.doJoinConversationByCode(conversationKey, conversationCode)),
        doLogout: () => dispatch(ROOT_ACTIONS.authAction.doLogout()),
        doRegisterWireless: (registrationData: RegisterData, options: {shouldInitializeClient: boolean}) =>
          dispatch(ROOT_ACTIONS.authAction.doRegisterWireless(registrationData, options)),
        setLastEventDate: (date: Date) => dispatch(ROOT_ACTIONS.notificationAction.setLastEventDate(date)),
      })
    )(_ConversationJoin)
  )
);
