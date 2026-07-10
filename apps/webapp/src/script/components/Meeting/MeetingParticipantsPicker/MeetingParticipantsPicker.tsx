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

import {useCallback, useEffect, useId, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import {Button, Popover} from 'react-aria-components';

import {ChevronDownIcon, getOverlayPortalContainer, InputLabel, SearchIcon} from '@wireapp/react-ui-kit';

import {UserSearchableList} from 'Components/UserSearchableList';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {User} from 'Repositories/entity/User';
import type {SearchRepository} from 'Repositories/search/searchRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import type {TeamState} from 'Repositories/team/TeamState';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {formatSelectedSummary} from './formatSelectedSummary';
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
  selectedSummaryStyles,
  valueContainerStyles,
  wrapperStyles,
} from './MeetingParticipantsPicker.styles';

export interface MeetingParticipantsPickerProps {
  id: string;
  dataUieName: string;
  users: User[];
  selectedUsers: User[];
  onSelectedUsersChange: (users: User[]) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  selfUser: User;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  teamState?: TeamState;
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
  placeholder = 'Enter a name',
  disabled = false,
  markInvalid = false,
  required = false,
  noUnderline = true,
  popoverPortalContainer,
}: MeetingParticipantsPickerProps) => {
  const {translate} = useApplicationContext();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const portalContainer = popoverPortalContainer ?? getOverlayPortalContainer();

  const selectedSummary = formatSelectedSummary(selectedUsers, translate);
  const hasSelection = selectedUsers.length > 0;
  const showPlaceholder = !hasSelection && filter.length === 0;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled && open) {
        return;
      }

      if (!open) {
        onFilterChange('');
      }

      setIsOpen(open);
    },
    [disabled, onFilterChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const trigger = triggerRef.current;
      const popover = popoverRef.current;

      if (
        (!is.nullOrUndefined(trigger) && trigger.contains(target)) ||
        (!is.nullOrUndefined(popover) && popover.contains(target))
      ) {
        return;
      }

      handleOpenChange(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [handleOpenChange, isOpen]);

  return (
    <div css={wrapperStyles} data-uie-name={dataUieName}>
      {is.nonEmptyString(label) && (
        <InputLabel htmlFor={id} markInvalid={markInvalid} isRequired={required}>
          {label}
        </InputLabel>
      )}

      <div
        ref={triggerRef}
        css={controlStyles({isDisabled: disabled, isOpen, markInvalid})}
        data-uie-name={`${dataUieName}-control`}
        data-disabled={disabled || undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
      >
        <div css={valueContainerStyles}>
          <SearchIcon aria-hidden="true" css={searchIconStyles} />
          {hasSelection && (
            <span css={selectedSummaryStyles} data-uie-name={`${dataUieName}-summary`}>
              {selectedSummary}
            </span>
          )}
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
            placeholder={showPlaceholder ? placeholder : ''}
            aria-label={placeholder}
            data-uie-name={`${dataUieName}-input`}
            onChange={event => {
              onFilterChange(event.target.value);
              if (!isOpen) {
                setIsOpen(true);
              }
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
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
          aria-label={label ?? placeholder}
          data-uie-name={`${dataUieName}-toggle`}
          onPress={() => handleOpenChange(!isOpen)}
        >
          <ChevronDownIcon
            aria-hidden="true"
            width={12}
            height={12}
            css={[chevronIconStyles, isOpen && {transform: 'rotate(180deg)'}]}
          />
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
        <div css={dialogStyles} aria-label={label ?? placeholder}>
          <div
            id={listboxId}
            css={listContainerStyles}
            data-uie-name={`dropdown-${dataUieName}`}
            role="listbox"
            aria-multiselectable="true"
          >
            <UserSearchableList
              selfUser={selfUser}
              users={users}
              filter={filter}
              selected={selectedUsers}
              isSelectable
              onUpdateSelectedUsers={onSelectedUsersChange}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              conversationRepository={conversationRepository}
              conversationState={conversationState}
              teamState={teamState}
              noUnderline={noUnderline}
              allowRemoteSearch
              filterRemoteTeamUsers
              showAllProvidedUsers
              truncate
              dataUieName={`${dataUieName}-list`}
            />
          </div>
        </div>
      </Popover>
    </div>
  );
};
