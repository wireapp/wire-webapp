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

import {useEffect, useId, useRef, useState} from 'react';

import {Maybe} from 'true-myth';

import {Button, ButtonVariant, COLOR} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import type {TeamState} from 'Repositories/team/TeamState';
import {
  canManuallyMigrateConversation,
  manuallyMigrateConversation,
  type ManualMigrationFailure,
} from 'src/script/mls/MLSMigration/manualMigration';
import {useManualMigrationStore} from 'src/script/mls/MLSMigration/useManualMigrationStore';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {errorHandlerStrings} from 'Util/errorUtil';
import type {TranslationKey} from 'Util/localizerUtil';
import {isAxiosError, isBackendError} from 'Util/typePredicateUtil';
import {useIsMounted} from 'Util/useIsMounted';

import {ConversationProtocolDetails} from './conversationProtocolDetails';
import {
  migrationButtonStyles,
  modalWrapperStyles,
  modalContentStyles,
  modalTitleStyles,
  modalDescriptionStyles,
  modalActionsStyles,
} from './manualMigrationProtocolDetails.styles';
import {useOnMultipleClicks} from './useOnMultipleClicks';

const REQUIRED_PROTOCOL_ACTIVATIONS = 5;

const migrationFailureTranslationKeys = {
  requestFailed: 'manualMlsMigrationFailure',
  notAllowed: 'manualMlsMigrationNotAllowed',
  alreadyRunning: 'manualMlsMigrationAlreadyRunning',
  missingGroup: 'manualMlsMigrationMissingGroup',
  protocolUnchanged: 'manualMlsMigrationProtocolUnchanged',
} satisfies Record<ManualMigrationFailure['reason'], TranslationKey>;

type MigrationDialogState = {phase: 'closed' | 'confirmation' | 'running'} | {phase: 'feedback'; message: string};

interface Props {
  conversation: Conversation;
  selfUser: Pick<User, 'teamId' | 'qualifiedId'>;
  teamState: Pick<TeamState, 'teamFeatures'>;
  repository: Pick<
    ConversationRepository,
    'updateConversationProtocol' | 'tryEstablishingMLSGroup' | 'safeEnsureConversationExists'
  >;
}

export const ManualMigrationProtocolDetails = ({conversation, selfUser, teamState, repository}: Props) => {
  const {translate} = useApplicationContext();
  const [currentConversation, setCurrentConversation] = useState(conversation);
  const [dialogState, setDialogState] = useState<MigrationDialogState>({phase: 'closed'});
  const isPending = useManualMigrationStore(state => state.pendingConversationIds.has(conversation.qualifiedId.id));
  const isBusy = isPending || dialogState.phase === 'running';
  const isMounted = useIsMounted();
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const {teamFeatures} = useKoSubscribableChildren(teamState, ['teamFeatures']);
  useKoSubscribableChildren(currentConversation, ['isSelfUserRemoved', 'isGroupOrChannel', 'messages_unordered']);
  const eligible = canManuallyMigrateConversation(currentConversation, selfUser, Maybe.of(teamFeatures?.mlsMigration));

  useEffect(() => {
    setCurrentConversation(conversation);
  }, [conversation]);

  const {activate, reset} = useOnMultipleClicks({
    count: REQUIRED_PROTOCOL_ACTIVATIONS,
    elementRef: wrapper,
    elementSelector: '[data-uie-name="manual-migration-protocol"]',
    enabled: eligible && !isBusy && dialogState.phase === 'closed',
    onActivate: () => setDialogState({phase: 'confirmation'}),
  });

  useEffect(() => {
    if (!eligible) {
      reset();
      if (!isPending && dialogState.phase === 'confirmation') {
        setDialogState({phase: 'closed'});
      }
    }
  }, [eligible, isPending, dialogState.phase, reset]);

  const previousPhaseRef = useRef(dialogState.phase);
  useEffect(() => {
    if (dialogState.phase === 'closed' && previousPhaseRef.current !== 'closed') {
      const trigger = wrapper.current?.querySelector<HTMLButtonElement>('[data-uie-name="manual-migration-protocol"]');
      (trigger ?? wrapper.current)?.focus();
    }
    previousPhaseRef.current = dialogState.phase;
  }, [dialogState.phase]);

  const dismiss = () => {
    if (!isBusy) {
      reset();
      setDialogState({phase: 'closed'});
    }
  };

  const confirm = async () => {
    if (useManualMigrationStore.getState().pendingConversationIds.has(currentConversation.qualifiedId.id)) {
      return;
    }

    setDialogState({phase: 'running'});
    const outcome = await manuallyMigrateConversation({
      conversation: currentConversation,
      selfUser,
      repository,
      getFeature: () => Maybe.of(teamState.teamFeatures()?.mlsMigration),
      onConversationUpdated: updated => {
        if (isMounted()) {
          setCurrentConversation(updated);
        }
      },
    });

    if (!isMounted()) {
      return;
    }

    setDialogState({
      phase: 'feedback',
      message: outcome.match({
        Ok: () => translate('manualMlsMigrationSuccess'),
        Err: error => {
          const cause = error.cause;
          if (cause.isJust) {
            const backendError = isAxiosError(cause.value) ? cause.value.response?.data : cause.value;
            if (isBackendError(backendError)) {
              return translate(errorHandlerStrings[backendError.label] ?? 'manualMlsMigrationFailure');
            }
          }
          return translate(migrationFailureTranslationKeys[error.reason]);
        },
      }),
    });
  };

  return (
    <div ref={wrapper} tabIndex={-1}>
      <ConversationProtocolDetails
        protocol={currentConversation.protocol}
        cipherSuite={currentConversation.cipherSuite}
        onProtocolActivated={eligible ? activate : undefined}
      />
      {dialogState.phase !== 'closed' && (
        <ModalComponent
          isShown
          onOpened={() => cancelButton.current?.focus()}
          aria-labelledby={titleId}
          aria-busy={dialogState.phase === 'running'}
          wrapperCSS={modalWrapperStyles}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              dismiss();
            }
          }}
        >
          <div css={modalContentStyles}>
            <h2 id={titleId} css={modalTitleStyles}>
              {translate('manualMlsMigrationTitle')}
            </h2>
            <p role="status" css={modalDescriptionStyles}>
              {dialogState.phase === 'feedback'
                ? dialogState.message
                : translate(
                    dialogState.phase === 'running' ? 'manualMlsMigrationProgress' : 'manualMlsMigrationDescription',
                  )}
            </p>
          </div>
          <div css={modalActionsStyles}>
            {dialogState.phase === 'feedback' ? (
              <Button
                ref={element => {
                  element?.focus();
                }}
                css={migrationButtonStyles}
                variant={ButtonVariant.SECONDARY}
                onClick={dismiss}
              >
                {translate('modalAcknowledgeAction')}
              </Button>
            ) : (
              <>
                <Button
                  ref={cancelButton}
                  css={migrationButtonStyles}
                  variant={ButtonVariant.SECONDARY}
                  disabled={isBusy}
                  onClick={dismiss}
                >
                  {translate('modalConfirmSecondary')}
                </Button>
                <Button
                  css={migrationButtonStyles}
                  variant={ButtonVariant.SECONDARY}
                  loadingColor={COLOR.GRAY}
                  disabled={isBusy}
                  showLoading={isBusy}
                  onClick={() => {
                    void confirm();
                  }}
                >
                  {translate('manualMlsMigrationConfirm')}
                </Button>
              </>
            )}
          </div>
        </ModalComponent>
      )}
    </div>
  );
};
