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

z.string.wire = 'Wire';
z.string.wireMacos = 'Wire for macOS';
z.string.wireWindows = 'Wire for Windows';
z.string.wireLinux = 'Wire for Linux';
z.string.nonexistentUser = 'Deleted User';
z.string.and = 'and';

// Alert view when trying to set a profile image that's too small
z.string.alertUploadFileFormat = 'Can’t use this picture.\nPlease choose a PNG or JPEG file.';
z.string.alertUploadTooSmall = 'Can’t use this picture.\nPlease choose a picture that’s at least 320 x 320 px.';
z.string.alertUploadTooLarge = 'This picture is too large.\nYou can upload files up to {{number}} MB.';
z.string.alertGifTooLarge = 'Animation is too large.\nMaximum size is {{number}} MB.';

// Auth
// Authentication: ACCOUNT section
z.string.authAccountCountryCode = 'Country Code';
z.string.authAccountDeletion = 'You were signed out because your account was deleted.';
z.string.authAccountExpiration = 'You were signed out because your session expired. Please log in again.';
z.string.authAccountPasswordForgot = 'Forgot password';
z.string.authAccountPublicComputer = 'This is a public computer';
z.string.authAccountSignIn = 'Log in';
z.string.authAccountSignInEmail = 'Email';
z.string.authAccountSignInPhone = 'Phone';

// Authentication: BLOCKED section
z.string.authBlockedCookies = 'Enable cookies to log in to Wire.';
z.string.authBlockedDatabase = 'Wire needs access to local storage to display your messages. Local storage is not available in private mode.';
z.string.authBlockedTabs = 'Wire is already open in another tab.';

// Authentication: VERIFY section
z.string.authVerifyAccountAdd = 'Add';
z.string.authVerifyAccountDetail = 'This lets you use Wire on multiple devices.';
z.string.authVerifyAccountHeadline = 'Add email address and password.';
z.string.authVerifyAccountLogout = 'Log out';
z.string.authVerifyCodeDescription = 'Enter the verification code\nwe sent to {{number}}.';
z.string.authVerifyCodeResend = 'No code showing up?';
z.string.authVerifyCodeResendDetail = 'Resend';
z.string.authVerifyCodeResendTimer = 'You can request a new code {{expiration}}.';
z.string.authVerifyCodeChangePhone = 'Change phone number';
z.string.authVerifyPasswordHeadline = 'Enter your password';

// Authentication: LIMIT section
z.string.authLimitDevicesHeadline = 'Devices';
z.string.authLimitDescription = 'Remove one of your other devices to start using Wire on this one.';
z.string.authLimitButtonManage = 'Manage devices';
z.string.authLimitButtonSignOut = 'Log out';
z.string.authLimitDevicesCurrent = '(Current)';

// Authentication: HISTORY section
z.string.authHistoryHeadline = 'It’s the first time you’re using Wire on this device.';
z.string.authHistoryDescription = 'For privacy reasons, your conversation history will not appear here.';
z.string.authHistoryReuseHeadline = 'You’ve used Wire on this device before.';
z.string.authHistoryReuseDescription = 'Messages sent in the meantime will not appear here.';
z.string.authHistoryButton = 'OK';

// Authentication: POSTED section
z.string.authPostedResend = 'Resend to {{email}}';
z.string.authPostedResendAction = 'No email showing up?';
z.string.authPostedResendDetail = 'Check your email inbox and follow the instructions.';
z.string.authPostedResendHeadline = 'You’ve got mail.';

// Authentication: Misc
z.string.authPlaceholderEmail = 'Email';
z.string.authPlaceholderPasswordPut = 'Password';
z.string.authPlaceholderPasswordSet = 'Password (at least 8 characters)';
z.string.authPlaceholderPhone = 'Phone Number';

// Authentication: Validation errors
z.string.authErrorCode = 'Invalid Code';
z.string.authErrorCountryCodeInvalid = 'Invalid Country Code';
z.string.authErrorEmailExists = 'Email address already taken';
z.string.authErrorEmailForbidden = 'Sorry. This email address is forbidden.';
z.string.authErrorEmailMalformed = 'Please enter a valid email address.';
z.string.authErrorEmailMissing = 'Please enter an email address.';
z.string.authErrorMisc = 'Problems with the connection. Please try again.';
z.string.authErrorNameShort = 'Enter a name with at least 2 characters';
z.string.authErrorOffline = 'No Internet connection';
z.string.authErrorPasswordShort = 'Choose a password with at least 8 characters.';
z.string.authErrorPasswordWrong = 'Wrong password. Please try again.';
z.string.authErrorPending = 'Account is not yet verified';
z.string.authErrorPhoneNumberBudget = 'You logged in too often. Try again later.';
z.string.authErrorPhoneNumberForbidden = 'Sorry. This phone number is forbidden.';
z.string.authErrorPhoneNumberInvalid = 'Invalid Phone Number';
z.string.authErrorPhoneNumberUnknown = 'Unknown Phone Number';
z.string.authErrorSuspended = 'This account is no longer authorized to log in.';
z.string.authErrorSignIn = 'Please verify your details and try again.';

// Call stuff
z.string.callStateOutgoing = 'Ringing…';
z.string.callStateConnecting = 'Connecting…';
z.string.callStateIncoming = 'Calling…';
z.string.callDecline = 'Decline';
z.string.callAccept = 'Accept';
z.string.callJoin = 'Join';
z.string.callChooseSharedScreen = 'Choose a screen to share';
z.string.callParticipants = '{{number}} on call';

// Warnings
z.string.modalButtonCancel = 'Cancel';
z.string.modalButtonOk = 'Ok';
z.string.modalButtonSend = 'Send';

// Block a user
z.string.modalBlockConversationHeadline = 'Block {{user}}?';
z.string.modalBlockConversationMessage = '{{user}} won’t be able to contact you or add you to group conversations.';
z.string.modalBlockConversationButton = 'Block';
// Bots confirm
z.string. modalBotsConfirmHeadline = 'Add Service';
z.string.modalBotsConfirmMessage = 'Are you sure you want to start a new conversation with {{name}}?';
z.string.modalBotsConfirmButton = 'Confirm';
// Bots unavailable
z.string.modalBotsUnavailableHeadline = 'Bots currently unavailable';
z.string.modalBotsUnavailableMessage = 'Thank you for your interest in bots. The service is currently suspended while we work on the next version. Stay tuned.';
// Cannot create the call because there is nobody to call (conversation_empty)
z.string.modalCallConversationEmptyHeadline = 'No one to call';
z.string.modalCallConversationEmptyMessage = 'There is no one left here.';
// Cannot video call in group conversations
z.string.modalCallNoVideoInGroupHeadline = 'No video calls in groups';
z.string.modalCallNoVideoInGroupMessage = 'Video calls are not available in group conversations.';
// Second incoming call
z.string.modalCallSecondIncomingHeadline = 'Answer call?';
z.string.modalCallSecondIncomingMessage = 'Your current call will end.';
z.string.modalCallSecondIncomingAction = 'Answer';
// Second ongoing call
z.string.modalCallSecondOngoingHeadline = 'Hang up call on another device?';
z.string.modalCallSecondOngoingMessage = 'You can only be in one call at a time.';
z.string.modal_call_second_ongoing_action = 'Hang Up';
// Second outgoing call
z.string.modal_call_second_outgoing_headline = 'Hang up current call?';
z.string.modal_call_second_outgoing_message = 'You can only be in one call at a time.';
z.string.modal_call_second_outgoing_action = 'Hang Up';
// Clear a conversation
z.string.modal_clear_conversation_headline = 'Delete content?';
z.string.modal_clear_conversation_message = 'This will clear the conversation history and remove it from your list.';
z.string.modal_clear_conversation_option = 'Also leave the conversation';
z.string.modal_clear_conversation_button = 'Delete';
// Connected device
z.string.modal_connected_device_headline = 'Your account was used on:';
z.string.modal_connected_device_from = 'From:';
z.string.modal_connected_device_message = 'If you didn’t do this, remove the device and reset your password.';
z.string.modal_connected_device_manage_devices = 'manage devices';
// Delete account
z.string.modal_delete_account_action = 'Delete';
z.string.modal_delete_account_headline = 'Delete account';
z.string.modal_delete_account_message = 'We will send a message via email or SMS. Follow the link to permanently delete your account.';
// Delete message
z.string.modal_delete_button = 'Delete';
z.string.modal_delete_headline = 'Delete only for me?';
z.string.modal_delete_message = 'This cannot be undone.';
// Delete message
z.string.modal_delete_everyone_button = 'Delete';
z.string.modal_delete_everyone_headline = 'Delete for everyone?';
z.string.modal_delete_everyone_message = 'This cannot be undone.';
// Too long message
z.string.modal_too_long_headline = 'Message too long';
z.string.modal_too_long_message = 'You can send messages up to {{number}} characters long.';
// Leave a conversation
z.string.modal_leave_conversation_headline = 'Leave "{{name}}" conversation?';
z.string.modal_leave_conversation_message = 'The participants will be notified and the conversation removed from your list.';
z.string.modal_leave_conversation_button = 'Leave';
// Logout
z.string.modal_logout_headline = 'Clear Data?';
z.string.modal_logout_message = 'Delete all your personal information and conversations on this device.';
z.string.modal_logout_button = 'Log out';
// New device
z.string.modal_new_device_headline = '{{user}} started using a new device';
z.string.modal_new_device_headline_many = '{{users}} started using new devices';
z.string.modal_new_device_headline_you = '{{user}} started using a new device';
z.string.modal_new_device_message = 'Do you still want to send your messages?';
z.string.modal_new_device_call_accept = 'Accept call';
z.string.modal_new_device_call_anyway = 'Call anyway';
z.string.modal_new_device_call_incoming = 'Do you still want to accept the call?';
z.string.modal_new_device_call_outgoing = 'Do you still want to place the call?';
z.string.modal_new_device_show_device = 'show device';
z.string.modal_new_device_send_anyway = 'send anyway';
// Not connected
z.string.modal_not_connected_headline = 'No one added to conversation';
z.string.modal_not_connected_message_one = '{{name}} does not want to be added to conversations.';
z.string.modal_not_connected_message_many = 'One of the people you selected does not want to be added to conversations.';
// Remove device
z.string.modal_remove_device_button = 'Remove device';
z.string.modal_remove_device_headline = 'Remove "{{device}}"';
z.string.modal_remove_device_message = 'Your password is required to remove the device.';
// Service unavailable
z.string.modal_service_disabled_headline = 'Adding service not possible';
z.string.modal_service_disabled_message = 'The service is unavailable a the moment.';
// Session Reset
z.string.modal_session_reset_headline = 'The session has been reset';
z.string.modal_session_reset_message_1 = 'If the problem is not resolved,';
z.string.modal_session_reset_message_link = 'contact';
z.string.modal_session_reset_message_2 = 'us.';
// Too many bots in conversation
z.string.modal_too_many_bots_headline = 'Adding service not possible';
z.string.modal_too_many_bots_message = 'The bot is already part of this conversation.';
// Too many members in conversation
z.string.modal_too_many_members_headline = 'Full house';
z.string.modal_too_many_members_message = 'Up to {{number1}} people can join a conversation. There is room for {{number2}} more people in here.';
// Parallel uploads
z.string.modalUploadsParallel = 'You can send up to {{number}} files at once.';

// Connection requests
z.string.connectionRequestConnect = 'Connect';
z.string.connectionRequestIgnore = 'Ignore';

// Guests
z.string.conversation_guest_indicator = 'Guest';

// Conversation
z.string.conversation_you_nominative = 'you';
z.string.conversation_you_dative = 'you';
z.string.conversation_you_accusative = 'you';

z.string.conversationBotUser = 'Bot';
z.string.conversationConnectionAccepted = 'Connected';
z.string.conversationConnectionBlocked = 'Blocked';
z.string.conversationConnectionCancelRequest = 'Cancel connection request';
z.string.conversation_create = ' started a conversation with {{users}}';
z.string.conversation_create_you = ' started a conversation with {{users}}';
z.string.conversation_device_started_using_one = ' started using';
z.string.conversation_device_started_using_many = ' started using';
z.string.conversation_device_unverified = ' unverified one of';
z.string.conversation_device_your_devices = ' your devices';
z.string.conversation_device_user_devices = ' {{user}}´s devices';
z.string.conversation_device_new_device_one = ' a new device';
z.string.conversation_device_new_device_many = ' new devices';
z.string.conversation_device_new_people_joined = 'new people joined.';
z.string.conversation_device_new_people_joined_verify = ' verify devices';
z.string.conversation_just_now = 'Just now';
z.string.conversation_location_link = 'Open Map';
z.string.conversation_member_join = ' added {{users}}';
z.string.conversation_member_join_you = ' added {{users}}';
z.string.conversation_member_leave_left = ' left';
z.string.conversation_member_leave_left_you = ' left';
z.string.conversation_member_leave_removed = ' removed {{users}}';
z.string.conversation_member_leave_removed_you = ' removed {{users}}';
z.string.conversation_message_delivered = 'Delivered';
z.string.conversation_rename = ' renamed the conversation';
z.string.conversation_rename_you = ' renamed the conversation';
z.string.conversation_resume = 'Start a conversation with {{users}}';
z.string.conversation_team_leave = ' was removed from the team';
z.string.conversation_ping = ' pinged';
z.string.conversation_ping_you = ' pinged';
z.string.conversation_today = 'today';
z.string.conversation_verified = 'Verified';
z.string.conversation_voice_channel_deactivate = ' called';
z.string.conversation_voice_channel_deactivate_you = ' called';
z.string.conversation_yesterday = 'Yesterday';
z.string.conversation_unable_to_decrypt_1 = 'a message from {{user}} was not received.';
z.string.conversation_unable_to_decrypt_2 = '{{user}}´s device identity changed. Undelivered message.';
z.string.conversation_unable_to_decrypt_link = 'Why?';
z.string.conversation_unable_to_decrypt_error_message = 'Error';
z.string.conversation_unable_to_decrypt_reset_session = 'Reset session';
z.string.conversation_missed_messages = 'You haven’t used this device for a while. Some messages may not appear here.';
z.string. conversationAssetUploading = 'Uploading…';
z.string.conversationAssetDownloading = 'Downloading…';
z.string.conversationAssetUploadFailed = 'Upload Failed';
z.string.conversationAssetUploadTooLarge = 'You can send files up to {{number}}';
z.string.conversation_playback_error = 'Unable to play';
z.string.conversationContextMenuEdit = 'Edit';
z.string.conversationContextMenuDelete = 'Delete for Me';
z.string.conversationContextMenuDeleteEveryone = 'Delete for Everyone';
z.string.conversationContextMenuDownload = 'Download';
z.string.conversation_context_menu_like = 'Like';
z.string.conversation_context_menu_unlike = 'Unlike';
z.string.conversation_delete_timestamp = 'Deleted: {{date}}';
z.string.conversation_edit_timestamp = 'Edited: {{date}}';
z.string.conversation_likes_caption = '{{number}} people';
z.string.conversation_send_pasted_file = 'Pasted image at {{date}}';
z.string.conversation_someone = 'Someone';
z.string.conversation_tweet_author = ' on Twitter';

// Conversation creation
z.string.conversation_creation_preferences_action = 'Next';
z.string.conversation_creation_preferences_header = 'Create conversation';
z.string.conversation_creation_preferences_placeholder = 'Conversation name';
z.string.conversation_creation_participants_action_create = 'Create';
z.string.conversation_creation_participants_action_skip = 'Skip';
z.string.conversation_creation_participants_header = 'Add people';
z.string.conversation_creation_participants_header_with_counter = 'Add people ({{number}})';
z.string.conversation_creation_participants_placeholder = 'Search by name';

// Collection
z.string.collectionShowAll = 'Show all {{number}}';
z.string.collectionSectionLinks = 'Links';
z.string.collectionSectionImages = 'Pictures';
z.string.collectionSectionFiles = 'Files';
z.string.collectionSectionAudio = 'Audio messages';

// Full Search
z.string.fullsearchPlaceholder = 'Search text messages';
z.string.fullsearchNoResults = 'No results.';

// Archive
z.string.archiveHeader = 'Archive';

// Conversations
z.string.conversations_all_archived = 'Everything archived';
z.string.conversations_contacts = 'Contacts';
z.string.conversations_connection_request_many = '{{number}} people waiting';
z.string.conversations_connection_request_one = '1 person waiting';
z.string.conversations_empty_conversation = 'Group conversation';
z.string.conversations_empty_conversation_description = 'Everyone left';
z.string.conversations_no_conversations = 'Start a conversation or create a group.';
z.string.conversations_popover_archive = 'Archive';
z.string.conversations_popover_block = 'Block';
z.string.conversations_popover_cancel = 'Cancel request';
z.string.conversations_popover_clear = 'Delete';
z.string.conversations_popover_leave = 'Leave';
z.string.conversations_popover_notify = 'Unmute';
z.string.conversations_popover_silence = 'Mute';
z.string.conversations_popover_unarchive = 'Unarchive';

// Conversations secondary line
z.string.conversations_secondary_line_missed_call = '{{number}} missed call';
z.string.conversations_secondary_line_missed_calls = '{{number}} missed calls';
z.string.conversations_secondary_line_new_message = '{{number}} new message';
z.string.conversations_secondary_line_new_messages = '{{number}} new messages';
z.string.conversations_secondary_line_ping = '{{number}} ping';
z.string.conversations_secondary_line_pings = '{{number}} pings';
z.string.conversations_secondary_line_people_left = '{{number}} people left';
z.string.conversations_secondary_line_person_left = '{{user}} left';
z.string.conversations_secondary_line_person_removed = '{{user}} was removed';
z.string.conversations_secondary_line_people_added = '{{user}} people were added';
z.string.conversations_secondary_line_person_added = '{{user}} was added';
z.string.conversations_secondary_line_person_added_you = '{{user}} added you';
z.string.conversations_secondary_line_renamed = '{{user}} renamed conversation';
z.string.conversations_secondary_line_timed_message = 'Timed message';
z.string.conversations_secondary_line_you_left = 'You left';
z.string.conversations_secondary_line_you_were_removed = 'You were removed';

// Takeover
z.string.takeoverSub = 'Claim your unique name on Wire.';
z.string.takeoverLink = 'Learn more';
z.string.takeoverButtonChoose = 'Choose your own';
z.string.takeoverButtonKeep = 'Keep this one';

// Invites
z.string.inviteMetaKeyMac = 'Cmd';
z.string.inviteMetaKeyPc = 'Ctrl';
z.string.inviteHintSelected = 'Press {{meta_key}} + C to copy';
z.string.inviteHintUnselected = 'Select and Press {{meta_key}} + C';
z.string.inviteHeadline = 'Invite people to Wire';
z.string.inviteMessage = 'I’m on Wire, search for {{username}} or visit get.wire.com.';
z.string.inviteMessageNoEmail = 'I’m on Wire. Visit get.wire.com to connect with me.';

// Extensions
z.string.extensionsBubbleButtonGif = 'Gif';

// Extensions Giphy
z.string.extensionsGiphyButtonOk = 'Send';
z.string.extensionsGiphyButtonMore = 'Try Another';
z.string.extensionsGiphyMessage = '{{tag}} • via giphy.com';
z.string.extensionsGiphyNoGifs = 'Oops, no gifs';
z.string.extensionsGiphyRandom = 'Random';

// People View
z.string.search_open = 'Open';
z.string.search_open_group = 'Create Group';
z.string.people_confirm_label = 'Add people to group';
z.string.people_people = '{{number}} People';
z.string.people_search_placeholder = 'Search by name';
z.string.people_everyone_participates = 'Everyone you’re\nconnected to is already in\nthis conversation.';
z.string.people_no_matches = 'No matching results.\nTry entering a different name.';
z.string.people_invite = 'Invite people to join Wire';
z.string.people_invite_detail = 'Sharing your contacts helps you connect with others. We anonymize all the information and do not share it with anyone else.';
z.string.people_invite_button_contacts = 'From Contacts';
z.string.people_invite_button_gmail = 'From Gmail';
z.string.people_invite_headline = 'Bring your friends';
z.string.people_service_confirm_button = 'Add service';
z.string.people_service_removal_button = 'Remove service';
z.string.people_service_new_conversation = 'Create a new conversation';
z.string.people_services = 'Services';
z.string.people_share = 'Share Contacts';
z.string.people_tabs_details = 'Details';
z.string.people_tabs_devices = 'Devices';
z.string.people_tabs_devices_headline = 'Wire gives every device a unique fingerprint. Compare them with {{user}} and verify your conversation.';
z.string.people_tabs_devices_learn_more = 'Learn more';
z.string.people_tabs_devices_why_verify = 'Why verify conversation?';
z.string.people_tabs_no_devices_headline = '{{user}} is using an old version of Wire. No devices are shown here.';
z.string.people_tabs_device_detail_all_my_devices = 'Show all my devices';
z.string.people_tabs_device_detail_device_fingerprint = 'Device fingerprint';
z.string.people_tabs_device_detail_headline = 'Verify that this matches the fingerprint shown on {{html1}}{{user}}’s device{{html2}}.';
z.string.people_tabs_device_detail_how_to = 'How do I do that?';
z.string.people_tabs_device_detail_reset_session = 'Reset session';
z.string.people_tabs_device_detail_show_my_device = 'Show my device fingerprint';
z.string.people_tabs_device_detail_verify = 'Verified';
z.string.people_tabs_people = 'People';
z.string.people_tabs_services = 'Services';
z.string.people_verified = 'Verified';

// Block user
z.string.people_block_headline = 'Block?';
z.string.people_block_message = '{{user}} won’t be able to contact you or add you to group conversations.';

// Accept a pending connection dialogue
z.string.people_connect_headline = 'Accept?';
z.string.people_connect_message = 'This will connect you and open the conversation with {{user}}.';

// Cancel a pending request
z.string.people_cancel_request_headline = 'Cancel Request?';
z.string.people_cancel_request_message = 'Remove connection request to {{user}}.';

// Leave the conversation dialogue
z.string.people_leave_headline = 'Leave the conversation?';
z.string.people_leave_message = 'You won’t be able to send or receive messages in this conversation.';

// Remove from conversation dialogue
z.string.people_remove_headline = 'Remove?';
z.string.people_remove_message = '{{user}} won’t be able to send or receive messages in this conversation.';

// Unblock user
z.string.people_unblock_headline = 'Unblock?';
z.string.people_unblock_message = '{{user}} will be able to contact you and add you to group conversations again.';

// Button labels for the actions
z.string.people_button_add = 'Add';
z.string.people_button_add_people = 'Add people';
z.string.people_button_block = 'Block';
z.string.people_button_cancel = 'Cancel';
z.string.people_button_connect = 'Connect';
z.string.people_button_create = 'Create group';
z.string.people_button_ignore = 'Ignore';
z.string.people_button_leave = 'Leave';
z.string.people_button_open = 'Open Conversation';
z.string.people_button_pending = 'Pending';
z.string.people_button_profile = 'Profile';
z.string.people_button_remove = 'Remove';
z.string.people_button_unblock = 'Unblock';
z.string.people_button_no = 'No';
z.string.people_button_yes = 'Yes';

// Settings
z.string.preferences_about = 'About';
z.string.preferences_account = 'Account';
z.string.preferences_av = 'Audio / Video';
z.string.preferences_device_details = 'Device Details';
z.string.preferences_devices = 'Devices';
z.string.preferences_headline = 'Preferences';
z.string.preferences_options = 'Options';

z.string.preferencesAboutCopyright = '© Wire Swiss GmbH';
z.string.preferencesAboutPrivacyPolicy = 'Privacy policy';
z.string.preferencesAboutSupport = 'Support';
z.string.preferencesAboutSupportWebsite = 'Support website';
z.string.preferencesAboutSupportContact = 'Contact Support';
z.string.preferencesAboutTermsOfUse = 'Terms of use';
z.string.preferencesAboutVersion = 'Version {{version}}';
z.string.preferencesAboutWebsite = 'Wire website';

z.string.preferences_account_avaibility_unset = 'Set a status';
z.string.preferences_account_create_team = 'Create a team';
z.string.preferences_account_delete = 'Delete account';
z.string.preferences_account_log_out = 'Log out';
z.string.preferences_account_manage_team = 'Manage team';
z.string.preferences_account_reset_password = 'Reset password';
z.string.preferences_account_team = 'in {{name}}';
z.string.preferences_account_username_placeholder = 'Your full name';
z.string.preferences_account_username_hint = 'At least 2 characters. a—z, 0—9 and _ only.';
z.string.preferences_account_username_available = 'Available';
z.string.preferences_account_username_error_taken = 'Already taken';

z.string.preferences_av_camera = 'Camera';
z.string.preferences_av_microphone = 'Microphone';
z.string.preferences_av_permission_detail = 'Enable from your browser Preferences';
z.string.preferences_av_speakers = 'Speakers';

z.string.preferences_devices_activated_in = 'in {{location}}';
z.string.preferences_devices_activated_on = 'Activated on {{date}}';
z.string.preferences_devices_active = 'Active';
z.string.preferences_devices_active_detail = 'If you don’t recognize a device above, remove it and reset your password.';
z.string.preferences_devices_current = 'Current';
z.string.preferences_devices_fingerprint = 'Key fingerprint';
z.string.preferences_devices_fingerprint_detail = 'Wire gives every device a unique fingerprint. Compare them and verify your devices and conversations.';
z.string.preferences_devices_id = 'ID: ';
z.string.preferences_devices_remove = 'Remove';
z.string.preferences_devices_remove_cancel = 'Cancel';
z.string.preferences_devices_remove_detail = 'Remove this device if you have stopped using it. You will be logged out of this device immediately.';
z.string.preferences_devices_session_confirmation = 'The session has been reset.';
z.string.preferences_devices_session_detail = 'If fingerprints don’t match, reset the session to generate new encryption keys on both sides.';
z.string.preferences_devices_session_reset = 'Reset session';
z.string.preferences_devices_session_ongoing = 'Resetting session…';
z.string.preferences_devices_verification = 'Verified';

z.string.preferences_options_audio = 'Sound alerts';
z.string.preferences_options_audio_all = 'All';
z.string.preferences_options_audio_all_detail = 'All sounds';
z.string.preferences_options_audio_none = 'None';
z.string.preferences_options_audio_none_detail = 'Sshhh!';
z.string.preferences_options_audio_some = 'Some';
z.string.preferences_options_audio_some_detail = 'Pings and calls';
z.string.preferences_options_contacts = 'Contacts';
z.string.preferences_options_contacts_gmail = 'Import from Gmail';
z.string.preferences_options_contacts_macos = 'Import from Contacts';
z.string.preferences_options_contacts_detail = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';
z.string.preferences_options_data = 'Usage and crash reports';
z.string.preferences_options_data_checkbox = 'Send anonymous data';
z.string.preferences_options_data_detail = 'Make Wire better by sending anonymous information.';
z.string.preferences_options_popular = 'By popular demand';
z.string.preferences_options_emoji_replace_checkbox = 'Replace type emoticons with emojis';
z.string.preferences_options_emoji_replace_detail = ':-) → {{icon}}';
z.string.preferences_options_previews_send_checkbox = 'Create previews for links you send';
z.string.preferences_options_previews_send_detail = 'Previews may still be shown for links from other people.';
z.string.preferences_options_notifications = 'Notifications';
z.string.preferences_options_notifications_none = 'Off';
z.string.preferences_options_notifications_obfuscate = 'Hide details';
z.string.preferences_options_notifications_obfuscate_message = 'Show sender';
z.string.preferences_options_notifications_on = 'Show sender and message';

// Search
z.string.search_group_hint = 'Keep typing or pick more people to create a group';
z.string.search_connect = 'Connect';
z.string.search_connections = 'Connections';
z.string.search_contacts = 'Contacts';
z.string.search_groups = 'Groups';
z.string.search_people = 'People';
z.string.search_placeholder = 'Search by name or username';
z.string.search_services = 'Services';
z.string.search_team_groups = 'Team conversations';
z.string.search_team_members = 'Team members';
z.string.search_top_people = 'Top people';
z.string.search_try_search = 'Find people by\nname or username';
z.string.search_no_contacts_on_wire = 'You have no contacts on Wire.\nTry finding people by\nname or username.';
z.string.search_member_invite = 'Invite people to join the team';
z.string.search_others = 'Connect';

// Google contacts upload
z.string.uploadGoogleHeadline = 'Find people\nto talk to.';
z.string.uploadGoogleMessage = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';
z.string.uploadGoogleHeadlineError = 'Something\nwent wrong.';
z.string.uploadGoogleMessageError = 'We did not receive your information. Please try importing your contacts again.';
z.string.uploadGoogleButtonAgain = 'Try again';

// URLs & Warnings: Permission requests & permission callbacks
z.string.urlSupportRoot = '/';
z.string.urlSupportArticles = '/hc/en-us/articles/';
z.string.urlSupportRequests = '/hc/en-us/requests/';
z.string.urlWebappRoot = '/';
z.string.urlWebsiteRoot = '/';
z.string.urlWebsiteCreateTeam = '/create-team/';
z.string.urlWebsitePrivacy = '/privacy';
z.string.warningCallDetail = 'Your browser needs access to the microphone to make calls.';
z.string.warningCallHeadline = 'Can’t call without microphone';
z.string.warningCallUnsupportedIncoming = '{{user}} is calling. Your browser doesn’t support calls.';
z.string.warningCallUnsupportedOutgoing = 'You cannot call because your browser doesn’t support calls.';
z.string.warningCallIssues = 'This version of Wire can not participate in the call. Please use';
z.string.warningCallUpgradeBrowser = 'To call, please update Google Chrome.';
z.string.warningConnectivityConnectionLost = 'Trying to connect. Wire may not be able to deliver messages.';
z.string.warningConnectivityNoInternet = 'No Internet. You won’t be able to send or receive messages.';
z.string.warningLearnMore = 'Learn more';
z.string.warningLifecycleUpdate = 'A new version of Wire is available.';
z.string.warningLifecycleUpdateNotes = 'What’s new';
z.string.warningLifecycleUpdateLink = 'Update now';
z.string.warningNotFoundCamera = 'You cannot call because your computer does not have a camera.';
z.string.warningNotFoundMicrophone = 'You cannot call because your computer does not have a microphone.';
z.string.warningPermissionDeniedCamera = 'You cannot call because your browser does not have access to the camera.';
z.string.warningPermissionDeniedMicrophone = 'You cannot call because your browser does not have access to the microphone.';
z.string.warningPermissionDeniedScreen = 'Your browser needs permission to share your screen.';
z.string.warningPermissionRequestCamera = '{{icon}} Allow access to camera';
z.string.warningPermissionRequestMicrophone = '{{icon}} Allow access to microphone';
z.string.warningPermissionRequestNotification = '{{icon}} Allow notifications';
z.string.warningPermissionRequestScreen = '{{icon}} Allow access to screen';
z.string.warningTellMeHow = 'Tell me how';

// User Availability
z.string.userAvailabilityAvailable = 'Available';
z.string.userAvailabilityAway = 'Away';
z.string.userAvailabilityBusy = 'Busy';
z.string.userAvailabilityNone = 'None';

// Browser notifications
z.string.notification_asset_add = 'Shared a picture';
z.string.notification_connection_accepted = 'Accepted your connection request';
z.string.notification_connection_connected = 'You are now connected';
z.string.notification_connection_request = 'Wants to connect';
z.string.notification_conversation_create = '{{user}} started a conversation';
z.string.notification_conversation_rename = '{{user}} renamed the conversation to {{name}}';
z.string.notification_member_join_many = '{{user}} added {{number}} people to the conversation';
z.string.notification_member_join_one = '{{user1}} added {{user2}} to the conversation';
z.string.notification_member_leave_removed_you = '{{user}} removed you from the conversation';
z.string.notification_obfuscated = 'Sent you a message';
z.string.notification_obfuscated_title = 'Someone';
z.string.notification_ping = 'Pinged';
z.string.notification_reaction = '{{reaction}} your message';
z.string.notification_shared_audio = 'Shared an audio message';
z.string.notification_shared_file = 'Shared a file';
z.string.notification_shared_location = 'Shared a location';
z.string.notification_shared_video = 'Shared a video';
z.string.notification_voice_channel_activate = 'Calling';
z.string.notification_voice_channel_deactivate = 'Called';

// Tooltips
z.string.tooltip_conversation_all_verified = 'All fingerprints are verified';
z.string.tooltip_conversation_call = 'Call';
z.string.tooltip_conversation_ephemeral = 'Timed message';
z.string.tooltip_conversation_file = 'Add file';
z.string.tooltip_conversation_input_placeholder = 'Type a message';
z.string.tooltip_conversation_input_placeholder_available = '{{user}} is available';
z.string.tooltip_conversation_input_placeholder_away = '{{user}} is away';
z.string.tooltip_conversation_input_placeholder_busy = '{{user}} is busy';
z.string.tooltip_conversation_people = 'People ({{shortcut}})';
z.string.tooltip_conversation_picture = 'Add picture';
z.string.tooltip_conversation_ping = 'Ping ({{shortcut}})';
z.string.tooltip_conversation_search = 'Search';
z.string.tooltip_conversation_video_call = 'Video Call';

z.string.tooltip_conversations_archive = 'Archive ({{shortcut}})';
z.string.tooltip_conversations_archived = 'Show archive ({{number}})';
z.string.tooltip_conversations_more = 'More';
z.string.tooltip_conversations_notify = 'Unmute ({{shortcut}})';
z.string.tooltip_conversations_preferences = 'Open preferences';
z.string.tooltip_conversations_silence = 'Mute ({{shortcut}})';
z.string.tooltip_conversations_start = 'Start conversation ({{shortcut}})';

z.string.tooltipPeopleAdd = 'Add to conversation ({{shortcut}})';
z.string.tooltipPeopleAddPeople = 'Add people to conversation ({{shortcut}})';
z.string.tooltipPeopleBack = 'Back';
z.string.tooltipPeopleBlock = 'Block';
z.string.tooltipPeopleConnect = 'Connect';
z.string.tooltipPeopleLeave = 'Leave conversation';
z.string.tooltipPeopleOpen = 'Open conversation';
z.string.tooltipPeopleProfile = 'Open your profile';
z.string.tooltipPeopleRename = 'Change conversation name';
z.string.tooltipPeopleRemove = 'Remove from conversation';
z.string.tooltipPeopleUnblock = 'Unblock';

z.string.tooltipPreferencesContactsGmail = 'Log in to your Gmail account to share contacts';
z.string.tooltipPreferencesContactsMacos = 'Share all your contacts from the macOS Contacts app';
z.string.tooltipPreferencesPassword = 'Open another website to reset your password';
z.string.tooltipPreferencesPicture = 'Change your picture…';
z.string.tooltipPreferencesRename = 'Change your name';

z.string.tooltipSearchClose = 'Close (Esc)';

// App loading
z.string.initReceivedSelfUser = 'Hello, {{user}}.';
z.string.initValidatedClient = 'Fetching your connections and conversations';
z.string.initReceivedUserData = 'Checking for new messages';
z.string.initDecryption = 'Decrypting messages';
z.string.initEvents = 'Loading messages';
z.string.initUpdatedFromNotifications = 'Almost done - Enjoy Wire';
z.string.initProgress = ' — {{number1}} of {{number2}}';

z.string.ephememalUnitsNone = 'Off';
z.string.ephememalUnitsSecond = 'second';
z.string.ephememalUnitsSeconds = 'seconds';
z.string.ephememalUnitsMinute = 'minute';
z.string.ephememalUnitsMinutes = 'minutes';
z.string.ephememalUnitsHour = 'hour';
z.string.ephememalUnitsHours = 'hours';
z.string.ephememalUnitsDay = 'day';
z.string.ephememalUnitsDays = 'days';
