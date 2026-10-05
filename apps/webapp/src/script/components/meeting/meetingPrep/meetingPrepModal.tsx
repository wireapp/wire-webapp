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

import {useRef} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {maybe} from 'true-myth';

import {modalWrapperStyles} from 'Components/meeting/shared/styles/meetingModalShell.styles';
import {ModalComponent} from 'Components/modals/modalComponent';
import type {CallMediaChoice} from 'Repositories/calling/callMediaChoice';
import {handleEscDown} from 'Util/keyboardUtil';

import {MeetingPrepSurface} from './meetingPrepSurface';
import type {RequestMeetingPrepPreview} from './meetingPrepTypes';
import {useMeetingPrepModal} from './useMeetingPrepModal';

export type MeetingPrepModalProps = {
  participantName: string;
  requestPreviewStream: RequestMeetingPrepPreview;
  releasePreviewStream: (stream: MediaStream) => void;
  joinMeeting: (qualifiedConversationId: QualifiedId, media: CallMediaChoice) => Promise<boolean>;
};

export const MeetingPrepModal = ({
  participantName,
  requestPreviewStream,
  releasePreviewStream,
  joinMeeting,
}: MeetingPrepModalProps) => {
  const session = useMeetingPrepModal(state => {
    return state.session;
  });
  const close = useMeetingPrepModal(state => {
    return state.close;
  });
  const isJoiningRef = useRef(false);

  const requestClose = () => {
    if (isJoiningRef.current) {
      return;
    }
    close();
  };

  return (
    <ModalComponent
      id="meeting-prep-modal"
      data-uie-name="meeting-prep-modal"
      wrapperCSS={modalWrapperStyles}
      isShown={maybe.isJust(session)}
      onBgClick={requestClose}
      onKeyDown={event => {
        return handleEscDown(event, requestClose);
      }}
    >
      {maybe.isJust(session) && (
        <MeetingPrepSurface
          meetingTitle={session.value.meetingTitle}
          meetingStartTime={session.value.meetingStartTime}
          participantName={participantName}
          onCancel={requestClose}
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
