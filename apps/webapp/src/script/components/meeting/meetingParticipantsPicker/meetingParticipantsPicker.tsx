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

import {useId} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {Button, Popover} from 'react-aria-components';

import {ChevronDownIcon, getOverlayPortalContainer, InputLabel, SearchIcon} from '@wireapp/react-ui-kit';

import {UserSearchableList} from 'Components/UserSearchableList';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {User} from 'Repositories/entity/User';
import type {SearchRepository} from 'Repositories/search/searchRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import type {TeamState} from 'Repositories/team/TeamState';
import {meetingsM2FeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {formatParticipantsFieldLabel} from './formatParticipantsFieldLabel';
import {MeetingConversationsSearchableList} from './meetingConversationsSearchableList';
import {
  chevronButtonStyles,
  chevronIconStyles,
  controlStyles,
  dialogStyles,
  listContainerStyles,
  popoverOverlayStyles,
  popoverStyles,
  searchIconStyles,
  searchInputStyles,
  valueContainerStyles,
  wrapperStyles,
} from './meetingParticipantsPicker.styles';
import {useMeetingParticipantsPicker} from './useMeetingParticipantsPicker';

export interface MeetingParticipantsPickerProps {
  id: string;
  dataUieName?: string;
  users: User[];
  selectedUsers: User[];
  onSelectedUsersChange: (users: User[]) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  selfUser: User;
  searchRepository: Pick<SearchRepository, 'normalizeQuery' | 'searchByName' | 'searchUserInSet'>;
  teamRepository: Pick<TeamRepository, 'filterExternals' | 'filterRemoteDomainUsers' | 'isSelfConnectedTo'>;
  conversationRepository?: ConversationRepository;
  conversationState?: Pick<ConversationState, 'hasConversationWith'>;
  teamState?: Pick<TeamState, 'isInTeam'>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  markInvalid?: boolean;
  required?: boolean;
  noUnderline?: boolean;
  popoverPortalContainer?: HTMLElement;
}

export const MeetingParticipantsPicker = ({
  id,
  dataUieName,
  users,
  selectedUsers,
  onSelectedUsersChange,
  filter,
  onFilterChange,
  selfUser,
  searchRepository,
  teamRepository,
  conversationRepository,
  conversationState,
  teamState,
  label,
  placeholder,
  disabled = false,
  markInvalid = false,
  required = false,
  noUnderline = false,
  popoverPortalContainer,
}: MeetingParticipantsPickerProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const listboxId = useId();
  const portalContainer = popoverPortalContainer ?? getOverlayPortalContainer();

  const fieldLabel = isNonEmptyString(label)
    ? formatParticipantsFieldLabel(label, selectedUsers.length, translate)
    : undefined;
  const searchPlaceholder = placeholder ?? translate('meetings.scheduleModal.participantsPlaceholder');
  const showPlaceholder = filter.length === 0;
  const meetingsM2Enabled = isFeatureToggleEnabled(meetingsM2FeatureToggleName);
  const {
    handleOpenChange,
    handleSelectedUsersChange,
    handleSelectConversation,
    isConversationsOpen,
    isOpen,
    matchingConversations,
    popoverRef,
    selectedConversationIds,
    setIsConversationsOpen,
    triggerRef,
  } = useMeetingParticipantsPicker({
    disabled,
    filter,
    selectedUsers,
    onSelectedUsersChange,
    onFilterChange,
    conversationRepository,
    meetingsM2Enabled,
  });

  return (
    <div css={wrapperStyles} data-uie-name={dataUieName}>
      {isNonEmptyString(fieldLabel) && (
        <InputLabel htmlFor={id} markInvalid={markInvalid} isRequired={required}>
          {fieldLabel}
        </InputLabel>
      )}

      <div
        ref={triggerRef}
        css={controlStyles({isDisabled: disabled, isOpen, markInvalid})}
        data-uie-name={dataUieName ? `${dataUieName}-control` : undefined}
        data-disabled={disabled || undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
      >
        <div css={valueContainerStyles}>
          <SearchIcon aria-hidden="true" css={searchIconStyles} />
          <input
            id={id}
            css={searchInputStyles}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            value={filter}
            disabled={disabled}
            placeholder={showPlaceholder ? searchPlaceholder : ''}
            aria-label={isNonEmptyString(fieldLabel) ? undefined : searchPlaceholder}
            data-uie-name={dataUieName ? `${dataUieName}-input` : undefined}
            onChange={event => {
              onFilterChange(event.target.value);
              if (!isOpen) {
                handleOpenChange(true);
              }
            }}
            onFocus={() => {
              if (!disabled) {
                handleOpenChange(true);
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                handleOpenChange(false);
              }
            }}
          />
        </div>
        <Button
          css={chevronButtonStyles}
          isDisabled={disabled}
          aria-label={fieldLabel ?? searchPlaceholder}
          data-uie-name={dataUieName ? `${dataUieName}-toggle` : undefined}
          onPress={() => handleOpenChange(!isOpen)}
        >
          <ChevronDownIcon aria-hidden="true" width={16} height={16} css={chevronIconStyles(isOpen)} />
        </Button>
      </div>

      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        isNonModal
        css={popoverStyles}
        style={popoverOverlayStyles}
        placement="bottom start"
        offset={4}
        UNSTABLE_portalContainer={portalContainer}
      >
        <div css={dialogStyles} aria-label={fieldLabel ?? searchPlaceholder}>
          <div
            id={listboxId}
            css={listContainerStyles}
            data-uie-name={dataUieName ? `dropdown-${dataUieName}` : undefined}
            role="listbox"
            aria-multiselectable="true"
          >
            <UserSearchableList
              selfUser={selfUser}
              users={users}
              filter={filter}
              selected={selectedUsers}
              isSelectable
              onUpdateSelectedUsers={handleSelectedUsersChange}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              conversationRepository={meetingsM2Enabled ? conversationRepository : undefined}
              conversationState={conversationState}
              teamState={teamState}
              noUnderline={noUnderline}
              allowRemoteSearch
              filterRemoteTeamUsers
              showAllProvidedUsers
              hideEmptyState={meetingsM2Enabled && matchingConversations.length > 0}
              showSelectedUsersRegardlessOfFilter
              dataUieName={dataUieName ? `${dataUieName}-list` : undefined}
            />
            <MeetingConversationsSearchableList
              id={id}
              conversations={matchingConversations}
              selectedConversationIds={selectedConversationIds}
              onSelectConversation={handleSelectConversation}
              isOpen={isConversationsOpen}
              onOpenChange={setIsConversationsOpen}
              noUnderline={noUnderline}
              dataUieName={dataUieName ? `${dataUieName}-conversation-dropdown` : undefined}
            />
          </div>
        </div>
      </Popover>
    </div>
  );
};
