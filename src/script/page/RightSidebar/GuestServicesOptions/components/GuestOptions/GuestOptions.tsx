/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC, useCallback, useEffect, useMemo, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CopyToClipboard} from 'Components/CopyToClipboard';
import {Icon} from 'Components/Icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {BaseToggle} from 'Components/toggle/BaseToggle';
import {TeamState} from 'src/script/team/TeamState';
import {copyText} from 'Util/ClipboardUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../../../../Config';
import {ACCESS_STATE} from '../../../../../conversation/AccessState';
import {teamPermissionsForAccessState} from '../../../../../conversation/ConversationAccessPermission';
import {ConversationRepository} from '../../../../../conversation/ConversationRepository';
import {Conversation} from '../../../../../entity/Conversation';
import {TeamRepository} from '../../../../../team/TeamRepository';

const COPY_LINK_CONFIRM_DURATION = 1500;

interface GuestOptionsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  toggleAccessState: (accessType: number, text: string, hasService: boolean) => void;
  setIsRequestOngoing: (isRequestOngoing: boolean) => void;
  isRequestOngoing?: boolean;
  isTeamStateGuestLinkEnabled?: boolean;
  isToggleDisabled?: boolean;
  teamState?: TeamState;
}

const GuestOptions: FC<GuestOptionsProps> = ({
  activeConversation,
  conversationRepository,
  teamRepository,
  toggleAccessState,
  setIsRequestOngoing,
  isRequestOngoing = false,
  isTeamStateGuestLinkEnabled = false,
  isToggleDisabled = false,
  teamState = container.resolve(TeamState),
}) => {
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const [conversationHasGuestLinkEnabled, setConversationHasGuestLinkEnabled] = useState<boolean>(false);

  const {accessCode, hasGuest, isGuestAndServicesRoom, isGuestRoom, isServicesRoom} = useKoSubscribableChildren(
    activeConversation,
    ['accessCode', 'hasGuest', 'isGuestAndServicesRoom', 'isGuestRoom', 'isServicesRoom'],
  );
  const inTeam = teamState.isInTeam(activeConversation);

  const isGuestEnabled = isGuestRoom || isGuestAndServicesRoom;
  const isGuestLinkEnabled = inTeam
    ? isTeamStateGuestLinkEnabled
    : isTeamStateGuestLinkEnabled && conversationHasGuestLinkEnabled;
  const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;

  const hasAccessCode = isGuestEnabled ? accessCode : false;

  const guestInfoText = useMemo(() => {
    if (!inTeam) {
      return t('guestRoomToggleInfoDisabled');
    }

    return isGuestEnabled ? t('guestOptionsInfoText', Config.getConfig().BRAND_NAME) : t('guestRoomToggleInfo');
  }, [inTeam, isGuestEnabled]);

  const guestLinkDisabledInfo = !conversationHasGuestLinkEnabled
    ? t('guestLinkDisabledByOtherTeam')
    : t('guestLinkDisabled');

  const toggleGuestAccess = async () => {
    await toggleAccessState(
      teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_FEATURES),
      t('modalConversationRemoveGuestsMessage'),
      hasGuest,
    );
  };

  const copyLink = async () => {
    if (!isLinkCopied) {
      await copyText(accessCode);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), COPY_LINK_CONFIRM_DURATION);
    }
  };

  const revokeAccessCode = () => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: async (): Promise<void> => {
          if (!isRequestOngoing) {
            setIsRequestOngoing(true);
            await conversationRepository.stateHandler.revokeAccessCode(activeConversation);
            setIsRequestOngoing(false);
          }
        },
        text: t('modalConversationRevokeLinkAction'),
      },
      text: {
        message: t('modalConversationRevokeLinkMessage'),
        title: t('modalConversationRevokeLinkHeadline'),
      },
    });
  };

  const requestAccessCode = async () => {
    if (!isGuestEnabled && !isServicesEnabled) {
      await conversationRepository.stateHandler.changeAccessState(activeConversation, ACCESS_STATE.TEAM.GUEST_ROOM);
    }

    if (!isRequestOngoing) {
      setIsRequestOngoing(true);
      await conversationRepository.stateHandler.requestAccessCode(activeConversation);
      setIsRequestOngoing(false);
    }
  };

  const updateCode = useCallback(async () => {
    const canUpdateCode = (isGuestRoom || isGuestAndServicesRoom) && !accessCode && isGuestLinkEnabled;

    if (canUpdateCode) {
      setIsRequestOngoing(true);
      await conversationRepository.stateHandler.getAccessCode(activeConversation);
      setIsRequestOngoing(false);
    }
  }, [accessCode, activeConversation, isGuestAndServicesRoom, isGuestLinkEnabled, isGuestRoom, setIsRequestOngoing]);

  const initializeOptions = useCallback(async () => {
    if (!inTeam && !isGuestLinkEnabled) {
      const hasGuestLink = await teamRepository.conversationHasGuestLinkEnabled(activeConversation.id);
      setConversationHasGuestLinkEnabled(hasGuestLink);
    }

    await updateCode();
  }, [activeConversation, inTeam, isGuestLinkEnabled, updateCode]);

  useEffect(() => {
    initializeOptions();
  }, [initializeOptions]);

  return (
    <>
      <div className="guest-options__content">
        <BaseToggle
          isChecked={isGuestEnabled}
          setIsChecked={toggleGuestAccess}
          isDisabled={isToggleDisabled}
          toggleName={t('guestRoomToggleName')}
          toggleId="guests"
        />

        <p className="guest-options__info-head">{t('guestRoomToggleInfoHead')}</p>

        <p className="guest-options__info-text" data-uie-name="status-guest-options-info">
          {guestInfoText}
        </p>
      </div>

      {isGuestEnabled && (
        <>
          {isGuestLinkEnabled && (
            <>
              {hasAccessCode && (
                <>
                  <CopyToClipboard text={accessCode} className="guest-options__link" dataUieName="status-invite-link" />

                  <button
                    className={cx('panel__action-item panel__action-item--link panel__action-item--alternate', {
                      'panel__action-item--show-alternative': isLinkCopied,
                    })}
                    type="button"
                    onClick={copyLink}
                    data-uie-name="do-copy-link"
                  >
                    <span className="panel__action-item__default">
                      <span className="panel__action-item__icon">
                        <Icon.Copy />
                      </span>

                      <span className="panel__action-item__text">{t('guestOptionsCopyLink')}</span>
                    </span>

                    <span className="panel__action-item__alternative">
                      <span className="panel__action-item__icon">
                        <Icon.Check />
                      </span>

                      <span className="panel__action-item__text" data-uie-name="status-copy-link-done">
                        {t('guestOptionsCopyLinkDone')}
                      </span>
                    </span>
                  </button>

                  <button
                    className="panel__action-item panel__action-item--link"
                    type="button"
                    disabled={isRequestOngoing}
                    onClick={revokeAccessCode}
                  >
                    <span className="panel__action-item__icon">
                      <Icon.Close />
                    </span>

                    <span className="panel__action-item__text" data-uie-name="do-revoke-link">
                      {t('guestOptionsRevokeLink')}
                    </span>
                  </button>
                </>
              )}

              {!hasAccessCode && (
                <div className="guest-options__content">
                  <Button
                    disabled={isRequestOngoing}
                    variant={ButtonVariant.TERTIARY}
                    onClick={requestAccessCode}
                    data-uie-name="do-create-link"
                  >
                    <Icon.Link width="16" height="16" css={{marginRight: '10px'}} />
                    {t('guestOptionsCreateLink')}
                  </Button>
                </div>
              )}
            </>
          )}

          {!isGuestLinkEnabled && (
            <div className="panel__action-item--info">
              <span className="panel__action-item__icon--info">
                <Icon.Info />
              </span>

              <p className="panel__action-item__text--info" data-uie-name="guest-link-disabled-info">
                {guestLinkDisabledInfo}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
};

export {GuestOptions};
