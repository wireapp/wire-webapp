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

import {type FunctionComponent, useCallback, useId, useRef} from 'react';

import {Maybe, maybe} from 'true-myth';

import {MeetingPrepSurface} from './meetingPrepSurface';
import {type MeetingPrepDeviceKind, meetingPrepDeviceKinds, type RequestMeetingPrepPreview} from './meetingPrepTypes';
import {useMeetingPrepModal} from './useMeetingPrepModal';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {useApplicationContext} from '../../../page/rootProvider';
import type {CallMediaChoice} from '../../../repositories/calling/callMediaChoice';
import type {User} from '../../../repositories/entity/User';
import {handleEscDown} from '../../../util/keyboardUtil';
import {captureModalFocusContext} from '../../../util/modalFocusUtil';
import {showNoAudioInputModal, showNoCameraModal} from '../../calling/devicePermissionModals';
import {ModalComponent} from '../../Modals/ModalComponent';
import {fullPageModalWrapperStyles} from '../shared/styles/meetingModalShell.styles';

export type MeetingPrepModalProps = {
  readonly participant: User;
  readonly isCallInProgress: boolean;
  readonly invitees: readonly User[];
  readonly brandName: string;
  readonly supportUrl?: string;
  /** Opens Settings > Troubleshooting. Nothing when the troubleshooter is not available. */
  readonly openTroubleshooting: Maybe<() => void>;
  readonly requestPreviewStream: RequestMeetingPrepPreview;
  readonly releasePreviewStream: (stream: MediaStream) => void;
  readonly joinMeeting: (qualifiedConversationId: QualifiedId, media: CallMediaChoice) => Promise<boolean>;
};

export const MeetingPrepModal: FunctionComponent<MeetingPrepModalProps> = ({
  participant,
  isCallInProgress,
  invitees,
  brandName,
  supportUrl,
  openTroubleshooting,
  requestPreviewStream,
  releasePreviewStream,
  joinMeeting,
}: MeetingPrepModalProps) => {
  const {translate} = useApplicationContext();
  const session = useMeetingPrepModal(state => {
    return state.session;
  });
  const close = useMeetingPrepModal(state => {
    return state.close;
  });
  const isJoiningRef = useRef(false);
  const titleId = useId();

  const requestClose = (): void => {
    if (isJoiningRef.current) {
      return;
    }
    close();
  };

  // The green room closes first, so the troubleshooting page is not hidden behind it.
  const testConnection = openTroubleshooting.map(open => {
    return (): void => {
      if (isJoiningRef.current) {
        return;
      }
      close();
      open();
    };
  });

  const handlePermissionDenied = useCallback(
    (kind: MeetingPrepDeviceKind): void => {
      const focusContext = captureModalFocusContext();
      const modalFocusContext = {
        container: focusContext.container,
        close: focusContext.createFocusRestorationCallback(),
      };
      if (kind === meetingPrepDeviceKinds.camera) {
        showNoCameraModal(translate, modalFocusContext);
      } else {
        showNoAudioInputModal(translate, modalFocusContext);
      }
    },
    [translate],
  );

  return (
    <ModalComponent
      id="meeting-prep-modal"
      data-uie-name="meeting-prep-modal"
      wrapperCSS={fullPageModalWrapperStyles}
      aria-labelledby={titleId}
      isShown={maybe.isJust(session)}
      onBgClick={requestClose}
      onKeyDown={event => {
        return handleEscDown(event, requestClose);
      }}
    >
      {maybe.isJust(session) && (
        <MeetingPrepSurface
          // A new meeting opened over this one starts from a clean green room.
          key={`${session.value.qualifiedMeetingId.id}@${session.value.qualifiedMeetingId.domain}`}
          titleId={titleId}
          meetingTitle={session.value.meetingTitle}
          meetingStartTime={session.value.meetingStartTime}
          meetingEndTime={Maybe.of(session.value.meetingEndTime)}
          isCallInProgress={isCallInProgress}
          invitees={invitees}
          brandName={brandName}
          supportUrl={supportUrl}
          onTestConnection={testConnection}
          participant={participant}
          onCancel={requestClose}
          onPermissionDenied={handlePermissionDenied}
          onJoin={async choice => {
            isJoiningRef.current = true;
            try {
              const joined = await joinMeeting(session.value.qualifiedConversationId, choice);
              if (joined) {
                close();
              }
            } finally {
              isJoiningRef.current = false;
            }
          }}
          requestPreviewStream={requestPreviewStream}
          releasePreviewStream={releasePreviewStream}
        />
      )}
    </ModalComponent>
  );
};
