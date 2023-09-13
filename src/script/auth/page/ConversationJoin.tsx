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
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';

import {UrlUtil} from '@wireapp/commons';
import {Column, Columns, H1, Muted} from '@wireapp/react-ui-kit';

import {noop} from 'Util/util';

import {GuestLoginColumn, IsLoggedInColumn, Separator} from './ConversationJoinComponents';
import {ConversationJoinFull, ConversationJoinInvalid} from './ConversationJoinInvalid';
import {EntropyContainer} from './EntropyContainer';
import {Login} from './Login';
import {Page} from './Page';

import {Config} from '../../Config';
import {conversationJoinStrings} from '../../strings';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {UnsupportedBrowser} from '../component/UnsupportedBrowser';
import {WirelessContainer} from '../component/WirelessContainer';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY} from '../route';
import * as AccentColor from '../util/AccentColor';

type Props = React.HTMLProps<HTMLDivElement>;

const ConversationJoinComponent = ({
  doCheckConversationCode,
  doJoinConversationByCode,
  doInit,
  doRegisterWireless,
  setLastEventDate,
  doLogout,
  selfName,
  conversationError,
}: Props & ConnectedProps & DispatchProps) => {
  const nameInput = React.useRef<HTMLInputElement>(null);
  const {formatMessage: _} = useIntl();

  const [accentColor] = useState(AccentColor.STRONG_BLUE);
  const [conversationCode, setConversationCode] = useState<string>();
  const [conversationKey, setConversationKey] = useState<string>();
  const [enteredName, setEnteredName] = useState<string>('');
  const [error, setError] = useState<any>();
  const [expiresIn, setExpiresIn] = useState<number>();
  const [isValidLink, setIsValidLink] = useState(true);
  const [isValidName, setIsValidName] = useState(true);
  const [isSubmitingName, setIsSubmitingName] = useState(false);
  const [showCookiePolicyBanner, setShowCookiePolicyBanner] = useState(true);
  const [showEntropyForm, setShowEntropyForm] = useState(false);
  const isEntropyRequired = Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY;

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

  const routeToApp = (conversation: string = '', domain: string = '') => {
    const redirectLocation = `${UrlUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP)}${
      conversation && `#/conversation/${conversation}${domain && `/${domain}`}`
    }`;
    window.location.replace(redirectLocation);
  };

  const getConversationInfoAndJoin = async () => {
    try {
      if (!conversationCode || !conversationKey) {
        throw Error('Conversation code or key missing');
      }
      const conversationEvent = await doJoinConversationByCode(conversationKey, conversationCode);
      /* When we join a conversation, we create the join event before loading the webapp.
       * That means that when the webapp loads and tries to fetch the notificationStream is will get the join event once again and will try to handle it
       * Here we set the core's lastEventDate so that it knows that this duplicated event should be skipped
       */
      await setLastEventDate(new Date(conversationEvent.time));

      routeToApp(conversationEvent.conversation, conversationEvent.qualified_conversation?.domain ?? '');
    } catch (error) {
      console.warn('Unable to join conversation', error);
      setShowEntropyForm(false);
    }
  };

  const handleSubmit = async (entropyData?: Uint8Array) => {
    setIsSubmitingName(true);
    try {
      if (!conversationCode || !conversationKey) {
        throw Error('Conversation code or key missing');
      }
      const name = enteredName?.trim();
      const registrationData = {
        accent_id: accentColor.id,
        expires_in: expiresIn,
        name,
      };
      await doRegisterWireless(
        registrationData as RegisterData,
        {
          shouldInitializeClient: true,
        },
        entropyData,
      );
      await getConversationInfoAndJoin();
    } catch (error) {
      setIsSubmitingName(false);
      if (error.label) {
        switch (error.label) {
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              error.label.endsWith(errorType),
            );
            if (!isValidationError) {
              doLogout();
              console.warn('Unable to create wireless account', error);
              setShowEntropyForm(false);
            }
          }
        }
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

  const checkNameValidity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (nameInput.current) {
      nameInput.current.value = nameInput.current.value.trim();
      if (!nameInput.current.checkValidity()) {
        setError(ValidationError.handleValidationState('name', nameInput.current.validity));
        setIsValidName(false);
      } else if (isEntropyRequired) {
        setShowEntropyForm(true);
      } else {
        await handleSubmit();
      }
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

  if (!isValidLink) {
    return <ConversationJoinInvalid />;
  }

  const isFullConversation =
    conversationError && conversationError.label && conversationError.label === BackendErrorLabel.TOO_MANY_MEMBERS;
  if (isFullConversation) {
    return <ConversationJoinFull />;
  }

  return (
    <UnsupportedBrowser isTemporaryGuest>
      <WirelessContainer
        showCookiePolicyBanner={showCookiePolicyBanner}
        onCookiePolicyBannerClose={() => setShowCookiePolicyBanner(false)}
      >
        <AppAlreadyOpen />
        <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column', marginBottom: '2rem'}}>
          <H1 style={{fontWeight: 500, marginTop: '0', marginBottom: '1rem'}} data-uie-name="status-join-headline">
            {_(conversationJoinStrings.mainHeadline)}
          </H1>
          <Muted data-uie-name="status-join-subhead">
            {_(conversationJoinStrings.headline, {domain: window.location.hostname})}
          </Muted>
        </div>
        <Columns style={{display: 'flex', gap: '2rem', alignSelf: 'center', maxWidth: '100%'}}>
          <Column>
            {selfName ? (
              <IsLoggedInColumn selfName={selfName} handleLogout={doLogout} handleSubmit={getConversationInfoAndJoin} />
            ) : (
              <Login embedded />
            )}
          </Column>
          <Separator />
          <Column>
            <Page>
              {isEntropyRequired && showEntropyForm ? (
                <EntropyContainer onSetEntropy={handleSubmit} />
              ) : (
                <GuestLoginColumn
                  enteredName={enteredName}
                  nameInput={nameInput}
                  onNameChange={onNameChange}
                  checkNameValidity={checkNameValidity}
                  handleSubmit={handleSubmit}
                  isSubmitingName={isSubmitingName}
                  isValidName={isValidName}
                  conversationError={conversationError}
                  error={error}
                />
              )}
            </Page>
          </Column>
        </Columns>
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
