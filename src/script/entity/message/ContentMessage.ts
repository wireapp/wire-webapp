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

import {QuoteEntity} from '../../message/QuoteEntity';
import {SuperType} from '../../message/SuperType';
import {User} from '../User';
import {Asset} from './Asset';
import {File as FileAsset} from './File';
import {MediumImage} from './MediumImage';
import {Message} from './Message';
import {Text as TextAsset} from './Text';

export class ContentMessage extends Message {
  private readonly edited_timestamp: ko.Observable<number>;
  private readonly is_liked_provisional: ko.Observable<boolean>;
  private readonly quote: ko.Observable<QuoteEntity>;
  private readonly reactions_user_ets: ko.ObservableArray<User>;
  private readonly reactions: ko.Observable<Record<string, string>>;
  public readonly assets: ko.ObservableArray<Asset>;
  public readonly is_liked: ko.PureComputed<boolean>;
  public readonly like_caption: ko.PureComputed<string>;
  public readonly other_likes: ko.PureComputed<User[]>;
  public readonly reactions_user_ids: ko.PureComputed<void>;
  public readonly was_edited: ko.PureComputed<boolean>;
  public replacing_message_id: null | string;

  constructor(id: string) {
    super(id);

    this.assets = ko.observableArray([]);
    this.super_type = SuperType.CONTENT;
    this.replacing_message_id = null;
    this.edited_timestamp = ko.observable(null);

    this.was_edited = ko.pureComputed(() => !!this.edited_timestamp());

    this.reactions = ko.observable({});
    this.reactions_user_ets = ko.observableArray();
    this.reactions_user_ids = ko.pureComputed(() => {
      this.reactions_user_ets()
        .map(user_et => user_et.first_name())
        .join(', ');
    });

    this.quote = ko.observable();
    this.readReceipts = ko.observableArray([]);

    this.is_liked_provisional = ko.observable();
    this.is_liked = ko.pureComputed({
      read: () => {
        if (this.is_liked_provisional() != null) {
          const is_liked_provisional = this.is_liked_provisional();
          this.is_liked_provisional(null);
          return is_liked_provisional;
        }
        const likes = this.reactions_user_ets().filter(user_et => user_et.is_me);
        return likes.length === 1;
      },
      write: value => {
        return this.is_liked_provisional(value);
      },
    });
    this.other_likes = ko.pureComputed(() => this.reactions_user_ets().filter(user_et => !user_et.is_me));

    this.like_caption = ko.pureComputed(() => {
      if (this.reactions_user_ets().length <= 5) {
        return this.reactions_user_ets()
          .map(user_et => user_et.first_name())
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
  get_first_asset(): Asset {
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
  download(): void {
    const asset_et = this.get_first_asset() as FileAsset | MediumImage;
    const fileName = this.get_content_name();
    asset_et.download(fileName);
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
