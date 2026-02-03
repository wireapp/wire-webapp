/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export enum AudioPreference {
  ALL = 'all',
  NONE = 'none',
  SOME = 'some',
}

export enum NotificationPreference {
  NONE = 'none',
  OBFUSCATE = 'obfuscate',
  OBFUSCATE_MESSAGE = 'obfuscate-message',
  ON = 'on',
}

export interface WebappProperties {
  [property_key: string]: any;
  enable_debugging: boolean;
  settings: {
    call: {
      enable_vbr_encoding: boolean;
      enable_soundless_incoming_calls: boolean;
      enable_press_space_to_unmute: boolean;
    };
    emoji: {
      replace_inline: boolean;
    };
    interface: {
      font_size: string;
      theme: 'dark' | 'default';
      view_folders: boolean;
      markdown_preview: boolean;
    };
    notifications: NotificationPreference;
    previews: {
      send: boolean;
    };
    privacy: {
      marketing_consent?: boolean;
      telemetry_data_sharing?: boolean;
    };
    sound: {
      alerts: AudioPreference;
    };
  };
  version: number;
}

export interface UserPropertiesSetData {
  key: 'webapp';
  value: WebappProperties;
}
