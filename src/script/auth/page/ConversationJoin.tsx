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

import React, {useEffect, useState} from 'react';

import type {RegisterData} from '@wireapp/api-client/lib/auth';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {
  ArrowIcon,
  Button,
  ContainerXS,
  Form,
  H2,
  Input,
  InputBlock,
  InputSubmitCombo,
  Link,
  RoundIconButton,
  Small,
  Text,
} from '@wireapp/react-ui-kit';

import {isBackendError} from 'Util/TypePredicateUtil';
import {noop} from 'Util/util';

import {EntropyContainer} from './EntropyContainer';

import {Config} from '../../Config';
import {conversationJoinStrings} from '../../strings';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {GuestLinkPasswordModal} from '../component/GuestLinkPasswordModal';
import {RouterLink} from '../component/RouterLink';
import {UnsupportedBrowser} from '../component/UnsupportedBrowser';
import {WirelessContainer} from '../component/WirelessContainer';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY, ROUTE} from '../route';
import * as AccentColor from '../util/AccentColor';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as StringUtil from '../util/stringUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const ConversationJoinComponent = ({
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
  const nameInput = React.useRef<HTMLInputElement>(null);
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
  const [showEntropyForm, setShowEntropyForm] = useState(false);
  const isEntropyRequired = Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY;

  const isLinkPasswordModalOpen =
    conversationError && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD;

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
    setIsPwaEnabled(!!isEnabled);
    if (isEnabled) {
      setForceNewTemporaryGuestAccount(true);
    }
  }, []);

  const routeToApp = (conversation: string = '', domain: string = '') => {
    const redirectLocation = isPwaEnabled
      ? UrlUtil.pathWithParams(EXTERNAL_ROUTE.PWA_LOGIN, {[QUERY_KEY.IMMEDIATE_LOGIN]: 'true'})
      : `${UrlUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP)}${
          conversation && `#/conversation/${conversation}${domain && `/${domain}`}`
        }`;
    window.location.replace(redirectLocation);
  };

  const handleSubmitError = (error: BackendError) => {
    switch (error.label) {
      default: {
        const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
          (error as BackendError).label.endsWith(errorType),
        );
        if (!isValidationError) {
          doLogout();
          console.warn('Unable to create wireless account', error);
          setShowEntropyForm(false);
        }
      }
    }
  };

  const handleSubmit = async (entropyData?: Uint8Array, password?: string) => {
    if (!conversationKey || !conversationCode) {
      return;
    }
    try {
      const name = enteredName?.trim();
      const registrationData = {
        accent_id: accentColor.id,
        expires_in: expiresIn,
        name,
      };
      await doRegisterWireless(
        registrationData as RegisterData,
        {
          shouldInitializeClient: !isPwaEnabled,
        },
        entropyData,
      );
      const conversationEvent = await doJoinConversationByCode(conversationKey, conversationCode, undefined, password);
      /* When we join a conversation, we create the join event before loading the webapp.
       * That means that when the webapp loads and tries to fetch the notificationStream is will get the join event once again and will try to handle it
       * Here we set the core's lastEventDate so that it knows that this duplicated event should be skipped
       */
      await setLastEventDate(new Date(conversationEvent.time));

      routeToApp(conversationEvent.conversation, conversationEvent.qualified_conversation?.domain ?? '');
    } catch (error) {
      if (isBackendError(error)) {
        handleSubmitError(error);
      } else {
        await doLogout();
        console.warn('Unable to create wireless account', error);
        setShowEntropyForm(false);
      }
    }
    if (nameInput.current) {
      nameInput.current.focus();
    }
  };

  const checkNameValidity = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameInput.current) {
      return;
    }
    nameInput.current.value = nameInput.current.value.trim();
    if (!nameInput.current.checkValidity()) {
      setError(ValidationError.handleValidationState('name', nameInput.current.validity));
      setIsValidName(false);
    } else if (isEntropyRequired) {
      setShowEntropyForm(true);
    } else {
      handleSubmit();
    }
  };

  const resetErrors = () => {
    setError(null);
    setIsValidName(true);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setEnteredName(event.target.value);
  };

  const isFullConversation =
    conversationError && conversationError.label && conversationError.label === BackendErrorLabel.TOO_MANY_MEMBERS;
  const renderTemporaryGuestAccountCreation = !isAuthenticated || isTemporaryGuest || forceNewTemporaryGuestAccount;

  const submitJoinCodeWithPassword = async (password: string) => {
    await handleSubmit(undefined, password);
  };

  if (!isValidLink) {
    return <Navigate to={ROUTE.CONVERSATION_JOIN_INVALID} replace />;
  }

  return (
    <UnsupportedBrowser isTemporaryGuest>
      {isLinkPasswordModalOpen && <GuestLinkPasswordModal onSubmitPassword={submitJoinCodeWithPassword} />}
      <WirelessContainer
        showCookiePolicyBanner={showCookiePolicyBanner}
        onCookiePolicyBannerClose={() => setShowCookiePolicyBanner(false)}
      >
        {isEntropyRequired && showEntropyForm ? (
          <EntropyContainer onSetEntropy={handleSubmit} />
        ) : isFullConversation ? (
          <ContainerXS style={{margin: 'auto 0'}}>
            <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-full-headline">
              <FormattedMessage {...conversationJoinStrings.fullConversationHeadline} />
            </H2>
            <Text style={{fontSize: '1rem', marginTop: '10px'}} data-uie-name="status-full-text">
              {_(conversationJoinStrings.fullConversationSubhead)}
            </Text>
          </ContainerXS>
        ) : renderTemporaryGuestAccountCreation ? (
          <div>
            <ContainerXS style={{margin: 'auto 0'}}>
              <AppAlreadyOpen fullscreen={isPwaEnabled} />
              <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}>
                <FormattedMessage
                  {...conversationJoinStrings.headline}
                  values={{
                    brandName: Config.getConfig().BRAND_NAME,
                  }}
                />
              </H2>
              <Text style={{fontSize: '1rem', marginTop: '10px'}}>
                <FormattedMessage {...conversationJoinStrings.subhead} />
              </Text>
              <Form style={{marginTop: 30}}>
                <InputBlock>
                  <InputSubmitCombo>
                    <Input
                      id="enter-name"
                      name="name"
                      autoComplete="username"
                      value={enteredName}
                      ref={nameInput}
                      onChange={onNameChange}
                      placeholder={_(conversationJoinStrings.namePlaceholder)}
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
                      onClick={checkNameValidity}
                      data-uie-name="do-next"
                    >
                      <ArrowIcon />
                    </RoundIconButton>
                  </InputSubmitCombo>
                </InputBlock>
                {!isLinkPasswordModalOpen && (error ? parseValidationErrors(error) : parseError(conversationError))}
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
          </div>
        ) : (
          <ContainerXS style={{margin: 'auto 0'}}>
            <AppAlreadyOpen fullscreen={isPwaEnabled} />
            <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} data-uie-name="status-join-headline">
              {selfName
                ? _(conversationJoinStrings.existentAccountHeadline, {
                    brandName: Config.getConfig().BRAND_NAME,
                    name: StringUtil.capitalize(selfName),
                  })
                : _(conversationJoinStrings.headline, {brandName: Config.getConfig().BRAND_NAME})}
            </H2>
            <Text block style={{fontSize: '1rem', marginTop: '10px'}}>
              {_(conversationJoinStrings.existentAccountSubhead)}
            </Text>
            <Button
              type="button"
              style={{marginTop: 16}}
              onClick={async () => {
                if (!conversationKey || !conversationCode) {
                  return;
                }
                try {
                  const conversationEvent = await doJoinConversationByCode(conversationKey, conversationCode);
                  routeToApp(conversationEvent.conversation, conversationEvent.qualified_conversation?.domain ?? '');
                } catch (error) {
                  console.warn('Unable to join conversation with existing account', error);
                  if (isBackendError(error)) {
                    handleSubmitError(error);
                  }
                }
              }}
              data-uie-name="do-open"
            >
              {_(conversationJoinStrings.existentAccountOpenButton, {brandName: Config.getConfig().BRAND_NAME})}
            </Button>
            {!isLinkPasswordModalOpen && (error ? parseValidationErrors(error) : parseError(conversationError))}
            <Small block>
              {_(conversationJoinStrings.existentAccountJoinWithoutText, {
                existentAccountJoinWithoutLink: (
                  <Link
                    onClick={() => setForceNewTemporaryGuestAccount(true)}
                    textTransform={'none'}
                    data-uie-name="go-join"
                  >
                    {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
                  </Link>
                ),
              })}
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

const ConversationJoin = connect(mapStateToProps, mapDispatchToProps)(ConversationJoinComponent);

export {ConversationJoin};
