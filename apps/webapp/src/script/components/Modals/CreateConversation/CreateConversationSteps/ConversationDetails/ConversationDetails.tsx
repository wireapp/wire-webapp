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

import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {ChannelSettings} from './ChannelSettings';
import {groupsNotAllowedSectionCss} from './ConversationDetails.styles';
import {ConversationNameInput} from './ConversationNameInput';

import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ConversationType} from '../../types';
import {Preference} from '../Preference';

export const ConversationDetails = () => {
  const {conversationType} = useCreateConversationModal();
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
      {conversationType === ConversationType.Group ? <Preference /> : <ChannelSettings />}
    </>
  );
};
