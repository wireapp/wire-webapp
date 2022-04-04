import {BackendClientError} from './error/BackendClientError';
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

import {BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/src/http/';
import {defineMessages} from 'react-intl';

import {BackendError} from './auth/module/action/BackendError';
import {LabeledError} from './auth/module/action/LabeledError';
import {ValidationError} from './auth/module/action/ValidationError';
import {LOGOUT_REASON} from './auth/route';

export const footerStrings = defineMessages({
  copy: {
    defaultMessage: '© Wire Swiss GmbH',
    id: 'footer.copy',
  },
});

export const customEnvRedirectStrings = defineMessages({
  credentialsInfo: {
    defaultMessage: "Provide credentials only if you're sure this is your organization's login.",
    id: 'customEnvRedirect.credentialsInfo',
  },
  redirectHeadline: {
    defaultMessage: 'Redirecting...',
    id: 'customEnvRedirect.redirectHeadline',
  },
  redirectTo: {
    defaultMessage: 'You are being redirected to your dedicated enterprise service.',
    id: 'customEnvRedirect.redirectTo',
  },
});

export const cookiePolicyStrings = defineMessages({
  bannerText: {
    defaultMessage:
      'We use cookies to personalize your experience on our website. By continuing to use the website, you agree to the use of cookies.{newline}Further information on cookies can be found in our <strong>privacy policy</strong>.',
    id: 'cookiePolicyStrings.bannerText',
  },
});

export const indexStrings = defineMessages({
  createAccount: {
    defaultMessage: 'Create account',
    id: 'index.createAccount',
  },
  enterprise: {
    defaultMessage: 'Enterprise Login',
    id: 'index.enterprise',
  },
  logIn: {
    defaultMessage: 'Log in',
    id: 'index.login',
  },
  ssoLogin: {
    defaultMessage: 'Log in with SSO',
    id: 'index.ssoLogin',
  },
  welcome: {
    defaultMessage: 'Welcome to {brandName}',
    id: 'index.welcome',
  },
});

export const setAccountTypeStrings = defineMessages({
  createAccountForOrganizations: {
    defaultMessage: 'Wire for Free',
    id: 'index.createAccountForOrganizations',
  },
  createAccountForPersonalUse: {
    defaultMessage: 'Personal',
    id: 'index.createAccountForPersonalUse',
  },
  createPersonalAccount: {
    defaultMessage: 'Chat privately with groups of friends and family',
    id: 'index.createPersonalAccount',
  },
  createTeam: {
    defaultMessage: 'Secure collaboration for businesses, institutions and professional organizations',
    id: 'index.createTeam',
  },
  goBack: {
    defaultMessage: 'Go Back',
    id: 'index.goBack',
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
    defaultMessage: 'What is a team?',
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
  passwordHelp: {
    defaultMessage:
      'Use at least {minPasswordLength} characters, with one lowercase letter, one capital letter, a number, and a special character.',
    id: 'accountForm.passwordHelp',
  },
  passwordPlaceholder: {
    defaultMessage: 'Password',
    id: 'accountForm.passwordPlaceholder',
  },
  submitButton: {
    defaultMessage: 'Next',
    id: 'accountForm.submitButton',
  },
  terms: {
    defaultMessage: 'I accept the <terms>terms and conditions</terms>',
    id: 'accountForm.terms',
  },
  termsAndPrivacyPolicy: {
    defaultMessage:
      'I accept the <privacypolicy>privacy policy</privacypolicy> and <terms>terms and conditions</terms>',
    id: 'accountForm.termsAndPrivacyPolicy',
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
    defaultMessage: 'Enter the verification code we sent to{newline}{email}',
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
    defaultMessage: 'Your username helps people find you.',
    id: 'chooseHandle.subhead',
  },
});

export const setEmailStrings = defineMessages({
  button: {
    defaultMessage: 'Set email',
    id: 'setEmail.button',
  },
  emailPlaceholder: {
    defaultMessage: 'Email',
    id: 'setEmail.emailPlaceholder',
  },
  headline: {
    defaultMessage: 'Set email',
    id: 'setEmail.headline',
  },
  noMailHeadline: {
    defaultMessage: 'No email showing up?',
    id: 'authPostedResendAction',
  },
  tryAgain: {
    defaultMessage: 'Try again',
    id: 'setEmail.tryAgain',
  },
  verifyHeadline: {
    defaultMessage: 'You’ve got mail.',
    id: 'authPostedResendHeadline',
  },
  verifySubhead: {
    defaultMessage: 'Check your email inbox and follow the instructions.',
    id: 'authPostedResendDetail',
  },
});

export const setEntropyStrings = defineMessages({
  headline: {
    defaultMessage: 'Create Entropy',
    id: 'setEntropy.headline',
  },
  moreEntropyNeeded: {
    defaultMessage: 'Please continue moving your mouse within the window to create enough entropy.',
    id: 'setEntropy.moreEntropyNeeded',
  },
  subheadline: {
    defaultMessage:
      'Move your mouse as randomly as possible within the window below until the progress bar is 100% filled. This creates a random number which helps to protect your account and increases the overall security.',
    id: 'setEntropy.subheadline',
  },
  success: {
    defaultMessage: 'Entropy successfully created',
    id: 'setEntropy.success',
  },
});

export const setPasswordStrings = defineMessages({
  button: {
    defaultMessage: 'Set password',
    id: 'setPassword.button',
  },
  headline: {
    defaultMessage: 'Set password',
    id: 'setPassword.headline',
  },
  passwordPlaceholder: {
    defaultMessage: 'Password',
    id: 'setPassword.passwordPlaceholder',
  },
});

export const appAlreadyOpenStrings = defineMessages({
  continueButton: {
    defaultMessage: 'Continue',
    id: 'appAlreadyOpen.continueButton',
  },
  headline: {
    defaultMessage: '{brandName} is already open in this browser',
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
    defaultMessage: 'Do you want to receive news and product updates from {brandName} via email?',
    id: 'acceptNewsModal.headline',
  },
  privacyDescription: {
    defaultMessage: 'Check our <strong>Privacy Policy</strong>.',
    id: 'acceptNewsModal.privacyDescription',
  },
  unsubscribeDescription: {
    defaultMessage: 'You can unsubscribe at any time.',
    id: 'acceptNewsModal.unsubscribeDescription',
  },
});

export const unsupportedStrings = defineMessages({
  desktopOnlyMessage: {
    defaultMessage: 'Please use {brandName} on your desktop app instead.',
    id: 'unsupported.desktopOnlyMessage',
  },
  headlineBrowser: {
    defaultMessage: 'This browser is not supported.',
    id: 'unsupported.headlineBrowser',
  },
  headlineCookies: {
    defaultMessage: 'Enable cookies',
    id: 'unsupported.headlineCookies',
  },
  headlineIndexedDb: {
    defaultMessage: 'Your browser is in private mode',
    id: 'unsupported.headlineIndexedDb',
  },
  subheadBrowser: {
    defaultMessage:
      'Download the latest version of <strong>Google Chrome, Mozilla Firefox, Opera</strong> or <strong>Microsoft Edge.</strong>',
    id: 'unsupported.subheadBrowser',
  },
  subheadCookies: {
    defaultMessage: 'Enable cookies to log in to {brandName}.',
    id: 'unsupported.subheadCookies',
  },
  subheadIndexedDb: {
    defaultMessage:
      '{brandName} needs access to local storage to display your messages. Local storage is not available in private mode.',
    id: 'unsupported.subheadIndexedDb',
  },
});

export const unsupportedJoinStrings = defineMessages({
  unsupportedJoinHeadline: {
    defaultMessage: 'You have been invited to join a conversation in {brandName}',
    id: 'conversationJoin.unsupportedJoinHeadline',
  },
  unsupportedJoinMobileSubhead: {
    defaultMessage: 'Open this link on your computer.',
    id: 'conversationJoin.unsupportedJoinMobileSubhead',
  },
});

export const conversationJoinStrings = defineMessages({
  existentAccountHeadline: {
    defaultMessage: '{name}, you have been invited to join a conversation in {brandName}',
    id: 'conversationJoin.existentAccountHeadline',
  },
  existentAccountJoinWithoutLink: {
    defaultMessage: 'Join the conversation',
    id: 'conversationJoin.existentAccountJoinWithoutLink',
  },
  existentAccountJoinWithoutText: {
    defaultMessage: '{existentAccountJoinWithoutLink} without an account',
    id: 'conversationJoin.existentAccountJoinWithoutText',
  },
  existentAccountOpenButton: {
    defaultMessage: 'Open in {brandName}',
    id: 'conversationJoin.buttonExistentAccountOpen',
  },
  existentAccountSubhead: {
    defaultMessage:
      'Audio and video conferencing, text messaging, file sharing, and screen sharing, all end-to-end-encrypted.',
    id: 'conversationJoin.existentAccountSubhead',
  },
  fullConversationHeadline: {
    defaultMessage: 'Unable to join conversation',
    id: 'conversationJoin.fullConversationHeadline',
  },
  fullConversationSubhead: {
    defaultMessage: 'The maximum number of participants in this conversation has been reached.',
    id: 'conversationJoin.fullConversationSubhead',
  },
  hasAccount: {
    defaultMessage: 'Already have an account?',
    id: 'conversationJoin.hasAccount',
  },
  headline: {
    defaultMessage: 'You have been invited to join a conversation in {brandName}',
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
    defaultMessage: 'Conversation not found',
    id: 'conversationJoin.invalidHeadline',
  },
  invalidSubhead: {
    defaultMessage: 'The link to this group conversation expired or the conversation was set to private.',
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
    defaultMessage: 'Join conversation as temporary guest (access expires after 24 hours)',
    id: 'conversationJoin.subhead',
  },
});

export const errorHandlerStrings = defineMessages({
  [SyntheticErrorLabel.INVALID_PHONE_NUMBER]: {
    defaultMessage: 'Invalid Phone Number',
    id: 'authErrorPhoneNumberInvalid',
  },
  [SyntheticErrorLabel.FORBIDDEN_PHONE_NUMBER]: {
    defaultMessage: 'Sorry. This phone number is forbidden.',
    id: 'authErrorPhoneNumberForbidden',
  },
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
  [BackendClientError.LABEL.DOMAIN_BLOCKED_FOR_REGISTRATION]: {
    defaultMessage:
      'You can’t create this account as your email domain is intentionally blocked. Please ask your team admin to invite you via email.',
    id: 'BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION',
  },
  [BackendError.LABEL.INVALID_CODE]: {
    defaultMessage: 'Please retry, or request another code.',
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
  [BackendError.LABEL.KEY_EXISTS]: {
    defaultMessage: 'This email address has already been registered. {supportEmailExistsLink}',
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
    defaultMessage: 'This email address is already in use. {supportEmailExistsLink}',
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
  [BackendError.LABEL.CODE_AUTHENTICATION_FAILED]: {
    defaultMessage: 'Please retry, or request another code.',
    id: 'BackendError.LABEL.CODE_AUTHENTICATION_FAILED',
  },
  [BackendError.LABEL.SSO_GENERIC_ERROR]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 0).',
    id: 'BackendError.LABEL.SSO_GENERIC_ERROR',
  },
  [LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE]: {
    defaultMessage: 'Not enough disk space',
    id: 'LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE',
  },
  [BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND]: {
    defaultMessage: 'This email cannot be used for enterprise login. Please enter the SSO code to proceed.',
    id: 'BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND',
  },
  learnMore: {
    defaultMessage: 'Learn more',
    id: 'BackendError.learnMore',
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
    defaultMessage:
      'Use at least {minPasswordLength} characters, with one lowercase letter, one capital letter, a number, and a special character.',
    id: 'ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH]: {
    defaultMessage: 'Wrong password. Please try again.',
    id: 'ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH]: {
    defaultMessage: 'Please enter a valid SSO code',
    id: 'ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH',
  },
  [ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH]: {
    defaultMessage: 'Please enter a valid email or SSO code',
    id: 'ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH',
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
  goBack: {
    defaultMessage: 'Go Back',
    id: 'login.goBack',
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
  twoFactorLoginSubHead: {
    defaultMessage: 'Please check your email {email} for the verification code and enter it below.',
    id: 'login.twoFactorLoginSubHead',
  },
  twoFactorLoginTitle: {
    defaultMessage: 'Verify your account',
    id: 'login.twoFactorLoginTitle',
  },
});

export const ssoLoginStrings = defineMessages({
  codeInputPlaceholder: {
    defaultMessage: 'SSO code',
    id: 'ssoLogin.codeInputPlaceholder',
  },
  codeOrMailInputPlaceholder: {
    defaultMessage: 'Email or SSO code',
    id: 'ssoLogin.codeOrMailInputPlaceholder',
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
  subheadCode: {
    defaultMessage: 'Please enter your SSO code',
    id: 'ssoLogin.subheadCode',
  },
  subheadCodeOrEmail: {
    defaultMessage: 'Please enter your email or SSO code.',
    id: 'ssoLogin.subheadCodeOrEmail',
  },
  subheadEmailEnvironmentSwitchWarning: {
    defaultMessage:
      'If your email matches an enterprise installation of {brandName}, this app will connect to that server.',
    id: 'ssoLogin.subheadEmailEnvironmentSwitchWarning',
  },
});

export const phoneLoginStrings = defineMessages({
  accountCountryCode: {
    defaultMessage: 'Country Code',
    id: 'authAccountCountryCode',
  },
  errorCountryCodeInvalid: {
    defaultMessage: 'Invalid Country Code',
    id: 'authErrorCountryCodeInvalid',
  },
  loginHead: {
    defaultMessage: 'Phone Log in',
    id: 'authAccountSignInPhone',
  },
  verifyCodeChangePhone: {
    defaultMessage: 'Change phone number',
    id: 'authVerifyCodeChangePhone',
  },
  verifyCodeDescription: {
    defaultMessage: 'Enter the verification code we sent to {number}.',
    id: 'authVerifyCodeDescription',
  },
  verifyCodeResend: {
    defaultMessage: 'Resend',
    id: 'authVerifyCodeResendDetail',
  },
  verifyPasswordHeadline: {
    defaultMessage: 'Enter your password',
    id: 'authVerifyPasswordHeadline',
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
  [LOGOUT_REASON.NO_APP_CONFIG]: {
    defaultMessage: 'You were signed out because the initial configuration could not be loaded.',
    id: 'LOGOUT_REASON.NO_APP_CONFIG',
  },
  [LOGOUT_REASON.SESSION_EXPIRED]: {
    defaultMessage: 'You were signed out because your session expired.{newline}Please log in again.',
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
    defaultMessage: 'Remove one of your other devices to start using {brandName} on this one.',
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
    defaultMessage: 'You’ve used {brandName} on this device before.',
    id: 'historyInfo.hasHistoryHeadline',
  },
  hasHistoryInfo: {
    defaultMessage: 'Messages sent in the meantime {newline}will not appear here.',
    id: 'historyInfo.hasHistoryInfo',
  },
  learnMore: {
    defaultMessage: 'Learn more',
    id: 'historyInfo.learnMore',
  },
  noHistoryHeadline: {
    defaultMessage: 'It’s the first time you’re using {brandName} on this device.',
    id: 'historyInfo.noHistoryHeadline',
  },
  noHistoryInfo: {
    defaultMessage: 'For privacy reasons, {newline}your conversation history will not appear here.',
    id: 'historyInfo.noHistoryInfo',
  },
  ok: {
    defaultMessage: 'OK',
    id: 'historyInfo.ok',
  },
});
