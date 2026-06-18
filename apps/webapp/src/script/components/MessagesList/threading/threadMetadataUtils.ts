/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {Message} from 'Repositories/entity/message/Message';
import {Text} from 'Repositories/entity/message/Text';
import {ClientEvent} from 'Repositories/event/Client';

export type BackendThreadEvent = {
  type?: string;
  conversation?: string;
  is_thread_reply?: boolean;
  data?: {
    thread_id?: string | null;
    thread_root_message_id?: string | null;
    threadId?: string | null;
    message_id?: string;
  };
  thread_id?: string | null;
  thread_root_message_id?: string | null;
  threadId?: string | null;
};

export const normalizeThreadId = (threadId?: string | null): string | null =>
  typeof threadId === 'string' && threadId.length > 0 ? threadId : null;

export const getThreadIdFromBackendEvent = (event?: BackendThreadEvent): string | null =>
  normalizeThreadId(
    event?.thread_id ??
      event?.threadId ??
      event?.thread_root_message_id ??
      event?.data?.thread_id ??
      event?.data?.threadId ??
      event?.data?.thread_root_message_id ??
      null,
  );

export const isThreadReplyMessageEvent = (eventType?: string): boolean => {
  if (eventType === undefined || eventType.length === 0) {
    return false;
  }

  return (
    eventType === ClientEvent.CONVERSATION.MESSAGE_ADD ||
    eventType === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD ||
    eventType === CONVERSATION_EVENT.OTR_MESSAGE_ADD ||
    eventType === CONVERSATION_EVENT.MLS_MESSAGE_ADD
  );
};

export type ThreadRootMetadata = {
  rootMessagePreview?: string;
  rootMessageAuthorId?: string;
  rootMessageTimestamp?: string;
};

export type ThreadPreviewEvent = {
  from?: string;
  time?: string;
  data?: {
    content?: string;
    text?: {content?: string};
  };
};

export const extractThreadPreviewFromEvent = (event?: ThreadPreviewEvent) => {
  const preview = event?.data?.text?.content ?? event?.data?.content;
  if (typeof preview !== 'string') {
    return undefined;
  }

  const normalizedPreview = preview.trim();
  return normalizedPreview.length > 0 ? normalizedPreview : undefined;
};

export const extractThreadRootMetadataFromEvent = (event?: ThreadPreviewEvent): ThreadRootMetadata => ({
  rootMessagePreview: extractThreadPreviewFromEvent(event),
  rootMessageAuthorId: event?.from,
  rootMessageTimestamp: event?.time,
});

export const extractThreadRootMetadataFromMessage = (message?: Message): ThreadRootMetadata => {
  if (!message) {
    return {};
  }

  const authorId = message.user()?.id;
  const timestampMs = message.timestamp();
  const rootMessageTimestamp =
    typeof timestampMs === 'number' && Number.isFinite(timestampMs) ? new Date(timestampMs).toISOString() : undefined;

  if (message.hasAssetText()) {
    const textAsset = (message as ContentMessage).getFirstAsset() as Text | undefined;
    const preview = textAsset?.text?.trim();

    return {
      rootMessagePreview: preview?.length ? preview : undefined,
      rootMessageAuthorId: authorId,
      rootMessageTimestamp,
    };
  }

  if (message instanceof ContentMessage) {
    const asset = message.getFirstAsset();
    const fileName = asset && 'file_name' in asset ? asset.file_name?.trim() : undefined;

    return {
      rootMessagePreview: fileName?.length ? fileName : undefined,
      rootMessageAuthorId: authorId,
      rootMessageTimestamp,
    };
  }

  return {
    rootMessageAuthorId: authorId,
    rootMessageTimestamp,
  };
};
