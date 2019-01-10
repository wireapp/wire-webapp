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

const env = window.wire.env;

export const UNSPLASH_URL = 'https://source.unsplash.com/1200x1200/?landscape';

export const URL = {
  ACCOUNT: env.URL && env.URL.ACCOUNT_BASE,
  PRIVACY_POLICY: env.URL && env.URL.PRIVACY_POLICY,
  SUPPORT: env.URL && env.URL.SUPPORT_BASE,
  TEAM_SETTINGS: env.URL && env.URL.TEAMS_BASE,
  TERMS_OF_USE_PERSONAL: env.URL && env.URL.TERMS_OF_USE_PERSONAL,
  TERMS_OF_USE_TEAMS: env.URL && env.URL.TERMS_OF_USE_TEAMS,
  WEBAPP: {
    INTERNAL: 'https://wire-webapp-staging.wire.com',
    PRODUCTION: env.APP_BASE || 'https://app.wire.com',
    STAGING: 'https://wire-webapp-staging.zinfra.io',
  },
  WEBSITE: env.URL && env.URL.WEBSITE_BASE,
};

export const URL_PATH = {
  CREATE_TEAM: '/create-team/',
  DECRYPT_ERROR_1: '/privacy/error-1/',
  DECRYPT_ERROR_2: '/privacy/error-2/',
  MANAGE_SERVICES: '/services/',
  MANAGE_TEAM: '/login/',
  PASSWORD_RESET: '/forgot/',
  PRIVACY_HOW: '/privacy/how/',
  PRIVACY_WHY: '/privacy/why/',
  SUPPORT_CONTACT: '/hc/en-us/requests/new',
  SUPPORT_USERNAME: '/support/username/',
};

const getTeamSettingsUrl = (path = '', utmSource) => {
  const query = utmSource ? `?utm_source=${utmSource}&utm_term=desktop` : '';
  const teamSettingsUrl = `${URL.TEAM_SETTINGS}${path}${query}`;
  return URL.TEAM_SETTINGS ? teamSettingsUrl : undefined;
};

export const getWebsiteUrl = (path = '', pkCampaign) => {
  const query = pkCampaign ? `?pk_campaign=${pkCampaign}&pk_kwd=desktop` : '';
  const websiteUrl = `${URL.WEBSITE}${path}${query}`;
  return URL.WEBSITE ? websiteUrl : undefined;
};

export const getAccountPagesUrl = (path = '') => {
  const accountPagesUrl = `${URL.ACCOUNT}${path}`;
  return URL.ACCOUNT ? accountPagesUrl : undefined;
};

export const getSupportUrl = (path = '') => {
  const supportUrl = `${URL.SUPPORT}${path}`;
  return URL.SUPPORT ? supportUrl : undefined;
};

export const getPrivacyPolicyUrl = () => URL.PRIVACY_POLICY || undefined;
export const getTermsOfUsePersonalUrl = () => URL.TERMS_OF_USE_PERSONAL || undefined;
export const getTermsOfUseTeamUrl = () => URL.TERMS_OF_USE_TEAMS || undefined;

export const getManageServicesUrl = utmSource => getTeamSettingsUrl(URL_PATH.MANAGE_SERVICES, utmSource);
export const getManageTeamUrl = utmSource => getTeamSettingsUrl(URL_PATH.MANAGE_TEAM, utmSource);

export const getCreateTeamUrl = pkCampaign =>
  z.config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && getWebsiteUrl(URL_PATH.CREATE_TEAM, pkCampaign);
export const getPrivacyHowUrl = () => getWebsiteUrl(URL_PATH.PRIVACY_HOW);
export const getPrivacyWhyUrl = () => getWebsiteUrl(URL_PATH.PRIVACY_WHY);
export const getSupportUsernameUrl = () => getWebsiteUrl(URL_PATH.SUPPORT_USERNAME);

export const getSupportContactUrl = () => getSupportUrl(URL_PATH.SUPPORT_CONTACT);
