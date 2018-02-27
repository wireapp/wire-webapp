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
z.string.modalBotsConfirmHeadline = 'Add Service';
z.string.modalBotsConfirmMessage = 'Are you sure you want to start a new conversation with {{name}}?';
z.string.modalBotsConfirmButton = 'Confirm';
// Bots unavailable
z.string.modalBotsUnavailableHeadline = 'Bots currently unavailable';
z.string.modalBotsUnavailableMessage = 'Thank you for your interest in bots. The service is currently suspended while we work on the next version. Stay tuned.';
// Cannot create the call because there is nobody to call (conversationEmpty)
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
z.string.modalCallSecondOngoingAction = 'Hang Up';
// Second outgoing call
z.string.modalCallSecondOutgoingHeadline = 'Hang up current call?';
z.string.modalCallSecondOutgoingMessage = 'You can only be in one call at a time.';
z.string.modalCallSecondOutgoingAction = 'Hang Up';
// Clear a conversation
z.string.modalClearConversationHeadline = 'Delete content?';
z.string.modalClearConversationMessage = 'This will clear the conversation history on all your devices.';
z.string.modalClearConversationOption = 'Also leave the conversation';
z.string.modalClearConversationButton = 'Delete';
// Connected device
z.string.modalConnectedDeviceHeadline = 'Your account was used on:';
z.string.modalConnectedDeviceFrom = 'From:';
z.string.modalConnectedDeviceMessage = 'If you didn’t do this, remove the device and reset your password.';
z.string.modalConnectedDeviceManageDevices = 'manage devices';
// Delete account
z.string.modalDeleteAccountAction = 'Delete';
z.string.modalDeleteAccountHeadline = 'Delete account';
z.string.modalDeleteAccountMessage = 'We will send a message via email or SMS. Follow the link to permanently delete your account.';
// Delete message
z.string.modalDeleteButton = 'Delete';
z.string.modalDeleteHeadline = 'Delete only for me?';
z.string.modalDeleteMessage = 'This cannot be undone.';
// Delete message
z.string.modalDeleteEveryoneButton = 'Delete';
z.string.modalDeleteEveryoneHeadline = 'Delete for everyone?';
z.string.modalDeleteEveryoneMessage = 'This cannot be undone.';
// Too long message
z.string.modalTooLongHeadline = 'Message too long';
z.string.modalTooLongMessage = 'You can send messages up to {{number}} characters long.';
// Leave a conversation
z.string.modalLeaveConversationHeadline = 'Leave "{{name}}" conversation?';
z.string.modalLeaveConversationMessage = 'The participants will be notified and the conversation removed from your list.';
z.string.modalLeaveConversationButton = 'Leave';
// Logout
z.string.modalLogoutHeadline = 'Clear Data?';
z.string.modalLogoutMessage = 'Delete all your personal information and conversations on this device.';
z.string.modalLogoutButton = 'Log out';
// New device
z.string.modalNewDeviceHeadline = '{{user}} started using a new device';
z.string.modalNewDeviceHeadlineMany = '{{users}} started using new devices';
z.string.modalNewDeviceHeadlineYou = '{{user}} started using a new device';
z.string.modalNewDeviceMessage = 'Do you still want to send your messages?';
z.string.modalNewDeviceCallAccept = 'Accept call';
z.string.modalNewDeviceCallAnyway = 'Call anyway';
z.string.modalNewDeviceCallIncoming = 'Do you still want to accept the call?';
z.string.modalNewDeviceCallOutgoing = 'Do you still want to place the call?';
z.string.modalNewDeviceShowDevice = 'show device';
z.string.modalNewDeviceSendAnyway = 'send anyway';
// Not connected
z.string.modalNotConnectedHeadline = 'No one added to conversation';
z.string.modalNotConnectedMessageOne = '{{name}} does not want to be added to conversations.';
z.string.modalNotConnectedMessageMany = 'One of the people you selected does not want to be added to conversations.';
// Remove device
z.string.modalRemoveDeviceButton = 'Remove device';
z.string.modalRemoveDeviceHeadline = 'Remove "{{device}}"';
z.string.modalRemoveDeviceMessage = 'Your password is required to remove the device.';
// Service unavailable
z.string.modalServiceUnavailableHeadline = 'Adding service not possible';
z.string.modalServiceUnavailableMessage = 'The service is unavailable a the moment.';
// Session Reset
z.string.modalSessionResetHeadline = 'The session has been reset';
z.string.modalSessionResetMessage_1 = 'If the problem is not resolved,';
z.string.modalSessionResetMessageLink = 'contact';
z.string.modalSessionResetMessage_2 = 'us.';
// Too many members in conversation
z.string.modalTooManyMembersHeadline = 'Full house';
z.string.modalTooManyMembersMessage = 'Up to {{number1}} people can join a conversation. There is room for {{number2}} more people in here.';
// Parallel uploads
z.string.modalUploadsParallel = 'You can send up to {{number}} files at once.';

// Connection requests
z.string.connectionRequestConnect = 'Connect';
z.string.connectionRequestIgnore = 'Ignore';

// Guests
z.string.conversationGuestIndicator = 'Guest';

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
z.string.conversationCreateWith = 'with {{users}}';
z.string.conversationCreateYou = ' started a conversation with {{users}}';
z.string.conversationDeviceStartedUsingOne = ' started using';
z.string.conversationDeviceStartedUsingMany = ' started using';
z.string.conversationDeviceUnverified = ' unverified one of';
z.string.conversationDeviceYourDevices = ' your devices';
z.string.conversationDeviceUserDevices = ' {{user}}´s devices';
z.string.conversationDeviceNewDeviceOne = ' a new device';
z.string.conversationDeviceNewDeviceMany = ' new devices';
z.string.conversationDeviceNewPeopleJoined = 'new people joined.';
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
z.string.conversationVerified = 'Verified';
z.string.conversationVoiceChannelDeactivate = ' called';
z.string.conversationVoiceChannelDeactivateYou = ' called';
z.string.conversationYesterday = 'Yesterday';
z.string.conversationUnableToDecrypt_1 = 'a message from {{user}} was not received.';
z.string.conversationUnableToDecrypt_2 = '{{user}}´s device identity changed. Undelivered message.';
z.string.conversationUnableToDecryptLink = 'Why?';
z.string.conversationUnableToDecryptErrorMessage = 'Error';
z.string.conversationUnableToDecryptResetSession = 'Reset session';
z.string.conversationMissedMessages = 'You haven’t used this device for a while. Some messages may not appear here.';
z.string.conversationAssetUploading = 'Uploading…';
z.string.conversationAssetDownloading = 'Downloading…';
z.string.conversationAssetUploadFailed = 'Upload Failed';
z.string.conversationAssetUploadTooLarge = 'You can send files up to {{number}}';
z.string.conversationPlaybackError = 'Unable to play';
z.string.conversationContextMenuEdit = 'Edit';
z.string.conversationContextMenuDelete = 'Delete for Me';
z.string.conversationContextMenuDeleteEveryone = 'Delete for Everyone';
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
z.string.conversationsPopoverBlock = 'Block';
z.string.conversationsPopoverCancel = 'Cancel request';
z.string.conversationsPopoverClear = 'Delete';
z.string.conversationsPopoverLeave = 'Leave';
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
z.string.conversationsSecondaryLinePeopleAdded = '{{user}} people were added';
z.string.conversationsSecondaryLinePersonAdded = '{{user}} was added';
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

// People View
z.string.peopleConfirmLabel = 'Add people to group';
z.string.peoplePeople = '{{number}} People';
z.string.peopleSearchPlaceholder = 'Search by name';
z.string.peopleEveryoneParticipates = 'Everyone you’re\nconnected to is already in\nthis conversation.';
z.string.peopleNoMatches = 'No matching results.\nTry entering a different name.';
z.string.peopleInvite = 'Invite people to join Wire';
z.string.peopleInviteDetail = 'Sharing your contacts helps you connect with others. We anonymize all the information and do not share it with anyone else.';
z.string.peopleInviteButtonContacts = 'From Contacts';
z.string.peopleInviteButtonGmail = 'From Gmail';
z.string.peopleInviteHeadline = 'Bring your friends';
z.string.peopleServiceConfirmButton = 'Add service';
z.string.peopleServiceRemovalButton = 'Remove service';
z.string.peopleServiceNewConversation = 'Create a new conversation';
z.string.peopleServices = 'Services';
z.string.peopleShare = 'Share Contacts';
z.string.peopleTabsDetails = 'Details';
z.string.peopleTabsDevices = 'Devices';
z.string.peopleTabsDevicesHeadline = 'Wire gives every device a unique fingerprint. Compare them with {{user}} and verify your conversation.';
z.string.peopleTabsDevicesLearnMore = 'Learn more';
z.string.peopleTabsDevicesWhyVerify = 'Why verify conversation?';
z.string.peopleTabsNoDevicesHeadline = '{{user}} is using an old version of Wire. No devices are shown here.';
z.string.peopleTabsDeviceDetailAllMyDevices = 'Show all my devices';
z.string.peopleTabsDeviceDetailDeviceFingerprint = 'Device fingerprint';
z.string.peopleTabsDeviceDetailHeadline = 'Verify that this matches the fingerprint shown on {{html1}}{{user}}’s device{{html2}}.';
z.string.peopleTabsDeviceDetailHowTo = 'How do I do that?';
z.string.peopleTabsDeviceDetailResetSession = 'Reset session';
z.string.peopleTabsDeviceDetailShowMyDevice = 'Show my device fingerprint';
z.string.peopleTabsDeviceDetailVerify = 'Verified';
z.string.peopleTabsPeople = 'People';
z.string.peopleTabsServices = 'Services';
z.string.peopleVerified = 'Verified';

// Block user
z.string.peopleBlockHeadline = 'Block?';
z.string.peopleBlockMessage = '{{user}} won’t be able to contact you or add you to group conversations.';

// Accept a pending connection dialogue
z.string.peopleConnectHeadline = 'Accept?';
z.string.peopleConnectMessage = 'This will connect you and open the conversation with {{user}}.';

// Cancel a pending request
z.string.peopleCancelRequestHeadline = 'Cancel Request?';
z.string.peopleCancelRequestMessage = 'Remove connection request to {{user}}.';

// Leave the conversation dialogue
z.string.peopleLeaveHeadline = 'Leave the conversation?';
z.string.peopleLeaveMessage = 'You won’t be able to send or receive messages in this conversation.';

// Remove from conversation dialogue
z.string.peopleRemoveHeadline = 'Remove?';
z.string.peopleRemoveMessage = '{{user}} won’t be able to send or receive messages in this conversation.';

// Unblock user
z.string.peopleUnblockHeadline = 'Unblock?';
z.string.peopleUnblockMessage = '{{user}} will be able to contact you and add you to group conversations again.';

// Button labels for the actions
z.string.peopleButtonAdd = 'Add';
z.string.peopleButtonAddPeople = 'Add people';
z.string.peopleButtonBlock = 'Block';
z.string.peopleButtonCancel = 'Cancel';
z.string.peopleButtonConnect = 'Connect';
z.string.peopleButtonCreate = 'Create group';
z.string.peopleButtonIgnore = 'Ignore';
z.string.peopleButtonLeave = 'Leave';
z.string.peopleButtonOpen = 'Open Conversation';
z.string.peopleButtonPending = 'Pending';
z.string.peopleButtonProfile = 'Profile';
z.string.peopleButtonRemove = 'Remove';
z.string.peopleButtonUnblock = 'Unblock';
z.string.peopleButtonNo = 'No';
z.string.peopleButtonYes = 'Yes';

// Settings
z.string.preferencesAbout = 'About';
z.string.preferencesAccount = 'Account';
z.string.preferencesAv = 'Audio / Video';
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
z.string.preferencesAccountDelete = 'Delete account';
z.string.preferencesAccountLogOut = 'Log out';
z.string.preferencesAccountManageTeam = 'Manage team';
z.string.preferencesAccountResetPassword = 'Reset password';
z.string.preferencesAccountTeam = 'in {{name}}';
z.string.preferencesAccountUsernamePlaceholder = 'Your full name';
z.string.preferencesAccountUsernameHint = 'At least 2 characters. a—z, 0—9 and _ only.';
z.string.preferencesAccountUsernameAvailable = 'Available';
z.string.preferencesAccountUsernameErrorTaken = 'Already taken';

z.string.preferencesAvCamera = 'Camera';
z.string.preferencesAvMicrophone = 'Microphone';
z.string.preferencesAvPermissionDetail = 'Enable from your browser Preferences';
z.string.preferencesAvSpeakers = 'Speakers';

z.string.preferencesDevicesActivatedIn = 'in {{location}}';
z.string.preferencesDevicesActivatedOn = 'Activated on {{date}}';
z.string.preferencesDevicesActive = 'Active';
z.string.preferencesDevicesActiveDetail = 'If you don’t recognize a device above, remove it and reset your password.';
z.string.preferencesDevicesCurrent = 'Current';
z.string.preferencesDevicesFingerprint = 'Key fingerprint';
z.string.preferencesDevicesFingerprintDetail = 'Wire gives every device a unique fingerprint. Compare them and verify your devices and conversations.';
z.string.preferencesDevicesId = 'ID: ';
z.string.preferencesDevicesRemove = 'Remove';
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
z.string.preferencesOptionsData = 'Usage and crash reports';
z.string.preferencesOptionsDataCheckbox = 'Send anonymous data';
z.string.preferencesOptionsDataDetail = 'Make Wire better by sending anonymous information.';
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

// Search
z.string.searchConnect = 'Connect';
z.string.searchConnections = 'Connections';
z.string.searchContacts = 'Contacts';
z.string.searchCreateGroup = 'Create group';
z.string.searchCreateGuestRoom = 'Create guest room';
z.string.searchGroups = 'Groups';
z.string.searchPeople = 'People';
z.string.searchPlaceholder = 'Search by name or username';
z.string.searchServices = 'Services';
z.string.searchTeamGroups = 'Team conversations';
z.string.searchTeamMembers = 'Team members';
z.string.searchTopPeople = 'Top people';
z.string.searchTrySearch = 'Find people by\nname or username';
z.string.searchNoContactsOnWire = 'You have no contacts on Wire.\nTry finding people by\nname or username.';
z.string.searchMemberInvite = 'Invite people to join the team';
z.string.searchOthers = 'Connect';

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
z.string.notificationAssetAdd = 'Shared a picture';
z.string.notificationConnectionAccepted = 'Accepted your connection request';
z.string.notificationConnectionConnected = 'You are now connected';
z.string.notificationConnectionRequest = 'Wants to connect';
z.string.notificationConversationCreate = '{{user}} started a conversation';
z.string.notificationConversationRename = '{{user}} renamed the conversation to {{name}}';
z.string.notificationMemberJoinMany = '{{user}} added {{number}} people to the conversation';
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
