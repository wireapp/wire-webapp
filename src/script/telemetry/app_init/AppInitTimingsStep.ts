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

export enum AppInitTimingsStep {
  APP_LOADED = 'app_loaded',
  APP_PRE_LOADED = 'app_pre_loaded',
  INITIALIZED_CRYPTOGRAPHY = 'initialized_cryptography',
  RECEIVED_ACCESS_TOKEN = 'received_access_token',
  RECEIVED_SELF_USER = 'received_self_user',
  RECEIVED_USER_DATA = 'received_user_data',
  UPDATED_CONVERSATIONS = 'updated_conversations',
  UPDATED_FROM_NOTIFICATIONS = 'updated_from_notifications',
  VALIDATED_CLIENT = 'validated_client',
}
