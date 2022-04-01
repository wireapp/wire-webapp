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
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Conversation} from '../../entity/Conversation';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import useEffectRef from 'Util/useEffectRef';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {isToday, isThisYear, formatLocale} from 'Util/TimeUtil';
import {t} from 'Util/LocalizerUtil';
import CollectionItem from './CollectionItem';
import {noop} from 'Util/util';

interface CollectionDetailsProps {
  conversation: Conversation;
  messages: ContentMessage[];
  onClose?: () => void;
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

const CollectionDetails: React.FC<CollectionDetailsProps> = ({conversation, messages, onClose = noop}) => {
  const {display_name} = useKoSubscribableChildren(conversation, ['display_name']);
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

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
        <div className="content-list collection-list" ref={setScrollbarRef}>
          <div className="collection-images">
            {groupByDate(messages).map(([groupName, groupMessages]) => {
              return (
                <Fragment key={groupName}>
                  <header className="collection-date-separator">{groupName}</header>
                  {groupMessages.map(message => (
                    <CollectionItem message={message} key={message.id} allMessages={messages} />
                  ))}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetails;
