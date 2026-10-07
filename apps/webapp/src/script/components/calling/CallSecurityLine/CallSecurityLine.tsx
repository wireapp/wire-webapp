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

import {useCallback, useEffect, useId, useRef, useState} from 'react';

import {STATE as CALL_STATE} from '@wireapp/avs';
import {CloseIcon, InfoIcon, LockClosedIcon, ShieldIcon, UpdateIcon} from '@wireapp/react-ui-kit';

import type {Participant} from 'Repositories/calling/Participant';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {isEscapeKey} from 'Util/keyboardUtil';
import type {Translate} from 'Util/localizerUtil';

import {CallPerson, diffCallPeople, getCallPeople} from './callPeople';
import {
  callSecurityButtonStyles,
  callSecurityContentStyles,
  callSecurityExplainerBodyStyles,
  callSecurityExplainerCloseStyles,
  callSecurityExplainerHeadStyles,
  callSecurityExplainerIconStyles,
  callSecurityExplainerLinkStyles,
  callSecurityExplainerStyles,
  callSecurityExplainerTitleStyles,
  callSecurityFadeInStyles,
  callSecurityIconStyles,
  callSecurityInfoIconStyles,
  callSecurityLabelStyles,
  callSecurityLineStyles,
  callSecurityLineTintedStyles,
  callSecurityMutedLabelStyles,
  callSecurityRootStyles,
  callSecuritySeparatorStyles,
  callSecurityUpdateIconStyles,
} from './CallSecurityLine.styles';
import {createKeyUpdateQueue, KeyUpdateMessage, KeyUpdateQueue} from './keyUpdateQueue';

import {Duration} from '../Duration';

/** How long the "Only people in this call…" sentence stays before the line settles. */
export const CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS = 3000;
/** Joins and leaves during the intro and this long after it do not show, so the intro is never cut short. */
export const CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS = 2000;
/** Screen readers hear at most one key update in this period, so a busy call does not flood them. */
export const CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS = 30_000;

type CallSecurityPhase = 'connecting' | 'intro' | 'resting';

const getCallSecurityPhase = (
  callConnectionState: CALL_STATE,
  startedAt: number | undefined,
  nowInMilliseconds: number,
): CallSecurityPhase => {
  if (callConnectionState !== CALL_STATE.MEDIA_ESTAB || startedAt === undefined) {
    return 'connecting';
  }

  return nowInMilliseconds - startedAt < CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS ? 'intro' : 'resting';
};

const getKeyUpdateDetail = (translate: Translate, message: KeyUpdateMessage): string => {
  if (message.type === 'joined') {
    return translate('callSecurityJoined', {name: message.name});
  }

  if (message.type === 'left') {
    return translate('callSecurityLeft', {name: message.name});
  }

  if (message.leftCount === 0) {
    return translate('callSecurityPeopleJoined', {count: message.joinedCount});
  }

  if (message.joinedCount === 0) {
    return translate('callSecurityPeopleLeft', {count: message.leftCount});
  }

  return translate('callSecurityPeopleJoinedAndLeft', {
    joinedCount: message.joinedCount,
    leftCount: message.leftCount,
  });
};

interface CallSecurityLineProps {
  callConnectionState: CALL_STATE;
  participants: Participant[];
  startedAt?: number;
}

/**
 * The line under the call title that tells participants the call is end-to-end encrypted.
 * It replaces the plain call timer when FEATURE_ENABLE_CALL_SECURITY_LINE is on.
 *
 * - connecting: until the call media is established
 * - intro: for 3 s after the call is established (startedAt), so reopening the call view does not replay it
 * - resting: lock, "End-to-end encrypted", duration, info icon; the line is a button that opens the explainer
 * - updating: "Updating encryption keys · {name} joined" when the set of people in the call changes (see keyUpdateQueue)
 */
export const CallSecurityLine = ({callConnectionState, participants, startedAt}: CallSecurityLineProps) => {
  const {translate, clock} = useApplicationContext();
  const [phase, setPhase] = useState<CallSecurityPhase>(() => {
    return getCallSecurityPhase(callConnectionState, startedAt, clock.currentUnixEpochMilliseconds);
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [keyUpdate, setKeyUpdate] = useState<KeyUpdateMessage>();
  const keyUpdateQueueRef = useRef<KeyUpdateQueue | undefined>(undefined);
  const previousPeopleRef = useRef<ReadonlyMap<string, CallPerson> | undefined>(undefined);
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedAtRef = useRef<number | undefined>(undefined);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const explainerId = useId();

  const brandName = Config.getConfig().BRAND_NAME;
  const supportUrl = Config.getConfig().URL.SUPPORT.CALL_ENCRYPTION;

  useEffect((): void | (() => void) => {
    const currentPhase = getCallSecurityPhase(callConnectionState, startedAt, clock.currentUnixEpochMilliseconds);
    setPhase(currentPhase);

    if (currentPhase !== 'intro' || startedAt === undefined) {
      return undefined;
    }

    const remainingIntroInMilliseconds =
      CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS - (clock.currentUnixEpochMilliseconds - startedAt);
    const timeoutIdentifier = clock.setTimeout(() => {
      setPhase('resting');
    }, remainingIntroInMilliseconds);

    return () => {
      clock.clearTimeout(timeoutIdentifier);
    };
  }, [callConnectionState, startedAt, clock]);

  useEffect(() => {
    const keyUpdateQueue = createKeyUpdateQueue({clock, onMessageChange: setKeyUpdate});
    keyUpdateQueueRef.current = keyUpdateQueue;

    return () => {
      keyUpdateQueue.dispose();
      keyUpdateQueueRef.current = undefined;
    };
  }, [clock]);

  useEffect(() => {
    if (startedAt !== undefined) {
      keyUpdateQueueRef.current?.absorbUntil(
        startedAt + CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS,
      );
    }
  }, [startedAt, clock]);

  // call.participants is mutated in place, so the array reference does not change on a join or leave.
  // The signature does, and makes the effect below run.
  const peopleSignature = [...getCallPeople(participants).keys()].toSorted().join(',');

  useEffect(() => {
    const nextPeople = getCallPeople(participants);
    const previousPeople = previousPeopleRef.current;
    previousPeopleRef.current = nextPeople;

    // The first list, and the people already in the call while it connects, are the starting point, not changes.
    if (previousPeople === undefined || phase === 'connecting') {
      return;
    }

    keyUpdateQueueRef.current?.push(diffCallPeople(previousPeople, nextPeople));
  }, [participants, peopleSignature, phase]);

  useEffect(() => {
    if (keyUpdate === undefined) {
      // Cleared between updates, so the same sentence later is announced again.
      setAnnouncement('');
      return;
    }

    const now = clock.currentUnixEpochMilliseconds;
    const lastAnnouncedAt = lastAnnouncedAtRef.current;

    if (lastAnnouncedAt !== undefined && now - lastAnnouncedAt < CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS) {
      return;
    }

    lastAnnouncedAtRef.current = now;
    setAnnouncement(`${translate('callSecurityUpdatingKeys')}. ${getKeyUpdateDetail(translate, keyUpdate)}`);
  }, [keyUpdate, clock, translate]);

  const closeExplainer = useCallback(() => {
    setIsExplainerOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on Escape and on a click outside. Listen on the line's own document, so it also works
  // when the call runs in the detached calling window.
  useEffect((): void | (() => void) => {
    const ownerDocument = rootRef.current?.ownerDocument;

    if (!isExplainerOpen || ownerDocument === undefined) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        closeExplainer();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setIsExplainerOpen(false);
      }
    };

    ownerDocument.addEventListener('keydown', handleKeyDown);
    ownerDocument.addEventListener('mousedown', handlePointerDown);

    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown);
      ownerDocument.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isExplainerOpen, closeExplainer]);

  if (phase === 'connecting') {
    return (
      <span
        key="connecting"
        css={[callSecurityLineStyles, callSecurityFadeInStyles]}
        data-uie-name="call-security-line"
        data-uie-value="connecting"
      >
        <span css={callSecurityMutedLabelStyles}>{translate('callSecurityConnecting')}</span>
      </span>
    );
  }

  if (phase === 'intro') {
    return (
      <span
        key="intro"
        css={[callSecurityLineStyles, callSecurityLineTintedStyles, callSecurityFadeInStyles]}
        data-uie-name="call-security-line"
        data-uie-value="intro"
      >
        <LockClosedIcon color="var(--success-color)" css={callSecurityIconStyles} aria-hidden="true" />
        <span css={callSecurityLabelStyles}>{translate('callSecurityIntro')}</span>
      </span>
    );
  }

  return (
    <span key="resting" ref={rootRef} css={callSecurityRootStyles}>
      <span className="visually-hidden" aria-live="polite" data-uie-name="call-security-announcement">
        {announcement}
      </span>
      <button
        ref={triggerRef}
        type="button"
        css={[callSecurityLineStyles, callSecurityButtonStyles]}
        aria-label={translate('callSecurityShowDetails')}
        aria-expanded={isExplainerOpen}
        aria-controls={explainerId}
        onClick={() => {
          setIsExplainerOpen(isOpen => {
            return !isOpen;
          });
        }}
        data-uie-name="call-security-line"
        data-uie-value={keyUpdate === undefined ? 'resting' : 'updating'}
      >
        {keyUpdate === undefined ? (
          <span key="encrypted" css={callSecurityContentStyles}>
            <LockClosedIcon color="var(--success-color)" css={callSecurityIconStyles} aria-hidden="true" />
            <span css={callSecurityLabelStyles}>{translate('callSecurityEncrypted')}</span>
            <span css={callSecuritySeparatorStyles} aria-hidden="true">
              ·
            </span>
            <Duration startedAt={startedAt} />
          </span>
        ) : (
          // A new key keeps the fade and the turn replaying when one update follows another.
          <span key={getKeyUpdateDetail(translate, keyUpdate)} css={callSecurityContentStyles}>
            <UpdateIcon color="var(--success-color)" css={callSecurityUpdateIconStyles} aria-hidden="true" />
            <span css={callSecurityLabelStyles}>{translate('callSecurityUpdatingKeys')}</span>
            <span css={callSecuritySeparatorStyles} aria-hidden="true">
              ·
            </span>
            <span>{getKeyUpdateDetail(translate, keyUpdate)}</span>
          </span>
        )}
        <InfoIcon color="var(--foreground-fade-56)" css={callSecurityInfoIconStyles} aria-hidden="true" />
      </button>

      {isExplainerOpen && (
        <div
          id={explainerId}
          role="dialog"
          aria-labelledby={`${explainerId}-title`}
          css={callSecurityExplainerStyles}
          data-uie-name="call-security-explainer"
        >
          <div css={callSecurityExplainerHeadStyles}>
            <span css={callSecurityExplainerIconStyles}>
              <ShieldIcon color="var(--success-color)" width={16} height={16} aria-hidden="true" />
            </span>
            <p id={`${explainerId}-title`} css={callSecurityExplainerTitleStyles}>
              {translate('callSecurityIntro')}
            </p>
            <button
              type="button"
              css={callSecurityExplainerCloseStyles}
              aria-label={translate('callSecurityExplainerClose')}
              onClick={closeExplainer}
              data-uie-name="call-security-explainer-close"
            >
              <CloseIcon color="var(--foreground-fade-56)" width={12} height={12} aria-hidden="true" />
            </button>
          </div>
          <p css={callSecurityExplainerBodyStyles}>{translate('callSecurityExplainerBody', {brandName})}</p>
          {supportUrl !== undefined && supportUrl !== '' && (
            <a
              css={callSecurityExplainerLinkStyles}
              href={supportUrl}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="call-security-explainer-link"
            >
              {translate('callSecurityExplainerLink', {brandName})}
            </a>
          )}
        </div>
      )}
    </span>
  );
};
