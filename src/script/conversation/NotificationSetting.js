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

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.NotificationSetting = {
  /* eslint-disable sort-keys */

  STATE: {
    EVERYTHING: 0b00,
    MENTIONS_AND_REPLIES: 0b01,
    NOTHING: 0b11,
  },

  /* eslint-enable sort-keys */

  getText(status) {
    const statusTexts = {
      [z.conversation.NotificationSetting.STATE.EVERYTHING]: z.string.notificationSettingsEverything,
      [z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES]: z.string.notificationSettingsMentionsAndReplies,
      [z.conversation.NotificationSetting.STATE.NOTHING]: z.string.notificationSettingsNothing,
    };
    return z.l10n.text(statusTexts[status]);
  },
};
