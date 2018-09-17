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

'use strict';

window.z = window.z || {};
window.z.cryptography = z.cryptography || {};

z.cryptography.PROTO_MESSAGE_TYPE = {
  ASSET_NOT_UPLOADED: 'not_uploaded',
  ASSET_ORIGINAL: 'original',
  ASSET_PREVIEW: 'preview',
  ASSET_UPLOADED: 'uploaded',
  EPHEMERAL_EXPIRATION: 'expire_after_millis',
  LINK_PREVIEW_IMAGE: 'image',
  LINK_PREVIEW_TITLE: 'title',
  LINK_PREVIEWS: 'link_preview',
  MENTION_TYPE_USER_ID: 'user_id',
  MENTIONS: 'mentions',
  TWEET: 'tweet',
};
