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

import {type ReactElement, useCallback, useEffect, useId, useRef, useState} from 'react';

import {isNullOrUndefined} from '@sindresorhus/is';
import {Maybe, maybe} from 'true-myth';
import {match} from 'ts-pattern';

import {STATE as CALL_STATE} from '@wireapp/avs';
import {CloseIcon, InfoIcon, LockClosedIcon, ShieldIcon, UpdateIcon} from '@wireapp/react-ui-kit';

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
  callSecurityLabelStyles,
  callSecurityLineStyles,
  callSecurityLineTintedStyles,
  callSecurityMutedLabelStyles,
  callSecurityRootStyles,
  callSecuritySeparatorStyles,
  callSecurityUpdateIconStyles,
} from './callSecurityLine.styles';
import {createKeyUpdateQueue, KeyUpdateMessage, KeyUpdateQueue} from './keyUpdateQueue';

import {useApplicationContext} from '../../../page/rootProvider';
import type {Participant} from '../../../repositories/calling/Participant';
import {isEscapeKey} from '../../../util/keyboardUtil';
import type {Translate} from '../../../util/localizerUtil';
import {Duration} from '../Duration';

/** How long the "Only people in this call…" sentence stays before the line settles. */
export const CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS = 3000;
/** Joins and leaves during the intro and this long after it do not show, so the intro is never cut short. */
export const CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS = 2000;
/** Screen readers hear at most one key update in this period, so a busy call does not flood them. */
export const CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS = 30_000;
const microsecondsPerMillisecond = 1_000n;

type CallSecurityPhase = 'connecting' | 'intro' | 'resting';

const getCallSecurityPhase = (
  callConnectionState: CALL_STATE,
  startedAt: number | undefined,
  nowInMilliseconds: number,
): CallSecurityPhase => {
  if (callConnectionState !== CALL_STATE.MEDIA_ESTAB || isNullOrUndefined(startedAt)) {
    return 'connecting';
  }

  return nowInMilliseconds - startedAt < CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS ? 'intro' : 'resting';
};

const getKeyUpdateDetail = (translate: Translate, message: KeyUpdateMessage): string => {
  return match(message)
    .with({type: 'joined'}, ({name}) => {
      return translate('callSecurityJoined', {name}, {}, true);
    })
    .with({type: 'left'}, ({name}) => {
      return translate('callSecurityLeft', {name}, {}, true);
    })
    .with({type: 'summary', leftCount: 0}, ({joinedCount}) => {
      return translate('callSecurityPeopleJoined', {count: joinedCount});
    })
    .with({type: 'summary', joinedCount: 0}, ({leftCount}) => {
      return translate('callSecurityPeopleLeft', {count: leftCount});
    })
    .with({type: 'summary'}, ({joinedCount, leftCount}) => {
      return translate('callSecurityPeopleJoinedAndLeft', {joinedCount, leftCount});
    })
    .exhaustive();
};

interface CallSecurityLineProps {
  readonly callConnectionState: CALL_STATE;
  readonly participants: readonly Participant[];
  readonly startedAt?: number;
  readonly brandName: string;
  readonly supportUrl?: string;
}

/**
 * The line under the call title that tells participants the call is end-to-end encrypted.
 * It replaces the plain call timer when the call-security-line startup feature toggle is on.
 *
 * - connecting: until the call media is established
 * - intro: for 3 s after the call is established (startedAt), so reopening the call view does not replay it
 * - resting: lock, "End-to-end encrypted", duration, info icon; the line is a button that opens the explainer
 * - updating: "Updating encryption keys · {name} joined" when the set of people in the call changes (see keyUpdateQueue)
 */
export const CallSecurityLine = ({
  callConnectionState,
  participants,
  startedAt,
  brandName,
  supportUrl,
}: CallSecurityLineProps): ReactElement => {
  const {translate, clock} = useApplicationContext();
  const [phase, setPhase] = useState<CallSecurityPhase>(() => {
    return getCallSecurityPhase(callConnectionState, startedAt, clock.currentUnixEpochMilliseconds);
  });
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [keyUpdate, setKeyUpdate] = useState<Maybe<KeyUpdateMessage>>(Maybe.nothing());
  const keyUpdateQueueRef = useRef<Maybe<KeyUpdateQueue>>(Maybe.nothing());
  const previousPeopleRef = useRef<Maybe<ReadonlyMap<string, CallPerson>>>(Maybe.nothing());
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedAtRef = useRef<Maybe<bigint>>(Maybe.nothing());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const explainerId = useId();

  useEffect((): void | (() => void) => {
    const currentPhase = getCallSecurityPhase(callConnectionState, startedAt, clock.currentUnixEpochMilliseconds);
    setPhase(currentPhase);
    if (currentPhase !== 'resting') {
      setIsExplainerOpen(false);
    }

    if (currentPhase !== 'intro' || isNullOrUndefined(startedAt)) {
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
    const keyUpdateQueue = createKeyUpdateQueue({
      clock,
      onMessageChange: message => {
        setKeyUpdate(Maybe.of(message));
      },
    });
    keyUpdateQueueRef.current = Maybe.just(keyUpdateQueue);

    return () => {
      keyUpdateQueue.dispose();
      keyUpdateQueueRef.current = Maybe.nothing();
    };
  }, [clock]);

  // call.participants is mutated in place, so the array reference does not change on a join or leave.
  // The signature does, and makes the effect below run.
  const peopleSignature = [...getCallPeople(participants).keys()].toSorted().join(',');

  useEffect(() => {
    const nextPeople = getCallPeople(participants);
    const previousPeople = previousPeopleRef.current;
    previousPeopleRef.current = Maybe.just(nextPeople);

    // The first list, and the people already in the call while it connects, are the starting point, not changes.
    if (
      maybe.isNothing(previousPeople) ||
      callConnectionState !== CALL_STATE.MEDIA_ESTAB ||
      isNullOrUndefined(startedAt)
    ) {
      return;
    }

    if (
      clock.currentUnixEpochMilliseconds <
      startedAt + CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS
    ) {
      return;
    }

    const queue = keyUpdateQueueRef.current;
    if (maybe.isJust(queue)) {
      queue.value.push(diffCallPeople(previousPeople.value, nextPeople));
    }
  }, [participants, peopleSignature, callConnectionState, startedAt, clock]);

  const keyUpdateDetail = maybe.isJust(keyUpdate) ? getKeyUpdateDetail(translate, keyUpdate.value) : undefined;
  const keyUpdateSentence = isNullOrUndefined(keyUpdateDetail)
    ? undefined
    : `${translate('callSecurityUpdatingKeys')}. ${keyUpdateDetail}`;

  useEffect(() => {
    if (isNullOrUndefined(keyUpdateSentence)) {
      // Cleared between updates, so the same sentence later is announced again.
      setAnnouncement('');
      return;
    }

    const now = clock.currentMonotonicMicroseconds;
    const lastAnnouncedAt = lastAnnouncedAtRef.current;
    const announcementIntervalInMicroseconds =
      BigInt(CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS) * microsecondsPerMillisecond;

    if (maybe.isJust(lastAnnouncedAt) && now - lastAnnouncedAt.value < announcementIntervalInMicroseconds) {
      return;
    }

    lastAnnouncedAtRef.current = Maybe.just(now);
    setAnnouncement(keyUpdateSentence);
  }, [keyUpdate, keyUpdateSentence, clock]);

  const closeExplainer = useCallback(() => {
    setIsExplainerOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on Escape and on a click outside. Listen on the line's own document, so it also works
  // when the call runs in the detached calling window.
  useEffect((): void | (() => void) => {
    const ownerDocument = rootRef.current?.ownerDocument;

    if (!isExplainerOpen || isNullOrUndefined(ownerDocument)) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEscapeKey(event)) {
        closeExplainer();
      }
    };
    const handlePointerDown = (event: MouseEvent): void => {
      if (rootRef.current !== null && !event.composedPath().includes(rootRef.current)) {
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
    <div key="resting" ref={rootRef} css={callSecurityRootStyles}>
      <span className="visually-hidden" aria-live="polite" data-uie-name="call-security-announcement">
        {announcement}
      </span>
      <button
        ref={triggerRef}
        type="button"
        css={[callSecurityLineStyles, callSecurityButtonStyles]}
        aria-label={
          isNullOrUndefined(keyUpdateSentence)
            ? translate('callSecurityShowDetails')
            : `${keyUpdateSentence}. ${translate('callSecurityShowDetails')}`
        }
        aria-expanded={isExplainerOpen}
        aria-controls={explainerId}
        onClick={() => {
          setIsExplainerOpen(isOpen => {
            return !isOpen;
          });
        }}
        data-uie-name="call-security-line"
        data-uie-value={maybe.isNothing(keyUpdate) ? 'resting' : 'updating'}
      >
        {maybe.isNothing(keyUpdate) ? (
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
          <span key={keyUpdateDetail} css={callSecurityContentStyles}>
            <UpdateIcon color="var(--success-color)" css={callSecurityUpdateIconStyles} aria-hidden="true" />
            <span css={callSecurityLabelStyles}>{translate('callSecurityUpdatingKeys')}</span>
            <span css={callSecuritySeparatorStyles} aria-hidden="true">
              ·
            </span>
            <span>{keyUpdateDetail}</span>
          </span>
        )}
        <InfoIcon color="var(--foreground-fade-56)" css={callSecurityIconStyles} aria-hidden="true" />
      </button>

      {isExplainerOpen && (
        <div
          id={explainerId}
          role="region"
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
          {Boolean(supportUrl) && (
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
    </div>
  );
};
