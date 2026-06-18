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

import {container} from 'tsyringe';

import {UserState} from 'Repositories/user/userState';
import {t} from 'Util/localizerUtil';

import {ChannelSettings} from './ChannelSettings';
import {
  conversationDescriptionInputCss,
  conversationDescriptionInputWrapperCss,
  conversationDescriptionLabelCss,
  groupsNotAllowedSectionCss,
} from './ConversationDetails.styles';
import {ConversationNameInput} from './ConversationNameInput';

import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ConversationType} from '../../types';
import {Preference} from '../Preference';

export const ConversationDetails = () => {
  const {conversationType, conversationDescription, setConversationDescription} = useCreateConversationModal();
  const userState = container.resolve(UserState);
  const selfUser = userState.self();

  return selfUser?.isExternal() && conversationType === ConversationType.Group ? (
    <div css={groupsNotAllowedSectionCss}>
      <p className="heading-h3">{t('createConversationGroupNotAllowedHeader')}</p>
      <p className="subline">{t('createConversationGroupNotAllowedContent1')}</p>
      <p className="subline">{t('createConversationGroupNotAllowedContent2')}</p>
    </div>
  ) : (
    <>
      <ConversationNameInput />
      {conversationType === ConversationType.Group && (
        <div css={conversationDescriptionInputWrapperCss}>
          <label css={conversationDescriptionLabelCss} htmlFor="enter-group-description">
            {t('conversationDescriptionOptionalLabel')}
          </label>
          <textarea
            css={conversationDescriptionInputCss}
            id="enter-group-description"
            data-uie-name="enter-group-description"
            name="enter-group-description"
            maxLength={200}
            value={conversationDescription}
            onChange={event => setConversationDescription(event.target.value)}
            onBlur={event => setConversationDescription(event.target.value.trim())}
          />
        </div>
      )}
      {conversationType === ConversationType.Group ? <Preference /> : <ChannelSettings />}
    </>
  );
};
