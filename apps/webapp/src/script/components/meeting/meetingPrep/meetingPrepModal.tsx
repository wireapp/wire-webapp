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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {maybe} from 'true-myth';

import {modalWrapperStyles} from 'Components/meeting/shared/styles/meetingModalShell.styles';
import {ModalComponent} from 'Components/Modals/ModalComponent';
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
  const session = useMeetingPrepModal(state => state.session);
  const close = useMeetingPrepModal(state => state.close);

  return (
    <ModalComponent
      id="meeting-prep-modal"
      data-uie-name="meeting-prep-modal"
      wrapperCSS={modalWrapperStyles}
      isShown={maybe.isJust(session)}
      onBgClick={close}
      onKeyDown={event => handleEscDown(event, close)}
    >
      {maybe.isJust(session) && (
        <MeetingPrepSurface
          meetingTitle={session.value.meetingTitle}
          meetingStartTime={session.value.meetingStartTime}
          participantName={participantName}
          onCancel={close}
          onJoin={async choice => {
            const joined = await joinMeeting(session.value.qualifiedConversationId, choice);
            if (joined) {
              close();
            }
          }}
          requestPreviewStream={requestPreviewStream}
          releasePreviewStream={releasePreviewStream}
        />
      )}
    </ModalComponent>
  );
};
