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

import {isEmptyArray, isNonEmptyArray} from '@sindresorhus/is';
import ko from 'knockout';

import {Asset} from './asset';
import type {LinkPreview} from './linkPreview';

import {QualifiedId} from '../../../apiClient/user/qualifiedId';
import type {MentionCheckOptions, MentionEntity} from '../../../message/mentionEntity';
import {renderMessage, type RenderMessageOptions} from '../../../util/messageRenderer';
import {AssetType} from '../../assets/assetType';
import {containsOnlyLink} from '../../conversation/linkPreviews/helpers';
import {mediaParser} from '../../media/MediaParser';

export class Text extends Asset {
  public readonly mentions: ko.ObservableArray<MentionEntity>;
  public readonly previews: ko.ObservableArray<LinkPreview>;
  public readonly should_render_text: ko.PureComputed<boolean>;

  constructor(id?: string, text: string = '') {
    super(id);
    this.type = AssetType.TEXT;

    this.text = text;
    this.mentions = ko.observableArray();
    this.previews = ko.observableArray();

    this.should_render_text = ko.pureComputed(() => {
      if (this.text === null || this.text.length === 0) {
        return false;
      }
      const has_link_previews = isNonEmptyArray(this.previews());
      return !has_link_previews || (has_link_previews && !containsOnlyLink(this.text));
    });
  }

  // Process text before rendering it
  render(selfId: QualifiedId, themeColor?: string, options: RenderMessageOptions = {}): string {
    const message = renderMessage(this.text, selfId, this.mentions(), options);
    return isEmptyArray(this.previews()) ? mediaParser.renderMediaEmbeds(message, themeColor) : message;
  }

  /**
   * @param userId The user id to check
   * @param options.includeEveryone Whether a mention of everyone (`@all`) counts as mentioning the user
   */
  isUserMentioned(userId: QualifiedId, {includeEveryone = false}: MentionCheckOptions = {}): boolean {
    return this.mentions().some(mentionEntity => {
      return (includeEveryone && mentionEntity.isEveryone) || mentionEntity.targetsUser(userId);
    });
  }

  hasEveryoneMention(): boolean {
    return this.mentions().some(mentionEntity => {
      return mentionEntity.isEveryone;
    });
  }
}
