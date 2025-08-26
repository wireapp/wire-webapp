/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {TextInput} from 'Components/TextInput';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ConversationType} from '../../types';

export const ConversationNameInput = () => {
  const {conversationName, setConversationName, setError, error, gotoNextStep, conversationType} =
    useCreateConversationModal();

  const maxNameLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;

  const onGroupNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = event.target;

    const trimmedNameInput = value.trim();
    const nameTooLong = trimmedNameInput.length > maxNameLength;
    const nameTooShort = !trimmedNameInput.length;

    setConversationName(value);
    if (nameTooLong) {
      return setError(t('groupCreationPreferencesErrorNameLong'));
    }

    if (nameTooShort) {
      return setError(t('groupCreationPreferencesErrorNameShort'));
    }
    setError('');
  };

  const groupNameLength = conversationName.length;

  const clickOnNext = (): void => {
    const nameTooLong = groupNameLength > maxNameLength;

    if (groupNameLength && !nameTooLong) {
      gotoNextStep();
    }
  };

  const hasNameError = error.length > 0;

  const label =
    conversationType === ConversationType.Group
      ? t('groupCreationPreferencesPlaceholder')
      : t('channelCreationPreferencesPlaceholder');

  return (
    <TextInput
      /* eslint jsx-a11y/no-autofocus : "off" */
      autoFocus
      label={label}
      placeholder={label}
      uieName="enter-group-name"
      name="enter-group-name"
      errorUieName="error-group-name"
      onCancel={() => setConversationName('')}
      onChange={onGroupNameChange}
      onBlur={event => {
        const {value} = event.target as HTMLInputElement;
        const trimmedName = value.trim();
        setConversationName(trimmedName);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
        handleEnterDown(event, clickOnNext);
      }}
      value={conversationName}
      isError={hasNameError}
      errorMessage={error}
    />
  );
};
