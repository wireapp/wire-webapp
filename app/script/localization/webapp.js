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
z.string.callStateIncomingGroup = '{{user}} is calling';
z.string.callDecline = 'Decline';
z.string.callAccept = 'Accept';
z.string.callJoin = 'Join';
z.string.callChooseSharedScreen = 'Choose a screen to share';
z.string.callParticipants = '{{number}} on call';
z.string.callNoCameraAccess = 'No camera access';

z.string.videoCallOverlayFitVideoLabel = 'Double-click to fit or fill video to frame';
z.string.videoCallOverlayConversations = 'Conversations';
z.string.videoCallOverlayMute = 'Mute';
z.string.videoCallOverlayVideo = 'Video';
z.string.videoCallOverlayShareScreen = 'Share Screen';
z.string.videoCallOverlayHangUp = 'Hang Up';
z.string.videoCallPaused = 'Video paused';
z.string.videoCallScreenShareNotSupported = 'Screen sharing is not supported in this browser';

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

z.string.modalAccountReadReceiptsChangedSecondary = 'Manage devices';
z.string.modalAccountReadReceiptsChangedOnHeadline = 'You have enabled read receipts';
z.string.modalAccountReadReceiptsChangedOffHeadline = 'You have disabled read receipts';
z.string.modalAccountReadReceiptsChangedMessage = 'You can change this option in your account settings.';

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

z.string.modalConversationRemoveGuestsAction = 'Remove';
z.string.modalConversationRemoveGuestsHeadline = 'Disable access?';
z.string.modalConversationRemoveGuestsMessage = 'Current guests and services will be removed from the conversation. New guests and services will not be allowed.';

z.string.modalConversationRevokeLinkAction = 'Revoke link';
z.string.modalConversationRevokeLinkHeadline = 'Revoke the link?';
z.string.modalConversationRevokeLinkMessage = 'New guests will not be able to join with this link. Current guests will still have access.';

z.string.modalConversationGuestOptionsAllowGuestMessage = 'Could not allow guests and services. Please try again.';
z.string.modalConversationGuestOptionsDisableGuestMessage = 'Could not remove guests and services. Please try again.';
z.string.modalConversationGuestOptionsGetCodeMessage = 'Could not get access link.';
z.string.modalConversationGuestOptionsRequestCodeMessage = 'Could not request access link. Please try again.';
z.string.modalConversationGuestOptionsRevokeCodeMessage = 'Could not revoke access link. Please try again.';
z.string.modalConversationGuestOptionsToggleGuestsMessage = 'Could not change guests state.';

z.string.modalConversationTooManyMembersHeadline = 'The group is full';
z.string.modalConversationTooManyMembersMessage = 'Up to {{number1}} people can join a conversation. Currently there is only room for {{number2}} more.';

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

z.string.modalImproveWireAction = 'I Agree';
z.string.modalImproveWireSecondary = 'No';
z.string.modalImproveWireHeadline = 'Help us make Wire better';
z.string.modalImproveWireMessage = 'I agree that Wire may create and use anonymous usage and error reports to improve the Wire App. I can revoke this consent at any time.';

z.string.modalServiceUnavailableHeadline = 'Adding service not possible';
z.string.modalServiceUnavailableMessage = 'The service is unavailable at the moment.';

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

z.string.modalNoCameraTitle = 'No camera access';
z.string.modalNoCameraMessage = 'Wire doesn’t have access to the camera.[br][faqLink]Read this support article[/faqLink] to find out how to fix it.';

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

z.string.conversationConnectionAccepted = 'Connected';
z.string.conversationConnectionBlocked = 'Blocked';
z.string.conversationConnectionCancelRequest = 'Cancel connection request';
z.string.conversationCreateTemporary = 'You joined the conversation';
z.string.conversationCreateWith = 'with {{users}}';
z.string.conversationDeviceStartedUsingOne = ' started using';
z.string.conversationDeviceStartedUsingMany = ' started using';
z.string.conversationDeviceUnverified = ' unverified one of';
z.string.conversationDeviceYourDevices = ' your devices';
z.string.conversationDeviceUserDevices = ' {{user}}´s devices';
z.string.conversationDeviceNewDeviceOne = ' a new device';
z.string.conversationDeviceNewDeviceMany = ' new devices';
z.string.conversationDeviceNewPeopleJoined = 'New people joined.';
z.string.conversationDeviceNewPeopleJoinedVerify = 'Verify devices';
z.string.conversationJustNow = 'Just now';
z.string.conversationLocationLink = 'Open Map';
z.string.conversationCreated = '[bold]{{name}}[/bold] started a conversation with {{users}}';
z.string.conversationCreatedMore = '[bold]{{name}}[/bold] started a conversation with {{users}}, and [showmore]{{count}} more[/showmore]';
z.string.conversationCreatedName = '[bold]{{name}}[/bold] started the conversation';
z.string.conversationCreatedNameYou = '[bold]You[/bold] started the conversation';
z.string.conversationCreatedYou = 'You started a conversation with {{users}}';
z.string.conversationCreatedYouMore = 'You started a conversation with {{users}}, and [showmore]{{count}} more[/showmore]';
z.string.conversationCreateWithMore = 'with {{users}}, and [showmore]{{count}} more[/showmore]';
z.string.conversationCreateTeam = 'with [showmore]all team members[/showmore]';
z.string.conversationCreateTeamGuest = 'with [showmore]all team members and one guest[/showmore]';
z.string.conversationCreateTeamGuests = 'with [showmore]all team members and {{count}} guests[/showmore]';
z.string.conversationCreateReceiptsEnabled = 'Read receipts are on';
z.string.conversationMemberJoined = '[bold]{{name}}[/bold] added {{users}} to the conversation';
z.string.conversationMemberJoinedYou = '[bold]You[/bold] added {{users}} to the conversation';
z.string.conversationMemberJoinedMore = '[bold]{{name}}[/bold] added {{users}}, and [showmore]{{count}} more[/showmore] to the conversation';
z.string.conversationMemberJoinedYouMore = '[bold]You[/bold] added {{users}}, and [showmore]{{count}} more[/showmore] to the conversation';
z.string.conversationMemberJoinedSelf = '[bold]{{name}}[/bold] joined';
z.string.conversationMemberJoinedSelfYou = '[bold]You[/bold] joined';
z.string.conversationMemberLeft = '[bold]{{name}}[/bold] left';
z.string.conversationMemberLeftYou = '[bold]You[/bold] left';
z.string.conversationMemberRemoved = '[bold]{{name}}[/bold] removed {{users}}';
z.string.conversationMemberRemovedYou = '[bold]You[/bold] removed {{users}}';
z.string.conversationTeamLeft = '[bold]{{name}}[/bold] was removed from the team';
z.string.conversationMessageDelivered = 'Delivered';
z.string.conversationReceiptsOn = ' turned on read receipts for everyone';
z.string.conversationReceiptsOnYou = ' turned on read receipts for everyone';
z.string.conversationReceiptsOff = ' turned off read receipts for everyone';
z.string.conversationReceiptsOffYou = ' turned off read receipts for everyone';
z.string.conversationRename = ' renamed the conversation';
z.string.conversationRenameYou = ' renamed the conversation';
z.string.conversationUpdatedTimer = ' set the message timer to {{time}}';
z.string.conversationUpdatedTimerYou = ' set the message timer to {{time}}';
z.string.conversationResetTimer = ' turned off the message timer';
z.string.conversationResetTimerYou = ' turned off the message timer';
z.string.conversationResume = 'Start a conversation with {{users}}';
z.string.conversationPing = ' pinged';
z.string.conversationPingYou = ' pinged';
z.string.conversationToday = 'today';
z.string.conversationVoiceChannelDeactivate = ' called';
z.string.conversationVoiceChannelDeactivateYou = ' called';
z.string.conversationYesterday = 'Yesterday';
z.string.conversationUnableToDecrypt1 = 'A message from [highlight]{{user}}[/highlight] was not received.';
z.string.conversationUnableToDecrypt2 = '[highlight]{{user}}[/highlight]´s device identity changed. Undelivered message.';
z.string.conversationUnableToDecryptLink = 'Why?';
z.string.conversationUnableToDecryptErrorMessage = 'Error';
z.string.conversationUnableToDecryptResetSession = 'Reset session';
z.string.conversationMissedMessages = 'You haven’t used this device for a while. Some messages may not appear here.';
z.string.conversationAssetUploading = 'Uploading…';
z.string.conversationAssetDownloading = 'Downloading…';
z.string.conversationAssetUploadFailed = 'Upload Failed';
z.string.conversationPlaybackError = 'Unable to play';
z.string.conversationContextMenuCopy = 'Copy';
z.string.conversationContextMenuEdit = 'Edit';
z.string.conversationContextMenuDelete = 'Delete for Me…';
z.string.conversationContextMenuDeleteEveryone = 'Delete for Everyone…';
z.string.conversationContextMenuDownload = 'Download';
z.string.conversationContextMenuLike = 'Like';
z.string.conversationContextMenuReply = 'Reply';
z.string.conversationContextMenuUnlike = 'Unlike';
z.string.conversationContextMenuDetails = 'Details';
z.string.conversationDeleteTimestamp = 'Deleted: {{date}}';
z.string.conversationEditTimestamp = 'Edited: {{date}}';
z.string.conversationLikesCaption = '{{number}} people';
z.string.conversationSendPastedFile = 'Pasted image at {{date}}';
z.string.conversationSomeone = 'Someone';
z.string.conversationTweetAuthor = ' on Twitter';
z.string.conversationServicesWarning = 'Services have access to the content of this conversation';

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
z.string.groupSizeInfo = 'Up to {{count}} people can join a group conversation. Video calls work with up to 3 other people and you.';

// Guest room
z.string.guestRoomConversationName = 'Guest room';
z.string.guestRoomToggleName = 'Allow guests and services';
z.string.guestRoomToggleInfo = 'Open this conversation to services and people outside your team.';
z.string.guestRoomToggleInfoExtended = 'Open this conversation to services and people outside your team. You can always change it later.';

z.string.guestRoomConversationBadge = 'Guests are present';
z.string.guestRoomConversationBadgeService = 'Services are active';
z.string.guestRoomConversationBadgeGuestAndService = 'Guests and services are present';

z.string.guestRoomConversationHead = 'People outside your team can join this conversation.';
z.string.guestRoomConversationButton = 'Invite people';

// Read receipts toggle
z.string.readReceiptsToogleName = 'Read receipts';
z.string.readReceiptsToogleInfo = 'When this is on, people can see when their messages in this conversation are read.';

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
z.string.conversationsPopoverNotificationSettings = 'Notifications…';
z.string.conversationsPopoverNotify = 'Unmute';
z.string.conversationsPopoverSilence = 'Mute';
z.string.conversationsPopoverUnarchive = 'Unarchive';

// Conversations secondary line
z.string.conversationsSecondaryLineEphemeralMention = 'Mentioned you';
z.string.conversationsSecondaryLineEphemeralMentionGroup = 'Someone mentioned you';
z.string.conversationsSecondaryLineEphemeralMessage = 'Sent a message';
z.string.conversationsSecondaryLineEphemeralMessageGroup = 'Someone sent a message';
z.string.conversationsSecondaryLineEphemeralReply = 'Replied to you';
z.string.conversationsSecondaryLineEphemeralReplyGroup = 'Someone replied to you';
z.string.conversationsSecondaryLineIncomingCall = '{{user}} is calling';
z.string.conversationsSecondaryLinePeopleLeft = '{{number}} people left';
z.string.conversationsSecondaryLinePersonLeft = '{{user}} left';
z.string.conversationsSecondaryLinePersonRemoved = '{{user}} was removed';
z.string.conversationsSecondaryLinePersonRemovedTeam = '{{user}} was removed from the team';
z.string.conversationsSecondaryLinePeopleAdded = '{{user}} people were added';
z.string.conversationsSecondaryLinePersonAdded = '{{user}} was added';
z.string.conversationsSecondaryLinePersonAddedSelf = '{{user}} joined';
z.string.conversationsSecondaryLinePersonAddedYou = '{{user}} added you';
z.string.conversationsSecondaryLineRenamed = '{{user}} renamed the conversation';
z.string.conversationsSecondaryLineSummaryMessage = '{{number}} message';
z.string.conversationsSecondaryLineSummaryMessages = '{{number}} messages';
z.string.conversationsSecondaryLineSummaryMention = '{{number}} mention';
z.string.conversationsSecondaryLineSummaryMentions = '{{number}} mentions';
z.string.conversationsSecondaryLineSummaryMissedCall = '{{number}} missed call';
z.string.conversationsSecondaryLineSummaryMissedCalls = '{{number}} missed calls';
z.string.conversationsSecondaryLineSummaryPing = '{{number}} ping';
z.string.conversationsSecondaryLineSummaryPings = '{{number}} pings'
z.string.conversationsSecondaryLineSummaryReply = '{{number}} reply';
z.string.conversationsSecondaryLineSummaryReplies = '{{number}} replies';
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
z.string.addParticipantsHeader = 'Add participants';
z.string.addParticipantsHeaderWithCounter = 'Add participants ({{number}})';
z.string.addParticipantsManageServices = 'Manage services';
z.string.addParticipantsManageServicesNoResults = 'Manage services';
z.string.addParticipantsNoServicesManager = 'Services are helpers that can improve your workflow.';
z.string.addParticipantsNoServicesMember = 'Services are helpers that can improve your workflow. To enable them, ask your administrator.';
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
z.string.conversationDetailsActionConversationParticipants = 'Show all ({{number}})';
z.string.conversationDetailsActionCreateGroup = 'Create group';
z.string.conversationDetailsActionDevices = 'Devices';
z.string.conversationDetailsActionGuestOptions = 'Guests and services';
z.string.conversationDetailsActionTimedMessages = 'Timed messages';
z.string.conversationDetailsActionNotifications = 'Notifications';
z.string.conversationDetailsActionLeave = 'Leave group…';
z.string.conversationDetailsGuestsOff = 'Off';
z.string.conversationDetailsGuestsOn = 'On';
z.string.conversationDetailsOptions = 'Options';
z.string.conversationDetailsParticipantsServicesOne = 'Service';
z.string.conversationDetailsParticipantsServicesMany = 'Services';
z.string.conversationDetailsParticipantsUsersOne = 'Person';
z.string.conversationDetailsParticipantsUsersMany = 'People';
z.string.conversationDetailsPeople = 'People';
z.string.conversationDetailsServices = 'Services';
z.string.conversationDetails1to1ReceiptsHeadEnabled = 'You have enabled read receipts';
z.string.conversationDetails1to1ReceiptsHeadDisabled = 'You have disabled read receipts';
z.string.conversationDetails1to1ReceiptsFirst = 'If both sides turn on read receipts, you can see when messages are read.';
z.string.conversationDetails1to1ReceiptsSecond = 'You can change this option in your account settings.';

// Panel: Conversation participants
z.string.conversationParticipantsTitle = 'People';
z.string.conversationParticipantsSearchPlaceholder = 'Search by name';

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
z.string.guestOptionsTitle = 'Guests and services';

// Panel: Notifications
z.string.notificationSettingsTitle = 'Notifications';
z.string.notificationSettingsDisclaimer = 'You can be notified about everything (including audio and video calls) or only when someone mentions you or replies to one of your messages.';
z.string.notificationSettingsEverything = 'Everything';
z.string.notificationSettingsMentionsAndReplies = 'Mentions and replies';
z.string.notificationSettingsNothing = 'Nothing';

// Panel: Timed messages
z.string.timedMessagesTitle = 'Timed messages';
z.string.timedMessageDisclaimer = 'Timed messages will be turned on for all the participants in this conversation.';

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

// Panel: Message details
z.string.messageDetailsTitle = 'Details';
z.string.messageDetailsTitleLikes = 'Liked{{count}}';
z.string.messageDetailsTitleReceipts = 'Read{{count}}';
z.string.messageDetailsSent = 'Sent: {{sent}}';
z.string.messageDetailsEdited = 'Edited: {{edited}}';
z.string.messageDetailsNoLikes = 'No one has liked this message yet.';
z.string.messageDetailsReceiptsOff = 'Read receipts were not on when this message was sent.';
z.string.messageDetailsNoReceipts = 'No one has read this message yet.';

// Read receipt toggle
z.string.receiptToggleLabel = 'Read receipts';
z.string.receiptToggleInfo = 'When this is on, people can see when their messages in this conversation are read.';


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
z.string.preferencesAccountMarketingConsentDetail = 'Receive news and product updates from Wire via email.';
z.string.preferencesAccountPrivacy = 'Privacy';
z.string.preferencesAccountReadReceiptsCheckbox = 'Read receipts';
z.string.preferencesAccountReadReceiptsDetail = 'When this is off, you won’t be able to see read receipts from other people. This setting does not apply to group conversations.';
z.string.preferencesAccountResetPassword = 'Reset password';
z.string.preferencesAccountTeam = 'in {{name}}';
z.string.preferencesAccountUsernameAvailable = 'Available';
z.string.preferencesAccountUsernameErrorTaken = 'Already taken';
z.string.preferencesAccountUsernameHint = 'At least 2 characters. a—z, 0—9 and _ only.';
z.string.preferencesAccountUsernamePlaceholder = 'Your full name';

z.string.preferencesAVCamera = 'Camera';
z.string.preferencesAVMicrophone = 'Microphone';
z.string.preferencesAVPermissionDetail = 'Enable from your browser Preferences';
z.string.preferencesAVSpeakers = 'Speakers';
z.string.preferencesAVTemporaryDisclaimer = 'Guests can’t start video conferences. Select the camera to use if you join one.';
z.string.preferencesAVNoCamera = 'Wire doesn’t have access to the camera.[br][faqLink]Read this support article[/faqLink] to find out how to fix it.';
z.string.preferencesAVTryAgain= 'Try Again';

z.string.preferencesDevicesActivatedOn = 'Activated {{date}}';
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
z.string.preferencesOptionsContactsMacos = 'Import from Contacts';
z.string.preferencesOptionsContactsDetail = 'We use your contact data to connect you with others. We anonymize all information and do not share it with anyone else.';
z.string.preferencesOptionsPopular = 'By popular demand';
z.string.preferencesOptionsUseDarkMode = 'Dark theme';
z.string.preferencesOptionsEmojiReplaceCheckbox = 'Replace type emoticons with emojis';
z.string.preferencesOptionsEmojiReplaceDetail = ':-) → [icon]';
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
z.string.searchManageServices = 'Manage Services';
z.string.searchManageServicesNoResults = 'Manage services';
z.string.searchNoServicesManager = 'Services are helpers that can improve your workflow.';
z.string.searchNoServicesMember = 'Services are helpers that can improve your workflow. To enable them, ask your administrator.';
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
z.string.searchInviteHeadline = 'Bring your friends';
z.string.searchInviteShare = 'Share Contacts';

z.string.searchServiceConfirmButton = 'Open Conversation';

// Search list: User list & service list components
z.string.searchListEveryoneParticipates = 'Everyone you’re\nconnected to is already in\nthis conversation.';
z.string.searchListNoMatches = 'No matching results.\nTry entering a different name.';

// Temporary guest experience
z.string.temporaryGuestCta = 'Create an account';
z.string.temporaryGuestDescription = 'Secure your business with encrypted group messaging and conference calls.';
z.string.temporaryGuestTimeRemaining = ' left in this guest room';

z.string.temporaryGuestJoinMessage = 'This conversation will be available to you for 24 hours.';
z.string.temporaryGuestJoinDescription = 'If you close or refresh this page, you will lose access.';

z.string.temporaryGuestLeaveMessage = 'You are no longer part of this conversation.';
z.string.temporaryGuestLeaveDescription = 'If you close or refresh this page, you will lose access to the conversation history.';

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
z.string.warningPermissionRequestCamera = '[icon] Allow access to camera';
z.string.warningPermissionRequestMicrophone = '[icon] Allow access to microphone';
z.string.warningPermissionRequestNotification = '[icon] Allow notifications';
z.string.warningPermissionRequestScreen = '[icon] Allow access to screen';

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
z.string.notificationConversationMessageTimerUpdate = '{{user}} set the message timer to {{time}}';
z.string.notificationConversationMessageTimerReset = '{{user}} turned off the message timer';
z.string.notificationConversationRename = '{{user}} renamed the conversation to {{name}}';
z.string.notificationMemberJoinMany = '{{user}} added {{number}} people to the conversation';
z.string.notificationMemberJoinSelf = '{{user}} joined the conversation';
z.string.notificationMemberJoinOne = '{{user1}} added {{user2}} to the conversation';
z.string.notificationMemberLeaveRemovedYou = '{{user}} removed you from the conversation';
z.string.notificationMention = 'Mention: {{text}}';
z.string.notificationObfuscated = 'Sent a message';
z.string.notificationObfuscatedMention = 'Mentioned you';
z.string.notificationObfuscatedReply = 'Replied to you';
z.string.notificationObfuscatedTitle = 'Someone';
z.string.notificationPing = 'Pinged';
z.string.notificationReaction = '{{reaction}} your message';
z.string.notificationReply = 'Reply: {{text}}';
z.string.notificationSharedAudio = 'Shared an audio message';
z.string.notificationSharedFile = 'Shared a file';
z.string.notificationSharedLocation = 'Shared a location';
z.string.notificationSharedVideo = 'Shared a video';
z.string.notificationTitleGroup = '{{user}} in {{conversation}}';
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
z.string.tooltipConversationsNotifications = 'Open notification settings ({{shortcut}})';
z.string.tooltipConversationsNotify = 'Unmute ({{shortcut}})';
z.string.tooltipConversationsPreferences = 'Open preferences';
z.string.tooltipConversationsSilence = 'Mute ({{shortcut}})';
z.string.tooltipConversationsStart = 'Start conversation ({{shortcut}})';

z.string.tooltipConversationDetailsAddPeople = 'Add participants to conversation ({{shortcut}})';
z.string.tooltipConversationDetailsRename = 'Change conversation name';

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

z.string.ephemeralUnitsNone = 'Off';
z.string.ephemeralUnitsSecond = 'second';
z.string.ephemeralUnitsSeconds = 'seconds';
z.string.ephemeralUnitsMinute = 'minute';
z.string.ephemeralUnitsMinutes = 'minutes';
z.string.ephemeralUnitsHour = 'hour';
z.string.ephemeralUnitsHours = 'hours';
z.string.ephemeralUnitsDay = 'day';
z.string.ephemeralUnitsDays = 'days';
z.string.ephemeralUnitsWeek = 'week';
z.string.ephemeralUnitsWeeks = 'weeks';
z.string.ephemeralUnitsYear = 'year';
z.string.ephemeralUnitsYears = 'years';
z.string.ephemeralRemaining = 'remaining';

// Replies
z.string.replyAudioMessage = 'Audio Message';
z.string.replyQuoteError = 'You cannot see this message.';
z.string.replyQuoteShowMore = 'Show more';
z.string.replyQuoteShowLess = 'Show less';
z.string.replyQuoteTimeStampDate = 'Original message from {{date}}';
z.string.replyQuoteTimeStampTime = 'Original message from {{time}}'
