/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http/';
import {defineMessages} from 'react-intl';

import {LabeledError} from './auth/module/action/LabeledError';
import {ValidationError} from './auth/module/action/ValidationError';
import {Scope} from './auth/page/OAuthPermissions';
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
  goBack: {
    defaultMessage: 'Go back',
    id: 'createPersonalAccount.goBack',
  },
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
  continue: {
    defaultMessage: 'Continue',
    id: 'setEntropy.continue',
  },
  headline: {
    defaultMessage: 'Increase your account’s security',
    id: 'setEntropy.headline',
  },
  subheadline: {
    defaultMessage:
      'Move your mouse as randomly as possible in the white window until the progress bar is 100% full. In this way, you will help improve the quality of the random numbers used to create the long-term cryptographic secrets of this device and thus increase the security of your account.',
    id: 'setEntropy.subheadline',
  },
  success: {
    defaultMessage: 'Thanks for your support!',
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

export const guestLinkPasswordModalStrings = defineMessages({
  headline: {
    defaultMessage: '[Group Conversation] \n Enter password',
    id: 'guestLinkPasswordModal.headline',
  },
  description: {
    defaultMessage: 'Please enter the password you have received with the access link for this conversation.',
    id: 'guestLinkPasswordModal.description',
  },
  passwordInputLabel: {
    defaultMessage: 'Conversation password',
    id: 'guestLinkPasswordModal.passwordInputLabel',
  },
  learnMoreLink: {
    defaultMessage: 'Learn more about guest links',
    id: 'guestLinkPasswordModal.learnMoreLink',
  },
  joinConversation: {
    defaultMessage: 'Join Conversation',
    id: 'guestLinkPasswordModal.joinConversation',
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
  [BackendErrorLabel.NO_CONVERSATION_CODE]: {
    defaultMessage: 'This link is no longer valid. Ask the person who invited you how to join.',
    id: 'BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND',
  },
  [BackendErrorLabel.NO_CONVERSATION]: {
    defaultMessage: 'CONVERSATION_NOT_FOUND',
    id: 'BackendError.LABEL.CONVERSATION_NOT_FOUND',
  },
  [BackendErrorLabel.TOO_MANY_MEMBERS]: {
    defaultMessage: 'This conversation has reached the limit of participants',
    id: 'BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS',
  },
  [BackendErrorLabel.ACCESS_DENIED]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.ACCESS_DENIED',
  },
  [BackendErrorLabel.BLACKLISTED_EMAIL]: {
    defaultMessage: 'This email address is not allowed',
    id: 'BackendError.LABEL.BLACKLISTED_EMAIL',
  },
  [BackendErrorLabel.BLACKLISTED_PHONE]: {
    defaultMessage: 'This phone number is not allowed',
    id: 'BackendError.LABEL.BLACKLISTED_PHONE',
  },
  [BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION]: {
    defaultMessage:
      'You can’t create this account as your email domain is intentionally blocked. Please ask your team admin to invite you via email.',
    id: 'BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION',
  },
  [BackendErrorLabel.INVALID_CODE]: {
    defaultMessage: 'Please retry, or request another code.',
    id: 'BackendError.LABEL.INVALID_CODE',
  },
  [BackendErrorLabel.INVALID_CREDENTIALS]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.INVALID_CREDENTIALS',
  },
  [BackendErrorLabel.INVALID_EMAIL]: {
    defaultMessage: 'This email address is invalid',
    id: 'BackendError.LABEL.INVALID_EMAIL',
  },
  [BackendErrorLabel.KEY_EXISTS]: {
    defaultMessage: 'This email address has already been registered. {supportEmailExistsLink}',
    id: 'BackendError.LABEL.KEY_EXISTS',
  },
  [SyntheticErrorLabel.ALREADY_INVITED]: {
    defaultMessage: 'This email has already been invited',
    id: 'BackendError.LABEL.ALREADY_INVITED',
  },
  [BackendErrorLabel.MISSING_AUTH]: {
    defaultMessage: 'Please verify your details and try again',
    id: 'BackendError.LABEL.MISSING_AUTH',
  },
  [BackendErrorLabel.PENDING_ACTIVATION]: {
    defaultMessage: 'The email address you provided has already been invited. Please check your email',
    id: 'BackendError.LABEL.PENDING_ACTIVATION',
  },
  [BackendErrorLabel.PENDING_LOGIN]: {
    defaultMessage: 'BackendError.LABEL.PENDING_LOGIN',
    id: 'BackendError.LABEL.PENDING_LOGIN',
  },
  [BackendErrorLabel.CLIENT_ERROR]: {
    defaultMessage: 'Please try again later',
    id: 'BackendError.LABEL.TOO_MANY_LOGINS',
  },
  [SyntheticErrorLabel.TOO_MANY_REQUESTS]: {
    defaultMessage: 'Too many requests, please try again later.',
    id: 'BackendError.LABEL.TOO_MANY_REQUESTS',
  },
  [BackendErrorLabel.BAD_REQUEST]: {
    defaultMessage: 'Invalid input',
    id: 'BackendError.LABEL.BAD_REQUEST',
  },
  [SyntheticErrorLabel.EMAIL_REQUIRED]: {
    defaultMessage: 'Log in with an email address is required when two-factor authentication is activated',
    id: 'BackendError.LABEL.EMAIL_REQUIRED',
  },
  [BackendErrorLabel.INVALID_OPERATION]: {
    defaultMessage: 'Invalid operation',
    id: 'BackendError.LABEL.INVALID_OPERATION',
  },
  [BackendErrorLabel.INVALID_PAYLOAD]: {
    defaultMessage: 'Invalid input',
    id: 'BackendError.LABEL.INVALID_PAYLOAD',
  },
  [BackendErrorLabel.NOT_FOUND]: {
    defaultMessage: 'Could not find resource',
    id: 'BackendError.LABEL.NOT_FOUND',
  },
  [BackendErrorLabel.OPERATION_DENIED]: {
    defaultMessage: 'You don’t have permission',
    id: 'BackendError.LABEL.OPERATION_DENIED',
  },
  [BackendErrorLabel.UNAUTHORIZED]: {
    defaultMessage: 'Something went wrong. Please reload the page and try again',
    id: 'BackendError.LABEL.UNAUTHORIZED',
  },
  [BackendErrorLabel.HANDLE_EXISTS]: {
    defaultMessage: 'This username is already taken',
    id: 'BackendError.LABEL.HANDLE_EXISTS',
  },
  [SyntheticErrorLabel.HANDLE_TOO_SHORT]: {
    defaultMessage: 'Please enter a username with at least 2 characters',
    id: 'BackendError.LABEL.HANDLE_TOO_SHORT',
  },
  [BackendErrorLabel.INVALID_HANDLE]: {
    defaultMessage: 'This username is invalid',
    id: 'BackendError.LABEL.INVALID_HANDLE',
  },
  [BackendErrorLabel.INVALID_INVITATION_CODE]: {
    defaultMessage: 'Invitation has been revoked or expired',
    id: 'BackendError.LABEL.INVALID_INVITATION_CODE',
  },
  [BackendErrorLabel.NO_OTHER_OWNER]: {
    defaultMessage: 'The last owner cannot be removed from the team',
    id: 'BackendError.LABEL.NO_OTHER_OWNER',
  },
  [BackendErrorLabel.NO_TEAM]: {
    defaultMessage: 'Could not find team',
    id: 'BackendError.LABEL.NO_TEAM',
  },
  [BackendErrorLabel.NO_TEAM_MEMBER]: {
    defaultMessage: 'Could not find team member',
    id: 'BackendError.LABEL.NO_TEAM_MEMBER',
  },
  [BackendErrorLabel.TOO_MANY_MEMBERS]: {
    defaultMessage: 'This team has reached its maximum size',
    id: 'BackendError.LABEL.TOO_MANY_MEMBERS',
  },
  [BackendErrorLabel.SUSPENDED_ACCOUNT]: {
    defaultMessage: 'This account is no longer authorized to log in',
    id: 'BackendError.LABEL.SUSPENDED',
  },
  [BackendErrorLabel.INVITE_EMAIL_EXISTS]: {
    defaultMessage: 'This email address is already in use. {supportEmailExistsLink}',
    id: 'BackendError.LABEL.EMAIL_EXISTS',
  },
  [BackendErrorLabel.SSO_FORBIDDEN]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 8).',
    id: 'BackendError.LABEL.SSO_FORBIDDEN',
  },
  [BackendErrorLabel.INSUFFICIENT_PERMISSIONS]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 10).',
    id: 'BackendError.LABEL.SSO_INSUFFICIENT_PERMISSIONS',
  },
  [BackendErrorLabel.SSO_INVALID_FAILURE_REDIRECT]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 3).',
    id: 'BackendError.LABEL.SSO_INVALID_FAILURE_REDIRECT',
  },
  [BackendErrorLabel.SSO_INVALID_SUCCESS_REDIRECT]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 2).',
    id: 'BackendError.LABEL.SSO_INVALID_SUCCESS_REDIRECT',
  },
  [BackendErrorLabel.SSO_INVALID_UPSTREAM]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 5).',
    id: 'BackendError.LABEL.SSO_INVALID_UPSTREAM',
  },
  [BackendErrorLabel.SSO_INVALID_USERNAME]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 4).',
    id: 'BackendError.LABEL.SSO_INVALID_USERNAME',
  },
  [BackendErrorLabel.SSO_NO_MATCHING_AUTH]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 9).',
    id: 'BackendError.LABEL.SSO_NO_MATCHING_AUTH',
  },
  [BackendErrorLabel.NOT_FOUND]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 7).',
    id: 'BackendError.LABEL.SSO_NOT_FOUND',
  },
  [BackendErrorLabel.SERVER_ERROR]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 6).',
    id: 'BackendError.LABEL.SSO_SERVER_ERROR',
  },
  [BackendErrorLabel.SSO_UNSUPPORTED_SAML]: {
    defaultMessage: 'Something went wrong. Please contact your team administrator for details (Error 1).',
    id: 'BackendError.LABEL.SSO_UNSUPPORTED_SAML',
  },
  [BackendErrorLabel.CODE_AUTHENTICATION_FAILED]: {
    defaultMessage: 'Please retry, or request another code.',
    id: 'BackendError.LABEL.CODE_AUTHENTICATION_FAILED',
  },
  [SyntheticErrorLabel.SSO_GENERIC_ERROR]: {
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
  submitTwoFactorButton: {
    defaultMessage: 'Submit',
    id: 'login.submitTwoFactorButton',
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
    defaultMessage: 'Cancel process',
    id: 'clientManager.logout',
  },
  subhead: {
    defaultMessage: 'Remove one of your other devices to start using {brandName} on this one.',
    id: 'clientManager.subhead',
  },
  oauth: {
    defaultMessage:
      'You are adding a new device. Only 7 devices can be active. Remove one of your devices to start using Wire on this one ({device}).',
    id: 'clientManager.oauth',
  },
});

export const clientItemStrings = defineMessages({
  passwordPlaceholder: {
    defaultMessage: 'Password',
    id: 'clientItem.passwordPlaceholder',
  },
});

export const historyInfoStrings = defineMessages({
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

export const oauthStrings = defineMessages({
  headline: {
    defaultMessage: 'Permissions',
    id: 'oauth.headline',
  },
  logout: {
    defaultMessage: 'Switch account',
    id: 'oauth.logout',
  },
  cancel: {
    defaultMessage: "Don't Allow",
    id: 'oauth.cancel',
  },
  allow: {
    defaultMessage: 'Allow',
    id: 'oauth.allow',
  },
  subhead: {
    defaultMessage: '{app} requires your permission to:',
    id: 'oauth.subhead',
  },
  learnMore: {
    defaultMessage: '<learnMore>Learn more</learnMore> about these permissions in the settings.',
    id: 'oauth.learnMore',
  },
  details: {
    defaultMessage:
      'If you allow the permissions listed, Wire™ will be able to connect to your calendar. It won’t see the content of your calendar, just the ones happening with Wire. If you don’t grant the permissions, you can’t use this add-in.',
    id: 'oauth.details',
  },
  privacyPolicy: {
    defaultMessage: "Wire's <privacypolicy>Privacy Policy</privacypolicy>",
    id: 'oauth.privacypolicy',
  },
  [Scope.WRITE_CONVERSATIONS]: {
    defaultMessage: 'Create conversations',
    id: 'oauth.scope.write_conversations',
  },
  [Scope.WRITE_CONVERSATIONS_CODE]: {
    defaultMessage: 'Create conversation guest links',
    id: 'oauth.scope.write_conversations_code',
  },
  [Scope.READ_SELF]: {
    defaultMessage: 'Access user information',
    id: 'oauth.scope.read_self',
  },
  [Scope.READ_FEATURE_CONFIGS]: {
    defaultMessage: 'Access team feature configurations',
    id: 'oauth.scope.read_feature_configs',
  },
});
