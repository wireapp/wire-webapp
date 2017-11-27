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

import {defineMessages} from 'react-intl';

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
    defaultMessage: 'Log In',
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

export const createAccountStrings = defineMessages({
  headLine: {
    id: 'createAccount.headLine',
    defaultMessage: 'Set up your account',
  },
  namePlaceholder: {
    id: 'createAccount.namePlaceholder',
    defaultMessage: 'Name',
  },
  emailPlaceholder: {
    id: 'createAccount.emailPlaceholder',
    defaultMessage: 'you@yourcompany.com',
  },
  passwordPlaceholder: {
    id: 'createAccount.passwordPlaceholder',
    defaultMessage: 'Password (at least 8 characters)',
  },
  terms: {
    id: 'createAccount.terms',
    defaultMessage: 'I accept the <a {linkParams}>terms and conditions</a>',
  },
  nextButton: {
    id: 'createAccount.nextButton',
    defaultMessage: 'Next',
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
