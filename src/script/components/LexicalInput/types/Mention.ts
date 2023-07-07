/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {createCommand, LexicalCommand} from 'lexical';

export interface InsertMention {
  /**
   * The trigger that was used to insert the mention.
   */
  trigger: string;
  /**
   * The value to insert after the trigger.
   */
  value: string;
  /**
   * Whether to focus the editor after inserting the mention.
   * @default true
   */
  focus?: boolean;
}

export interface RemoveMentions {
  /**
   * The trigger to search for when removing mentions.
   */
  trigger: string;
  /**
   * An optional value to search for when removing mentions.
   */
  value?: string;
  /**
   * Whether to focus the editor after removing the mention.
   * @default true
   */
  focus?: boolean;
}

export interface RenameMentions {
  /**
   * The trigger to search for when renaming mentions.
   */
  trigger: string;
  /**
   * The new value to replace the old value with.
   */
  newValue: string;
  /**
   * An optional value to search for when renaming mentions.
   */
  value?: string;
  /**
   * Whether to focus the editor after renaming the mention.
   * @default true
   */
  focus?: boolean;
}

export interface HasMentions {
  /**
   * The trigger to search for when checking for mentions.
   */
  trigger: string;
  /**
   * An optional value to search for when checking for mentions.
   */
  value?: string;
}

export interface OpenMentionsMenu {
  trigger: string;
}

export const INSERT_MENTION_COMMAND: LexicalCommand<InsertMention> = createCommand('INSERT_MENTION_COMMAND');

export const REMOVE_MENTIONS_COMMAND: LexicalCommand<RemoveMentions> = createCommand('REMOVE_MENTIONS_COMMAND');

export const RENAME_MENTIONS_COMMAND: LexicalCommand<RenameMentions> = createCommand('RENAME_MENTIONS_COMMAND');

export const OPEN_MENTIONS_MENU_COMMAND: LexicalCommand<OpenMentionsMenu> = createCommand('OPEN_MENTIONS_MENU_COMMAND');
