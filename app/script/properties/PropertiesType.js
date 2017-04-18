/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.properties = z.properties || {};

z.properties.PROPERTIES_TYPE = {
  CONTACT_IMPORT: {
    GOOGLE: 'contact_import.google',
    MACOS: 'contact_import.macos',
  },
  ENABLE_DEBUGGING: 'enable_debugging',
  HAS_CREATED_CONVERSATION: 'has_created_conversation',
  NOTIFICATIONS: 'settings.notifications',
  PRIVACY: 'settings.privacy.improve_wire',
  SOUND_ALERTS: 'settings.privacy.sound.alerts',
  VERSION: 'version',
};
