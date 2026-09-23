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
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {toast} from 'sonner';
import {task, type Task} from 'true-myth';

import {showMeetingLinkPasswordForm} from 'Components/meeting/shared/service/meetingLinkPasswordModal';
import {removeCurrentModal, setPrimaryModalLoading, usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Translate} from 'Util/localizerUtil';
import {isAxiosError, isErrorWithCode} from 'Util/typePredicateUtil';

import type {MeetingLink} from './meetingService';

import {showMeetingLinkConfirmation} from '../../meetingLinkConfirmation/meetingLinkConfirmation';

export type MeetingLinkRecoveryError = {
  readonly type: 'unavailable';
  readonly cause: unknown;
};

export type MeetingLinkErrorClassification = 'missing' | 'unavailable';

export const classifyMeetingLinkError = (error: unknown): MeetingLinkErrorClassification => {
  let status: number | undefined;
  if (isAxiosError(error)) {
    status = error.response?.status;
  } else if (isErrorWithCode(error)) {
    status = error.code;
  }

  return status === HTTP_STATUS.NOT_FOUND ? 'missing' : 'unavailable';
};

type MeetingLinkOperations = Pick<
  ConversationRepository,
  'getMeetingConversationCode' | 'requestMeetingConversationCode'
>;

type MeetingLinkRotationOperations = MeetingLinkOperations &
  Pick<ConversationRepository, 'revokeMeetingConversationCode'>;

export const recoverMeetingConversationCode = (
  operations: MeetingLinkOperations,
  conversationId: QualifiedId,
  password: string,
): Task<MeetingLink, MeetingLinkRecoveryError> =>
  operations.getMeetingConversationCode(conversationId).orElse(error => {
    if (classifyMeetingLinkError(error) !== 'missing') {
      return task.reject<MeetingLink, MeetingLinkRecoveryError>({type: 'unavailable', cause: error});
    }

    return operations.requestMeetingConversationCode(conversationId, password).mapRejected(postError => ({
      type: 'unavailable' as const,
      cause: postError,
    }));
  });

export const generateMeetingConversationCode = (
  operations: MeetingLinkOperations,
  conversationId: QualifiedId,
  password: string,
): Task<MeetingLink, MeetingLinkRecoveryError> =>
  operations.requestMeetingConversationCode(conversationId, password).mapRejected(error => ({
    type: 'unavailable' as const,
    cause: error,
  }));

export const rotateMeetingConversationCode = (
  operations: MeetingLinkRotationOperations,
  conversationId: QualifiedId,
  password: string,
): Task<MeetingLink, MeetingLinkRecoveryError> =>
  operations
    .revokeMeetingConversationCode(conversationId)
    .mapRejected(error => ({
      type: 'unavailable' as const,
      cause: error,
    }))
    .andThen(() =>
      operations.requestMeetingConversationCode(conversationId, password).mapRejected(error => ({
        type: 'unavailable' as const,
        cause: error,
      })),
    );

type ShowMeetingLinkPasswordModalParams = {
  conversationId: QualifiedId;
  conversationRepository: MeetingLinkRotationOperations;
  generate?: boolean;
  rotate?: boolean;
  translate: Translate;
};

export const showMeetingLinkPasswordModal = ({
  conversationId,
  conversationRepository,
  generate = false,
  rotate = false,
  translate,
}: ShowMeetingLinkPasswordModalParams): void => {
  let modalId: string | undefined;
  const recover = async (password: string): Promise<void> => {
    if (modalId === undefined) {
      return;
    }

    setPrimaryModalLoading(true, modalId);

    let recoveryTask: Task<MeetingLink, MeetingLinkRecoveryError>;
    if (rotate) {
      recoveryTask = rotateMeetingConversationCode(conversationRepository, conversationId, password);
    } else if (generate) {
      recoveryTask = generateMeetingConversationCode(conversationRepository, conversationId, password);
    } else {
      recoveryTask = recoverMeetingConversationCode(conversationRepository, conversationId, password);
    }
    const result = await recoveryTask.toPromise();
    result.match({
      Ok: meetingLink => {
        if (usePrimaryModalState.getState().currentModalId !== modalId) {
          return;
        }

        setPrimaryModalLoading(false, modalId);
        removeCurrentModal(modalId);
        showMeetingLinkConfirmation({meetingLink, translate});
      },
      Err: () => {
        if (usePrimaryModalState.getState().currentModalId !== modalId) {
          return;
        }

        setPrimaryModalLoading(false, modalId);
        toast.error(translate('meetings.meetingLink.loadFailed'));
      },
    });
  };

  modalId = showMeetingLinkPasswordForm({onCreate: recover, rotate, translate});
};
