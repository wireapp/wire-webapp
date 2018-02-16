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

export const errorHandlerStrings = defineMessages({
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
    defaultMessage: 'BackendError.LABEL.INVALID_OPERATION',
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
