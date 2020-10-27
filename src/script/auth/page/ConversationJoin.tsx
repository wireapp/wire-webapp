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
  Button,
  COLOR,
  ContainerXS,
  Form,
  H2,
  Input,
  InputSubmitCombo,
  Link,
  RoundIconButton,
  Small,
  Text,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Redirect} from 'react-router';
import {AnyAction, Dispatch} from 'redux';
import {noop} from 'Util/util';
import type {RegisterData} from '@wireapp/api-client/src/auth';
import {Config} from '../../Config';
import {conversationJoinStrings} from '../../strings';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import RouterLink from '../component/RouterLink';
import UnsupportedBrowser from '../component/UnsupportedBrowser';
import WirelessContainer from '../component/WirelessContainer';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {Runtime} from '@wireapp/commons';
import * as AccentColor from '../util/AccentColor';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as StringUtil from '../util/stringUtil';
import {UrlUtil} from '@wireapp/commons';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const ConversationJoin = ({
  doCheckConversationCode,
  doJoinConversationByCode,
  doInit,
  doRegisterWireless,
  setLastEventDate,
  doLogout,
  isAuthenticated,
  isTemporaryGuest,
  selfName,
  conversationError,
}: Props & ConnectedProps & DispatchProps) => {
  const nameInput = React.useRef<HTMLInputElement>();
  const {formatMessage: _} = useIntl();

  const [accentColor] = useState(AccentColor.random());
  const [isPwaEnabled, setIsPwaEnabled] = useState<boolean>();
  const [conversationCode, setConversationCode] = useState<string>();
  const [conversationKey, setConversationKey] = useState<string>();
  const [enteredName, setEnteredName] = useState<string>();
  const [error, setError] = useState<any>();
  const [expiresIn, setExpiresIn] = useState<number>();
  const [forceNewTemporaryGuestAccount, setForceNewTemporaryGuestAccount] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const [isValidName, setIsValidName] = useState(true);
  const [showCookiePolicyBanner, setShowCookiePolicyBanner] = useState(true);

  const isPwaSupportedBrowser = () => {
    return Runtime.isMobileOS() || Runtime.isSafari();
  };

  useEffect(() => {
    const localConversationCode = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE);
    const localConversationKey = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY);
    const localExpiresIn = parseInt(UrlUtil.getURLParameter(QUERY_KEY.JOIN_EXPIRES), 10) || undefined;

    setConversationCode(localConversationCode);
    setConversationKey(localConversationKey);
    setExpiresIn(localExpiresIn);
    setIsValidLink(true);
    doInit({isImmediateLogin: false, shouldValidateLocalClient: true})
      .catch(noop)
      .then(() =>
        localConversationCode && localConversationKey
          ? doCheckConversationCode(localConversationKey, localConversationCode)
          : null,
      )
      .catch(error => {
        setIsValidLink(false);
      });
  }, []);

  useEffect(() => {
    const isEnabled =
      Config.getConfig().URL.MOBILE_BASE && UrlUtil.hasURLParameter(QUERY_KEY.PWA_AWARE) && isPwaSupportedBrowser();
    setIsPwaEnabled(isEnabled);
    if (isEnabled) {
      setForceNewTemporaryGuestAccount(true);
    }
  }, []);

  const routeToApp = () => {
    const redirectLocation = isPwaEnabled
      ? UrlUtil.pathWithParams(EXTERNAL_ROUTE.PWA_LOGIN, {[QUERY_KEY.IMMEDIATE_LOGIN]: 'true'})
      : UrlUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP);
    window.location.replace(redirectLocation);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    nameInput.current.value = nameInput.current.value.trim();
    if (!nameInput.current.checkValidity()) {
      setError(ValidationError.handleValidationState('name', nameInput.current.validity));
      setIsValidName(false);
    } else {
      try {
        const name = nameInput.current.value.trim();
        const registrationData = {
          accent_id: accentColor.id,
          expires_in: expiresIn,
          name,
        };
        await doRegisterWireless(registrationData as RegisterData, {
          shouldInitializeClient: !isPwaEnabled,
        });
        const conversationEvent = await doJoinConversationByCode(conversationKey, conversationCode);
        await setLastEventDate(new Date(conversationEvent.time));
        routeToApp();
      } catch (error) {
        if (error.label) {
          switch (error.label) {
            default: {
              const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
                error.label.endsWith(errorType),
              );
              if (!isValidationError) {
                doLogout();
                console.warn('Unable to create wireless account', error);
              }
            }
          }
        } else {
          await doLogout();
          console.warn('Unable to create wireless account', error);
        }
      }
    }
    if (nameInput.current) {
      nameInput.current.focus();
    }
  };

  const resetErrors = () => {
    setError(null);
    setIsValidName(true);
  };

  const isFullConversation =
    conversationError &&
    conversationError.label &&
    conversationError.label === BackendError.CONVERSATION_ERRORS.CONVERSATION_TOO_MANY_MEMBERS;
  const renderTemporaryGuestAccountCreation = !isAuthenticated || isTemporaryGuest || forceNewTemporaryGuestAccount;

  if (!isValidLink) {
    return <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />;
  }
  return (
    <UnsupportedBrowser isTemporaryGuest>
      <WirelessContainer
        showCookiePolicyBanner={showCookiePolicyBanner}
        onCookiePolicyBannerClose={() => setShowCookiePolicyBanner(false)}
      >
        {isFullConversation ? (
          <ContainerXS style={{margin: 'auto 0'}}>
            <H2
              style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
              color={COLOR.GRAY}
              data-uie-name="status-full-headline"
            >
              <FormattedMessage
                {...conversationJoinStrings.fullConversationHeadline}
                values={{
                  brandName: Config.getConfig().BRAND_NAME,
                  // eslint-disable-next-line react/display-name
                  newline: <br />,
                  // eslint-disable-next-line react/display-name
                  strong: (...chunks: any[]) => <strong style={{color: 'black'}}>{chunks}</strong>,
                }}
              />
            </H2>
            <Text style={{fontSize: '16px', marginTop: '10px'}} data-uie-name="status-full-text">
              {_(conversationJoinStrings.fullConversationSubhead)}
            </Text>
          </ContainerXS>
        ) : renderTemporaryGuestAccountCreation ? (
          <ContainerXS style={{margin: 'auto 0'}}>
            <AppAlreadyOpen fullscreen={isPwaEnabled} />
            <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
              <FormattedMessage
                {...conversationJoinStrings.headline}
                values={{
                  brandName: Config.getConfig().BRAND_NAME,
                  // eslint-disable-next-line react/display-name
                  newline: <br />,
                  // eslint-disable-next-line react/display-name
                  strong: (...chunks: any[]) => <strong style={{color: 'black'}}>{chunks}</strong>,
                }}
              />
            </H2>
            <Text style={{fontSize: '16px', marginTop: '10px'}}>
              <FormattedMessage
                {...conversationJoinStrings.subhead}
                values={{
                  newline: <br />,
                }}
              />
            </Text>
            <Form style={{marginTop: 30}}>
              <InputSubmitCombo>
                <Input
                  name="name"
                  autoComplete="username"
                  value={enteredName}
                  ref={nameInput}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    resetErrors();
                    setEnteredName(event.target.value);
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
                  onClick={handleSubmit}
                  data-uie-name="do-next"
                >
                  <ArrowIcon />
                </RoundIconButton>
              </InputSubmitCombo>
              {error ? parseValidationErrors(error) : parseError(conversationError)}
            </Form>
            {!isPwaEnabled && (
              <Small block>
                {`${_(conversationJoinStrings.hasAccount)} `}
                <RouterLink
                  to={`${ROUTE.LOGIN}/${conversationKey}/${conversationCode}`}
                  textTransform={'none'}
                  data-uie-name="go-login"
                >
                  {_(conversationJoinStrings.loginLink)}
                </RouterLink>
              </Small>
            )}
          </ContainerXS>
        ) : (
          <ContainerXS style={{margin: 'auto 0'}}>
            <AppAlreadyOpen fullscreen={isPwaEnabled} />
            <H2
              style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
              color={COLOR.GRAY}
              data-uie-name="status-join-headline"
            >
              {selfName ? (
                <FormattedMessage
                  {...conversationJoinStrings.existentAccountHeadline}
                  values={{
                    brandName: Config.getConfig().BRAND_NAME,
                    name: StringUtil.capitalize(selfName),
                    newline: <br />,
                    // eslint-disable-next-line react/display-name
                    strong: (...chunks: any[]) => <strong style={{color: 'black'}}>{chunks}</strong>,
                  }}
                />
              ) : (
                <FormattedMessage
                  {...conversationJoinStrings.headline}
                  values={{brandName: Config.getConfig().BRAND_NAME}}
                />
              )}
            </H2>
            <Text block style={{fontSize: '16px', marginTop: '10px'}}>
              {_(conversationJoinStrings.existentAccountSubhead)}
            </Text>
            <Button
              style={{marginTop: 16}}
              onClick={async () => {
                try {
                  await doJoinConversationByCode(conversationKey, conversationCode);
                  routeToApp();
                } catch (error) {
                  console.warn('Unable to join conversation with existing account', error);
                }
              }}
              data-uie-name="do-open"
            >
              {_(conversationJoinStrings.existentAccountOpenButton, {brandName: Config.getConfig().BRAND_NAME})}
            </Button>
            {error ? parseValidationErrors(error) : parseError(conversationError)}
            <Small block>
              <Link
                onClick={() => setForceNewTemporaryGuestAccount(true)}
                textTransform={'none'}
                data-uie-name="go-join"
              >
                {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
              </Link>
              {` ${_(conversationJoinStrings.existentAccountJoinWithoutText)}`}
            </Small>
          </ContainerXS>
        )}
      </WirelessContainer>
    </UnsupportedBrowser>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  conversationError: ConversationSelector.getError(state),
  isAuthenticated: AuthSelector.isAuthenticated(state),
  isFetching: ConversationSelector.isFetching(state),
  isTemporaryGuest: SelfSelector.isTemporaryGuest(state),
  selfName: SelfSelector.getSelfName(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doCheckConversationCode: ROOT_ACTIONS.conversationAction.doCheckConversationCode,
      doInit: ROOT_ACTIONS.authAction.doInit,
      doJoinConversationByCode: ROOT_ACTIONS.conversationAction.doJoinConversationByCode,
      doLogout: ROOT_ACTIONS.authAction.doLogout,
      doRegisterWireless: ROOT_ACTIONS.authAction.doRegisterWireless,
      setLastEventDate: ROOT_ACTIONS.notificationAction.setLastEventDate,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(ConversationJoin);
