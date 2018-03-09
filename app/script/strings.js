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

/* eslint-disable sort-keys */

export const footerStrings = defineMessages({
  wireLink: {
    id: 'footer.wireLink',
    defaultMessage: 'wire.com',
  },
  copy: {
    id: 'footer.copy',
    defaultMessage: '© Wire Swiss GmbH',
  },
});

export const indexStrings = defineMessages({
  claim: {
    id: 'index.claim',
    defaultMessage: 'Secure messaging for everyone.',
  },
  createAccount: {
    id: 'index.createAccount',
    defaultMessage: 'Create an account',
  },
  createAccountFor: {
    id: 'index.createAccountFor',
    defaultMessage: 'for personal use',
  },
  createTeam: {
    id: 'index.createTeam',
    defaultMessage: 'Create a team',
  },
  createTeamFor: {
    id: 'index.createTeamFor',
    defaultMessage: 'for work',
  },
  loginInfo: {
    id: 'index.loginInfo',
    defaultMessage: 'Already have an account?',
  },
  login: {
    id: 'index.login',
    defaultMessage: 'Log in',
  },
});

export const teamNameStrings = defineMessages({
  headline: {
    id: 'teamName.headline',
    defaultMessage: 'Name your team',
  },
  subhead: {
    id: 'teamName.subhead',
    defaultMessage: 'You can always change it later.',
  },
  teamNamePlaceholder: {
    id: 'teamName.teamNamePlaceholder',
    defaultMessage: 'Team name',
  },
  whatIsWireTeamsLink: {
    id: 'teamName.whatIsWireTeamsLink',
    defaultMessage: 'What is Wire for teams?',
  },
});

export const accountFormStrings = defineMessages({
  namePlaceholder: {
    id: 'accountForm.namePlaceholder',
    defaultMessage: 'Name',
  },
  emailTeamPlaceholder: {
    id: 'accountForm.emailTeamPlaceholder',
    defaultMessage: 'you@yourcompany.com',
  },
  emailPersonalPlaceholder: {
    id: 'accountForm.emailPersonalPlaceholder',
    defaultMessage: 'you@email.com',
  },
  passwordPlaceholder: {
    id: 'accountForm.passwordPlaceholder',
    defaultMessage: 'Password (at least 8 characters)',
  },
  terms: {
    id: 'accountForm.terms',
    defaultMessage: 'I accept the <a {linkParams}>terms and conditions</a>',
  },
  submitButton: {
    id: 'accountForm.submitButton',
    defaultMessage: 'Next',
  },
});

export const createAccountStrings = defineMessages({
  headLine: {
    id: 'createAccount.headLine',
    defaultMessage: 'Set up your account',
  },
  submitButton: {
    id: 'createAccount.nextButton',
    defaultMessage: 'Next',
  },
});

export const createPersonalAccountStrings = defineMessages({
  headLine: {
    id: 'createPersonalAccount.headLine',
    defaultMessage: 'New account',
  },
  submitButton: {
    id: 'createPersonalAccount.nextButton',
    defaultMessage: 'Register',
  },
});

export const verifyStrings = defineMessages({
  headline: {
    id: 'verify.headline',
    defaultMessage: 'You’ve got mail',
  },
  subhead: {
    id: 'verify.subhead',
    defaultMessage: 'Enter the verification code we sent to<br />{email}',
  },
  resendCode: {
    id: 'verify.resendCode',
    defaultMessage: 'Resend code',
  },
  changeEmail: {
    id: 'verify.changeEmail',
    defaultMessage: 'Change email',
  },
});

export const inviteStrings = defineMessages({
  headline: {
    id: 'invite.headline',
    defaultMessage: 'Build your team',
  },
  subhead: {
    id: 'invite.subhead',
    defaultMessage: 'Invite your colleagues to join.',
  },
  emailPlaceholder: {
    id: 'invite.emailPlaceholder',
    defaultMessage: 'colleague@email.com',
  },
  skipForNow: {
    id: 'invite.skipForNow',
    defaultMessage: 'Skip for now',
  },
  nextButton: {
    id: 'invite.nextButton',
    defaultMessage: 'Next',
  },
});

export const chooseHandleStrings = defineMessages({
  headline: {
    id: 'chooseHandle.headline',
    defaultMessage: 'Set username',
  },
  subhead: {
    id: 'chooseHandle.subhead',
    defaultMessage: 'Usernames help people find you.',
  },
  handlePlaceholder: {
    id: 'chooseHandle.handlePlaceholder',
    defaultMessage: 'Username',
  },
});

export const appAlreadyOpenStrings = defineMessages({
  headline: {
    id: 'appAlreadyOpenStrings.headline',
    defaultMessage: 'Wire is already open in this browser',
  },
  text: {
    id: 'appAlreadyOpenStrings.text',
    defaultMessage: 'If you continue here, you will be logged out on the other tab.',
  },
  cancelButton: {
    id: 'appAlreadyOpenStrings.cancelButton',
    defaultMessage: 'Cancel',
  },
  continueButton: {
    id: 'appAlreadyOpenStrings.continueButton',
    defaultMessage: 'Continue',
  },
});

export const unsupportedStrings = defineMessages({
  headline: {
    id: 'unsupported.unsupportedHeadline',
    defaultMessage: 'This browser is not supported.',
  },
  subhead: {
    id: 'unsupported.unsupportedSubhead',
    defaultMessage:
      'Download the latest version of <b style="font-weight: 600">Google Chrome, Mozilla Firefox, Opera</b style="font-weight: 600"> or <b style="font-weight: 600">Microsoft Edge.</b>',
  },
});

export const unsupportedJoinStrings = defineMessages({
  unsupportedJoinHeadline: {
    id: 'conversationJoin.unsupportedJoinHeadline',
    defaultMessage: 'You have been invited <br />to join a <b style="color: black;">Wire guest room.</b>',
  },
  unsupportedJoinSubhead: {
    id: 'conversationJoin.unsupportedJoinSubhead',
    defaultMessage:
      '<p>This browser is not supported.</p>Download the latest version of <b style="font-weight: 600">Google Chrome, Mozilla Firefox, Opera</b> or <b  style="font-weight: 600">Microsoft Edge.</b>',
  },
  unsupportedJoinMobileSubhead: {
    id: 'conversationJoin.unsupportedJoinMobileSubhead',
    defaultMessage: 'Open this link on your computer.',
  },
});

export const conversationJoinStrings = defineMessages({
  headline: {
    id: 'conversationJoin.headline',
    defaultMessage: 'You have been invited <br />to join a <b style="color: black;">Wire guest room.</b>',
  },
  subhead: {
    id: 'conversationJoin.subhead',
    defaultMessage: 'Encrypted group messaging and conference calls. <br />No account necessary.',
  },
  existentAccountSubhead: {
    id: 'conversationJoin.subheadExistentAccount',
    defaultMessage: 'Guest rooms let you have conversations with people who are not on your team.',
  },
  existentAccountOpenButton: {
    id: 'conversationJoin.buttonExistentAccountOpen',
    defaultMessage: 'Open in Wire',
  },
  existentAccountJoinWithoutLink: {
    id: 'conversationJoin.existentAccountJoinWithoutLink',
    defaultMessage: 'Join the conversation',
  },
  existentAccountJoinWithoutText: {
    id: 'conversationJoin.existentAccountJoinWithoutText',
    defaultMessage: 'without an account.',
  },
  invalidHeadline: {
    id: 'conversationJoin.invalidHeadline',
    defaultMessage: 'This <b style="color: black;">Wire guest room</b><br />is now closed.',
  },
  invalidSubhead: {
    id: 'conversationJoin.invalidSubhead',
    defaultMessage: 'Ask the person who invited you how to join.',
  },
  invalidCreateAccountLink: {
    id: 'conversationJoin.invalidCreateAccountLink',
    defaultMessage: 'Create an account',
  },
  invalidCreateAccountText: {
    id: 'conversationJoin.invalidCreateAccountText',
    defaultMessage: 'for group messaging and conference calls.',
  },
  fullConversationHeadline: {
    id: 'conversationJoin.fullConversationHeadline',
    defaultMessage: 'This <b style="color: black;">Wire guest room</b><br />is full.',
  },
  fullConversationSubhead: {
    id: 'conversationJoin.fullConversationSubhead',
    defaultMessage: 'Talk to the person who invited you.',
  },
  namePlaceholder: {
    id: 'conversationJoin.namePlaceholder',
    defaultMessage: 'Your name',
  },
  hasAccount: {
    id: 'conversationJoin.hasAccount',
    defaultMessage: 'Already have an account?',
  },
  loginLink: {
    id: 'conversationJoin.loginLink',
    defaultMessage: 'Log in',
  },
  acceptTou: {
    id: 'conversationJoin.acceptTou',
    defaultMessage: 'By continuing you accept the Wire',
  },
  touLink: {
    id: 'conversationJoin.touLink',
    defaultMessage: 'Terms of Use',
  },
});

export const errorHandlerStrings = defineMessages({
  [BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND]: {
    id: 'BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND',
    defaultMessage: 'CONVERSATION_CODE_NOT_FOUND',
  },
  [BackendError.LABEL.CONVERSATION_NOT_FOUND]: {
    id: 'BackendError.LABEL.CONVERSATION_NOT_FOUND',
    defaultMessage: 'CONVERSATION_NOT_FOUND',
  },
  [BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS]: {
    id: 'BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS',
    defaultMessage: 'CONVERSATION_TOO_MANY_MEMBERS',
  },
  [BackendError.LABEL.ACCESS_DENIED]: {
    id: 'BackendError.LABEL.ACCESS_DENIED',
    defaultMessage: 'Please verify your details and try again',
  },
  [BackendError.LABEL.BLACKLISTED_EMAIL]: {
    id: 'BackendError.LABEL.BLACKLISTED_EMAIL',
    defaultMessage: 'This email address is not allowed',
  },
  [BackendError.LABEL.BLACKLISTED_PHONE]: {
    id: 'BackendError.LABEL.BLACKLISTED_PHONE',
    defaultMessage: 'This phone number is not allowed',
  },
  [BackendError.LABEL.INVALID_CODE]: {
    id: 'BackendError.LABEL.INVALID_CODE',
    defaultMessage: 'Please enter a valid code',
  },
  [BackendError.LABEL.INVALID_CREDENTIALS]: {
    id: 'BackendError.LABEL.INVALID_CREDENTIALS',
    defaultMessage: 'Please verify your details and try again',
  },
  [BackendError.LABEL.INVALID_EMAIL]: {
    id: 'BackendError.LABEL.INVALID_EMAIL',
    defaultMessage: 'This email address is invalid',
  },
  [BackendError.LABEL.INVALID_PHONE]: {
    id: 'BackendError.LABEL.INVALID_PHONE',
    defaultMessage: 'This phone number is invalid',
  },
  [BackendError.LABEL.KEY_EXISTS]: {
    id: 'BackendError.LABEL.KEY_EXISTS',
    defaultMessage:
      'This email address has already been registered. <a target="_blank" rel="noopener noreferrer" href="https://support.wire.com/hc/articles/115004082129">Learn more</a>',
  },
  [BackendError.LABEL.ALREADY_INVITED]: {
    id: 'BackendError.LABEL.ALREADY_INVITED',
    defaultMessage: 'This email has already been invited',
  },
  [BackendError.LABEL.MISSING_AUTH]: {
    id: 'BackendError.LABEL.MISSING_AUTH',
    defaultMessage: 'Please verify your details and try again',
  },
  [BackendError.LABEL.PENDING_ACTIVATION]: {
    id: 'BackendError.LABEL.PENDING_ACTIVATION',
    defaultMessage: 'The email address you provided has already been invited. Please check your email',
  },
  [BackendError.LABEL.PENDING_LOGIN]: {
    id: 'BackendError.LABEL.PENDING_LOGIN',
    defaultMessage: 'BackendError.LABEL.PENDING_LOGIN',
  },
  [BackendError.LABEL.TOO_MANY_LOGINS]: {
    id: 'BackendError.LABEL.TOO_MANY_LOGINS',
    defaultMessage: 'Please try again later',
  },
  [BackendError.LABEL.BAD_REQUEST]: {
    id: 'BackendError.LABEL.BAD_REQUEST',
    defaultMessage: 'Invalid input',
  },
  [BackendError.LABEL.INVALID_OPERATION]: {
    id: 'BackendError.LABEL.INVALID_OPERATION',
    defaultMessage: 'Invalid operation',
  },
  [BackendError.LABEL.INVALID_PAYLOAD]: {
    id: 'BackendError.LABEL.INVALID_PAYLOAD',
    defaultMessage: 'Invalid input',
  },
  [BackendError.LABEL.NOT_FOUND]: {
    id: 'BackendError.LABEL.NOT_FOUND',
    defaultMessage: 'Could not find resource',
  },
  [BackendError.LABEL.OPERATION_DENIED]: {
    id: 'BackendError.LABEL.OPERATION_DENIED',
    defaultMessage: 'You don’t have permission',
  },
  [BackendError.LABEL.UNAUTHORIZED]: {
    id: 'BackendError.LABEL.UNAUTHORIZED',
    defaultMessage: 'Something went wrong. Please reload the page and try again',
  },
  [BackendError.LABEL.HANDLE_EXISTS]: {
    id: 'BackendError.LABEL.HANDLE_EXISTS',
    defaultMessage: 'This username is already taken',
  },
  [BackendError.LABEL.HANDLE_TOO_SHORT]: {
    id: 'BackendError.LABEL.HANDLE_TOO_SHORT',
    defaultMessage: 'Please enter a username with at least 2 characters',
  },
  [BackendError.LABEL.INVALID_HANDLE]: {
    id: 'BackendError.LABEL.INVALID_HANDLE',
    defaultMessage: 'This username is invalid',
  },
  [BackendError.LABEL.INVALID_INVITATION_CODE]: {
    id: 'BackendError.LABEL.INVALID_INVITATION_CODE',
    defaultMessage: 'Invitation has been revoked or expired',
  },
  [BackendError.LABEL.NO_OTHER_OWNER]: {
    id: 'BackendError.LABEL.NO_OTHER_OWNER',
    defaultMessage: 'The last owner cannot be removed from the team',
  },
  [BackendError.LABEL.NO_TEAM]: {
    id: 'BackendError.LABEL.NO_TEAM',
    defaultMessage: 'Could not find team',
  },
  [BackendError.LABEL.NO_TEAM_MEMBER]: {
    id: 'BackendError.LABEL.NO_TEAM_MEMBER',
    defaultMessage: 'Could not find team member',
  },
  [BackendError.LABEL.TOO_MANY_MEMBERS]: {
    id: 'BackendError.LABEL.TOO_MANY_MEMBERS',
    defaultMessage: 'This team has reached its maximum size',
  },
  [BackendError.LABEL.SUSPENDED]: {
    id: 'BackendError.LABEL.SUSPENDED',
    defaultMessage: 'This account is no longer authorized to log in',
  },
  [BackendError.LABEL.EMAIL_EXISTS]: {
    id: 'BackendError.LABEL.EMAIL_EXISTS',
    defaultMessage:
      'This email address is already in use. <a target="_blank" rel="noopener noreferrer" href="https://support.wire.com/hc/articles/115004082129">Learn more</a>',
  },
  unexpected: {
    id: 'BackendError.unexpected',
    defaultMessage: 'Unexpected error ({code} {message})',
  },
});

export const validationErrorStrings = defineMessages({
  [ValidationError.FIELD.NAME.PATTERN_MISMATCH]: {
    id: 'ValidationError.FIELD.NAME.PATTERN_MISMATCH',
    defaultMessage: 'Enter a name with at least 2 characters',
  },
  [ValidationError.FIELD.NAME.VALUE_MISSING]: {
    id: 'ValidationError.FIELD.NAME.VALUE_MISSING',
    defaultMessage: 'Enter a name with at least 2 characters',
  },
  [ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH]: {
    id: 'ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH',
    defaultMessage: 'Enter a password with at least 8 characters',
  },
  [ValidationError.FIELD.EMAIL.TYPE_MISMATCH]: {
    id: 'ValidationError.FIELD.EMAIL.TYPE_MISMATCH',
    defaultMessage: 'Please enter a valid email address',
  },
  unexpected: {
    id: 'BackendError.unexpected',
    defaultMessage: 'Unexpected error ({code} {message})',
  },
});
