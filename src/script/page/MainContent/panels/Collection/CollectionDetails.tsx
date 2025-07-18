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

import React, {Fragment} from 'react';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale, isThisYear, isToday} from 'Util/TimeUtil';
import {noop} from 'Util/util';

import {CollectionItem} from './CollectionItem';

interface CollectionDetailsProps {
  conversation: Conversation;
  messages: ContentMessage[];
  onClose?: () => void;
  onImageClick?: (message: ContentMessage) => void;
}

type GroupedCollection = [string, ContentMessage[]][];

const getTitleForHeader = (timestamp: number) => {
  if (isToday(timestamp)) {
    return t('conversationToday');
  }
  return isThisYear(timestamp) ? formatLocale(timestamp, 'MMMM') : formatLocale(timestamp, 'MMMM y');
};

const groupByDate = (messages: ContentMessage[]): GroupedCollection => {
  return Object.entries(
    messages.reduce<{[group: string]: ContentMessage[]}>((groups, message) => {
      const group = getTitleForHeader(message.timestamp());
      groups[group] = groups[group] || [];
      groups[group].unshift(message);
      return groups;
    }, {}),
  );
};

const CollectionDetails: React.FC<CollectionDetailsProps> = ({
  conversation,
  messages,
  onClose = noop,
  onImageClick,
}) => {
  const {display_name} = useKoSubscribableChildren(conversation, ['display_name']);

  return (
    <div id="collection-details" className="collection-details content">
      <div className="content-titlebar">
        <div className="content-titlebar-items-left">
          <button
            className="content-titlebar-icon icon-back"
            data-uie-name="do-collection-details-close"
            onClick={onClose}
          ></button>
        </div>
        <span className="content-titlebar-items-center" data-uie-name="collection-details-conversation-name">
          {display_name}
        </span>
      </div>

      <div className="content-list-wrapper">
        <FadingScrollbar className="content-list collection-list">
          <div className="collection-images">
            {groupByDate(messages).map(([groupName, groupMessages]) => {
              return (
                <Fragment key={groupName}>
                  <header className="collection-date-separator">{groupName}</header>
                  {groupMessages.map(message => (
                    <CollectionItem
                      message={message}
                      key={message.id}
                      allMessages={messages}
                      onImageClick={onImageClick}
                    />
                  ))}
                </Fragment>
              );
            })}
          </div>
        </FadingScrollbar>
      </div>
    </div>
  );
};

export {CollectionDetails};
