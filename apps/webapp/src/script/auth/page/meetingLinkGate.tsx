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

import {
  createContext,
  type FunctionComponent,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {noop} from 'noop-esm';
import {useDispatch} from 'react-redux';

import {verifiedContentCss} from './meetingLinkGate.styles';
import {MeetingLinkStatus, isMeetingLinkUnavailable, type LinkError} from './meetingLinkStatus';

import {toError} from '../../util/toError';
import {isBackendError, isErrorWithCode} from '../../util/typePredicateUtil';
import {JoinGuestLinkPasswordModal} from '../component/joinGuestLinkPasswordModal';
import {WirelessContainer} from '../component/wirelessContainer';
import {joinLinkAction} from '../module/action/joinLinkAction';
import type {ThunkDispatch} from '../module/reducer';
import {getJoinLink, isJoinLinkPasswordError, JOIN_LINK_KIND, type MeetingLink} from '../util/joinLink';

type VerifiedMeetingLink = {link: MeetingLink; password?: string};

// Keep verification when login or SSO consumes the link URL before leaving the auth flow.
const VerifiedLinkContext = createContext<{
  verified?: VerifiedMeetingLink;
  setVerified: (verified?: VerifiedMeetingLink) => void;
}>({setVerified: noop});

export const MeetingLinkSession: FunctionComponent<PropsWithChildren> = ({children}) => {
  const [verified, setVerified] = useState<VerifiedMeetingLink>();
  return <VerifiedLinkContext.Provider value={{verified, setVerified}}>{children}</VerifiedLinkContext.Provider>;
};

type RetryAdmission = (password?: string) => Promise<void>;
type MeetingLinkContextValue = VerifiedMeetingLink & {
  onJoinError: (error: unknown, retry: RetryAdmission) => void;
  clear: () => void;
};
// Only expose the link to join actions after the current gate has verified it.
const MeetingLinkContext = createContext<MeetingLinkContextValue | undefined>(undefined);

export const useVerifiedMeetingLink = (): MeetingLinkContextValue | undefined => {
  return useContext(MeetingLinkContext);
};

type VerificationState =
  {kind: 'idle' | 'checking'} | {kind: 'password' | 'checkingPassword' | 'error'; error: LinkError};

const toLinkError = (error: unknown): LinkError => {
  const result = toError(error);
  return Object.assign(result, {
    label: isBackendError(error) ? error.label : undefined,
    code: isErrorWithCode(error) ? error.code : undefined,
  });
};

const VerifyMeetingLink: FunctionComponent<PropsWithChildren<{link: MeetingLink}>> = ({link, children}) => {
  const {domain, key, code} = link;
  const dispatch = useDispatch<ThunkDispatch>();
  const {verified, setVerified} = useContext(VerifiedLinkContext);
  const completed = useRef(false);
  const retryAdmission = useRef<RetryAdmission | undefined>(undefined);
  const [state, setState] = useState<VerificationState>({kind: 'idle'});
  const current =
    verified?.link.domain === domain && verified.link.key === key && verified.link.code === code ? verified : undefined;

  const verify = useCallback(
    async (password?: string) => {
      setState(currentState => {
        return currentState.kind === 'password' || currentState.kind === 'checkingPassword'
          ? {kind: 'checkingPassword', error: currentState.error}
          : {kind: 'checking'};
      });
      const currentLink: MeetingLink = {kind: JOIN_LINK_KIND.MEETING, domain, key, code};
      try {
        await dispatch(joinLinkAction.doCheckMeetingLink(currentLink, password));
        setVerified({link: currentLink, password});
        setState({kind: 'idle'});
        if (!isUndefined(retryAdmission.current)) {
          await retryAdmission.current(password);
        }
      } catch (cause: unknown) {
        setState({kind: isJoinLinkPasswordError(cause) ? 'password' : 'error', error: toLinkError(cause)});
      }
    },
    [code, dispatch, domain, key, setVerified],
  );

  useEffect(() => {
    if (!completed.current && isUndefined(current) && state.kind === 'idle') {
      void verify();
    }
  }, [current, state.kind, verify]);

  const onJoinError = (cause: unknown, retry: RetryAdmission): void => {
    retryAdmission.current = retry;
    setState({kind: isJoinLinkPasswordError(cause) ? 'password' : 'error', error: toLinkError(cause)});
  };

  const clear = (): void => {
    completed.current = true;
    retryAdmission.current = undefined;
    setVerified(undefined);
  };

  return (
    <>
      {!isUndefined(current) && (
        <div hidden={state.kind !== 'idle'} css={verifiedContentCss}>
          <MeetingLinkContext.Provider value={{...current, onJoinError, clear}}>{children}</MeetingLinkContext.Provider>
        </div>
      )}
      {(state.kind === 'password' || state.kind === 'checkingPassword') && (
        <WirelessContainer>
          <JoinGuestLinkPasswordModal
            error={state.error}
            isLoading={state.kind === 'checkingPassword'}
            onClose={() => {
              if (state.kind === 'password') {
                setState({kind: 'error', error: state.error});
              }
            }}
            onSubmitPassword={verify}
          />
        </WirelessContainer>
      )}
      {state.kind === 'error' && (
        <MeetingLinkStatus
          error={state.error}
          retry={
            isMeetingLinkUnavailable(state.error)
              ? undefined
              : () => {
                  if (isUndefined(current)) {
                    void verify();
                  } else {
                    setState({kind: 'idle'});
                    void retryAdmission.current?.(current.password);
                  }
                }
          }
        />
      )}
      {isUndefined(current) && (state.kind === 'idle' || state.kind === 'checking') && <MeetingLinkStatus />}
    </>
  );
};

export const MeetingLinkGate: FunctionComponent<PropsWithChildren<{required?: boolean}>> = ({
  children,
  required = false,
}) => {
  const {verified} = useContext(VerifiedLinkContext);
  const currentLink = getJoinLink();
  // Login can consume the URL before an account warning has been acknowledged.
  const link = currentLink.kind === JOIN_LINK_KIND.MEETING ? currentLink : verified?.link;
  if (link?.kind === JOIN_LINK_KIND.MEETING) {
    return (
      <VerifyMeetingLink key={`${link.domain}:${link.key}:${link.code}`} link={link}>
        {children}
      </VerifyMeetingLink>
    );
  }
  if (required) {
    return <MeetingLinkStatus status="invalid" />;
  }
  return children;
};
