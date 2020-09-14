/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale, formatTimeShort} from 'Util/TimeUtil';

import type {QuoteEntity} from '../../message/QuoteEntity';
import {SuperType} from '../../message/SuperType';
import type {User} from '../User';
import type {Asset} from './Asset';
import type {FileAsset} from './FileAsset';
import type {MediumImage} from './MediumImage';
import {Message} from './Message';
import {Text as TextAsset} from './Text';
import {AssetRepository} from '../../assets/AssetRepository';

export class ContentMessage extends Message {
  private readonly isLikedProvisional: ko.Observable<boolean>;
  public readonly reactions_user_ets: ko.ObservableArray<User>;
  public readonly assets: ko.ObservableArray<Asset | FileAsset | TextAsset | MediumImage>;
  public readonly is_liked: ko.PureComputed<boolean>;
  public readonly like_caption: ko.PureComputed<string>;
  public readonly other_likes: ko.PureComputed<User[]>;
  public readonly quote: ko.Observable<QuoteEntity>;
  public readonly reactions_user_ids: ko.PureComputed<string>;
  public readonly was_edited: ko.PureComputed<boolean>;
  public replacing_message_id: null | string;
  readonly edited_timestamp: ko.Observable<number>;
  readonly reactions: ko.Observable<{[userId: string]: string}>;

  constructor(id?: string) {
    super(id);

    this.assets = ko.observableArray([]);
    this.super_type = SuperType.CONTENT;
    this.replacing_message_id = null;
    this.edited_timestamp = ko.observable(null);

    this.was_edited = ko.pureComputed(() => !!this.edited_timestamp());

    this.reactions = ko.observable({});
    this.reactions_user_ets = ko.observableArray();
    this.reactions_user_ids = ko.pureComputed(() => {
      return this.reactions_user_ets()
        .map(user_et => user_et.name())
        .join(', ');
    });

    this.quote = ko.observable();
    this.readReceipts = ko.observableArray([]);

    this.isLikedProvisional = ko.observable(null);
    this.is_liked = ko.pureComputed({
      read: () => {
        const isLikedProvisional = this.isLikedProvisional();
        const reactionsUserEts = this.reactions_user_ets();
        if (isLikedProvisional !== null) {
          this.isLikedProvisional(null);
          return isLikedProvisional;
        }
        return reactionsUserEts.some(user => user.isMe);
      },
      write: value => {
        return this.isLikedProvisional(value);
      },
    });
    this.other_likes = ko.pureComputed(() => this.reactions_user_ets().filter(user_et => !user_et.isMe));

    this.like_caption = ko.pureComputed(() => {
      const maxShownNames = 2;
      if (this.reactions_user_ets().length <= maxShownNames) {
        return this.reactions_user_ets()
          .map(user => user.name())
          .join(', ');
      }
      return t('conversationLikesCaption', this.reactions_user_ets().length);
    });
  }

  display_edited_timestamp = () => {
    return t('conversationEditTimestamp', formatTimeShort(this.edited_timestamp()));
  };

  /**
   * Add another content asset to the message.
   * @param asset_et New content asset
   */
  add_asset(asset_et: Asset): void {
    this.assets.push(asset_et);
  }

  copy(): void {
    copyText((this.get_first_asset() as TextAsset).text);
  }

  /**
   * Get the first asset attached to the message.
   * @returns The first asset attached to the message
   */
  get_first_asset(): Asset | FileAsset | TextAsset | MediumImage {
    return this.assets()[0];
  }

  getUpdatedReactions({
    data: event_data,
    from,
  }: {
    data: {reaction: string};
    from: string;
  }): false | {reactions: Record<string, string>; version: number} {
    const reaction = event_data && event_data.reaction;
    const hasUser = this.reactions()[from];
    const shouldAdd = reaction && !hasUser;
    const shouldDelete = !reaction && hasUser;

    if (!shouldAdd && !shouldDelete) {
      return false;
    }

    const newReactions = {...this.reactions()};

    if (shouldAdd) {
      newReactions[from] = reaction;
    } else {
      delete newReactions[from];
    }

    return {reactions: newReactions, version: this.version + 1};
  }

  /**
   * @param userId The user id to check
   * @returns `true` if the message mentions the user, `false` otherwise.
   */
  isUserMentioned(userId: string): boolean {
    return this.has_asset_text()
      ? this.assets().some(assetEntity => assetEntity.is_text() && assetEntity.isUserMentioned(userId))
      : false;
  }

  /**
   * @param userId The user id to check
   * @returns `true` if the message quotes the user, `false` otherwise.
   */
  isUserQuoted(userId: string): boolean {
    return this.quote() ? this.quote().isQuoteFromUser(userId) : false;
  }

  /**
   * @param userId The user id to check
   * @returns `true` if the user was mentioned or quoted, `false` otherwise.
   */
  isUserTargeted(userId: string): boolean {
    return this.isUserMentioned(userId) || this.isUserQuoted(userId);
  }

  /**
   * Download message content.
   */
  download(assetRepository: AssetRepository): void {
    const asset_et = this.get_first_asset() as FileAsset | MediumImage;

    if (typeof (asset_et as MediumImage).resource === 'function') {
      assetRepository.download((asset_et as MediumImage).resource(), this.get_content_name());
    } else if (typeof (asset_et as FileAsset).original_resource === 'function') {
      const fileAsset: FileAsset = asset_et;
      assetRepository.downloadFile(fileAsset);
    }
  }

  /**
   * Get content name.
   * @returns The content/file name.
   */
  get_content_name(): string {
    const asset_et = this.get_first_asset() as FileAsset;
    let {file_name} = asset_et;

    if (!file_name) {
      const date = this.timestamp();
      file_name = `Wire ${formatLocale(date, 'yyyy-MM-dd')} at ${formatTimeShort(date)}`;
    }

    if (asset_et.file_type) {
      const file_extension = asset_et.file_type.split('/').pop();
      file_name = `${file_name}.${file_extension}`;
    }

    return file_name;
  }
}
