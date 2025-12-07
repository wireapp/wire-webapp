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

enum EMOJI {
  REPLACE_INLINE = 'settings.emoji.replace_inline',
}

enum CALL {
  ENABLE_SOUNDLESS_INCOMING_CALLS = 'settings.call.enable_soundless_incoming_calls',
  ENABLE_VBR_ENCODING = 'settings.call.enable_vbr_encoding',
  ENABLE_PRESS_SPACE_TO_UNMUTE = 'settings.call.enable_press_space_to_unmute',
}

enum INTERFACE {
  THEME = 'settings.interface.theme',
  MARKDOWN_PREVIEW = 'settings.interface.markdown_preview',
}

enum PREVIEWS {
  SEND = 'settings.previews.send',
}

enum PROPERTIES {
  ENABLE_DEBUGGING = 'enable_debugging',
  NOTIFICATIONS = 'settings.notifications',
  SOUND_ALERTS = 'settings.sound.alerts',
  VERSION = 'version',
}

enum PRIVACY {
  TELEMETRY_SHARING = 'settings.privacy.telemetry_data_sharing',
  MARKETING_CONSENT = 'settings.privacy.marketing_consent',
}

export const PROPERTIES_TYPE = {
  ...PROPERTIES,
  CALL,
  EMOJI,
  INTERFACE,
  PREVIEWS,
  PRIVACY,
};

export enum UserConsentStatus {
  ALL_DENIED = 'ALL_DENIED',
  ALL_GRANTED = 'ALL_GRANTED',
  TRACKING_GRANTED = 'TRACKING_GRANTED',
  MARKETING_GRANTED = 'MARKETING_GRANTED',
}
