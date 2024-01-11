/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

export const WebAppEvents = {
  ANALYTICS: {
    CLOSE_SESSION: 'wire.webapp.analytics.close_session',
    EVENT: 'wire.webapp.analytics.event',
    START_SESSION: 'wire.webapp.analytics.start_session',
  },
  APP: {
    UPDATE_PROGRESS: 'wire.webapp.app.update_progress',
  },
  AUDIO: {
    PLAY: 'wire.webapp.audio.play',
    PLAY_IN_LOOP: 'wire.webapp.audio.play_in_loop',
    STOP: 'wire.webapp.audio.stop',
  },
  BACKUP: {
    EXPORT: {
      START: 'wire.webapp.backup.export.start',
    },
    IMPORT: {
      START: 'wire.webapp.backup.import.start',
    },
  },
  BROADCAST: {
    SEND_MESSAGE: 'wire.app.broadcast.send_message',
  },
  CALL: {
    EVENT_FROM_BACKEND: 'wire.webapp.call.event_from_backend',
    MEDIA: {
      ADD_STREAM: 'wire.webapp.call.media.add_stream',
      CHOOSE_SCREEN: 'wire.webapp.call.media.choose_screen',
      CONNECTION_CLOSED: 'wire.webapp.call.media.connection_closed',
      MUTE_AUDIO: 'wire.webapp.call.media.mute_audio',
      TOGGLE: 'wire.webapp.call.media.toggle',
    },
    SIGNALING: {
      DELETE_FLOW: 'wire.webapp.call.signaling.delete_flow',
      POST_FLOWS: 'wire.webapp.call.signaling.post_flows',
      SEND_ICE_CANDIDATE_INFO: 'wire.webapp.call.signaling.send_ice_candidate_info',
      SEND_LOCAL_SDP_INFO: 'wire.webapp.call.signaling.send_local_sdp_info',
    },
    STATE: {
      CHECK: 'wire.webapp.call.state.check',
      DELETE: 'wire.webapp.call.state.delete',
      JOIN: 'wire.webapp.call.state.join',
      LEAVE: 'wire.webapp.call.state.leave',
      REJECT: 'wire.webapp.call.state.reject',
      TOGGLE: 'wire.webapp.call.state.toggle',
    },
  },
  CLIENT: {
    ADD: 'wire.webapp.user.client.add',
    REMOVE: 'wire.webapp.client.remove',
    UPDATE: 'wire.webapp.client.update',
    VERIFICATION_STATE_CHANGED: 'wire.webapp.client.verification_state_changed',
  },
  CONNECTION: {
    ACCESS_TOKEN: {
      RENEW: 'wire.webapp.connection.access_token.renew',
      RENEWED: 'wire.webapp.connection.access_token.renewed',
    },
    ONLINE: 'wire.webapp.connection.online',
  },
  CONTENT: {
    EXPAND_FOLDER: 'wire.webapp.content.expand_folder',
    SWITCH: 'wire.webapp.content.switch',
  },
  CONTEXT_MENU: 'wire.webapp.context_menu',
  CONVERSATION: {
    JOIN: 'wire.webapp.conversation.join',
    ASSET: {
      CANCEL: 'wire.webapp.conversation.asset.cancel',
    },
    CREATE_GROUP: 'wire.webapp.conversation.create_group',
    DEBUG: 'wire.webapp.conversation.debug',
    DELETE: 'wire.webapp.conversation.delete',
    DETAIL_VIEW: {
      SHOW: 'wire.webapp.conversation.detail_view.show',
    },
    EPHEMERAL_MESSAGE_TIMEOUT: 'wire.webapp.conversation.ephemeral_message_timeout',
    EVENT_FROM_BACKEND: 'wire.webapp.conversation.event_from_backend',
    IMAGE: {
      SEND: 'wire.webapp.conversation.image.send',
    },
    INJECT_CALLING_MESSAGE: 'wire.webapp.conversation.insert_calling_message',
    INJECT_LEGAL_HOLD_MESSAGE: 'wire.webapp.conversation.insert_legal_hold_message',
    MAP_CONNECTION: 'wire.webapp.conversation.map_connection',
    MESSAGE: {
      ADDED: 'wire.webapp.conversation.message.added',
      EDIT: 'wire.webapp.conversation.message.edit',
      REMOVED: 'wire.webapp.conversation.message.removed',
      REPLY: 'wire.webapp.conversation.message.reply',
      UPDATED: 'wire.webapp.conversation.message.updated',
    },
    MISSED_EVENTS: 'wire.webapp.conversation.missed_events',
    PEOPLE: {
      HIDE: 'wire.webapp.conversation.people.hide',
    },
    PERSIST_STATE: 'wire.webapp.conversation.persist_state',
    SHOW: 'wire.webapp.conversation.show',
    VERIFICATION_STATE_CHANGED: 'wire.webapp.conversation.verification_state_changed',
  },
  DEBUG: {
    UPDATE_LAST_CALL_STATUS: 'wire.webapp.debug.update_last_call_status',
  },
  EVENT: {
    NOTIFICATION_HANDLING_STATE: 'wire.webapp.event.notification_handling',
  },
  EXTENSIONS: {
    GIPHY: {
      SEND: 'wire.webapp.extensions.giphy.send',
      SHOW: 'wire.webapp.extensions.giphy.show',
    },
  },
  FEDERATION: {
    EVENT_FROM_BACKEND: 'wire.webapp.federation.event_from_backend',
  },
  INPUT: {
    RESIZE: 'wire.webapp.input.resize',
  },
  LEFT: {
    FADE_IN: 'wire.webapp.left.fade_in',
    HIDE: 'wire.webapp.left.hide',
  },
  LIFECYCLE: {
    ASK_TO_CLEAR_DATA: 'wire.webapp.lifecycle.ask_to_clear_data',
    CHANGE_ENVIRONMENT: 'wire.webapp.lifecycle.change_environment',
    LOADED: 'wire.webapp.lifecycle.loaded',
    REFRESH: 'wire.webapp.lifecycle.refresh',
    RESTART: 'wire.webapp.lifecycle.restart',
    SIGN_OUT: 'wire.webapp.lifecycle.sign_out',
    SIGNED_OUT: 'wire.webapp.lifecycle.signed_out',
    SSO_WINDOW_CLOSE: 'wire.webapp.lifecycle.sso_window_close',
    SSO_WINDOW_CLOSED: 'wire.webapp.lifecycle.sso_window_closed',
    SSO_WINDOW_FOCUS: 'wire.webapp.lifecycle.sso_window_focus',
    UNREAD_COUNT: 'wire.webapp.lifecycle.unread_count',
    UPDATE: 'wire.webapp.lifecycle.update',
    REDIRECTED: 'wire.webapp.lifecycle.redirected',
  },
  NOTIFICATION: {
    CLICK: 'wire.webapp.notification.click',
    NOTIFY: 'wire.webapp.notification.notify',
    PERMISSION_STATE: 'wire.webapp.notification.permissionState',
    REMOVE_READ: 'wire.webapp.notification.remove_read',
    SHOW: 'wire.webapp.notification.show',
  },
  PENDING: {
    SHOW: 'wire.webapp.pending.show',
  },
  PREFERENCES: {
    CHANGE_APP_LOCK_PASSPHRASE: 'wire.webapp.preferences.change_app_lock_passphrase',
    MANAGE_ACCOUNT: 'wire.webapp.preferences.manage_account',
    MANAGE_DEVICES: 'wire.webapp.preferences.manage_devices',
    SHOW_ABOUT: 'wire.webapp.preferences.show_about',
    SHOW_AV: 'wire.webapp.preferences.show_av',
    SHOW_OPTIONS: 'wire.webapp.preferences.show_options',
    UPLOAD_PICTURE: 'wire.webapp.preferences.upload_picture',
  },
  PROFILE: {
    SETTINGS: {
      SHOW: 'wire.webapp.profile.settings.show',
    },
  },
  PROPERTIES: {
    UPDATE: {
      CALL: {
        ENABLE_VBR_ENCODING: 'wire.webapp.properties.update.call.enable_vbr_encoding',
        ENABLE_SOUNDLESS_INCOMING_CALLS: 'wire.webapp.properties.update.call.enable_soundless_incoming_calls',
      },
      CONTACTS: 'wire.webapp.properties.update.contacts',
      EMOJI: {
        REPLACE_INLINE: 'wire.webapp.properties.update.emoji.replace_inline',
      },
      INTERFACE: {
        FONT_SIZE: 'wire.webapp.properties.update.interface.font_size',
        THEME: 'wire.webapp.properties.update.interface.theme',
        USE_DARK_MODE: 'wire.webapp.properties.update.interface.use_dark_mode',
        VIEW_FOLDERS: 'wire.webapp.properties.update.interface.view_folders',
      },
      NOTIFICATIONS: 'wire.webapp.properties.update.notifications',
      PREVIEWS: {
        SEND: 'wire.webapp.properties.update.previews.send',
      },
      PRIVACY: 'wire.webapp.properties.update.privacy',
      SOUND_ALERTS: 'wire.webapp.properties.update.sound_alerts',
      TELEMETRY_SHARING: 'wire.webapp.properties.update.telemetry_sharing',
    },
    UPDATED: 'wire.webapp.properties.updated',
  },
  SEARCH: {
    HIDE: 'wire.webapp.search.hide',
    SHOW: 'wire.webapp.search.show',
  },
  SHORTCUT: {
    ADD_PEOPLE: 'wire.webapp.shortcut.add_people',
    ARCHIVE: 'wire.webapp.shortcut.archive',
    DELETE: 'wire.webapp.shortcut.delete',
    NEXT: 'wire.webapp.shortcut.next',
    NOTIFICATIONS: 'wire.webapp.shortcut.notifications',
    PEOPLE: 'wire.webapp.shortcut.people',
    PICTURE: 'wire.webapp.shortcut.picture',
    PING: 'wire.webapp.shortcut.ping',
    PREV: 'wire.webapp.shortcut.prev',
    SILENCE: 'wire.webapp.shortcut.silence', // todo: deprecated - remove when user base of wrappers version >= 3.4 is
    // large enough
    START: 'wire.webapp.shortcut.start',
  },
  SIGN_OUT: 'wire.webapp.logout',
  STORAGE: {
    SAVE_ENTITY: 'wire.webapp.storage.save_entity',
  },
  SYSTEM_NOTIFICATION: {
    CLICK: 'wire.webapp.notification.click', // todo: deprecated - remove when user base of wrappers version >= 3.2 is
    // large enough
  },
  TEAM: {
    EVENT_FROM_BACKEND: 'wire.webapp.team.event_from_backend',
    INFO: 'wire.webapp.team.info',
    MEMBER_LEAVE: 'wire.webapp.team.member_leave',
    UPDATE_INFO: 'wire.webapp.team.update_info',
    DOWNLOAD_PATH_UPDATE: 'wire.webapp.team.download_path_update',
  },
  TELEMETRY: {
    BACKEND_REQUESTS: 'wire.webapp.telemetry.backend_requests',
  },
  USER: {
    CLIENTS_UPDATED: 'wire.webapp.user.clients_updated',
    CLIENT_ADDED: 'wire.webapp.user.client_added',
    CLIENT_REMOVED: 'wire.webapp.user.client_removed',
    EVENT_FROM_BACKEND: 'wire.webapp.user.event_from_backend',
    LEGAL_HOLD_ACTIVATED: 'wire.webapp.user.legal_hold_activated',
    LEGAL_HOLD_REMOVED: 'wire.webapp.user.legal_hold_removed',
    PERSIST: 'wire.webapp.user.persist',
    SET_AVAILABILITY: 'wire.webapp.user.set_availability',
    UNBLOCKED: 'wire.webapp.user.unblocked',
    UPDATE: 'wire.webapp.user.update',
  },
  WARNING: {
    DISMISS: 'wire.webapp.warning.dismiss',
    MODAL: 'wire.webapp.warning.modal',
    SHOW: 'wire.webapp.warning.show',
  },
};
