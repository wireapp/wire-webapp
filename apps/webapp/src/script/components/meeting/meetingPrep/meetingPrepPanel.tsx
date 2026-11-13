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

import {type ReactElement, type ReactNode, useEffect, useState} from 'react';

import {type Maybe, maybe} from 'true-myth';
import {match} from 'ts-pattern';

import {MeetingPrepInvitees} from './meetingPrepInvitees';
import {
  meetingPrepChipsStyles,
  meetingPrepJoinSentenceStyles,
  meetingPrepJoinStyles,
  meetingPrepLinkButtonStyles,
  meetingPrepLinkIconStyles,
  meetingPrepLiveDotStyles,
  meetingPrepPanelStyles,
  meetingPrepPanelTimeStyles,
  meetingPrepPanelTitleStyles,
  meetingPrepStatusStyles,
} from './meetingPrepPanel.styles';
import {getMeetingPrepStatus, getMillisecondsUntilStatusChange} from './meetingPrepStatus';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {useApplicationContext} from '../../../page/rootProvider';
import type {User} from '../../../repositories/entity/User';
import {Button, ButtonVariant} from '../../../uiKit/inputs/button/button';
import {formatLocale} from '../../../util/timeUtil';
import {EncryptedBadge} from '../../calling/encryptedBadge/encryptedBadge';
import {NetworkIcon} from '../../icon';

/** One person invited is the user alone: the row says nothing then. */
const MINIMUM_INVITEES_SHOWN = 2;

interface MeetingPrepPanelProps {
  readonly titleId: string;
  readonly meetingTitle: string;
  readonly meetingStartTime: string;
  readonly meetingEndTime: Maybe<string>;
  readonly isCallInProgress: boolean;
  readonly invitees: readonly User[];
  readonly organizerId: Maybe<QualifiedId>;
  /** The setup callout and device rows, built by the surface that owns the devices. */
  readonly deviceSection: ReactNode;
  readonly brandName: string;
  readonly supportUrl?: string;
  readonly onTestConnection: Maybe<() => void>;
  readonly joinSentence: string;
  readonly isJoining: boolean;
  readonly onJoin: () => void;
}

/**
 * The right side of the meeting green room: whether the meeting has started, that it is end-to-end
 * encrypted, when it runs, who is invited, and the Join button with how the user joins.
 */
export const MeetingPrepPanel = ({
  titleId,
  meetingTitle,
  meetingStartTime,
  meetingEndTime,
  isCallInProgress,
  invitees,
  organizerId,
  deviceSection,
  brandName,
  supportUrl,
  onTestConnection,
  joinSentence,
  isJoining,
  onJoin,
}: MeetingPrepPanelProps): ReactElement => {
  const {translate, clock} = useApplicationContext();
  const [nowInMilliseconds, setNowInMilliseconds] = useState(() => {
    return clock.currentUnixEpochMilliseconds;
  });

  const startInMilliseconds = new Date(meetingStartTime).getTime();

  // Re-read the clock exactly when the chip would change, not on a fixed tick.
  useEffect((): void | (() => void) => {
    const delay = getMillisecondsUntilStatusChange({startInMilliseconds, nowInMilliseconds});
    if (delay.isNothing) {
      return undefined;
    }

    const timeoutIdentifier = clock.setTimeout(() => {
      setNowInMilliseconds(clock.currentUnixEpochMilliseconds);
    }, delay.value);

    return () => {
      clock.clearTimeout(timeoutIdentifier);
    };
  }, [clock, nowInMilliseconds, startInMilliseconds]);

  const status = getMeetingPrepStatus({
    startInMilliseconds,
    nowInMilliseconds,
    isCallInProgress,
  });

  const date = formatLocale(meetingStartTime, 'EEE d MMMM');
  const start = formatLocale(meetingStartTime, 'p');
  const time = maybe.isJust(meetingEndTime)
    ? translate('meetings.prep.timeRange', {date, start, end: formatLocale(meetingEndTime.value, 'p')})
    : translate('meetings.prep.time', {date, start});

  return (
    <div css={meetingPrepPanelStyles} data-uie-name="meeting-prep-panel">
      <div>
        <div css={meetingPrepChipsStyles}>
          {match(status)
            .with({type: 'inProgress'}, () => {
              return (
                <span css={meetingPrepStatusStyles} data-uie-name="meeting-prep-status" data-uie-value="in-progress">
                  <span css={meetingPrepLiveDotStyles} aria-hidden="true" />
                  {translate('meetings.prep.inProgress')}
                </span>
              );
            })
            .with({type: 'startsIn'}, ({minutes}) => {
              return (
                <span css={meetingPrepStatusStyles} data-uie-name="meeting-prep-status" data-uie-value="starts-in">
                  {translate('meetings.prep.startsIn', {minutes})}
                </span>
              );
            })
            .with({type: 'none'}, () => {
              return null;
            })
            .exhaustive()}
          <EncryptedBadge
            explainerTitle={translate('meetings.prep.encryptionExplainerTitle')}
            brandName={brandName}
            supportUrl={supportUrl}
          />
        </div>
        <h2 id={titleId} css={meetingPrepPanelTitleStyles}>
          {meetingTitle}
        </h2>
        <p css={meetingPrepPanelTimeStyles} data-uie-name="meeting-prep-time">
          {time}
        </p>
      </div>

      {invitees.length >= MINIMUM_INVITEES_SHOWN && (
        <MeetingPrepInvitees invitees={invitees} organizerId={organizerId} />
      )}

      {deviceSection}

      {maybe.isJust(onTestConnection) && (
        <button
          type="button"
          css={meetingPrepLinkButtonStyles}
          onClick={onTestConnection.value}
          disabled={isJoining}
          data-uie-name="meeting-prep-test-connection"
        >
          {/* The Troubleshooting icon from the preferences, where the link leads. */}
          <NetworkIcon css={meetingPrepLinkIconStyles} aria-hidden="true" />
          {translate('meetings.prep.testConnection')}
        </button>
      )}

      <div css={meetingPrepJoinStyles}>
        <Button
          type="button"
          variant={ButtonVariant.PRIMARY}
          disabled={isJoining}
          onClick={onJoin}
          data-uie-name="meeting-prep-join"
        >
          {translate('callJoin')}
        </Button>
        <p css={meetingPrepJoinSentenceStyles} data-uie-name="meeting-prep-join-sentence">
          {joinSentence}
        </p>
      </div>
    </div>
  );
};
