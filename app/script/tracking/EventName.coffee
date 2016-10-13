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
z.tracking ?= {}

###
Definition of events used for user-tracking with Localytics.
@note Event names should be descriptive (!) like "Item Purchased" instead of being programmatic like "itemPurchased".
###
z.tracking.EventName =
  ACCOUNT:
    LOGGED_IN: 'account.logged_in'
    OPENED_LOGIN: 'account.opened_login'
  APP_LAUNCH: 'appLaunch'
  CALLING:
    ENDED_CALL: 'calling.ended_call'
    ESTABLISHED_CALL: 'calling.established_successful_call'
    FAILED_REQUEST: 'calling.failed_request'
    FAILED_REQUESTING_MEDIA: 'calling.failed_requesting_media'
    FAILED_RTC: 'calling.failed_rtc'
    INITIATED_CALL: 'calling.initiated_call'
    MINIMIZED_FROM_FULLSCREEN: 'calling.minimized_from_fullscreen'
    JOINED_CALL: 'calling.joined_call'
    RECEIVED_CALL: 'calling.received_call'
    SHARED_SCREEN: 'calling.shared_screen'
  CONVERSATION:
    ADD_TO_GROUP_CONVERSATION: 'addContactToGroupConversation'
    CHARACTER_LIMIT_REACHED: 'conversation.character_limit_reached'
    CREATE_GROUP_CONVERSATION: 'createGroupConversation'
    DELETED_MESSAGE: 'conversation.deleted_message'
    EDITED_MESSAGE: 'conversation.edited_message'
    SELECTED_MESSAGE: 'conversation.selected_message'
    REACTED_TO_MESSAGE: 'conversation.reacted_to_message'
  MEDIA:
    COMPLETED_MEDIA_ACTION: 'media.completed_media_action'
    PLAYED_AUDIO_MESSAGE: 'media.played_audio_message'
    PLAYED_VIDEO_MESSAGE: 'media.played_video_message'
  E2EE:
    CANNOT_DECRYPT_MESSAGE: 'e2ee.cannot_decrypt_message'
  FILE:
    UPLOAD_CANCELLED: 'file.cancelled_file_upload'
    UPLOAD_INITIATED: 'file.initiated_file_upload'
    UPLOAD_FAILED: 'file.failed_file_upload'
    UPLOAD_SUCCESSFUL: 'file.successfully_uploaded_file'
    UPLOAD_TOO_BIG: 'file.attempted_too_big_file_upload'
    DOWNLOAD_INITIATED: 'file.initiated_file_download'
    DOWNLOAD_FAILED: 'file.failed_file_download'
    DOWNLOAD_SUCCESSFUL: 'file.successfully_downloaded_file'
  IMAGE_SENT_ERROR: 'Image Sent Error'
  NAVIGATION:
    OPENED_WIRE_WEBSITE: 'navigation.opened_wire_website'
    OPENED_TERMS: 'navigation.opened_terms'
  ONBOARDING:
    ADDED_PHOTO: 'onboarding.added_photo'
    IMPORTED_CONTACTS: 'onboarding.imported_contacts'
  PASSWORD_RESET: 'resetPassword'
  PERMISSION:
    ALLOW_NOTIFICATIONS: 'allowNotifications'
  PROFILE_PICTURE_CHANGED: 'changedProfilePicture'
  REGISTRATION:
    ENTERED_CREDENTIALS: 'registration.entered_credentials'
    OPENED_EMAIL_SIGN_UP: 'registration.opened_email_signup'
    RESENT_EMAIL_VERIFICATION: 'registration.resent_email_verification'
    SUCCEEDED: 'registration.succeeded'
  SETTINGS:
    IMPORTED_CONTACTS: 'settings.imported_contacts'
    VIEWED_DEVICE: 'settings.viewed_device'
    REMOVED_DEVICE: 'settings.removed_device'
  SOUND_SETTINGS_CHANGED: 'soundIntensityPreference'
  TELEMETRY:
    APP_INITIALIZATION: 'telemetry.app_initialization'
  TRACKING:
    OPT_IN: 'Opt-in'
    OPT_OUT: 'Opt-out'
  UPLOADED_CONTACTS: 'uploadedContacts' # "source": "Gmail"
  ANNOUNCE:
    SENT: 'announce.sent'
    CLICKED: 'announce.clicked'
