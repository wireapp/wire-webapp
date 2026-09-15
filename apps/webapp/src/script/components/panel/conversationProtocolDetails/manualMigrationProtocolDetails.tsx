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

import {ConversationProtocolDetails} from './conversationProtocolDetails';
import {
  migrationButtonStyles,
  modalWrapperStyles,
  modalContentStyles,
  modalTitleStyles,
  modalDescriptionStyles,
  modalActionsStyles,
} from './manualMigrationProtocolDetails.styles';

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
  const [current, setCurrent] = useState(conversation);
  const [dialog, setDialog] = useState<MigrationDialogState>({phase: 'closed'});
  const isPending = useManualMigrationStore(state => state.pendingConversationIds.has(conversation.qualifiedId.id));
  const isBusy = isPending || dialog.phase === 'running';
  const taps = useRef(0);
  const mounted = useRef(true);
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const {teamFeatures} = useKoSubscribableChildren(teamState, ['teamFeatures']);
  useKoSubscribableChildren(current, ['isSelfUserRemoved', 'isGroupOrChannel']);
  const eligible = canManuallyMigrateConversation(current, selfUser, Maybe.of(teamFeatures?.mlsMigration));

  useEffect(() => {
    setCurrent(conversation);
  }, [conversation]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!eligible) {
      taps.current = 0;
      if (!isPending && dialog.phase === 'confirmation') {
        setDialog({phase: 'closed'});
      }
    }
  }, [eligible, isPending, dialog.phase]);

  useEffect(() => {
    const resetOnOtherClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-uie-name="manual-migration-protocol"]')) {
        taps.current = 0;
      }
    };
    document.addEventListener('click', resetOnOtherClick, true);
    return () => document.removeEventListener('click', resetOnOtherClick, true);
  }, []);

  const dismiss = () => {
    if (!isBusy) {
      taps.current = 0;
      setDialog({phase: 'closed'});
      wrapper.current?.focus();
    }
  };

  const activate = () => {
    if (!eligible || isBusy || dialog.phase !== 'closed') {
      return;
    }
    taps.current += 1;
    if (taps.current === REQUIRED_PROTOCOL_ACTIVATIONS) {
      taps.current = 0;
      setDialog({phase: 'confirmation'});
    }
  };

  const confirm = async () => {
    if (useManualMigrationStore.getState().pendingConversationIds.has(current.qualifiedId.id)) {
      return;
    }

    setDialog({phase: 'running'});
    const outcome = await manuallyMigrateConversation({
      conversation: current,
      selfUser,
      repository,
      getFeature: () => Maybe.of(teamState.teamFeatures()?.mlsMigration),
      onConversationUpdated: updated => {
        if (mounted.current) {
          setCurrent(updated);
        }
      },
    });

    if (!mounted.current) {
      return;
    }

    setDialog({
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
    <div ref={wrapper}>
      <ConversationProtocolDetails
        protocol={current.protocol}
        cipherSuite={current.cipherSuite}
        onProtocolActivated={eligible ? activate : undefined}
      />
      {dialog.phase !== 'closed' && (
        <ModalComponent
          isShown
          onOpened={() => cancelButton.current?.focus()}
          aria-labelledby={titleId}
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
              {dialog.phase === 'feedback' ? dialog.message : translate('manualMlsMigrationDescription')}
            </p>
          </div>
          <div css={modalActionsStyles}>
            {dialog.phase === 'feedback' ? (
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
