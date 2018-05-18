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
z.string.wireMacos = 'Wire for macOS';
z.string.wireWindows = 'Wire for Windows';
z.string.wireLinux = 'Wire for Linux';
z.string.nonexistentUser = 'Deleted User';
z.string.and = 'and';
z.string.enumerationAnd = ', and ';

// Auth
// Authentication: ACCOUNT section
z.string.authAccountCountryCode = 'Country Code';
z.string.authAccountPasswordForgot = 'Forgot password';
z.string.authAccountPublicComputer = 'This is a public computer';
z.string.authAccountSignIn = 'Log in';
z.string.authAccountSignInPhone = 'Phone Log in';

// Authentication: BLOCKED section
z.string.authBlockedCookies = 'Enable cookies to log in to Wire.';
z.string.authBlockedDatabase = 'Wire needs access to local storage to display your messages. Local storage is not available in private mode.';
z.string.authBlockedTabs = 'Wire is already open in another tab.';
z.string.authBlockedTabsAction = 'Use this tab instead';

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

// Modals
// Modals type defaults
z.string.modalAcknowledgeAction = 'Ok';
z.string.modalAcknowledgeHeadline = 'Something went wrong';
z.string.modalConfirmSecondary = 'Cancel';
z.string.modalOptionSecondary = 'Cancel';

// Modals content
z.string.modalAccountCreateAction = 'OK';
z.string.modalAccountCreateHeadline = 'Create an account?';
z.string.modalAccountCreateMessage = 'By creating an account you will lose the conversation history in this guest room.';

z.string.modalAccountDeletionAction = 'Delete';
z.string.modalAccountDeletionHeadline = 'Delete account';
z.string.modalAccountDeletionMessage = 'We will send a message via email or SMS. Follow the link to permanently delete your account.';

z.string.modalAccountLeaveGuestRoomAction = 'Leave';
z.string.modalAccountLeaveGuestRoomHeadline = 'Leave the guest room?';
z.string.modalAccountLeaveGuestRoomMessage = 'Conversation history will be deleted. To keep it, create an account next time.';

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

z.string.modalAssetTooLargeHeadline = 'File too large';
z.string.modalAssetTooLargeMessage = 'You can send files up to {{number}}';

z.string.modalAssetParallelUploadsHeadline = 'Too many files at once';
z.string.modalAssetParallelUploadsMessage = 'You can send up to {{number}} files at once.';

z.string.modalCallEmptyConversationHeadline = 'No one to call';
z.string.modalCallEmptyConversationMessage = 'There is no one left here.';

z.string.modalCallEmptyLogHeadline = 'No calls';
z.string.modalCallEmptyLogMessage = 'There were no calls to base the debug report on.';

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

z.string.modalCallSecondOutgoingAction = 'Call Anyway';
z.string.modalCallSecondOutgoingHeadline = 'Hang up current call?';
z.string.modalCallSecondOutgoingMessage = 'A call is active in another conversation. Calling here will hang up the other call.';

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
z.string.modalConversationNewDeviceMessage = 'Do you still want to send your message?';
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

z.string.modalConversationGuestOptionsAllowGuestMessage = 'Could not allow guests. Please try again.';
z.string.modalConversationGuestOptionsDisableGuestMessage = 'Could not remove guests. Please try again.';
z.string.modalConversationGuestOptionsGetCodeMessage = 'Could not get access link.';
z.string.modalConversationGuestOptionsRequestCodeMessage = 'Could not request access link. Please try again.';
z.string.modalConversationGuestOptionsRevokeCodeMessage = 'Could not revoke access link. Please try again.';
z.string.modalConversationGuestOptionsToggleGuestsMessage = 'Could not change guests state.';

z.string.modalConversationTooManyMembersHeadline = 'Full house';
z.string.modalConversationTooManyMembersMessage = 'Up to {{number1}} people can join a conversation. Currently there is only room for {{number2}} more people.';

z.string.modalGifTooLargeHeadline = 'Selected animation is too large';
z.string.modalGifTooLargeMessage = 'Maximum size is {{number}} MB.';

z.string.modalIntegrationUnavailableHeadline = 'Bots currently unavailable';
z.string.modalIntegrationUnavailableMessage = 'Thank you for your interest in bots. The service is currently suspended while we work on the next version. Stay tuned.';

z.string.modalPictureFileFormatHeadline = 'Can’t use this picture';
z.string.modalPictureFileFormatMessage = 'Please choose a PNG or JPEG file.';

z.string.modalPictureTooLargeHeadline = 'Selected picture is too large';
z.string.modalPictureTooLargeMessage = 'You can use pictures up to {{number}} MB.';

z.string.modalPictureTooSmallHeadline = 'Picture too small';
z.string.modalPictureTooSmallMessage = 'Please choose a picture that is at least 320 x 320 px.';

z.string.modalImproveWireAction = 'Accept';
z.string.modalImproveWireSecondary = 'Not now';
z.string.modalImproveWireHeadline = 'Help us make Wire better';
z.string.modalImproveWireMessage = 'Sending anonymous usage and crash reports helps us to improve our products and services. We do not use this information for anything else.';

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
z.string.connectionRequestConnect = 'Connect';
z.string.connectionRequestIgnore = 'Ignore';

// Guests
z.string.conversationGuestIndicator = 'Guest';
z.string.userRemainingTimeHours = '{{time}}h left';
z.string.userRemainingTimeMinutes = 'Less than {{time}}m left';

// Conversation
z.string.conversationYouNominative = 'you';
z.string.conversationYouDative = 'you';
z.string.conversationYouAccusative = 'you';

z.string.conversationBotUser = 'Bot';
z.string.conversationConnectionAccepted = 'Connected';
z.string.conversationConnectionBlocked = 'Blocked';
z.string.conversationConnectionCancelRequest = 'Cancel connection request';
z.string.conversationCreate = ' started a conversation with {{users}}';
z.string.conversationCreateName = '{{user}} started the conversation';
z.string.conversationCreateNameYou = '{{user}} started the conversation';
z.string.conversationCreateTemporary = 'You joined the conversation';
z.string.conversationCreateWith = 'with {{users}}';
z.string.conversationCreateYou = ' started a conversation with {{users}}';
z.string.conversationDeviceStartedUsingOne = ' started using';
z.string.conversationDeviceStartedUsingMany = ' started using';
z.string.conversationDeviceUnverified = ' unverified one of';
z.string.conversationDeviceYourDevices = ' your devices';
z.string.conversationDeviceUserDevices = ' {{user}}´s devices';
z.string.conversationDeviceNewDeviceOne = ' a new device';
z.string.conversationDeviceNewDeviceMany = ' new devices';
z.string.conversationDeviceNewPeopleJoined = 'New people joined.';
z.string.conversationDeviceNewPeopleJoinedVerify = ' verify devices';
z.string.conversationJustNow = 'Just now';
z.string.conversationLocationLink = 'Open Map';
z.string.conversationMemberJoin = ' added {{users}}';
z.string.conversationMemberJoinYou = ' added {{users}}';
z.string.conversationMemberJoinSelf = ' joined';
z.string.conversationMemberJoinSelfYou = ' joined';
z.string.conversationMemberLeaveLeft = ' left';
z.string.conversationMemberLeaveLeftYou = ' left';
z.string.conversationMemberLeaveRemoved = ' removed {{users}}';
z.string.conversationMemberLeaveRemovedYou = ' removed {{users}}';
z.string.conversationMessageDelivered = 'Delivered';
z.string.conversationRename = ' renamed the conversation';
z.string.conversationRenameYou = ' renamed the conversation';
z.string.conversationResume = 'Start a conversation with {{users}}';
z.string.conversationTeamLeave = ' was removed from the team';
z.string.conversationPing = ' pinged';
z.string.conversationPingYou = ' pinged';
z.string.conversationToday = 'today';
z.string.conversationVoiceChannelDeactivate = ' called';
z.string.conversationVoiceChannelDeactivateYou = ' called';
z.string.conversationYesterday = 'Yesterday';
z.string.conversationUnableToDecrypt1 = 'A message from {{user}} was not received.';
z.string.conversationUnableToDecrypt2 = '{{user}}´s device identity changed. Undelivered message.';
z.string.conversationUnableToDecryptLink = 'Why?';
z.string.conversationUnableToDecryptErrorMessage = 'Error';
z.string.conversationUnableToDecryptResetSession = 'Reset session';
z.string.conversationMissedMessages = 'You haven’t used this device for a while. Some messages may not appear here.';
z.string.conversationAssetUploading = 'Uploading…';
z.string.conversationAssetDownloading = 'Downloading…';
z.string.conversationAssetUploadFailed = 'Upload Failed';
z.string.conversationPlaybackError = 'Unable to play';
z.string.conversationContextMenuEdit = 'Edit';
z.string.conversationContextMenuDelete = 'Delete for Me…';
z.string.conversationContextMenuDeleteEveryone = 'Delete for Everyone…';
z.string.conversationContextMenuDownload = 'Download';
z.string.conversationContextMenuLike = 'Like';
z.string.conversationContextMenuUnlike = 'Unlike';
z.string.conversationDeleteTimestamp = 'Deleted: {{date}}';
z.string.conversationEditTimestamp = 'Edited: {{date}}';
z.string.conversationLikesCaption = '{{number}} people';
z.string.conversationSendPastedFile = 'Pasted image at {{date}}';
z.string.conversationSomeone = 'Someone';
z.string.conversationTweetAuthor = ' on Twitter';

// Group creation
z.string.groupCreationPreferencesAction = 'Next';
z.string.groupCreationPreferencesErrorNameShort = 'At least 1 character';
z.string.groupCreationPreferencesErrorNameLong = 'Too many characters';
z.string.groupCreationPreferencesHeader = 'Create group';
z.string.groupCreationPreferencesPlaceholder = 'Group name';
z.string.groupCreationParticipantsActionCreate = 'Done';
z.string.groupCreationParticipantsActionSkip = 'Skip';
z.string.groupCreationParticipantsHeader = 'Add people';
z.string.groupCreationParticipantsHeaderWithCounter = 'Add people ({{number}})';
z.string.groupCreationParticipantsPlaceholder = 'Search by name';

// Guest room
z.string.guestRoomConversationName = 'Guest room';
z.string.guestRoomToggleName = 'Allow guests';
z.string.guestRoomToggleInfo = 'Open this conversation to people outside your team.';
z.string.guestRoomToggleInfoExtended = 'Open this conversation to people outside your team. You can always change it later.';

z.string.guestRoomConversationBadge = 'Guests are present';

z.string.guestRoomConversationHead = 'People outside your team can join this conversation.';
z.string.guestRoomConversationButton = 'Invite people';

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
z.string.conversationsAllArchived = 'Everything archived';
z.string.conversationsContacts = 'Contacts';
z.string.conversationsConnectionRequestMany = '{{number}} people waiting';
z.string.conversationsConnectionRequestOne = '1 person waiting';
z.string.conversationsEmptyConversation = 'Group conversation';
z.string.conversationsNoConversations = 'Start a conversation or create a group.';
z.string.conversationsPopoverArchive = 'Archive';
z.string.conversationsPopoverBlock = 'Block…';
z.string.conversationsPopoverCancel = 'Cancel request…';
z.string.conversationsPopoverClear = 'Delete content…';
z.string.conversationsPopoverLeave = 'Leave group…';
z.string.conversationsPopoverNotify = 'Unmute';
z.string.conversationsPopoverSilence = 'Mute';
z.string.conversationsPopoverUnarchive = 'Unarchive';

// Conversations secondary line
z.string.conversationsSecondaryLineMissedCall = '{{number}} missed call';
z.string.conversationsSecondaryLineMissedCalls = '{{number}} missed calls';
z.string.conversationsSecondaryLineNewMessage = '{{number}} new message';
z.string.conversationsSecondaryLineNewMessages = '{{number}} new messages';
z.string.conversationsSecondaryLinePing = '{{number}} ping';
z.string.conversationsSecondaryLinePings = '{{number}} pings';
z.string.conversationsSecondaryLinePeopleLeft = '{{number}} people left';
z.string.conversationsSecondaryLinePersonLeft = '{{user}} left';
z.string.conversationsSecondaryLinePersonRemoved = '{{user}} was removed';
z.string.conversationsSecondaryLinePersonRemovedTeam = '{{user}} was removed from the team';
z.string.conversationsSecondaryLinePeopleAdded = '{{user}} people were added';
z.string.conversationsSecondaryLinePersonAdded = '{{user}} was added';
z.string.conversationsSecondaryLinePersonAddedSelf = '{{user}} joined';
z.string.conversationsSecondaryLinePersonAddedYou = '{{user}} added you';
z.string.conversationsSecondaryLineRenamed = '{{user}} renamed conversation';
z.string.conversationsSecondaryLineTimedMessage = 'Timed message';
z.string.conversationsSecondaryLineYouLeft = 'You left';
z.string.conversationsSecondaryLineYouWereRemoved = 'You were removed';

// Takeover
z.string.takeoverSub = 'Claim your unique name on Wire.';
z.string.takeoverLink = 'Learn more';
z.string.takeoverButtonChoose = 'Choose your own';
z.string.takeoverButtonKeep = 'Keep this one';

// Invites
z.string.inviteMetaKeyMac = 'Cmd';
z.string.inviteMetaKeyPc = 'Ctrl';
z.string.inviteHintSelected = 'Press {{metaKey}} + C to copy';
z.string.inviteHintUnselected = 'Select and Press {{metaKey}} + C';
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

// Panel
// Panel: Add participants
z.string.addParticipantsConfirmLabel = 'Add';
z.string.addParticipantsHeader = 'Add people';
z.string.addParticipantsHeaderWithCounter = 'Add people ({{number}})';
z.string.addParticipantsSearchPlaceholder = 'Search by name';
z.string.addParticipantsServiceConfirmButton = 'Add service';
z.string.addParticipantsTabsPeople = 'People';
z.string.addParticipantsTabsServices = 'Services';

// Panel: Conversation details
z.string.conversationDetailsActionArchive = 'Archive';
z.string.conversationDetailsActionAddParticipants = 'Add participants';
z.string.conversationDetailsActionBlock = 'Block…';
z.string.conversationDetailsActionCancelRequest = 'Cancel request…';
z.string.conversationDetailsActionClear = 'Delete content…';
z.string.conversationDetailsActionCreateGroup = 'Create group';
z.string.conversationDetailsActionDevices = 'Devices';
z.string.conversationDetailsActionGuestOptions = 'Guest options';
z.string.conversationDetailsActionLeave = 'Leave group…';
z.string.conversationDetailsGuestsOff = 'Off';
z.string.conversationDetailsGuestsOn = 'On';
z.string.conversationDetailsParticipantsServicesOne = 'Service';
z.string.conversationDetailsParticipantsServicesMany = 'Services';
z.string.conversationDetailsParticipantsUsersOne = 'Person';
z.string.conversationDetailsParticipantsUsersMany = 'People';
z.string.conversationDetailsPeople = 'People';
z.string.conversationDetailsServices = 'Services';

// Panel: Group participant
z.string.groupParticipantActionBlock = 'Block…';
z.string.groupParticipantActionCancelRequest = 'Cancel request…';
z.string.groupParticipantActionDevices = 'Devices';
z.string.groupParticipantActionIgnoreRequest = 'Ignore request';
z.string.groupParticipantActionIncomingRequest = 'Accept request';
z.string.groupParticipantActionLeave = 'Leave group…';
z.string.groupParticipantActionOpenConversation = 'Open conversation';
z.string.groupParticipantActionPending = 'Pending';
z.string.groupParticipantActionRemove = 'Remove from group…';
z.string.groupParticipantActionSelfProfile = 'Open profile';
z.string.groupParticipantActionSendRequest = 'Connect';
z.string.groupParticipantActionUnblock = 'Unblock…';

// Panel: Guest options
z.string.guestOptionsCopyLink = 'Copy link';
z.string.guestOptionsCopyLinkDone = 'Link copied!';
z.string.guestOptionsCreateLink = 'Create link';
z.string.guestOptionsInfoHeader = 'Invite others with a link';
z.string.guestOptionsInfoText = 'Anyone with the link can join the conversation, even if they don’t have Wire.';
z.string.guestOptionsRevokeLink = 'Revoke link…';
z.string.guestOptionsTitle = 'Guest options';

// Panel: Participant devices
z.string.participantDevicesDetailHeadline = 'Verify that this matches the fingerprint shown on {{html1}}{{user}}’s device{{html2}}.';
z.string.participantDevicesDetailHowTo = 'How do I do that?';
z.string.participantDevicesDetailResetSession = 'Reset session';
z.string.participantDevicesDetailShowMyDevice = 'Show my device fingerprint';
z.string.participantDevicesDetailVerify = 'Verified';

z.string.participantDevicesHeader = 'Devices';
z.string.participantDevicesHeadline = 'Wire gives every device a unique fingerprint. Compare them with {{user}} and verify your conversation.';
z.string.participantDevicesLearnMore = 'Learn more';
z.string.participantDevicesWhyVerify = 'Why verify conversations?';
z.string.participantDevicesOutdatedClientMessage = '{{user}} is using an old version of Wire. No devices are shown here.';

z.string.participantDevicesSelfAllDevices = 'Show all my devices';
z.string.participantDevicesSelfFingerprint = 'Device fingerprint';

// User profile actions
z.string.userProfileButtonConnect = 'Connect';
z.string.userProfileButtonIgnore = 'Ignore';
z.string.userProfileButtonUnblock = 'Unblock';

// Settings
z.string.preferencesAbout = 'About';
z.string.preferencesAccount = 'Account';
z.string.preferencesAV = 'Audio / Video';
z.string.preferencesDeviceDetails = 'Device Details';
z.string.preferencesDevices = 'Devices';
z.string.preferencesHeadline = 'Preferences';
z.string.preferencesOptions = 'Options';

z.string.preferencesAboutCopyright = '© Wire Swiss GmbH';
z.string.preferencesAboutPrivacyPolicy = 'Privacy policy';
z.string.preferencesAboutSupport = 'Support';
z.string.preferencesAboutSupportWebsite = 'Support website';
z.string.preferencesAboutSupportContact = 'Contact Support';
z.string.preferencesAboutTermsOfUse = 'Terms of use';
z.string.preferencesAboutVersion = 'Version {{version}}';
z.string.preferencesAboutWebsite = 'Wire website';

z.string.preferencesAccountAvaibilityUnset = 'Set a status';
z.string.preferencesAccountCreateTeam = 'Create a team';
z.string.preferencesAccountData = 'Data usage permissions';
z.string.preferencesAccountDataCheckbox = 'Send anonymous data';
z.string.preferencesAccountDataDetail = 'Help make Wire better by sending anonymous usage and crash reports.';
z.string.preferencesAccountDelete = 'Delete account';
z.string.preferencesAccountLeaveGuestRoom = 'Leave the guest room';
z.string.preferencesAccountLeaveGuestRoomDescription = 'You will no longer be able to access the messages in this conversation.';
z.string.preferencesAccountLogOut = 'Log out';
z.string.preferencesAccountManageTeam = 'Manage team';
z.string.preferencesAccountMarketingConsentCheckbox = 'Receive newsletter';
z.string.preferencesAccountMarketingConsentDetail = 'Receive news and product update from Wire via email.';
z.string.preferencesAccountResetPassword = 'Reset password';
z.string.preferencesAccountTeam = 'in {{name}}';
z.string.preferencesAccountUsernamePlaceholder = 'Your full name';
z.string.preferencesAccountUsernameHint = 'At least 2 characters. a—z, 0—9 and _ only.';
z.string.preferencesAccountUsernameAvailable = 'Available';
z.string.preferencesAccountUsernameErrorTaken = 'Already taken';

z.string.preferencesAVCamera = 'Camera';
z.string.preferencesAVMicrophone = 'Microphone';
z.string.preferencesAVPermissionDetail = 'Enable from your browser Preferences';
z.string.preferencesAVSpeakers = 'Speakers';

z.string.preferencesDevicesActivatedIn = 'in {{location}}';
z.string.preferencesDevicesActivatedOn = 'Activated on {{date}}';
z.string.preferencesDevicesActive = 'Active';
z.string.preferencesDevicesActiveDetail = 'If you don’t recognize a device above, remove it and reset your password.';
z.string.preferencesDevicesCurrent = 'Current';
z.string.preferencesDevicesFingerprint = 'Key fingerprint';
z.string.preferencesDevicesFingerprintDetail = 'Wire gives every device a unique fingerprint. Compare them and verify your devices and conversations.';
z.string.preferencesDevicesId = 'ID: ';
z.string.preferencesDevicesRemove = 'Remove…';
z.string.preferencesDevicesRemoveCancel = 'Cancel';
z.string.preferencesDevicesRemoveDetail = 'Remove this device if you have stopped using it. You will be logged out of this device immediately.';
z.string.preferencesDevicesSessionConfirmation = 'The session has been reset.';
z.string.preferencesDevicesSessionDetail = 'If fingerprints don’t match, reset the session to generate new encryption keys on both sides.';
z.string.preferencesDevicesSessionReset = 'Reset session';
z.string.preferencesDevicesSessionOngoing = 'Resetting session…';
z.string.preferencesDevicesVerification = 'Verified';

z.string.preferencesOptionsAudio = 'Sound alerts';
z.string.preferencesOptionsAudioAll = 'All';
z.string.preferencesOptionsAudioAllDetail = 'All sounds';
z.string.preferencesOptionsAudioNone = 'None';
z.string.preferencesOptionsAudioNoneDetail = 'Sshhh!';
z.string.preferencesOptionsAudioSome = 'Some';
z.string.preferencesOptionsAudioSomeDetail = 'Pings and calls';
z.string.preferencesOptionsContacts = 'Contacts';
z.string.preferencesOptionsContactsGmail = 'Import from Gmail';
z.string.preferencesOptionsContactsMacos = 'Import from Contacts';
z.string.preferencesOptionsContactsDetail = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';
z.string.preferencesOptionsPopular = 'By popular demand';
z.string.preferencesOptionsEmojiReplaceCheckbox = 'Replace type emoticons with emojis';
z.string.preferencesOptionsEmojiReplaceDetail = ':-) → {{icon}}';
z.string.preferencesOptionsPreviewsSendCheckbox = 'Create previews for links you send';
z.string.preferencesOptionsPreviewsSendDetail = 'Previews may still be shown for links from other people.';
z.string.preferencesOptionsNotifications = 'Notifications';
z.string.preferencesOptionsNotificationsNone = 'Off';
z.string.preferencesOptionsNotificationsObfuscate = 'Hide details';
z.string.preferencesOptionsNotificationsObfuscateMessage = 'Show sender';
z.string.preferencesOptionsNotificationsOn = 'Show sender and message';
z.string.preferencesOptionsCallLogs = 'Troubleshooting';
z.string.preferencesOptionsCallLogsGet = 'Save the calling debug report';
z.string.preferencesOptionsCallLogsDetail = 'This information helps Wire Support diagnose calling problems.';

z.string.preferencesOptionsBackupHeader = 'History';
z.string.preferencesOptionsBackupExportHeadline = 'Back up conversations';
z.string.preferencesOptionsBackupExportSecondary = 'Create a backup to preserve your conversation history. You can use this to restore history if you lose your computer or switch to a new one.\nThe backup file is not protected by Wire end-to-end encryption, so store it in a safe place.';
z.string.preferencesOptionsBackupImportHeadline = 'Restore from backup';
z.string.preferencesOptionsBackupImportSecondary = 'You can only restore history from a backup of the same platform. Your backup will overwrite the conversations that you may have on this device.';

// History Backup
z.string.backupExportGenericErrorHeadline = 'The file could not be saved';
z.string.backupExportGenericErrorSecondary = 'The backup was not completed.';
z.string.backupExportProgressHeadline = 'Preparing…';
z.string.backupExportProgressSecondary = 'Backing up · {{processed}} of {{total}} — {{progress}}%';
z.string.backupExportProgressCompressing = 'Preparing backup file';
z.string.backupExportSaveFileAction = 'Save file';
z.string.backupExportSuccessHeadline = 'Backup ready';
z.string.backupExportSuccessSecondary = 'You can use this to restore history if you lose your computer or switch to a new one.';
z.string.backupImportGenericErrorHeadline = 'Something went wrong';
z.string.backupImportGenericErrorSecondary = 'Your history could not be restored.';
z.string.backupImportAccountErrorHeadline = 'Wrong backup';
z.string.backupImportAccountErrorSecondary = 'You cannot restore history from a different account.';
z.string.backupImportVersionErrorHeadline = 'Incompatible backup';
z.string.backupImportVersionErrorSecondary = 'This backup was created by a newer or outdated version of Wire and cannot be restored here.';
z.string.backupImportIncompatibleErrorHeadline = 'Wrong backup';
z.string.backupImportIncompatibleErrorSecondary = 'You cannot restore history from a different account.';
z.string.backupImportOutdatedErrorHeadline = 'Incompatible backup';
z.string.backupImportOutdatedErrorSecondary = 'This backup was created by a newer or outdated version of Wire and cannot be restored here.';
z.string.backupImportProgressHeadline = 'Preparing…';
z.string.backupImportProgressSecondary = 'Restoring history · {{processed}} of {{total}} — {{progress}}%';
z.string.backupImportSuccessHeadline = 'History restored.';
z.string.backupCancel = 'Cancel';
z.string.backupTryAgain = 'Try Again';

// Search
z.string.searchConnect = 'Connect';
z.string.searchConnections = 'Connections';
z.string.searchContacts = 'Contacts';
z.string.searchCreateGroup = 'Create group';
z.string.searchCreateGuestRoom = 'Create guest room';
z.string.searchGroups = 'Groups';
z.string.searchPeople = 'People';
z.string.searchPlaceholder = 'Search by name or username';
z.string.searchServicePlaceholder = 'Search by name';
z.string.searchServices = 'Services';
z.string.searchTeamGroups = 'Team conversations';
z.string.searchTeamMembers = 'Team members';
z.string.searchTopPeople = 'Top people';
z.string.searchTrySearch = 'Find people by\nname or username';
z.string.searchNoContactsOnWire = 'You have no contacts on Wire.\nTry finding people by\nname or username.';
z.string.searchMemberInvite = 'Invite people to join the team';
z.string.searchOthers = 'Connect';

z.string.searchInvite = 'Invite people to join Wire';
z.string.searchInviteDetail = 'Sharing your contacts helps you connect with others. We anonymize all the information and do not share it with anyone else.';
z.string.searchInviteButtonContacts = 'From Contacts';
z.string.searchInviteButtonGmail = 'From Gmail';
z.string.searchInviteHeadline = 'Bring your friends';
z.string.searchInviteShare = 'Share Contacts';

z.string.searchServiceNewConversation = 'Create a new conversation';
z.string.searchServiceConfirmButton = 'Add service';

// Search list: User list & service list components
z.string.searchListEveryoneParticipates = 'Everyone you’re\nconnected to is already in\nthis conversation.';
z.string.searchListNoMatches = 'No matching results.\nTry entering a different name.';

// Temporary guest experience
z.string.temporaryGuestCta = 'Create an account';
z.string.temporaryGuestDescription = 'Secure your business with encrypted group messaging and conference calls.';
z.string.temporaryGuestTimeRemaining = ' left in this guest room';

z.string.temporaryGuestJoinMessage = 'This conversation will be available to you for 24 hours.';
z.string.temporaryGuestJoinDescription = 'If you close or refresh this page, you will lose access.';

z.string.temporaryGuestLeaveMessage = ' are no longer part of this conversation.';
z.string.temporaryGuestLeaveDescription = 'If you close or refresh this page, you will lose access to the conversation history.';

// Google contacts upload
z.string.uploadGoogleHeadline = 'Find people\nto talk to.';
z.string.uploadGoogleMessage = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';

// URLs & Warnings: Permission requests & permission callbacks
z.string.urlSupportRoot = '/';
z.string.urlSupportArticles = '/hc/en-us/articles/';
z.string.urlSupportRequests = '/hc/en-us/requests/';
z.string.urlWebappRoot = '/';
z.string.urlWebsiteRoot = '/';
z.string.urlWebsiteCreateTeam = '/create-team/';
z.string.urlWebsitePrivacy = '/privacy';
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

// User Availability
z.string.userAvailabilityAvailable = 'Available';
z.string.userAvailabilityAway = 'Away';
z.string.userAvailabilityBusy = 'Busy';
z.string.userAvailabilityNone = 'None';

// Browser notifications
z.string.notificationAssetAdd = 'Shared a picture';
z.string.notificationConnectionAccepted = 'Accepted your connection request';
z.string.notificationConnectionConnected = 'You are now connected';
z.string.notificationConnectionRequest = 'Wants to connect';
z.string.notificationConversationCreate = '{{user}} started a conversation';
z.string.notificationConversationRename = '{{user}} renamed the conversation to {{name}}';
z.string.notificationMemberJoinMany = '{{user}} added {{number}} people to the conversation';
z.string.notificationMemberJoinSelf = '{{user}} joined the conversation';
z.string.notificationMemberJoinOne = '{{user1}} added {{user2}} to the conversation';
z.string.notificationMemberLeaveRemovedYou = '{{user}} removed you from the conversation';
z.string.notificationObfuscated = 'Sent you a message';
z.string.notificationObfuscatedTitle = 'Someone';
z.string.notificationPing = 'Pinged';
z.string.notificationReaction = '{{reaction}} your message';
z.string.notificationSharedAudio = 'Shared an audio message';
z.string.notificationSharedFile = 'Shared a file';
z.string.notificationSharedLocation = 'Shared a location';
z.string.notificationSharedVideo = 'Shared a video';
z.string.notificationVoiceChannelActivate = 'Calling';
z.string.notificationVoiceChannelDeactivate = 'Called';

// Tooltips
z.string.tooltipConversationAllVerified = 'All fingerprints are verified';
z.string.tooltipConversationCall = 'Call';
z.string.tooltipConversationEphemeral = 'Timed message';
z.string.tooltipConversationFile = 'Add file';
z.string.tooltipConversationInputPlaceholder = 'Type a message';
z.string.tooltipConversationInputPlaceholderAvailable = '{{user}} is available';
z.string.tooltipConversationInputPlaceholderAway = '{{user}} is away';
z.string.tooltipConversationInputPlaceholderBusy = '{{user}} is busy';
z.string.tooltipConversationPeople = 'People ({{shortcut}})';
z.string.tooltipConversationPicture = 'Add picture';
z.string.tooltipConversationPing = 'Ping ({{shortcut}})';
z.string.tooltipConversationSearch = 'Search';
z.string.tooltipConversationVideoCall = 'Video Call';

z.string.tooltipConversationsArchive = 'Archive ({{shortcut}})';
z.string.tooltipConversationsArchived = 'Show archive ({{number}})';
z.string.tooltipConversationsMore = 'More';
z.string.tooltipConversationsNotify = 'Unmute ({{shortcut}})';
z.string.tooltipConversationsPreferences = 'Open preferences';
z.string.tooltipConversationsSilence = 'Mute ({{shortcut}})';
z.string.tooltipConversationsStart = 'Start conversation ({{shortcut}})';

z.string.tooltipConversationDetailsAddPeople = 'Add participants to conversation ({{shortcut}})';
z.string.tooltipConversationDetailsRename = 'Change conversation name';

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
