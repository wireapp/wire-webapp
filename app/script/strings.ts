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

import {defineMessages} from 'react-intl';
import BackendError from './auth/module/action/BackendError';
import ValidationError from './auth/module/action/ValidationError';
import {LOGOUT_REASON} from './auth/route';

/* eslint-disable sort-keys */

export const footerStrings = defineMessages({
  copy: {
    defaultMessage: '© Wire Swiss GmbH',
    id: 'footer.copy',
  },
  wireLink: {
    defaultMessage: 'wire.com',
    id: 'footer.wireLink',
  },
});

export const cookiePolicyStrings = defineMessages({
  bannerText: {
    defaultMessage: `We use cookies to personalize your experience on our website. By continuing to use the website, you agree to the use of cookies.<br/>Further information on cookies can be found in our <b>privacy policy</b>.`,
    id: 'cookiePolicyStrings.bannerText',
  },
});

export const indexStrings = defineMessages({
  createAccountForOrganizations: {
    defaultMessage: 'Pro',
    id: 'index.createAccountForOrganizations',
  },
  createAccountForPersonalUse: {
    defaultMessage: 'Personal',
    id: 'index.createAccountForPersonalUse',
  },
  createPersonalAccount: {
    defaultMessage: 'create an account',
    id: 'index.createPersonalAccount',
  },
  createTeam: {
    defaultMessage: 'create a team',
    id: 'index.createTeam',
  },
  login: {
    defaultMessage: 'Log in',
    id: 'index.login',
  },
  loginInfo: {
    defaultMessage: 'Already have an account?',
    id: 'index.loginInfo',
  },
});

export const teamNameStrings = defineMessages({
  headline: {
    defaultMessage: 'Name your team',
    id: 'teamName.headline',
  },
  subhead: {
    defaultMessage: 'You can always change it later.',
    id: 'teamName.subhead',
  },
  teamNamePlaceholder: {
    defaultMessage: 'Team name',
    id: 'teamName.teamNamePlaceholder',
  },
  whatIsWireTeamsLink: {
    defaultMessage: 'What is Wire for teams?',
    id: 'teamName.whatIsWireTeamsLink',
  },
});

export const accountFormStrings = defineMessages({
  emailPersonalPlaceholder: {
    defaultMessage: 'you@email.com',
    id: 'accountForm.emailPersonalPlaceholder',
  },
  emailTeamPlaceholder: {
    defaultMessage: 'you@yourcompany.com',
    id: 'accountForm.emailTeamPlaceholder',
  },
  namePlaceholder: {
    defaultMessage: 'Name',
    id: 'accountForm.namePlaceholder',
  },
  passwordPlaceholder: {
    defaultMessage: 'Password (at least 8 characters)',
    id: 'accountForm.passwordPlaceholder',
  },
  submitButton: {
    defaultMessage: 'Next',
    id: 'accountForm.submitButton',
  },
  terms: {
    defaultMessage: 'I accept the <a {linkParams}>terms and conditions</a>',
    id: 'accountForm.terms',
  },
});

export const createAccountStrings = defineMessages({
  headLine: {
    defaultMessage: 'Set up your account',
    id: 'createAccount.headLine',
  },
  submitButton: {
    defaultMessage: 'Next',
    id: 'createAccount.nextButton',
  },
});

export const createPersonalAccountStrings = defineMessages({
  headLine: {
    defaultMessage: 'New account',
    id: 'createPersonalAccount.headLine',
  },
  submitButton: {
    defaultMessage: 'Register',
    id: 'createPersonalAccount.nextButton',
  },
});

export const verifyStrings = defineMessages({
  changeEmail: {
    defaultMessage: 'Change email',
    id: 'verify.changeEmail',
  },
  headline: {
    defaultMessage: 'You’ve got mail',
    id: 'verify.headline',
  },
  resendCode: {
    defaultMessage: 'Resend code',
    id: 'verify.resendCode',
  },
  subhead: {
    defaultMessage: 'Enter the verification code we sent to<br />{email}',
    id: 'verify.subhead',
  },
});

export const inviteStrings = defineMessages({
  emailPlaceholder: {
    defaultMessage: 'colleague@email.com',
    id: 'invite.emailPlaceholder',
  },
  headline: {
    defaultMessage: 'Build your team',
    id: 'invite.headline',
  },
  nextButton: {
    defaultMessage: 'Next',
    id: 'invite.nextButton',
  },
  skipForNow: {
    defaultMessage: 'Skip for now',
    id: 'invite.skipForNow',
  },
  subhead: {
    defaultMessage: 'Invite your colleagues to join.',
    id: 'invite.subhead',
  },
});

export const chooseHandleStrings = defineMessages({
  handlePlaceholder: {
    defaultMessage: 'Username',
    id: 'chooseHandle.handlePlaceholder',
  },
  headline: {
    defaultMessage: 'Set username',
    id: 'chooseHandle.headline',
  },
  subhead: {
    defaultMessage: 'Usernames help people find you.',
    id: 'chooseHandle.subhead',
  },
});

export const appAlreadyOpenStrings = defineMessages({
  continueButton: {
    defaultMessage: 'Continue',
    id: 'appAlreadyOpen.continueButton',
  },
  headline: {
    defaultMessage: 'Wire is already open in this browser',
    id: 'appAlreadyOpen.headline',
  },
  text: {
    defaultMessage: 'If you continue here, you will be logged out on the other tab.',
    id: 'appAlreadyOpen.text',
  },
});

export const acceptNewsModalStrings = defineMessages({
  confirmButton: {
    defaultMessage: 'Accept',
    id: 'acceptNewsModal.confirmButton',
  },
  declineButton: {
    defaultMessage: 'No, thanks',
    id: 'acceptNewsModal.declineButton',
  },
  headline: {
    defaultMessage: 'Do you want to receive news and product updates from Wire via email?',
    id: 'acceptNewsModal.headline',
  },
  privacyDescription: {
    defaultMessage: 'Check our <b>Privacy Policy</b>.',
    id: 'acceptNewsModal.privacyDescription',
  },
  unsubscribeDescription: {
    defaultMessage: 'You can unsubscribe at any time.',
    id: 'acceptNewsModal.unsubscribeDescription',
  },
});

export const unsupportedStrings = defineMessages({
  headlineBrowser: {
    defaultMessage: 'This browser is not supported.',
    id: 'unsupported.headlineBrowser',
  },
  headlineCookies: {
    defaultMessage: 'Enable cookies',
    id: 'unsupported.headlineCookies',
  },
  headlineIndexedDb: {
    defaultMessage: 'You are in private mode',
    id: 'unsupported.headlineIndexedDb',
  },
  subheadBrowser: {
    defaultMessage:
      'Download the latest version of <b style="font-weight: 600">Google Chrome, Mozilla Firefox, Opera</b style="font-weight: 600"> or <b style="font-weight: 600">Microsoft Edge.</b>',
    id: 'unsupported.subheadBrowser',
  },
  subheadCookies: {
    defaultMessage: 'Enable cookies to log in to Wire.',
    id: 'unsupported.subheadCookies',
  },
  subheadIndexedDb: {
    defaultMessage:
      'Wire needs access to local storage to display your messages. Local storage is not available in private mode.',
    id: 'unsupported.subheadIndexedDb',
  },
});

export const unsupportedJoinStrings = defineMessages({
  unsupportedJoinHeadline: {
    defaultMessage: 'You have been invited <br />to join a <b style="color: black;">Wire guest room.</b>',
    id: 'conversationJoin.unsupportedJoinHeadline',
  },
  unsupportedJoinMobileSubhead: {
    defaultMessage: 'Open this link on your computer.',
    id: 'conversationJoin.unsupportedJoinMobileSubhead',
  },
  unsupportedJoinSubhead: {
    defaultMessage:
      '<p>This browser is not supported.</p>Download the latest version of <b style="font-weight: 600">Google Chrome, Mozilla Firefox, Opera</b> or <b style="font-weight: 600">Microsoft Edge.</b>',
    id: 'conversationJoin.unsupportedJoinSubhead',
  },
});

export const conversationJoinStrings = defineMessages({
  existentAccountHeadline: {
    defaultMessage: '{name}, you have been invited <br />to join a <b style="color: black;">Wire guest room.</b>',
    id: 'conversationJoin.existentAccountHeadline',
  },
  existentAccountJoinWithoutLink: {
    defaultMessage: 'Join the conversation',
    id: 'conversationJoin.existentAccountJoinWithoutLink',
  },
  existentAccountJoinWithoutText: {
    defaultMessage: 'without an account.',
    id: 'conversationJoin.existentAccountJoinWithoutText',
  },
  existentAccountOpenButton: {
    defaultMessage: 'Open in Wire',
    id: 'conversationJoin.buttonExistentAccountOpen',
  },
  existentAccountSubhead: {
    defaultMessage: 'Guest rooms let you have conversations with people who are not on your team.',
    id: 'conversationJoin.subheadExistentAccount',
  },
  fullConversationHeadline: {
    defaultMessage: 'This <b style="color: black;">Wire guest room</b><br />is full.',
    id: 'conversationJoin.fullConversationHeadline',
  },
  fullConversationSubhead: {
    defaultMessage: 'Talk to the person who invited you.',
    id: 'conversationJoin.fullConversationSubhead',
  },
  hasAccount: {
    defaultMessage: 'Already have an account?',
    id: 'conversationJoin.hasAccount',
  },
  headline: {
    defaultMessage: 'You have been invited <br />to join a <b style="color: black;">Wire guest room.</b>',
    id: 'conversationJoin.headline',
  },
  invalidCreateAccountLink: {
    defaultMessage: 'Create an account',
    id: 'conversationJoin.invalidCreateAccountLink',
  },
  invalidCreateAccountText: {
    defaultMessage: 'for group messaging and conference calls.',
    id: 'conversationJoin.invalidCreateAccountText',
  },
  invalidHeadline: {
    defaultMessage: 'This <b style="color: black;">Wire guest room</b><br />is now closed.',
    id: 'conversationJoin.invalidHeadline',
  },
  invalidSubhead: {
    defaultMessage: 'Ask the person who invited you how to join.',
    id: 'conversationJoin.invalidSubhead',
  },
  loginLink: {
    defaultMessage: 'Log in',
    id: 'conversationJoin.loginLink',
  },
  namePlaceholder: {
    defaultMessage: 'Your name',
    id: 'conversationJoin.namePlaceholder',
  },
  subhead: {
    defaultMessage: 'Encrypted group messaging and conference calls. <br />No account necessary.',
    id: 'conversationJoin.subhead',
  },
});

export const errorHandlerStrings = defineMessages({
  [BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND]: {
    defaultMessage: 'This link is no longer valid. Ask the person who invited you how to join.',
    id: 'BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND',
  },
  [BackendError.LABEL.CONVERSATION_NOT_FOUND]: {
    defaultMessage: 'CONVERSATION_NOT_FOUND',
    id: 'BackendError.LABEL.CONVERSATION_NOT_FOUND',
  },
  [BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS]: {
    defaultMessage: 'This conversation has reached the limit of participants',
    id: 'BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS',
  },
  [BackendError.LABEL.ACCESS_DENIED]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.ACCESS_DENIED',
  },
  [BackendError.LABEL.BLACKLISTED_EMAIL]: {
    defaultMessage: 'This email address is not allowed',
    id: 'BackendError.LABEL.BLACKLISTED_EMAIL',
  },
  [BackendError.LABEL.BLACKLISTED_PHONE]: {
    defaultMessage: 'This phone number is not allowed',
    id: 'BackendError.LABEL.BLACKLISTED_PHONE',
  },
  [BackendError.LABEL.INVALID_CODE]: {
    defaultMessage: 'Please enter a valid code',
    id: 'BackendError.LABEL.INVALID_CODE',
  },
  [BackendError.LABEL.INVALID_CREDENTIALS]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.INVALID_CREDENTIALS',
  },
  [BackendError.LABEL.INVALID_EMAIL]: {
    defaultMessage: 'This email address is invalid',
    id: 'BackendError.LABEL.INVALID_EMAIL',
  },
  [BackendError.LABEL.INVALID_PHONE]: {
    defaultMessage: 'This phone number is invalid',
    id: 'BackendError.LABEL.INVALID_PHONE',
  },
  [BackendError.LABEL.KEY_EXISTS]: {
    defaultMessage:
      'This email address has already been registered. <a target="_blank" rel="noopener noreferrer" href="https://support.wire.com/hc/articles/115004082129">Learn more</a>',
    id: 'BackendError.LABEL.KEY_EXISTS',
  },
  [BackendError.LABEL.ALREADY_INVITED]: {
    defaultMessage: 'This email has already been invited',
    id: 'BackendError.LABEL.ALREADY_INVITED',
  },
  [BackendError.LABEL.MISSING_AUTH]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.MISSING_AUTH',
  },
  [BackendError.LABEL.PENDING_ACTIVATION]: {
    defaultMessage: 'The email address you provided has already been invited. Please check your email',
    id: 'BackendError.LABEL.PENDING_ACTIVATION',
  },
  [BackendError.LABEL.PENDING_LOGIN]: {
    defaultMessage: 'BackendError.LABEL.PENDING_LOGIN',
    id: 'BackendError.LABEL.PENDING_LOGIN',
  },
  [BackendError.LABEL.TOO_MANY_LOGINS]: {
    defaultMessage: 'Please try again later',
    id: 'BackendError.LABEL.TOO_MANY_LOGINS',
  },
  [BackendError.LABEL.BAD_REQUEST]: {
    defaultMessage: 'Invalid input',
    id: 'BackendError.LABEL.BAD_REQUEST',
  },
  [BackendError.LABEL.INVALID_OPERATION]: {
    defaultMessage: 'Invalid operation',
    id: 'BackendError.LABEL.INVALID_OPERATION',
  },
  [BackendError.LABEL.INVALID_PAYLOAD]: {
    defaultMessage: 'Invalid input',
    id: 'BackendError.LABEL.INVALID_PAYLOAD',
  },
  [BackendError.LABEL.NOT_FOUND]: {
    defaultMessage: 'Could not find resource',
    id: 'BackendError.LABEL.NOT_FOUND',
  },
  [BackendError.LABEL.OPERATION_DENIED]: {
    defaultMessage: 'You don’t have permission',
    id: 'BackendError.LABEL.OPERATION_DENIED',
  },
  [BackendError.LABEL.UNAUTHORIZED]: {
    defaultMessage: 'Something went wrong. Please reload the page and try again',
    id: 'BackendError.LABEL.UNAUTHORIZED',
  },
  [BackendError.LABEL.HANDLE_EXISTS]: {
    defaultMessage: 'This username is already taken',
    id: 'BackendError.LABEL.HANDLE_EXISTS',
  },
  [BackendError.LABEL.HANDLE_TOO_SHORT]: {
    defaultMessage: 'Please enter a username with at least 2 characters',
    id: 'BackendError.LABEL.HANDLE_TOO_SHORT',
  },
  [BackendError.LABEL.INVALID_HANDLE]: {
    defaultMessage: 'This username is invalid',
    id: 'BackendError.LABEL.INVALID_HANDLE',
  },
  [BackendError.LABEL.INVALID_INVITATION_CODE]: {
    defaultMessage: 'Invitation has been revoked or expired',
    id: 'BackendError.LABEL.INVALID_INVITATION_CODE',
  },
  [BackendError.LABEL.NO_OTHER_OWNER]: {
    defaultMessage: 'The last owner cannot be removed from the team',
    id: 'BackendError.LABEL.NO_OTHER_OWNER',
  },
  [BackendError.LABEL.NO_TEAM]: {
    defaultMessage: 'Could not find team',
    id: 'BackendError.LABEL.NO_TEAM',
  },
  [BackendError.LABEL.NO_TEAM_MEMBER]: {
    defaultMessage: 'Could not find team member',
    id: 'BackendError.LABEL.NO_TEAM_MEMBER',
  },
  [BackendError.LABEL.TOO_MANY_MEMBERS]: {
    defaultMessage: 'This team has reached its maximum size',
    id: 'BackendError.LABEL.TOO_MANY_MEMBERS',
  },
  [BackendError.LABEL.SUSPENDED]: {
    defaultMessage: 'This account is no longer authorized to log in',
    id: 'BackendError.LABEL.SUSPENDED',
  },
  [BackendError.LABEL.EMAIL_EXISTS]: {
    defaultMessage:
      'This email address is already in use. <a target="_blank" rel="noopener noreferrer" href="https://support.wire.com/hc/articles/115004082129">Learn more</a>',
    id: 'BackendError.LABEL.EMAIL_EXISTS',
  },
  [BackendError.LABEL.SSO_FORBIDDEN]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 8).',
    id: 'BackendError.LABEL.SSO_FORBIDDEN',
  },
  [BackendError.LABEL.SSO_INSUFFICIENT_PERMISSIONS]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 10).',
    id: 'BackendError.LABEL.SSO_INSUFFICIENT_PERMISSIONS',
  },
  [BackendError.LABEL.SSO_INVALID_FAILURE_REDIRECT]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 3).',
    id: 'BackendError.LABEL.SSO_INVALID_FAILURE_REDIRECT',
  },
  [BackendError.LABEL.SSO_INVALID_SUCCESS_REDIRECT]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 2).',
    id: 'BackendError.LABEL.SSO_INVALID_SUCCESS_REDIRECT',
  },
  [BackendError.LABEL.SSO_INVALID_UPSTREAM]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 5).',
    id: 'BackendError.LABEL.SSO_INVALID_UPSTREAM',
  },
  [BackendError.LABEL.SSO_INVALID_USERNAME]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 4).',
    id: 'BackendError.LABEL.SSO_INVALID_USERNAME',
  },
  [BackendError.LABEL.SSO_NO_MATCHING_AUTH]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 9).',
    id: 'BackendError.LABEL.SSO_NO_MATCHING_AUTH',
  },
  [BackendError.LABEL.SSO_NO_SSO_CODE]: {
    defaultMessage: 'No SSO access code detected',
    id: 'BackendError.LABEL.NO_SSO_CODE',
  },
  [BackendError.LABEL.SSO_NOT_FOUND]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 7).',
    id: 'BackendError.LABEL.SSO_NOT_FOUND',
  },
  [BackendError.LABEL.SSO_SERVER_ERROR]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 6).',
    id: 'BackendError.LABEL.SSO_SERVER_ERROR',
  },
  [BackendError.LABEL.SSO_UNSUPPORTED_SAML]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 1).',
    id: 'BackendError.LABEL.SSO_UNSUPPORTED_SAML',
  },
  [BackendError.LABEL.SSO_GENERIC_ERROR]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 0).',
    id: 'BackendError.LABEL.SSO_GENERIC_ERROR',
  },
  unexpected: {
    defaultMessage: 'Unexpected error',
    id: 'BackendError.unexpected',
  },
});

export const validationErrorStrings = defineMessages({
  [ValidationError.FIELD.NAME.PATTERN_MISMATCH]: {
    defaultMessage: 'Enter a name with at least 2 characters',
    id: 'ValidationError.FIELD.NAME.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.NAME.VALUE_MISSING]: {
    defaultMessage: 'Enter a name with at least 2 characters',
    id: 'ValidationError.FIELD.NAME.VALUE_MISSING',
  },
  [ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH]: {
    defaultMessage: 'Enter a password with at least 8 characters',
    id: 'ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH]: {
    defaultMessage: 'Wrong password. Please try again.',
    id: 'ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.SSO_LOGIN.PATTERN_MISMATCH]: {
    defaultMessage: 'Invalid code',
    id: 'ValidationError.FIELD.SSO_LOGIN.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.EMAIL.TYPE_MISMATCH]: {
    defaultMessage: 'Please enter a valid email address',
    id: 'ValidationError.FIELD.EMAIL.TYPE_MISMATCH',
  },
  unexpected: {
    defaultMessage: 'Unexpected error',
    id: 'BackendError.unexpected',
  },
});

export const loginStrings = defineMessages({
  emailPlaceholder: {
    defaultMessage: 'Email or username',
    id: 'login.emailPlaceholder',
  },
  forgotPassword: {
    defaultMessage: 'Forgot password?',
    id: 'login.forgotPassword',
  },
  headline: {
    defaultMessage: 'Log in',
    id: 'login.headline',
  },
  passwordPlaceholder: {
    defaultMessage: 'Password',
    id: 'login.passwordPlaceholder',
  },
  phoneLogin: {
    defaultMessage: 'Log in with phone number',
    id: 'login.phoneLogin',
  },
  publicComputer: {
    defaultMessage: 'This is a public computer',
    id: 'login.publicComputer',
  },
  ssoLogin: {
    defaultMessage: 'Company log in',
    id: 'login.ssoLogin',
  },
  subhead: {
    defaultMessage: 'Enter your email address or username.',
    id: 'login.subhead',
  },
});

export const ssoLoginStrings = defineMessages({
  codeInputPlaceholder: {
    defaultMessage: 'SSO Code',
    id: 'ssoLogin.codeInputPlaceholder',
  },
  headline: {
    defaultMessage: 'Company log in',
    id: 'ssoLogin.headline',
  },
  overlayDescription: {
    defaultMessage: "If you don't see the Single Sign On window, continue your Company Log in from here.",
    id: 'ssoLogin.overlayDescription',
  },
  overlayFocusLink: {
    defaultMessage: 'Click to continue',
    id: 'ssoLogin.overlayFocusLink',
  },
  pasteButton: {
    defaultMessage: 'Paste code',
    id: 'ssoLogin.pasteButton',
  },
  subhead: {
    defaultMessage: 'Enter the company SSO access code.',
    id: 'ssoLogin.subhead',
  },
});

export const logoutReasonStrings = defineMessages({
  [LOGOUT_REASON.ACCOUNT_REMOVED]: {
    defaultMessage: 'You were signed out because your account was deleted.',
    id: 'LOGOUT_REASON.ACCOUNT_REMOVED',
  },
  [LOGOUT_REASON.CLIENT_REMOVED]: {
    defaultMessage: 'You were signed out because your device was deleted.',
    id: 'LOGOUT_REASON.CLIENT_REMOVED',
  },
  [LOGOUT_REASON.SESSION_EXPIRED]: {
    defaultMessage: 'You were signed out because your session expired.<br />Please log in again.',
    id: 'LOGOUT_REASON.SESSION_EXPIRED',
  },
});

export const clientManagerStrings = defineMessages({
  headline: {
    defaultMessage: 'Remove a device',
    id: 'clientManager.headline',
  },
  logout: {
    defaultMessage: 'Log out',
    id: 'clientManager.logout',
  },
  subhead: {
    defaultMessage: 'Remove one of your other devices to start using Wire on this one.',
    id: 'clientManager.subhead',
  },
});

export const clientItemStrings = defineMessages({
  passwordPlaceholder: {
    defaultMessage: 'Password',
    id: 'clientItem.passwordPlaceholder',
  },
});

export const historyInfoStrings = defineMessages({
  hasHistoryHeadline: {
    defaultMessage: 'You’ve used Wire on this device before.',
    id: 'historyInfo.hasHistoryHeadline',
  },
  hasHistoryInfo: {
    defaultMessage: 'Messages sent in the meantime<br/>will not appear here.',
    id: 'historyInfo.hasHistoryInfo',
  },
  learnMore: {
    defaultMessage: 'Learn more',
    id: 'historyInfo.learnMore',
  },
  noHistoryHeadline: {
    defaultMessage: 'It’s the first time you’re using Wire on this device.',
    id: 'historyInfo.noHistoryHeadline',
  },
  noHistoryInfo: {
    defaultMessage: 'For privacy reasons,<br/>your conversation history will not appear here.',
    id: 'historyInfo.noHistoryInfo',
  },
  ok: {
    defaultMessage: 'OK',
    id: 'historyInfo.ok',
  },
});
