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

export enum PROTO_MESSAGE_TYPE {
  ASSET_NOT_UPLOADED = 'notUploaded',
  ASSET_ORIGINAL = 'original',
  ASSET_PREVIEW = 'preview',
  ASSET_UPLOADED = 'uploaded',
  EPHEMERAL_EXPIRATION = 'expireAfterMillis',
  EXPECTS_READ_CONFIRMATION = 'expectsReadConfirmation',
  LEGAL_HOLD_STATUS = 'legalHoldStatus',
  LINK_PREVIEW_IMAGE = 'image',
  LINK_PREVIEW_TITLE = 'title',
  LINK_PREVIEWS = 'linkPreview',
  MENTION_TYPE_USER_ID = 'userId',
  MENTIONS = 'mentions',
  QUOTE = 'quote',
  TWEET = 'tweet',
}
