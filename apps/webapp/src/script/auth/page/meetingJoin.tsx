/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {type FunctionComponent, type FormEvent, useCallback, useEffect, useRef, useState} from 'react';

import {isNullOrUndefined, isUndefined} from '@sindresorhus/is';
import {useDispatch, useStore} from 'react-redux';

import {GuestLoginColumn, IsLoggedInColumn, Separator} from './conversationJoinComponents';
import {EntropyContainer} from './entropyContainer';
import {Login} from './login/login';
import {MeetingLinkGate, useVerifiedMeetingLink} from './meetingLinkGate';
import {MeetingLinkStatus} from './meetingLinkStatus';
import {Page} from './page';

import {UrlUtil} from '../../commons/util';
import {Config} from '../../Config';
import {useApplicationContext} from '../../page/rootProvider';
import {Column, Columns} from '../../uiKit/layout/column/column';
import {H1} from '../../uiKit/typography/heading/heading';
import {toError} from '../../util/toError';
import {AppAlreadyOpen} from '../component/appAlreadyOpen';
import {WirelessContainer} from '../component/wirelessContainer';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot} from '../module/action';
import {joinLinkAction} from '../module/action/joinLinkAction';
import {ValidationError} from '../module/action/validationError';
import type {RootState, ThunkDispatch} from '../module/reducer';
import {isAuthenticated} from '../module/selector/authSelector';
import {getSelfName} from '../module/selector/selfSelector';
import * as AccentColor from '../util/accentColor';
import {clearMeetingJoinParameters} from '../util/joinLink';

const MeetingLogin: FunctionComponent = () => {
  const {translate} = useApplicationContext();
  const dispatch = useDispatch<ThunkDispatch>();
  const verified = useVerifiedMeetingLink();
  const store = useStore<RootState>();
  const [session, setSession] = useState<{kind: 'loading'} | {kind: 'signedOut'} | {kind: 'signedIn'; name: string}>({
    kind: 'loading',
  });
  const [showCookiePolicyBanner, setShowCookiePolicyBanner] = useState(true);
  const [enteredName, setEnteredName] = useState('');
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<Error | null>(null);
  const [logoutError, setLogoutError] = useState<Error | null>(null);
  const [showEntropy, setShowEntropy] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const joining = useRef(false);

  useEffect(() => {
    void dispatch(actionRoot.authAction.doInit({isImmediateLogin: false, shouldValidateLocalClient: true})).finally(
      () => {
        const state = store.getState();
        setSession(isAuthenticated(state) ? {kind: 'signedIn', name: getSelfName(state) ?? ''} : {kind: 'signedOut'});
      },
    );
  }, [dispatch, store]);

  const join = useCallback(
    async (password = verified?.password): Promise<void> => {
      if (isUndefined(verified) || joining.current) {
        return;
      }
      joining.current = true;
      setIsSubmitting(true);
      try {
        const result = await dispatch(joinLinkAction.doJoinMeetingLink(verified.link, password));
        await dispatch(joinLinkAction.doStoreJoinDestination(result));
        clearMeetingJoinParameters();
        verified.clear();
        window.location.replace(UrlUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP));
      } catch (error: unknown) {
        verified.onJoinError(error, join);
      } finally {
        joining.current = false;
        setIsSubmitting(false);
      }
    },
    [dispatch, verified],
  );

  const switchAccount = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      setLogoutError(null);
      await dispatch(actionRoot.authAction.doLogout());
      if (isAuthenticated(store.getState())) {
        throw store.getState().authState.error ?? new Error('Could not switch accounts');
      }
      setSession({kind: 'signedOut'});
    } catch (error: unknown) {
      setLogoutError(toError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerGuest = async (entropy?: Uint8Array): Promise<void> => {
    setIsSubmitting(true);
    setRegistrationError(null);
    try {
      await dispatch(
        actionRoot.authAction.doRegisterWireless(
          {name: enteredName.trim(), accent_id: AccentColor.STRONG_BLUE.id},
          {shouldInitializeClient: true},
          entropy,
        ),
      );
      await join();
    } catch (error: unknown) {
      setRegistrationError(toError(error));
      void dispatch(actionRoot.authAction.resetAuthError());
      nameInput.current?.focus();
    } finally {
      setShowEntropy(false);
      setIsSubmitting(false);
    }
  };

  const submitName = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (isNullOrUndefined(nameInput.current)) {
      return;
    }
    nameInput.current.value = enteredName.trim();
    if (!nameInput.current.checkValidity()) {
      setValidationError(ValidationError.handleValidationState('name', nameInput.current.validity));
      return;
    }
    if (Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY) {
      setShowEntropy(true);
      return;
    }
    await registerGuest();
  };

  if (session.kind === 'loading') {
    return <MeetingLinkStatus />;
  }
  return (
    <WirelessContainer
      showCookiePolicyBanner={showCookiePolicyBanner}
      onCookiePolicyBannerClose={() => {
        return setShowCookiePolicyBanner(false);
      }}
    >
      <AppAlreadyOpen />
      <H1 center data-uie-name="status-join-headline">
        {translate('meetingJoin.joinHeadline')}
      </H1>
      <Columns style={{display: 'flex', gap: '2rem', alignSelf: 'center', maxWidth: '100%'}}>
        <Column>
          {session.kind === 'signedIn' ? (
            <IsLoggedInColumn
              selfName={session.name}
              isMeeting
              disabled={isSubmitting}
              logoutError={logoutError}
              handleSubmit={() => {
                void join();
              }}
              handleLogout={() => {
                void switchAccount();
              }}
            />
          ) : (
            <Login embedded />
          )}
        </Column>
        <Separator />
        <Column>
          <Page>
            {showEntropy ? (
              <EntropyContainer onSetEntropy={registerGuest} />
            ) : (
              <GuestLoginColumn
                isMeeting
                enteredName={enteredName}
                nameInput={nameInput}
                onNameChange={event => {
                  setEnteredName(event.target.value);
                  setValidationError(null);
                  setRegistrationError(null);
                }}
                checkNameValidity={submitName}
                isValidName={isNullOrUndefined(validationError)}
                isSubmitingName={isSubmitting}
                conversationError={registrationError}
                error={validationError}
              />
            )}
          </Page>
        </Column>
      </Columns>
    </WirelessContainer>
  );
};

export const MeetingJoin: FunctionComponent = () => {
  return (
    <MeetingLinkGate required>
      <MeetingLogin />
    </MeetingLinkGate>
  );
};
