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

// grunt test_init && grunt test_run:util/NotificationUtil

window.wire = window.wire || {};
window.wire.app = window.wire.app || {};

describe('z.util.NotificationUtil', () => {
  const eventsToNotify = z.notification.NotificationRepository.EVENTS_TO_NOTIFY;
  const userId = 'c59dfb06-6bef-4ac5-b220-11f32040cf40';

  let conversationEntity;
  let messageEntity;

  function generateTextAsset(selfMentioned = false) {
    const mentionId = selfMentioned ? userId : z.util.createRandomUuid();

    const textEntity = new z.entity.Text(z.util.createRandomUuid(), '@Gregor can you take a look?');
    const mentionEntity = new z.message.MentionEntity(0, 7, mentionId);
    textEntity.mentions([mentionEntity]);

    return textEntity;
  }

  beforeEach(() => {
    const selfUserEntity = new z.entity.User(userId);
    conversationEntity = new z.entity.Conversation(z.util.createRandomUuid());

    messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
    messageEntity.user(selfUserEntity);
  });

  it('returns the correct value for all notifications', () => {
    messageEntity.add_asset(generateTextAsset());

    conversationEntity.notificationState(z.conversation.NotificationSetting.STATE.EVERYTHING);
    const shouldNotify = z.util.NotificationUtil.shouldNotify(
      conversationEntity,
      messageEntity,
      eventsToNotify,
      userId
    );

    expect(shouldNotify).toBe(true);
  });

  it('returns the correct value for no notifications', () => {
    messageEntity.add_asset(generateTextAsset());

    conversationEntity.notificationState(z.conversation.NotificationSetting.STATE.NOTHING);
    const shouldNotify = z.util.NotificationUtil.shouldNotify(
      conversationEntity,
      messageEntity,
      eventsToNotify,
      userId
    );

    expect(shouldNotify).toBe(false);
  });

  it('returns the correct value for self mentioned messages', () => {
    messageEntity.add_asset(generateTextAsset(true));

    conversationEntity.notificationState(z.conversation.NotificationSetting.STATE.ONLY_MENTIONS);
    const shouldNotify = z.util.NotificationUtil.shouldNotify(
      conversationEntity,
      messageEntity,
      eventsToNotify,
      userId
    );

    expect(shouldNotify).toBe(true);
  });

  it('returns the correct value for non-self mentioned messages', () => {
    messageEntity.add_asset(generateTextAsset());

    conversationEntity.notificationState(z.conversation.NotificationSetting.STATE.ONLY_MENTIONS);
    const shouldNotify = z.util.NotificationUtil.shouldNotify(
      conversationEntity,
      messageEntity,
      eventsToNotify,
      userId
    );

    expect(shouldNotify).toBe(false);
  });
});
