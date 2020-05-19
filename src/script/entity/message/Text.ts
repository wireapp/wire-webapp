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

import {renderMessage} from 'Util/messageRenderer';

import {AssetType} from '../../assets/AssetType';
import {containsOnlyLink} from '../../links/LinkPreviewHelpers';
import {mediaParser} from '../../media/MediaParser';
import type {MentionEntity} from '../../message/MentionEntity';
import {Asset} from './Asset';
import type {LinkPreview} from './LinkPreview';

export class Text extends Asset {
  public readonly mentions: ko.ObservableArray<MentionEntity>;
  public readonly previews: ko.ObservableArray<LinkPreview>;
  public readonly should_render_text: ko.PureComputed<boolean>;
  /** Raw message text */
  public text: string;

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
      const has_link_previews = this.previews().length > 0;
      return !has_link_previews || (has_link_previews && !containsOnlyLink(this.text));
    });
  }

  // Process text before rendering it
  render(selfId: string, themeColor: string): string {
    const message = renderMessage(this.text, selfId, this.mentions());
    return !this.previews().length ? mediaParser.renderMediaEmbeds(message, themeColor) : message;
  }

  isUserMentioned(userId: string): boolean {
    return this.mentions().some(mentionEntity => mentionEntity.targetsUser(userId));
  }
}
