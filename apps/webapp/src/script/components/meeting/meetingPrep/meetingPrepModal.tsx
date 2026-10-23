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

import {type FunctionComponent, useCallback, useRef} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {maybe} from 'true-myth';

import {showNoAudioInputModal, showNoCameraModal} from 'Components/calling/devicePermissionModals';
import {modalWrapperStyles} from 'Components/meeting/shared/styles/meetingModalShell.styles';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import type {CallMediaChoice} from 'Repositories/calling/callMediaChoice';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';
import {captureModalFocusContext} from 'Util/modalFocusUtil';

import {MeetingPrepSurface} from './meetingPrepSurface';
import {type MeetingPrepDeviceKind, meetingPrepDeviceKinds, type RequestMeetingPrepPreview} from './meetingPrepTypes';
import {useMeetingPrepModal} from './useMeetingPrepModal';

export type MeetingPrepModalProps = {
  participant: User;
  requestPreviewStream: RequestMeetingPrepPreview;
  releasePreviewStream: (stream: MediaStream) => void;
  joinMeeting: (qualifiedConversationId: QualifiedId, media: CallMediaChoice) => Promise<boolean>;
};

export const MeetingPrepModal: FunctionComponent<MeetingPrepModalProps> = ({
  participant,
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

  const requestClose = (): void => {
    if (isJoiningRef.current) {
      return;
    }
    close();
  };

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
