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

import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react';

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/ConversationReceiptModeUpdateData';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';
import {isNonFederatingBackendsError} from '@wireapp/core/lib/errors';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {Button, ButtonVariant, Option, Select} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {SearchInput} from 'Components/SearchInput';
import {TextInput} from 'Components/TextInput';
import {InfoToggle} from 'Components/toggle/InfoToggle';
import {UserSearchableList} from 'Components/UserSearchableList';
import {ACCESS_STATE} from 'Repositories/conversation/AccessState';
import {
  ACCESS_TYPES,
  teamPermissionsForAccessState,
  toggleFeature,
} from 'Repositories/conversation/ConversationAccessPermission';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from 'src/script/router/routerBindings';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleEnterDown, handleEscDown, isKeyboardEvent} from 'Util/KeyboardUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {Config} from '../../../Config';
import {isProtocolOption, ProtocolOption} from '../../../guards/Protocol';
import {RootContext} from '../../../page/RootProvider';
import {PrimaryModal} from '../PrimaryModal';

interface GroupCreationModalProps {
  userState?: UserState;
  teamState?: TeamState;
}
enum GroupCreationModalState {
  DEFAULT = 'GroupCreationModal.STATE.DEFAULT',
  PARTICIPANTS = 'GroupCreationModal.STATE.PARTICIPANTS',
  PREFERENCES = 'GroupCreationModal.STATE.PREFERENCES',
}

const GroupCreationModal: React.FC<GroupCreationModalProps> = ({
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}) => {
  const {
    isTeam,
    isMLSEnabled: isMLSEnabledForTeam,
    isProtocolToggleEnabledForUser,
    isCellsEnabled: isCellsEnabledForTeam,
  } = useKoSubscribableChildren(teamState, [
    'isTeam',
    'isMLSEnabled',
    'isProtocolToggleEnabledForUser',
    'isCellsEnabled',
  ]);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const enableMLSToggle = isMLSEnabledForTeam && isProtocolToggleEnabledForUser;

  //if feature flag is set to false or mls is disabled for current team use proteus as default
  const defaultProtocol = isMLSEnabledForTeam
    ? teamState.teamFeatures()?.mls?.config.defaultProtocol
    : ConversationProtocol.PROTEUS;

  const protocolOptions: ProtocolOption[] = ([ConversationProtocol.PROTEUS, ConversationProtocol.MLS] as const).map(
    protocol => ({
      label: `${t(`modalCreateGroupProtocolSelect.${protocol}`)}${
        protocol === defaultProtocol ? t(`modalCreateGroupProtocolSelect.default`) : ''
      }`,
      value: protocol,
    }),
  );

  const initialProtocol = protocolOptions.find(protocol => protocol.value === defaultProtocol)!;

  //both environment feature flag and team feature flag must be enabled to create conversations with cells
  const isCellsEnabledForEnvironment = Config.getConfig().FEATURE.ENABLE_CELLS;
  const enableCellsToggle = isCellsEnabledForEnvironment && isCellsEnabledForTeam;
  const [isCellsOptionEnabled, setIsCellsOptionEnabled] = useState(enableCellsToggle);
  const isCellsEnabledForGroup = isCellsEnabledForEnvironment && isCellsOptionEnabled;

  const [isShown, setIsShown] = useState<boolean>(false);
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [enableReadReceipts, setEnableReadReceipts] = useState<boolean>(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolOption>(initialProtocol);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState<boolean>(false);
  const [accessState, setAccessState] = useState<ACCESS_STATE>(ACCESS_STATE.TEAM.GUESTS_SERVICES);
  const [nameError, setNameError] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [participantsInput, setParticipantsInput] = useState<string>('');
  const [groupCreationState, setGroupCreationState] = useState<GroupCreationModalState>(
    GroupCreationModalState.DEFAULT,
  );

  const mainViewModel = useContext(RootContext);

  useEffect(() => {
    const showCreateGroup = (_: string, userEntity: User) => {
      setEnableReadReceipts(isTeam);
      setIsShown(true);
      setGroupCreationState(GroupCreationModalState.PREFERENCES);

      if (userEntity) {
        setSelectedContacts([...selectedContacts, userEntity]);
      }
    };

    amplify.subscribe(WebAppEvents.CONVERSATION.CREATE_GROUP, showCreateGroup);
  }, []);

  useEffect(() => {
    setSelectedProtocol(protocolOptions.find(protocol => protocol.value === selectedProtocol.value)!);
  }, [defaultProtocol]);

  const stateIsPreferences = groupCreationState === GroupCreationModalState.PREFERENCES;
  const stateIsParticipants = groupCreationState === GroupCreationModalState.PARTICIPANTS;
  const isServicesRoom = accessState === ACCESS_STATE.TEAM.SERVICES;
  const isGuestAndServicesRoom = accessState === ACCESS_STATE.TEAM.GUESTS_SERVICES;
  const isGuestRoom = accessState === ACCESS_STATE.TEAM.GUEST_ROOM;
  const isGuestEnabled = isGuestRoom || isGuestAndServicesRoom;
  const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;

  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const contacts = useMemo(() => {
    if (showContacts) {
      if (!isTeam) {
        return userState.connectedUsers();
      }

      if (isGuestEnabled) {
        return teamState.teamUsers();
      }

      return teamState.teamMembers().sort(sortUsersByPriority);
    }
    return [];
  }, [isGuestEnabled, isTeam, showContacts, teamState, userState]);

  const filteredContacts = contacts.filter(user => user.isAvailable());

  const handleEscape = useCallback(
    (event: React.KeyboardEvent<HTMLElement> | KeyboardEvent): void => {
      handleEscDown(event, () => {
        if (stateIsPreferences) {
          setIsShown(false);
        }
      });
    },
    [setIsShown, stateIsPreferences],
  );

  useEffect(() => {
    let timerId: number;
    if (stateIsParticipants) {
      timerId = window.setTimeout(() => setShowContacts(true));
    } else {
      setShowContacts(false);
    }
    return () => {
      window.clearTimeout(timerId);
    };
  }, [stateIsParticipants]);

  if (!mainViewModel) {
    return null;
  }

  const {content: contentViewModel} = mainViewModel;
  const {
    conversation: conversationRepository,
    search: searchRepository,
    team: teamRepository,
  } = contentViewModel.repositories;

  const maxNameLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
  const maxSize = ConversationRepository.CONFIG.GROUP.MAX_SIZE;

  const onClose = () => {
    setIsCreatingConversation(false);
    setNameError('');
    setGroupName('');
    setParticipantsInput('');
    setSelectedContacts([]);
    setGroupCreationState(GroupCreationModalState.DEFAULT);
    setAccessState(ACCESS_STATE.TEAM.GUESTS_SERVICES);
  };

  const clickOnCreate = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLInputElement>,
  ): Promise<void> => {
    if (!isCreatingConversation) {
      setIsCreatingConversation(true);

      try {
        const conversation = await conversationRepository.createGroupConversation(
          selectedContacts,
          groupName,
          isTeam ? accessState : undefined,
          {
            protocol: enableMLSToggle ? selectedProtocol.value : defaultProtocol,
            receipt_mode: enableReadReceipts ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF,
            cells: isCellsEnabledForGroup,
          },
        );

        setCurrentSidebarTab(SidebarTabs.RECENT);

        if (isKeyboardEvent(event)) {
          createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
        } else {
          createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
        }
      } catch (error) {
        if (isNonFederatingBackendsError(error)) {
          const tempName = groupName;
          setIsShown(false);

          const backendString = error.backends.join(', and ');
          const replaceBackends = replaceLink(
            Config.getConfig().URL.SUPPORT.NON_FEDERATING_INFO,
            'modal__text__read-more',
            'read-more-backends',
          );
          return PrimaryModal.show(PrimaryModal.type.MULTI_ACTIONS, {
            preventClose: true,
            primaryAction: {
              text: t('groupCreationPreferencesNonFederatingEditList'),
              action: () => {
                setGroupName(tempName);
                setIsShown(true);
                setIsCreatingConversation(false);
                setGroupCreationState(GroupCreationModalState.PARTICIPANTS);
              },
            },
            secondaryAction: {
              text: t('groupCreationPreferencesNonFederatingLeave'),
              action: () => {
                setIsCreatingConversation(false);
              },
            },
            text: {
              htmlMessage: t(
                'groupCreationPreferencesNonFederatingMessage',
                {backends: backendString},
                replaceBackends,
              ),
              title: t('groupCreationPreferencesNonFederatingHeadline'),
            },
          });
        }
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, undefined, {});
        setIsCreatingConversation(false);
      }

      setIsShown(false);
    }
  };

  const onGroupNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = event.target;

    const trimmedNameInput = value.trim();
    const nameTooLong = trimmedNameInput.length > maxNameLength;
    const nameTooShort = !trimmedNameInput.length;

    setGroupName(value);
    if (nameTooLong) {
      return setNameError(t('groupCreationPreferencesErrorNameLong'));
    }

    if (nameTooShort) {
      return setNameError(t('groupCreationPreferencesErrorNameShort'));
    }
    setNameError('');
  };

  const onProtocolChange = (option: Option | null) => {
    if (!isProtocolOption(option)) {
      return;
    }

    setSelectedProtocol(option);

    if (
      (option.value === ConversationProtocol.MLS && isServicesEnabled) ||
      (option.value === ConversationProtocol.PROTEUS && !isServicesEnabled)
    ) {
      clickOnToggleServicesMode();
    }
  };

  const groupNameLength = groupName.length;

  const hasNameError = nameError.length > 0;

  const clickOnNext = (): void => {
    const nameTooLong = groupNameLength > maxNameLength;

    if (groupNameLength && !nameTooLong) {
      setGroupCreationState(GroupCreationModalState.PARTICIPANTS);
    }
  };

  const clickOnToggle = (feature: number): void => {
    const newAccessState = toggleFeature(feature, accessState);
    setAccessState(newAccessState);
  };
  const clickOnToggleServicesMode = () => clickOnToggle(ACCESS_TYPES.SERVICE);
  const clickOnToggleGuestMode = () => clickOnToggle(teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_FEATURES));
  const clickOnBack = (): void => {
    setGroupCreationState(GroupCreationModalState.PREFERENCES);
  };

  const participantsActionText = selectedContacts.length
    ? t('groupCreationParticipantsActionCreate')
    : t('groupCreationParticipantsActionSkip');
  const isInputValid = groupNameLength && !nameError.length;

  return (
    <ModalComponent
      id="group-creation-modal"
      className="group-creation__modal"
      wrapperCSS={{overflow: 'unset', overflowY: 'unset'}}
      isShown={isShown}
      onClosed={onClose}
      data-uie-name="group-creation-label"
      onKeyDown={stateIsPreferences ? handleEscape : undefined}
    >
      <div className="modal__header modal__header--list">
        {stateIsParticipants && (
          <>
            <button
              className="button-reset-default"
              type="button"
              onClick={clickOnBack}
              aria-label={t('accessibility.groupCreationParticipantsActionBack')}
              data-uie-name="go-back"
            >
              <Icon.ArrowLeftIcon aria-hidden="true" className="modal__header__button" />
            </button>

            <h2 id="group-creation-label" className="modal__header__title" data-uie-name="status-people-selected">
              {selectedContacts.length
                ? t('groupCreationParticipantsHeaderWithCounter', {number: selectedContacts.length})
                : t('groupCreationParticipantsHeader')}
            </h2>

            <Button
              className="enabled accent-text"
              css={{marginBottom: 0}}
              type="button"
              onClick={clickOnCreate}
              aria-label={participantsActionText}
              data-uie-name="do-create-group"
              variant={ButtonVariant.TERTIARY}
            >
              {participantsActionText}
            </Button>
          </>
        )}
        {stateIsPreferences && (
          <>
            <button
              className="button-reset-default"
              type="button"
              onClick={() => setIsShown(false)}
              aria-label={t('accessibility.groupCreationActionCloseModal')}
              data-uie-name="do-close"
            >
              <Icon.CloseIcon aria-hidden="true" className="modal__header__button" />
            </button>

            <h2 id="group-creation-label" className="modal__header__title">
              {t('groupCreationPreferencesHeader')}
            </h2>

            <Button
              id="group-go-next"
              className={cx({
                'accent-text': groupNameLength,
                enabled: isInputValid,
              })}
              css={{marginBottom: 0}}
              disabled={!isInputValid}
              type="button"
              onClick={clickOnNext}
              aria-label={t('groupCreationPreferencesAction')}
              data-uie-name="go-next"
              variant={ButtonVariant.TERTIARY}
            >
              {t('groupCreationPreferencesAction')}
            </Button>
          </>
        )}
      </div>
      <FadingScrollbar className="modal__body">
        {stateIsParticipants && (
          <SearchInput
            input={participantsInput}
            setInput={setParticipantsInput}
            selectedUsers={selectedContacts}
            placeholder={t('groupCreationParticipantsPlaceholder')}
            onEnter={clickOnCreate}
          />
        )}

        {stateIsParticipants && selfUser && (
          <FadingScrollbar className="group-creation__list">
            <UserSearchableList
              selfUser={selfUser}
              users={filteredContacts}
              filter={participantsInput}
              selected={selectedContacts}
              isSelectable
              onUpdateSelectedUsers={setSelectedContacts}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              conversationRepository={conversationRepository}
              noUnderline
              allowRemoteSearch
              filterRemoteTeamUsers
            />
          </FadingScrollbar>
        )}

        {/* eslint jsx-a11y/no-autofocus : "off" */}
        {stateIsPreferences && (
          <>
            <div className="modal-input-wrapper">
              <TextInput
                autoFocus
                label={t('groupCreationPreferencesPlaceholder')}
                placeholder={t('groupCreationPreferencesPlaceholder')}
                uieName="enter-group-name"
                name="enter-group-name"
                errorUieName="error-group-name"
                onCancel={() => setGroupName('')}
                onChange={onGroupNameChange}
                onBlur={event => {
                  const {value} = event.target as HTMLInputElement;
                  const trimmedName = value.trim();
                  setGroupName(trimmedName);
                }}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  handleEnterDown(event, clickOnNext);
                }}
                value={groupName}
                isError={hasNameError}
                errorMessage={nameError}
              />
            </div>

            {isTeam && (
              <>
                <p
                  className="modal__info"
                  style={{visibility: hasNameError ? 'hidden' : 'visible'}}
                  data-uie-name="status-group-size-info"
                >
                  {t('groupSizeInfo', {count: maxSize})}
                </p>
                <hr className="group-creation__modal__separator" />
                <InfoToggle
                  className="modal-style"
                  dataUieName="guests"
                  isChecked={isGuestEnabled}
                  setIsChecked={clickOnToggleGuestMode}
                  isDisabled={false}
                  name={t('guestOptionsTitle')}
                  info={t('guestRoomToggleInfo')}
                />
                {selectedProtocol.value !== ConversationProtocol.MLS && (
                  <InfoToggle
                    className="modal-style"
                    dataUieName="services"
                    isChecked={isServicesEnabled}
                    setIsChecked={clickOnToggleServicesMode}
                    isDisabled={false}
                    name={t('servicesOptionsTitle')}
                    info={t('servicesRoomToggleInfo')}
                  />
                )}
                <InfoToggle
                  className="modal-style"
                  dataUieName="read-receipts"
                  info={t('readReceiptsToggleInfo')}
                  isChecked={enableReadReceipts}
                  setIsChecked={setEnableReadReceipts}
                  isDisabled={false}
                  name={t('readReceiptsToggleName')}
                />
                {enableCellsToggle && (
                  <InfoToggle
                    className="modal-style"
                    dataUieName="cells"
                    isChecked={isCellsOptionEnabled}
                    setIsChecked={setIsCellsOptionEnabled}
                    isDisabled={false}
                    name={t('modalCreateGroupCellsToggleHeading')}
                    info={t('modalCreateGroupCellsToggleInfo')}
                  />
                )}
                {enableMLSToggle && (
                  <>
                    <Select
                      id="select-protocol"
                      onChange={onProtocolChange}
                      dataUieName="select-protocol"
                      options={protocolOptions}
                      value={selectedProtocol}
                      label={t('modalCreateGroupProtocolHeading')}
                      menuPosition="absolute"
                      wrapperCSS={{marginBottom: 0}}
                    />
                    <p className="modal__info" data-uie-name="status-group-protocol-info">
                      {t('modalCreateGroupProtocolInfo')}
                    </p>
                  </>
                )}
                <br />
              </>
            )}
          </>
        )}
      </FadingScrollbar>
    </ModalComponent>
  );
};

export {GroupCreationModal};
