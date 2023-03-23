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

import {FC} from 'react';

import {Icon} from 'Components/Icon';
import {Conversation} from 'Entities/Conversation';
import {ContentMessage} from 'Entities/message/ContentMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

interface DetailViewModalFooterProps {
  messageEntity: ContentMessage;
  conversationEntity: Conversation;
  onLikeClick: (conversation: Conversation, message: ContentMessage) => void;
  onReplyClick: (conversation: Conversation, message: ContentMessage) => void;
  onDownloadClick: (message: ContentMessage) => void;
}

const DetailViewModalFooter: FC<DetailViewModalFooterProps> = ({
  messageEntity,
  conversationEntity,
  onLikeClick,
  onReplyClick,
  onDownloadClick,
}) => {
  const {is_liked: isLiked} = useKoSubscribableChildren(messageEntity, ['is_liked']);
  const {removed_from_conversation: isRemovedFromConversation} = useKoSubscribableChildren(conversationEntity, [
    'removed_from_conversation',
  ]);

  return (
    <footer className="detail-view-footer">
      {messageEntity.isReactable() && !isRemovedFromConversation && (
        <button
          type="button"
          className="detail-view-action-button"
          onClick={() => onLikeClick(conversationEntity, messageEntity)}
          data-uie-name="do-like-fullscreen-picture"
        >
          <span className={isLiked ? 'icon-liked text-red' : 'icon-like'}></span>
          <span>{t('conversationContextMenuLike')}</span>
        </button>
      )}

      {messageEntity.isReplyable() && !isRemovedFromConversation && (
        <button
          type="button"
          className="detail-view-action-button"
          onClick={() => onReplyClick(conversationEntity, messageEntity)}
          data-uie-name="do-reply-fullscreen-picture"
        >
          <Icon.Reply />

          <span>{t('conversationContextMenuReply')}</span>
        </button>
      )}

      {messageEntity.isDownloadable() && (
        <button
          type="button"
          className="detail-view-action-button"
          onClick={() => onDownloadClick(messageEntity)}
          data-uie-name="do-download-fullscreen-picture"
        >
          <span className="icon-download" />
          <span>{t('conversationContextMenuDownload')}</span>
        </button>
      )}
    </footer>
  );
};

export {DetailViewModalFooter};
