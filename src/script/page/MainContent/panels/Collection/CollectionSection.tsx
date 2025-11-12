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

import React from 'react';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {t} from 'Util/LocalizerUtil';

import {CollectionItem} from './CollectionItem';

const CollectionSection = ({
  messages,
  limit,
  uieName,
  onSelect,
  children,
  label,
  onImageClick,
}: {
  children: React.ReactNode;
  label: string;
  limit: number;
  messages: ContentMessage[];
  onSelect: () => void;
  uieName: string;
  onImageClick?: (message: ContentMessage) => void;
}) => {
  if (messages.length === 0) {
    return null;
  }
  const hasExtra = messages.length > limit;
  const topMessages = messages.slice(0, limit);

  return (
    <section className="collection-section" data-uie-collection-size={messages.length} data-uie-name={uieName}>
      <header>
        {children}
        <span className="label-bold-xs">{label}</span>
        {hasExtra && (
          <button className="collection-header-all accent-text" onClick={onSelect}>
            <span data-uie-name="collection-show-all">{t('collectionShowAll', {number: messages.length})}</span>
            &nbsp;<span className="icon-forward font-size-xxs"></span>
          </button>
        )}
      </header>
      <div className="collection-images">
        {topMessages.map(message => (
          <CollectionItem message={message} allMessages={[]} key={message.id} onImageClick={onImageClick} />
        ))}
      </div>
    </section>
  );
};

export {CollectionSection};
