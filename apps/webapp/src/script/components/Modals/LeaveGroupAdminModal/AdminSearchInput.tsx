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

import is from '@sindresorhus/is';
import {FormatOptionLabelMeta} from 'react-select';

import {Option, Select} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import type {User} from 'Repositories/entity/User';
import {t} from 'Util/localizerUtil';

import {
  checkboxStyles,
  clearContentLabelStyles,
  clearContentRowStyles,
  newAdminLabelStyles,
  optionAvatarStyles,
  optionRowStyles,
  optionTextColumnStyles,
  searchSectionStyles,
  selectMenuPortalStyles,
  selectWrapperStyles,
  userHandleStyles,
  userNameStyles,
} from './styles';

interface AdminSearchInputProps {
  clearContent: boolean;
  eligibleUsers: User[];
  selectedUser: User | null;
  onClearContentChange: (checked: boolean) => void;
  onUserSelect: (user: User | null) => void;
}

export const AdminSearchInput = ({
  clearContent,
  eligibleUsers,
  selectedUser,
  onClearContentChange,
  onUserSelect,
}: AdminSearchInputProps) => {
  const options: Option[] = eligibleUsers.map(user => ({value: user.id, label: user.name()}));
  const selectedOption = selectedUser ? (options.find(opt => opt.value === selectedUser.id) ?? null) : null;

  const handleChange = (option: Option | null) => {
    if (!option) {
      onUserSelect(null);
      return;
    }
    const user = eligibleUsers.find(usr => usr.id === option.value);
    if (user) {
      onUserSelect(user);
    }
  };

  const formatOptionLabel = (option: Option, meta: FormatOptionLabelMeta<Option>) => {
    const user = eligibleUsers.find(usr => usr.id === option.value);
    if (!user || meta.context === 'value') {
      return <span>{option.label}</span>;
    }

    return (
      <div style={optionRowStyles}>
        <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={user} aria-hidden="true" css={optionAvatarStyles} />
        <span style={optionTextColumnStyles}>
          <span style={userNameStyles}>{user.name()}</span>
          <span style={userHandleStyles}>{user.handle}</span>
        </span>
      </div>
    );
  };

  return (
    <div style={searchSectionStyles}>
      <label style={newAdminLabelStyles} data-uie-name="leave-group-admin-new-admin-label">
        {t('leaveGroupAdminModalNewAdminLabel')}
      </label>

      <Select
        id="leave-group-admin-select"
        dataUieName="input-leave-group-admin-search"
        options={options}
        value={selectedOption}
        onChange={option => handleChange(option)}
        formatOptionLabel={formatOptionLabel}
        isSearchable
        placeholder={t('leaveGroupAdminModalSearchPlaceholder')}
        wrapperCSS={selectWrapperStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        selectMenuPortalCSS={selectMenuPortalStyles}
        isClearable
      />

      {!is.nullOrUndefined(selectedUser) && (
        <div style={clearContentRowStyles} data-uie-name="leave-group-admin-clear-content">
          <input
            type="checkbox"
            id="leave-group-admin-clear-content-checkbox"
            checked={clearContent}
            onChange={event => onClearContentChange(event.target.checked)}
            style={checkboxStyles}
            data-uie-name="input-leave-group-clear-content"
          />
          <label htmlFor="leave-group-admin-clear-content-checkbox" style={clearContentLabelStyles}>
            {t('leaveGroupAdminModalClearContent')}
          </label>
        </div>
      )}
    </div>
  );
};
