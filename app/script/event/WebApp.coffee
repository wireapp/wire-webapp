#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.event ?= {}

# Enum of diffent webapp events.
z.event.WebApp =
  ACTION:
    SHOW: 'wire.webapp.action.show'
  ANALYTICS:
    EVENT: 'wire.webapp.analytics.event'
    INIT: 'wire.webapp.analytics.init'
    SESSION:
      CLOSE: 'wire.webapp.analytics.session.close'
      START: 'wire.webapp.analytics.session.start'
  AUDIO:
    PLAY: 'wire.webapp.audio.play'
    PLAY_IN_LOOP: 'wire.webapp.audio.play-in-loop'
    STOP: 'wire.webapp.audio.stop'
  APP:
    UPDATE_INIT: 'wire.webapp.app.update-init'
    HIDE: 'wire.webapp.app.hide'
    FADE_IN: 'wire.webapp.app.fade-in'
  ARCHIVE:
    SHOW: 'wire.webapp.archive.show'
    CLOSE: 'wire.webapp.archive.close'
  CALL:
    EVENT_FROM_BACKEND: 'wire.webapp.call.event-from-backend'
    STATE:
      CHECK: 'wire.webapp.call.state.check'
      DELETE: 'wire.webapp.call.state.delete'
      IGNORE: 'wire.webapp.call.state.ignore'
      JOIN: 'wire.webapp.call.state.join'
      LEAVE: 'wire.webapp.call.state.leave'
      REMOVE_PARTICIPANT: 'wire.webapp.call.state.remove-participant'
      TOGGLE: 'wire.webapp.call.state.toggle'
      TOGGLE_SCREEN: 'wire.webapp.call.state.toggle-screen'
    MEDIA:
      MUTE_AUDIO: 'wire.webapp.call.media.mute_audio'
      ADD_STREAM: 'wire.webapp.call.media.add_stream'
    SIGNALING:
      DELETE_FLOW: 'wire.webapp.call.signaling.delete-flow'
      POST_FLOWS: 'wire.webapp.call.signaling.post-flows'
      SEND_ICE_CANDIDATE_INFO: 'wire.webapp.call.signaling.send-ice-candidate-info'
      SEND_LOCAL_SDP_INFO: 'wire.webapp.call.signaling.send-local-sdp-info'
  CLIENT:
    DELETE: 'wire.webapp.client.delete'
  CONNECT:
    IMPORT_CONTACTS: 'wire.webapp.connect.import-contacts'
  CONNECTION:
    ACCESS_TOKEN:
      RENEW: 'wire.webapp.connection.access-token.renew'
      RENEWED: 'wire.webapp.connection.access-token.renewed'
    RECONNECT: 'wire.webapp.connection.reconnect'
    ONLINE: 'wire.webapp.connection.online'
  CONVERSATION:
    DEBUG: 'wire.webapp.conversation.debug'
    EVENT_FROM_BACKEND: 'wire.webapp.conversation.event-from-backend'
    LOADED_STATES: 'wire.webapp.conversation.loaded-states'
    MAP_CONNECTION: 'wire.webapp.conversation.map-connection'
    PEOPLE:
      HIDE: 'wire.webapp.conversation.people.hide'
    SHOW: 'wire.webapp.conversation.show'
    STORE: 'wire.webapp.conversation.store'
    SWITCH: 'wire.webapp.conversation.switch'
    DETAIL_VIEW:
      SHOW: 'wire.webapp.conversation.detail-view.show'
    UNREAD: 'wire.webapp.conversation.unread'
    ASSET:
      CANCEL: 'wire.webapp.conversation.asset.cancel'
    MESSAGE:
      DELETE: 'wire.webapp.conversation.message.delete'
    IMAGE:
      SEND: 'wire.webapp.conversation.image.send'
  CONVERSATION_LIST:
    SHOW: 'wire.webapp.conversation-list.show'
    ARCHIVE:
      HIDE: 'wire.webapp.conversation-list.archive.hide'
  CONTEXT_MENU: 'wire.webapp.context-menu'
  DEBUG:
    UPDATE_LAST_CALL_STATUS: 'wire.webapp.debug.update-last-call-status'
  EXTENSIONS:
    SHOW: 'wire.webapp.extionsions.show'
    GIPHY:
      SHOW: 'wire.webapp.extionsions.giphy.show'
      SEND: 'wire.webapp.extionsions.giphy.send'
  EVENT:
    INJECT: 'wire.webapp.event.inject'
    NOTIFICATION_HANDLING_STATE: 'wire.webapp.event.notification_handling'
  LIST:
    BLUR: 'wire.webapp.list.blur'
    SCROLL: 'wire.webapp.list.scroll'
    FULLSCREEN_ANIM_DISABLED: 'wire.webapp.list.anim-disabled'
  LOADED: 'wire.webapp.loaded'
  PEOPLE:
    HIDE: 'wire.webapp.participant-et.hide'
    SHOW: 'wire.webapp.participant-et.show'
    TOGGLE: 'wire.webapp.participants.toggle'
  PENDING:
    SHOW: 'wire.webapp.pending.show'
  LEFT:
    HIDE: 'wire.webapp.left.hide'
    FADE_IN: 'wire.webapp.left.fade-in'
  LOGOUT:
    ASK_TO_CLEAR_DATA: 'wire.webapp.logout.ask-to-clear-data'
  WELCOME:
    SHOW: 'wire.webapp.profile.welcome.show'
    UNSPLASH_LOADED: 'wire.webapp.profile.welcome.unsplash-loaded'
  PROFILE:
    SHOW: 'wire.webapp.profile.show'
    HIDE: 'wire.webapp.profile.hide'
    FADE_IN: 'wire.webapp.profile.fade-in'
    SETTINGS:
      SHOW: 'wire.webapp.profile.settings.show'
    UPLOAD_PICTURE: 'wire.webapp.profile.upload-picture'
  PROPERTIES:
    CHANGE:
      APP_BANNER: 'wire.webapp.properties.change.app-banner'
      DEBUG: 'wire.webapp.properties.change.debug'
    UPDATE:
      GOOGLE: 'wire.webapp.properties.update.google'
      OSX_CONTACTS: 'wire.webapp.properties.update.google'
      CALL_MUTE: 'wire.webapp.properties.update.call-mute'
      SEND_DATA: 'wire.webapp.properties.update.send-data'
      SOUND_ALERTS: 'wire.webapp.properties.update.sound-alerts'
      HAS_CREATED_CONVERSATION: 'wire.webapp.properties.update.has-created-conversation'
    UPDATED: 'wire.webapp.properties.updated'
  SEARCH:
    HIDE: 'wire.webapp.search.hide'
    ONBOARDING: 'wire.webapp.search.onboarding'
    SHOW: 'wire.webapp.people-picker.show'
    BADGE:
      HIDE: 'wire.webapp.search.badge.hide'
      SHOW: 'wire.webapp.search.badge.show'
  SIGN_OUT: 'wire.webapp.logout'
  SYSTEM_NOTIFICATION:
    CLICK: 'wire.webapp.system-notification.click'
    NOTIFY: 'wire.webapp.system-notification.notify'
    REMOVE_READ: 'wire.webapp.system.notification.remove_read'
    REQUEST_PERMISSION: 'wire.webapp.system-notification.request_permission'
    SHOW: 'wire.webapp.system-notification.show'
  TELEMETRY:
    BACKEND_REQUESTS: 'wire.webapp.telemetry.backend_requests'
  USER:
    UNBLOCKED: 'wire.webapp.user.unblocked'
    EVENT_FROM_BACKEND: 'wire.webapp.user.event-from-backend'
  WARNINGS:
    SHOW: 'wire.webapp.warning.show'
    DISMISS: 'wire.webapp.warning.dismiss'
    MODAL: 'wire.webapp.warning.modal'
  WINDOW:
    RESIZE:
      HEIGHT: 'wire.webapp.window.resize.height'
      WIDTH: 'wire.webapp.window.resize.width'
  SELF:
    CLIENT_ADD: 'wire.webapp.self.client-add'
    CLIENT_REMOVE: 'wire.webapp.self.client-remove'
  SHORTCUT:
    ADD_PEOPLE: 'wire.webapp.shortcut.add-people'
    ARCHIVE: 'wire.webapp.shortcut.archive'
    CALL_IGNORE: 'wire.webapp.shortcut.call-ignore'
    CALL_MUTE: 'wire.webapp.shortcut.call-mute'
    DEBUG: 'wire.webapp.shortcut.debug'
    NEXT: 'wire.webapp.shortcut.next'
    PEOPLE: 'wire.webapp.shortcut.people'
    PICTURE: 'wire.webapp.shortcut.picture'
    PING: 'wire.webapp.shortcut.ping'
    PREV: 'wire.webapp.shortcut.prev'
    SILENCE: 'wire.webapp.shortcut.silence'
    START: 'wire.webapp.shortcut.start'
  STORAGE:
    SAVE_ENTITY: 'wire.webapp.storage.save-entity'
