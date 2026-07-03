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

import * as Icon from 'Components/icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {RadioGroup} from 'Components/Radio';
import {SelectText} from 'Components/SelectText';
import {BaseToggle} from 'Components/toggle/BaseToggle';
import {ACCESS_STATE} from 'Repositories/conversation/AccessState';
import {teamPermissionsForAccessState} from 'Repositories/conversation/ConversationAccessPermission';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {copyText} from 'Util/clipboardUtil';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {Config} from '../../../../../Config';

const COPY_LINK_CONFIRM_DURATION = 1500;

enum PasswordPreference {
  PASSWORD_SECURED = 'Password secured',
  NOT_PASSWORD_SECURED = 'Not password secured',
}

interface GuestOptionsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  toggleAccessState: (accessType: number, text: string, hasService: boolean) => void;
  setIsRequestOngoing: (isRequestOngoing: boolean) => void;
  isRequestOngoing?: boolean;
  isTeamStateGuestLinkEnabled?: boolean;
  isToggleDisabled?: boolean;
  isPasswordSupported?: boolean;
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
  isPasswordSupported = false,
  teamState = container.resolve(TeamState),
}) => {
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const {translate} = useApplicationContext();
  const [conversationHasGuestLinkEnabled, setConversationHasGuestLinkEnabled] = useState<boolean>(false);
  const [optionPasswordSecured, setOptionPasswordSecured] = useState<PasswordPreference>(
    PasswordPreference.PASSWORD_SECURED,
  );
  const {accessCode, accessCodeHasPassword, hasGuest, isGuestAndServicesRoom, isGuestRoom, isServicesRoom} =
    useKoSubscribableChildren(activeConversation, [
      'accessCode',
      'accessCodeHasPassword',
      'hasGuest',
      'isGuestAndServicesRoom',
      'isGuestRoom',
      'isServicesRoom',
    ]);

  const inTeam = teamState.isInTeam(activeConversation);

  const isGuestEnabled = isGuestRoom || isGuestAndServicesRoom;
  const isGuestLinkEnabled = inTeam
    ? isTeamStateGuestLinkEnabled
    : isTeamStateGuestLinkEnabled && conversationHasGuestLinkEnabled;
  const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;

  const hasAccessCode: boolean = isGuestEnabled ? accessCode.length !== 0 : false;

  const guestInfoText = useMemo(() => {
    if (!inTeam) {
      return translate('guestRoomToggleInfoDisabled');
    }
    if (accessCodeHasPassword === true) {
      return isGuestEnabled ? (
        <span>
          <span style={{marginBottom: 8, display: 'block'}}>{translate('guestOptionsInfoTextWithPassword')}</span>
          {'\n'}
          <span>{translate('guestOptionsInfoTextForgetPassword')}</span>
        </span>
      ) : (
        translate('guestRoomToggleInfo')
      );
    }
    return isGuestEnabled
      ? translate('guestOptionsInfoText', {brandName: Config.getConfig().BRAND_NAME})
      : translate('guestRoomToggleInfo');
  }, [accessCodeHasPassword, inTeam, isGuestEnabled, translate]);

  const guestLinkDisabledInfo = !isTeamStateGuestLinkEnabled
    ? translate('guestLinkDisabled')
    : translate('guestLinkDisabledByOtherTeam');

  const toggleGuestAccess = async () => {
    await toggleAccessState(
      teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_FEATURES),
      translate('modalConversationRemoveGuestsMessage'),
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
    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        preventClose: true,
        primaryAction: {
          action: async (): Promise<void> => {
            if (!isRequestOngoing) {
              setIsRequestOngoing(true);
              await conversationRepository.stateHandler.revokeAccessCode(activeConversation);
              setIsRequestOngoing(false);
            }
          },
          text: translate('modalConversationRevokeLinkAction'),
        },
        text: {
          message: translate('modalConversationRevokeLinkMessage'),
          title: translate('modalConversationRevokeLinkHeadline'),
        },
      },
      undefined,
      translate,
    );
  };

  const openForcePasswordCopyModal = async (password: string) => {
    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        closeOnConfirm: true,
        preventClose: false,
        primaryAction: {
          action: async () => {
            await copyText(password);
            await requestAccessCode(password);
          },
          text: translate('guestOptionsPasswordCopyToClipboard'),
        },
        text: {
          title: translate('guestOptionsPasswordCopyToClipboard'),
          message: translate('guestOptionsPasswordForceToCopy'),
        },
      },
      undefined,
      translate,
    );
  };

  const createGuestLinkWithPassword = async () => {
    const onCreate = async (password: string, didCopyPassword: boolean) => {
      if (!didCopyPassword) {
        await openForcePasswordCopyModal(password);
        return;
      }
      await requestAccessCode(password);
    };
    PrimaryModal.show(
      PrimaryModal.type.GUEST_LINK_PASSWORD,
      {
        copyPassword: true,
        closeOnConfirm: true,
        preventClose: false,
        primaryAction: {
          action: onCreate,
          text: translate('guestOptionsInfoModalAction'),
        },
        secondaryAction: {
          text: translate('modalConfirmSecondary'),
        },
        text: {
          closeBtnLabel: translate('guestOptionsInfoModalCancel'),
          input: translate('guestOptionsInfoModalFormLabel'),
          message: (
            <>
              {translate('guestOptionsInfoModalTitleSubTitle')}
              {'\n'}
              <span css={{display: 'block'}} className="text-bold-small">
                {translate('guestOptionsInfoModalTitleBoldSubTitle')}
              </span>
            </>
          ),
          title: translate('guestOptionsInfoModalTitle'),
        },
      },
      undefined,
      translate,
    );
  };

  const requestAccessCode = async (password?: string) => {
    if (!isGuestEnabled && !isServicesEnabled) {
      await conversationRepository.stateHandler.changeAccessState(activeConversation, ACCESS_STATE.TEAM.GUEST_ROOM);
    }

    if (!isRequestOngoing) {
      setIsRequestOngoing(true);
      await conversationRepository.stateHandler.requestAccessCode(activeConversation, password);
      setIsRequestOngoing(false);
    }
  };

  const createLink = async () => {
    if (optionPasswordSecured === PasswordPreference.PASSWORD_SECURED) {
      await createGuestLinkWithPassword();
      return;
    }

    await requestAccessCode();
  };

  const updateCode = useCallback(async () => {
    const canUpdateCode = (isGuestRoom || isGuestAndServicesRoom) && accessCode.length === 0 && isGuestLinkEnabled;

    if (canUpdateCode) {
      setIsRequestOngoing(true);
      await conversationRepository.stateHandler.getAccessCode(activeConversation);
      setIsRequestOngoing(false);
    }
  }, [
    accessCode,
    activeConversation,
    conversationRepository.stateHandler,
    isGuestAndServicesRoom,
    isGuestLinkEnabled,
    isGuestRoom,
    setIsRequestOngoing,
  ]);

  const initializeOptions = useCallback(async () => {
    if (!inTeam && !isGuestLinkEnabled) {
      const hasGuestLink = await teamRepository.conversationHasGuestLinkEnabled(activeConversation.id);
      setConversationHasGuestLinkEnabled(hasGuestLink);
    }

    await updateCode();
  }, [activeConversation, inTeam, isGuestLinkEnabled, teamRepository, updateCode]);

  useEffect(() => {
    void initializeOptions();
  }, [initializeOptions]);

  const saveOptionPasswordSecured = (preference: PasswordPreference) => {
    setOptionPasswordSecured(preference);
  };

  return (
    <>
      <div className="guest-options__content">
        <BaseToggle
          isChecked={isGuestEnabled}
          setIsChecked={toggleGuestAccess}
          isDisabled={isToggleDisabled}
          toggleName={translate('guestRoomToggleName')}
          toggleId="guests"
        />
        <p className="guest-options__info-head">
          {hasAccessCode && accessCodeHasPassword === true ? (
            <span style={{display: 'flex', alignItems: 'center', marginBottom: 8}}>
              <Icon.ShieldIcon
                data-uie-name="generate-password-icon"
                width="16"
                height="16"
                css={{marginRight: '10px'}}
              />
              {translate('guestOptionsInfoPasswordSecured')}
            </span>
          ) : (
            translate('guestRoomToggleInfoHead')
          )}
        </p>
        <p className="guest-options__info-text " data-uie-name="status-guest-options-info">
          {guestInfoText}
        </p>
      </div>

      {isGuestEnabled && (
        <>
          {isGuestLinkEnabled && (
            <>
              {hasAccessCode && (
                <>
                  <SelectText text={accessCode} className="guest-options__link" dataUieName="status-invite-link" />

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
                        <Icon.CopyIcon />
                      </span>

                      <span className="panel__action-item__text">{translate('guestOptionsCopyLink')}</span>
                    </span>

                    <span className="panel__action-item__alternative">
                      <span className="panel__action-item__icon">
                        <Icon.CheckIcon />
                      </span>

                      <span className="panel__action-item__text" data-uie-name="status-copy-link-done">
                        {translate('guestOptionsCopyLinkDone')}
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
                      <Icon.CloseIcon />
                    </span>

                    <span className="panel__action-item__text" data-uie-name="do-revoke-link">
                      {translate('guestOptionsRevokeLink')}
                    </span>
                  </button>
                </>
              )}

              {!hasAccessCode && !isPasswordSupported && (
                <div className="guest-options__content">
                  <Button
                    disabled={isRequestOngoing}
                    variant={ButtonVariant.TERTIARY}
                    onClick={() => requestAccessCode()}
                    data-uie-name="do-create-link"
                  >
                    <Icon.LinkIcon width="16" height="16" css={{marginRight: '10px'}} />
                    {translate('guestOptionsCreateLink')}
                  </Button>
                </div>
              )}

              {!hasAccessCode && isPasswordSupported && (
                <>
                  <div className="guest-options__password-radio">
                    <p className="guest-options__info-text">{translate('guestOptionsInfoTextSecureWithPassword')}</p>
                    <RadioGroup
                      ariaLabelledBy={translate('guestOptionsPasswordRadioLabel')}
                      name="guest-links-password"
                      selectedValue={optionPasswordSecured}
                      onChange={saveOptionPasswordSecured}
                      options={[
                        {
                          label: translate('guestOptionsPasswordRadioOptionSecured'),
                          value: PasswordPreference.PASSWORD_SECURED,
                        },
                        {
                          label: translate('guestOptionsPasswordRadioOptionNotSecured'),
                          value: PasswordPreference.NOT_PASSWORD_SECURED,
                        },
                      ]}
                    />
                  </div>
                  <div className="guest-options__content">
                    <Button
                      disabled={isRequestOngoing}
                      variant={ButtonVariant.TERTIARY}
                      onClick={createLink}
                      data-uie-name="do-create-link"
                    >
                      <Icon.LinkIcon width="16" height="16" css={{marginRight: '10px'}} />
                      {translate('guestOptionsCreateLink')}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {!isGuestLinkEnabled && (
            <div className="panel__action-item--info">
              <span className="panel__action-item__icon--info">
                <Icon.InfoIcon />
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
