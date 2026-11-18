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

import {useId, type FunctionComponent} from 'react';

import {isNonEmptyString, isUndefined} from '@sindresorhus/is';
import {Button, Popover} from 'react-aria-components';

import {formatParticipantsFieldLabel} from './formatParticipantsFieldLabel';
import {MeetingConversationsSearchableList} from './meetingConversationsSearchableList';
import {
  chevronButtonStyles,
  chevronIconStyles,
  controlStyles,
  dialogStyles,
  emailErrorStyles,
  inviteByEmailActionStyles,
  listContainerStyles,
  popoverOverlayStyles,
  popoverStyles,
  searchIconStyles,
  searchInputStyles,
  triggerWrapperStyles,
  valueContainerStyles,
  wrapperStyles,
} from './meetingParticipantsPicker.styles';
import {isAllowedMeetingParticipant} from './participantPickerUtils';
import {SelectedEmailInvitee} from './selectedEmailInvitee';
import {useMeetingEmailInvitees} from './useMeetingEmailInvitees';
import {useMeetingParticipantsPicker} from './useMeetingParticipantsPicker';

import {useApplicationContext} from '../../../page/rootProvider';
import type {ConversationRepository} from '../../../repositories/conversation/ConversationRepository';
import type {ConversationState} from '../../../repositories/conversation/ConversationState';
import type {User} from '../../../repositories/entity/User';
import type {SearchRepository} from '../../../repositories/search/searchRepository';
import type {TeamRepository} from '../../../repositories/team/TeamRepository';
import type {TeamState} from '../../../repositories/team/TeamState';
import {ChevronDownIcon} from '../../../uiKit/dataDisplay/icon/chevronDownIcon';
import {SearchIcon} from '../../../uiKit/dataDisplay/icon/searchIcon';
import {InputLabel} from '../../../uiKit/inputs/inputLabel/inputLabel';
import {getOverlayPortalContainer} from '../../../uiKit/utils/overlayPortal';
import {isValidEmail} from '../../../util/validationUtil';
import {UserSearchableList} from '../../UserSearchableList';

export interface MeetingParticipantsPickerProps {
  id: string;
  dataUieName?: string;
  users: User[];
  selectedUsers: User[];
  invitedEmails?: string[];
  isFederated?: boolean;
  onInvitedEmailsChange?: (emails: string[]) => void;
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

export const MeetingParticipantsPicker: FunctionComponent<MeetingParticipantsPickerProps> = ({
  id,
  dataUieName,
  users,
  selectedUsers,
  invitedEmails,
  isFederated = false,
  onInvitedEmailsChange,
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
  const {translate} = useApplicationContext();
  const listboxId = useId();
  const emailErrorId = useId();
  const portalContainer = popoverPortalContainer ?? getOverlayPortalContainer();
  const allowedUsers = users.filter(isAllowedMeetingParticipant);

  const fieldLabel = isNonEmptyString(label)
    ? formatParticipantsFieldLabel(label, selectedUsers.length + (invitedEmails?.length ?? 0), translate)
    : undefined;
  const searchPlaceholder = placeholder ?? translate('meetings.scheduleModal.participantsPlaceholder');
  const showPlaceholder = filter.length === 0;
  const {
    handleOpenChange,
    handleSelectedUsersChange,
    handleSelectConversation,
    isContactsOpen,
    isConversationsOpen,
    isOpen,
    matchingConversations,
    popoverRef,
    selectedConversationIds,
    setIsConversationsOpen,
    setIsContactsOpen,
    triggerRef,
  } = useMeetingParticipantsPicker({
    disabled,
    filter,
    selectedUsers,
    onSelectedUsersChange,
    onFilterChange,
    conversationRepository,
  });
  const {emailError, clearEmailError, handleEmailKeyDown, selectEmail, removeEmail} = useMeetingEmailInvitees({
    invitedEmails,
    onInvitedEmailsChange,
    onFilterChange,
    isOpen,
  });
  const selectedEmailItems = (invitedEmails ?? []).map(email => {
    return <SelectedEmailInvitee key={email} email={email} noUnderline={noUnderline} onRemove={removeEmail} />;
  });

  return (
    <div css={wrapperStyles} data-uie-name={dataUieName}>
      {isNonEmptyString(fieldLabel) && (
        <InputLabel htmlFor={id} markInvalid={markInvalid} isRequired={required}>
          {fieldLabel}
        </InputLabel>
      )}

      <div ref={triggerRef} css={triggerWrapperStyles}>
        <div
          css={controlStyles({isDisabled: disabled, isOpen, markInvalid: markInvalid || emailError.isJust})}
          data-uie-name={isNonEmptyString(dataUieName) ? `${dataUieName}-control` : undefined}
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
              aria-invalid={emailError.isJust}
              aria-describedby={emailError.isJust ? emailErrorId : undefined}
              value={filter}
              disabled={disabled}
              placeholder={showPlaceholder ? searchPlaceholder : ''}
              aria-label={isNonEmptyString(fieldLabel) ? undefined : searchPlaceholder}
              data-uie-name={isNonEmptyString(dataUieName) ? `${dataUieName}-input` : undefined}
              onChange={event => {
                onFilterChange(event.target.value);
                clearEmailError();
                if (!isOpen) {
                  handleOpenChange(true);
                }
              }}
              onKeyDown={handleEmailKeyDown}
              onFocus={() => {
                if (!disabled && !isOpen) {
                  handleOpenChange(true);
                }
              }}
            />
          </div>
          <Button
            css={chevronButtonStyles}
            isDisabled={disabled}
            aria-label={fieldLabel ?? searchPlaceholder}
            data-uie-name={isNonEmptyString(dataUieName) ? `${dataUieName}-toggle` : undefined}
            onPress={() => {
              return handleOpenChange(!isOpen);
            }}
          >
            <ChevronDownIcon aria-hidden="true" width={16} height={16} css={chevronIconStyles(isOpen)} />
          </Button>
        </div>
        {emailError.isJust && (
          <div id={emailErrorId} role="alert" css={emailErrorStyles}>
            {translate(
              emailError.value === 'invalid'
                ? 'meetings.scheduleModal.emailInvalid'
                : 'meetings.scheduleModal.emailDuplicate',
            )}
          </div>
        )}
      </div>

      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={open => {
          if (open) {
            handleOpenChange(true);
          }
        }}
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
            data-uie-name={isNonEmptyString(dataUieName) ? `dropdown-${dataUieName}` : undefined}
            role="listbox"
            aria-multiselectable="true"
          >
            <UserSearchableList
              selfUser={selfUser}
              users={allowedUsers}
              filter={filter}
              selected={selectedUsers}
              selectedExtraItems={selectedEmailItems}
              isSelectable
              onUpdateSelectedUsers={handleSelectedUsersChange}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              conversationRepository={conversationRepository}
              conversationState={conversationState}
              teamState={teamState}
              noUnderline={noUnderline}
              allowRemoteSearch={isUndefined(onInvitedEmailsChange) || isFederated || !isValidEmail(filter.trim())}
              filterRemoteTeamUsers={!isFederated}
              includeFederatedSearchResults={isFederated}
              showAllProvidedUsers
              hideEmptyState={matchingConversations.length > 0}
              showSelectedUsersRegardlessOfFilter
              isContactsOpen={isContactsOpen}
              onContactsOpenChange={setIsContactsOpen}
              dataUieName={isNonEmptyString(dataUieName) ? `${dataUieName}-list` : undefined}
            />
            {!isUndefined(onInvitedEmailsChange) && isValidEmail(filter.trim()) && (
              <button
                type="button"
                css={inviteByEmailActionStyles}
                data-uie-name="invite-by-email"
                onClick={() => {
                  return selectEmail(filter);
                }}
              >
                {translate('meetings.scheduleModal.inviteByEmail')}
              </button>
            )}
            <MeetingConversationsSearchableList
              id={id}
              conversations={matchingConversations}
              selectedConversationIds={selectedConversationIds}
              onSelectConversation={handleSelectConversation}
              isOpen={isConversationsOpen}
              onOpenChange={setIsConversationsOpen}
              noUnderline={noUnderline}
              dataUieName={isNonEmptyString(dataUieName) ? `${dataUieName}-conversation-dropdown` : undefined}
            />
          </div>
        </div>
      </Popover>
    </div>
  );
};
