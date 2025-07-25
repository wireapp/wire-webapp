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

import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {ReactionMap, ReadReceipt} from 'Repositories/storage';
import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale, formatTimeShort} from 'Util/TimeUtil';

import type {Asset} from './Asset';
import type {FileAsset} from './FileAsset';
import type {MediumImage} from './MediumImage';
import {Message} from './Message';
import {Text as TextAsset} from './Text';

import type {QuoteEntity} from '../../../message/QuoteEntity';
import {SuperType} from '../../../message/SuperType';

export class ContentMessage extends Message {
  public readonly assets: ko.ObservableArray<Asset | FileAsset | TextAsset | MediumImage> = ko.observableArray();
  public readonly failedToSend: ko.Observable<
    {queued?: QualifiedUserClients | QualifiedId[]; failed?: QualifiedId[]} | undefined
  > = ko.observable();
  // raw content of a file that was supposed to be sent but failed. Is undefined if the message has been successfully sent
  public readonly fileData: ko.Observable<Blob | undefined> = ko.observable();
  public readonly quote = ko.observable<QuoteEntity | undefined>();
  public readonly was_edited: ko.PureComputed<boolean>;
  public replacing_message_id?: string;
  readonly edited_timestamp: ko.Observable<number | null> = ko.observable(null);
  readonly reactions = ko.observable<ReactionMap>([]);
  public super_type = SuperType.CONTENT;
  public readonly readReceipts = ko.observableArray<ReadReceipt>();

  constructor(id?: string) {
    super(id);
    this.was_edited = ko.pureComputed(() => !!this.edited_timestamp());
  }

  readonly displayEditedTimestamp = () => {
    return t('conversationEditTimestamp', {date: formatTimeShort(this.edited_timestamp())});
  };

  /**
   * Add another content asset to the message.
   * @param asset_et New content asset
   */
  addAsset(asset_et: Asset): void {
    this.assets.push(asset_et);
  }

  copy(): void {
    copyText((this.getFirstAsset() as TextAsset).text);
  }

  /**
   * Get the first asset attached to the message.
   * @returns The first asset attached to the message
   */
  getFirstAsset(): Asset | FileAsset | TextAsset | MediumImage {
    return this.assets()[0];
  }

  /**
   * @param userId The user id to check
   * @returns `true` if the message mentions the user, `false` otherwise.
   */
  isUserMentioned(userId: QualifiedId): boolean {
    return this.hasAssetText()
      ? this.assets().some(assetEntity => assetEntity.isText() && assetEntity.isUserMentioned(userId))
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
  isUserTargeted(userId: QualifiedId): boolean {
    return userId && (this.isUserMentioned(userId) || this.isUserQuoted(userId.id));
  }

  /**
   * Download message content.
   */
  download(assetRepository: AssetRepository): void {
    const asset_et = this.getFirstAsset() as FileAsset | MediumImage;

    if (typeof (asset_et as MediumImage).resource === 'function') {
      assetRepository.download((asset_et as MediumImage).resource(), this.getContentName());
    } else if (typeof (asset_et as FileAsset).original_resource === 'function') {
      const fileAsset: FileAsset = asset_et;
      assetRepository.downloadFile(fileAsset);
    }
  }

  /**
   * Get content name.
   * @returns The content/file name.
   */
  getContentName(): string {
    const asset_et = this.getFirstAsset() as FileAsset;
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
