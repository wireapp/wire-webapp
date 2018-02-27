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

z.string.wire = 'Wire';
z.string.wire_macos = 'Wire for macOS';
z.string.wire_windows = 'Wire for Windows';
z.string.wire_linux = 'Wire for Linux';
z.string.nonexistent_user = 'Deleted User';
z.string.and = 'and';
z.string.enumerationAnd = ', and ';

// Auth
// Authentication: ACCOUNT section
z.string.auth_account_country_code = 'Country Code';
z.string.auth_account_deletion = 'You were signed out because your account was deleted.';
z.string.auth_account_expiration = 'You were signed out because your session expired. Please log in again.';
z.string.auth_account_password_forgot = 'Forgot password';
z.string.auth_account_public_computer = 'This is a public computer';
z.string.auth_account_sign_in = 'Log in';
z.string.auth_account_sign_in_email = 'Email';
z.string.auth_account_sign_in_phone = 'Phone';

// Authentication: BLOCKED section
z.string.auth_blocked_cookies = 'Enable cookies to log in to Wire.';
z.string.auth_blocked_database = 'Wire needs access to local storage to display your messages. Local storage is not available in private mode.';
z.string.auth_blocked_tabs = 'Wire is already open in another tab.';

// Authentication: VERIFY section
z.string.auth_verify_account_add = 'Add';
z.string.auth_verify_account_detail = 'This lets you use Wire on multiple devices.';
z.string.auth_verify_account_headline = 'Add email address and password.';
z.string.auth_verify_account_logout = 'Log out';
z.string.auth_verify_code_description = 'Enter the verification code\nwe sent to {{number}}.';
z.string.auth_verify_code_resend = 'No code showing up?';
z.string.auth_verify_code_resend_detail = 'Resend';
z.string.auth_verify_code_resend_timer = 'You can request a new code {{expiration}}.';
z.string.auth_verify_code_change_phone = 'Change phone number';
z.string.auth_verify_password_headline = 'Enter your password';

// Authentication: LIMIT section
z.string.auth_limit_devices_headline = 'Devices';
z.string.auth_limit_description = 'Remove one of your other devices to start using Wire on this one.';
z.string.auth_limit_button_manage = 'Manage devices';
z.string.auth_limit_button_sign_out = 'Log out';
z.string.auth_limit_devices_current = '(Current)';

// Authentication: HISTORY section
z.string.auth_history_headline = 'It’s the first time you’re using Wire on this device.';
z.string.auth_history_description = 'For privacy reasons, your conversation history will not appear here.';
z.string.auth_history_reuse_headline = 'You’ve used Wire on this device before.';
z.string.auth_history_reuse_description = 'Messages sent in the meantime will not appear here.';
z.string.auth_history_button = 'OK';

// Authentication: POSTED section
z.string.auth_posted_resend = 'Resend to {{email}}';
z.string.auth_posted_resend_action = 'No email showing up?';
z.string.auth_posted_resend_detail = 'Check your email inbox and follow the instructions.';
z.string.auth_posted_resend_headline = 'You’ve got mail.';

// Authentication: Misc
z.string.auth_placeholder_email = 'Email';
z.string.auth_placeholder_password_put = 'Password';
z.string.auth_placeholder_password_set = 'Password (at least 8 characters)';
z.string.auth_placeholder_phone = 'Phone Number';

// Authentication: Validation errors
z.string.auth_error_code = 'Invalid Code';
z.string.auth_error_country_code_invalid = 'Invalid Country Code';
z.string.auth_error_email_exists = 'Email address already taken';
z.string.auth_error_email_forbidden = 'Sorry. This email address is forbidden.';
z.string.auth_error_email_malformed = 'Please enter a valid email address.';
z.string.auth_error_email_missing = 'Please enter an email address.';
z.string.auth_error_misc = 'Problems with the connection. Please try again.';
z.string.auth_error_name_short = 'Enter a name with at least 2 characters';
z.string.auth_error_offline = 'No Internet connection';
z.string.auth_error_password_short = 'Choose a password with at least 8 characters.';
z.string.auth_error_password_wrong = 'Wrong password. Please try again.';
z.string.auth_error_pending = 'Account is not yet verified';
z.string.auth_error_phone_number_budget = 'You logged in too often. Try again later.';
z.string.auth_error_phone_number_forbidden = 'Sorry. This phone number is forbidden.';
z.string.auth_error_phone_number_invalid = 'Invalid Phone Number';
z.string.auth_error_phone_number_unknown = 'Unknown Phone Number';
z.string.auth_error_suspended = 'This account is no longer authorized to log in.';
z.string.auth_error_sign_in = 'Please verify your details and try again.';

// Call stuff
z.string.call_state_outgoing = 'Ringing…';
z.string.call_state_connecting = 'Connecting…';
z.string.call_state_incoming = 'Calling…';
z.string.call_decline = 'Decline';
z.string.call_accept = 'Accept';
z.string.call_join = 'Join';
z.string.call_choose_shared_screen = 'Choose a screen to share';
z.string.call_participants = '{{number}} on call';

// Modals
// Modals type defaults
z.string.modalAcknowledgeAction = 'Ok';
z.string.modalAcknowledgeHeadline = 'Something went wrong';
z.string.modalConfirmSecondary = 'Cancel';
z.string.modalOptionSecondary = 'Cancel';

// Modals content
z.string.modalAccountDeletionAction = 'Delete';
z.string.modalAccountDeletionHeadline = 'Delete account';
z.string.modalAccountDeletionMessage = 'We will send a message via email or SMS. Follow the link to permanently delete your account.';

z.string.modalAccountLogoutAction = 'Log out';
z.string.modalAccountLogoutHeadline = 'Clear Data?';
z.string.modalAccountLogoutOption = 'Delete all your personal information and conversations on this device.';

z.string.modalAccountNewDevicesSecondary = 'Manage devices';
z.string.modalAccountNewDevicesHeadline = 'Your account was used on:';
z.string.modalAccountNewDevicesFrom = 'From:';
z.string.modalAccountNewDevicesMessage = 'If you didn’t do this, remove the device and reset your password.';

z.string.modalAccountRemoveDeviceAction = 'Remove device';
z.string.modalAccountRemoveDeviceHeadline = 'Remove "{{device}}"';
z.string.modalAccountRemoveDeviceMessage = 'Your password is required to remove the device.';
z.string.modalAccountRemoveDevicePlaceholder = 'Password';

z.string.modalAssetTooLargeMessage = 'You can send files up to {{number}}';
z.string.modalAssetParallelUploadsMessage = 'You can send up to {{number}} files at once.';

z.string.modalCallEmptyConversationHeadline = 'No one to call';
z.string.modalCallEmptyConversationMessage = 'There is no one left here.';

z.string.modalCallNoGroupVideoHeadline = 'No video calls in groups';
z.string.modalCallNoGroupVideoMessage = 'Video calls are not available in group conversations.';

z.string.modalCallNoMicrophoneAction = 'Tell me how';
z.string.modalCallNoMicrophoneMessage = 'Your browser needs access to the microphone to make calls.';
z.string.modalCallNoMicrophoneHeadline = 'Can’t call without microphone';

z.string.modalCallSecondIncomingAction = 'Answer';
z.string.modalCallSecondIncomingHeadline = 'Answer call?';
z.string.modalCallSecondIncomingMessage = 'Your current call will end.';

z.string.modalCallSecondOngoingAction = 'Hang Up';
z.string.modalCallSecondOngoingHeadline = 'Hang up call on another device?';
z.string.modalCallSecondOngoingMessage = 'You can only be in one call at a time.';

z.string.modalCallSecondOutgoingAction = 'Hang Up';
z.string.modalCallSecondOutgoingHeadline = 'Hang up current call?';
z.string.modalCallSecondOutgoingMessage = 'You can only be in one call at a time.';

z.string.modalConnectCancelAction = 'Yes';
z.string.modalConnectCancelHeadline = 'Cancel Request?';
z.string.modalConnectCancelMessage = 'Remove connection request to {{user}}.';
z.string.modalConnectCancelSecondary = 'No';

z.string.modalConnectAcceptAction = 'Connect';
z.string.modalConnectAcceptHeadline = 'Accept?';
z.string.modalConnectAcceptMessage = 'This will connect you and open the conversation with {{user}}.';
z.string.modalConnectAcceptSecondary = 'Ignore';

z.string.modalConversationAddBotAction = 'Confirm';
z.string.modalConversationAddBotHeadline = 'Add Service';
z.string.modalConversationAddBotMessage = 'Are you sure you want to start a new conversation with {{name}}?';

z.string.modalConversationClearAction = 'Delete';
z.string.modalConversationClearHeadline = 'Delete content?';
z.string.modalConversationClearMessage = 'This will clear the conversation history on all your devices.';
z.string.modalConversationClearOption = 'Also leave the conversation';

z.string.modalConversationDeleteMessageAction = 'Delete';
z.string.modalConversationDeleteMessageHeadline = 'Delete only for me?';
z.string.modalConversationDeleteMessageMessage = 'This cannot be undone.';

z.string.modalConversationDeleteMessageEveryoneAction = 'Delete';
z.string.modalConversationDeleteMessageEveryoneHeadline = 'Delete for everyone?';
z.string.modalConversationDeleteMessageEveryoneMessage = 'This cannot be undone.';

z.string.modalConversationLeaveAction = 'Leave';
z.string.modalConversationLeaveHeadline = 'Leave {{name}} conversation?';
z.string.modalConversationLeaveMessage = 'You won’t be able to send or receive messages in this conversation.';

z.string.modalConversationMessageTooLongHeadline = 'Message too long';
z.string.modalConversationMessageTooLongMessage = 'You can send messages up to {{number}} characters long.';

z.string.modalConversationNewDeviceAction = 'Send anyway';
z.string.modalConversationNewDeviceHeadlineOne = '{{user}} started using a new device';
z.string.modalConversationNewDeviceHeadlineMany = '{{users}} started using new devices';
z.string.modalConversationNewDeviceHeadlineYou = '{{user}} started using a new device';
z.string.modalConversationNewDeviceIncomingCallAction = 'Accept call';
z.string.modalConversationNewDeviceIncomingCallMessage = 'Do you still want to accept the call?';
z.string.modalConversationNewDeviceMessage = 'Do you still want to send your messages?';
z.string.modalConversationNewDeviceOutgoingCallAction = 'Call anyway';
z.string.modalConversationNewDeviceOutgoingCallMessage = 'Do you still want to place the call?';

z.string.modalConversationNotConnectedHeadline = 'No one added to conversation';
z.string.modalConversationNotConnectedMessageOne = '{{name}} does not want to be added to conversations.';
z.string.modalConversationNotConnectedMessageMany = 'One of the people you selected does not want to be added to conversations.';

z.string.modalConversationRemoveAction = 'Remove';
z.string.modalConversationRemoveHeadline = 'Remove?';
z.string.modalConversationRemoveMessage = '{{user}} won’t be able to send or receive messages in this conversation.';

z.string.modalConversationRemoveGuestsAction = 'Remove guests';
z.string.modalConversationRemoveGuestsHeadline = 'Turning off guest access?';
z.string.modalConversationRemoveGuestsMessage = 'Current guest will be removed from the conversation. New guests will not be allowed.';

z.string.modalConversationRevokeLinkAction = 'Revoke link';
z.string.modalConversationRevokeLinkHeadline = 'Revoking the link?';
z.string.modalConversationRevokeLinkMessage = 'New guests will not be able to join with this link. Current guests will still have access.';

z.string.modalConversationTooManyMembersHeadline = 'Full house';
z.string.modalConversationTooManyMembersMessage = 'Up to {{number1}} people can join a conversation. There is room for {{number2}} more people in here.';

z.string.modalGifTooLargeMessage = 'Animation is too large.\nMaximum size is {{number}} MB.';

z.string.modalIntegrationUnavailableHeadline = 'Bots currently unavailable';
z.string.modalIntegrationUnavailableMessage = 'Thank you for your interest in bots. The service is currently suspended while we work on the next version. Stay tuned.';

z.string.modalPictureFileFormatMessage = 'Can’t use this picture.\nPlease choose a PNG or JPEG file.';
z.string.modalPictureTooLargeMessage = 'This picture is too large.\nYou can upload files up to {{number}} MB.';
z.string.modalPictureTooSmallMessage = 'Can’t use this picture.\nPlease choose a picture that’s at least 320 x 320 px.';

z.string.modalServiceUnavailableHeadline = 'Adding service not possible';
z.string.modalServiceUnavailableMessage = 'The service is unavailable a the moment.';

z.string.modalSessionResetHeadline = 'The session has been reset';
z.string.modalSessionResetMessage1 = 'If the problem is not resolved,';
z.string.modalSessionResetMessageLink = 'contact';
z.string.modalSessionResetMessage2 = 'us.';

z.string.modalUploadContactsAction = 'Try again';
z.string.modalUploadContactsMessage = 'We did not receive your information. Please try importing your contacts again.';

z.string.modalUserBlockAction = 'Block';
z.string.modalUserBlockHeadline = 'Block {{user}}?';
z.string.modalUserBlockMessage = '{{user}} won’t be able to contact you or add you to group conversations.';

z.string.modalUserUnblockAction = 'Unblock';
z.string.modalUserUnblockHeadline = 'Unblock?';
z.string.modalUserUnblockMessage = '{{user}} will be able to contact you and add you to group conversations again.';

// Connection requests
z.string.connection_request_connect = 'Connect';
z.string.connection_request_ignore = 'Ignore';

// Guests
z.string.conversation_guest_indicator = 'Guest';

// Conversation
z.string.conversation_you_nominative = 'you';
z.string.conversation_you_dative = 'you';
z.string.conversation_you_accusative = 'you';

z.string.conversation_bot_user = 'Bot';
z.string.conversation_connection_accepted = 'Connected';
z.string.conversation_connection_blocked = 'Blocked';
z.string.conversation_connection_cancel_request = 'Cancel connection request';
z.string.conversation_create = ' started a conversation with {{users}}';
z.string.conversationCreateName = '{{user}} started the conversation';
z.string.conversationCreateNameYou = '{{user}} started the conversation';
z.string.conversationCreateWith = 'with {{users}}';
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
z.string.conversationMemberJoinSelf = ' joined';
z.string.conversationMemberJoinSelfYou = ' joined';
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
z.string.conversation_asset_uploading = 'Uploading…';
z.string.conversation_asset_downloading = 'Downloading…';
z.string.conversation_asset_upload_failed = 'Upload Failed';
z.string.conversation_playback_error = 'Unable to play';
z.string.conversation_context_menu_edit = 'Edit';
z.string.conversation_context_menu_delete = 'Delete for Me';
z.string.conversation_context_menu_delete_everyone = 'Delete for Everyone';
z.string.conversation_context_menu_download = 'Download';
z.string.conversation_context_menu_like = 'Like';
z.string.conversation_context_menu_unlike = 'Unlike';
z.string.conversation_delete_timestamp = 'Deleted: {{date}}';
z.string.conversation_edit_timestamp = 'Edited: {{date}}';
z.string.conversation_likes_caption = '{{number}} people';
z.string.conversation_send_pasted_file = 'Pasted image at {{date}}';
z.string.conversation_someone = 'Someone';
z.string.conversation_tweet_author = ' on Twitter';

// Group creation
z.string.groupCreationPreferencesAction = 'Next';
z.string.groupCreationPreferencesErrorNameShort = 'At least 1 character';
z.string.groupCreationPreferencesErrorNameLong = 'Too many characters';
z.string.groupCreationPreferencesHeader = 'New group';
z.string.groupCreationPreferencesPlaceholder = 'Group name';
z.string.groupCreationParticipantsActionCreate = 'Done';
z.string.groupCreationParticipantsActionSkip = 'Skip';
z.string.groupCreationParticipantsHeader = 'Add people';
z.string.groupCreationParticipantsHeaderWithCounter = 'Add people ({{number}})';
z.string.groupCreationParticipantsPlaceholder = 'Search by name';

// Guest room
z.string.guestRoomConversationName = 'Guest room';

// Collection
z.string.collection_show_all = 'Show all {{number}}';
z.string.collection_section_links = 'Links';
z.string.collection_section_images = 'Pictures';
z.string.collection_section_files = 'Files';
z.string.collection_section_audio = 'Audio messages';

// Full Search
z.string.fullsearch_placeholder = 'Search text messages';
z.string.fullsearch_no_results = 'No results.';

// Archive
z.string.archive_header = 'Archive';

// Conversations
z.string.conversations_all_archived = 'Everything archived';
z.string.conversations_contacts = 'Contacts';
z.string.conversations_connection_request_many = '{{number}} people waiting';
z.string.conversations_connection_request_one = '1 person waiting';
z.string.conversations_empty_conversation = 'Group conversation';
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
z.string.takeover_sub = 'Claim your unique name on Wire.';
z.string.takeover_link = 'Learn more';
z.string.takeover_button_choose = 'Choose your own';
z.string.takeover_button_keep = 'Keep this one';

// Invites
z.string.invite_meta_key_mac = 'Cmd';
z.string.invite_meta_key_pc = 'Ctrl';
z.string.invite_hint_selected = 'Press {{meta_key}} + C to copy';
z.string.invite_hint_unselected = 'Select and Press {{meta_key}} + C';
z.string.invite_headline = 'Invite people to Wire';
z.string.invite_message = 'I’m on Wire, search for {{username}} or visit get.wire.com.';
z.string.invite_message_no_email = 'I’m on Wire. Visit get.wire.com to connect with me.';

// Extensions
z.string.extensions_bubble_button_gif = 'Gif';

// Extensions Giphy
z.string.extensions_giphy_button_ok = 'Send';
z.string.extensions_giphy_button_more = 'Try Another';
z.string.extensions_giphy_message = '{{tag}} • via giphy.com';
z.string.extensions_giphy_no_gifs = 'Oops, no gifs';
z.string.extensions_giphy_random = 'Random';

// People View
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

z.string.preferences_about_copyright = '© Wire Swiss GmbH';
z.string.preferences_about_privacy_policy = 'Privacy policy';
z.string.preferences_about_support = 'Support';
z.string.preferences_about_support_website = 'Support website';
z.string.preferences_about_support_contact = 'Contact Support';
z.string.preferences_about_terms_of_use = 'Terms of use';
z.string.preferences_about_version = 'Version {{version}}';
z.string.preferences_about_website = 'Wire website';

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
z.string.search_connect = 'Connect';
z.string.search_connections = 'Connections';
z.string.search_contacts = 'Contacts';
z.string.searchCreateGroup = 'Create group';
z.string.searchCreateGuestRoom = 'Create guest room';
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
z.string.upload_google_headline = 'Find people to talk to.';
z.string.upload_google_message = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';

// URLs & Warnings: Permission requests & permission callbacks
z.string.url_support_root = '/';
z.string.url_support_articles = '/hc/en-us/articles/';
z.string.url_support_requests = '/hc/en-us/requests/';
z.string.url_webapp_root = '/';
z.string.url_website_root = '/';
z.string.url_website_create_team = '/create-team/';
z.string.url_website_privacy = '/privacy';
z.string.warning_call_unsupported_incoming = '{{user}} is calling. Your browser doesn’t support calls.';
z.string.warning_call_unsupported_outgoing = 'You cannot call because your browser doesn’t support calls.';
z.string.warning_call_issues = 'This version of Wire can not participate in the call. Please use';
z.string.warning_call_upgrade_browser = 'To call, please update Google Chrome.';
z.string.warning_connectivity_connection_lost = 'Trying to connect. Wire may not be able to deliver messages.';
z.string.warning_connectivity_no_internet = 'No Internet. You won’t be able to send or receive messages.';
z.string.warning_learn_more = 'Learn more';
z.string.warning_lifecycle_update = 'A new version of Wire is available.';
z.string.warning_lifecycle_update_notes = 'What’s new';
z.string.warning_lifecycle_update_link = 'Update now';
z.string.warning_not_found_camera = 'You cannot call because your computer does not have a camera.';
z.string.warning_not_found_microphone = 'You cannot call because your computer does not have a microphone.';
z.string.warning_permission_denied_camera = 'You cannot call because your browser does not have access to the camera.';
z.string.warning_permission_denied_microphone = 'You cannot call because your browser does not have access to the microphone.';
z.string.warning_permission_denied_screen = 'Your browser needs permission to share your screen.';
z.string.warning_permission_request_camera = '{{icon}} Allow access to camera';
z.string.warning_permission_request_microphone = '{{icon}} Allow access to microphone';
z.string.warning_permission_request_notification = '{{icon}} Allow notifications';
z.string.warning_permission_request_screen = '{{icon}} Allow access to screen';

// User Availability
z.string.user_availability_available = 'Available';
z.string.user_availability_away = 'Away';
z.string.user_availability_busy = 'Busy';
z.string.user_availability_none = 'None';

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

z.string.tooltip_people_add = 'Add to conversation ({{shortcut}})';
z.string.tooltip_people_add_people = 'Add people to conversation ({{shortcut}})';
z.string.tooltip_people_back = 'Back';
z.string.tooltip_people_block = 'Block';
z.string.tooltip_people_connect = 'Connect';
z.string.tooltip_people_leave = 'Leave conversation';
z.string.tooltip_people_open = 'Open conversation';
z.string.tooltip_people_profile = 'Open your profile';
z.string.tooltip_people_rename = 'Change conversation name';
z.string.tooltip_people_remove = 'Remove from conversation';
z.string.tooltip_people_unblock = 'Unblock';

z.string.tooltip_preferences_contacts_gmail = 'Log in to your Gmail account to share contacts';
z.string.tooltip_preferences_contacts_macos = 'Share all your contacts from the macOS Contacts app';
z.string.tooltip_preferences_password = 'Open another website to reset your password';
z.string.tooltip_preferences_picture = 'Change your picture…';
z.string.tooltip_preferences_rename = 'Change your name';

z.string.tooltip_search_close = 'Close (Esc)';

// App loading
z.string.init_received_self_user = 'Hello, {{user}}.';
z.string.init_validated_client = 'Fetching your connections and conversations';
z.string.init_received_user_data = 'Checking for new messages';
z.string.init_decryption = 'Decrypting messages';
z.string.init_events = 'Loading messages';
z.string.init_updated_from_notifications = 'Almost done - Enjoy Wire';
z.string.init_progress = ' — {{number1}} of {{number2}}';

z.string.ephememal_units_none = 'Off';
z.string.ephememal_units_second = 'second';
z.string.ephememal_units_seconds = 'seconds';
z.string.ephememal_units_minute = 'minute';
z.string.ephememal_units_minutes = 'minutes';
z.string.ephememal_units_hour = 'hour';
z.string.ephememal_units_hours = 'hours';
z.string.ephememal_units_day = 'day';
z.string.ephememal_units_days = 'days';
