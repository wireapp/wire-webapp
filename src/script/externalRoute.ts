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

import {currentLanguage} from './auth/localeConfig';
import {Config} from './Config';

const URL = Config.getConfig().URL;

const isProductionWebsite = URL.WEBSITE_BASE && URL.WEBSITE_BASE === 'https://wire.com';

/**
 * Check if audit logging is enabled for the current backend.
 * Audit logging is explicitly disabled for the production cloud backend.
 */
export const isAuditLogEnabledForBackend = (): boolean => {
  const {BACKEND_REST} = Config.getConfig();
  return BACKEND_REST !== 'https://prod-nginz-https.wire.com';
};

const getTeamSettingsUrl = (path: string = '', utmSource?: string): string | undefined => {
  const query = utmSource ? `?utm_source=${utmSource}&utm_term=desktop` : '';
  const teamSettingsUrl = `${URL.TEAMS_BASE}${path}${query}`;
  return URL.TEAMS_BASE ? teamSettingsUrl : undefined;
};

const getWebsiteUrl = (path: string = '', pkCampaign?: string): string | undefined => {
  if (URL.WEBSITE_BASE) {
    const query = pkCampaign ? `?pk_campaign=${pkCampaign}&pk_kwd=desktop` : '';
    const websiteUrl = `${URL.WEBSITE_BASE}${path}${query}`;
    return addLocaleToUrl(websiteUrl);
  }
  return undefined;
};

const getAccountPagesUrl = (path: string = ''): string | undefined => {
  return URL.ACCOUNT_BASE ? `${URL.ACCOUNT_BASE}${path}` : undefined;
};

const getPrivacyPolicyUrl = (): string | undefined => addLocaleToUrl(URL.PRIVACY_POLICY || undefined);
const getTermsOfUsePersonalUrl = (): string | undefined => addLocaleToUrl(URL.TERMS_OF_USE_PERSONAL || undefined);
const getTermsOfUseTeamUrl = (): string | undefined => addLocaleToUrl(URL.TERMS_OF_USE_TEAMS || undefined);

/**
 * Retrieves the URL for managing services with optional UTM parameters.
 * UTM parameters are used in online marketing to track the effectiveness of campaigns.
 *
 * @param  utmSource - Optional. The source of the UTM parameters.
 * @returns  The URL for managing services with optional UTM parameters.
 */
export const getManageServicesUrl = (utmSource?: string): string | undefined =>
  getTeamSettingsUrl(URL.URL_PATH.MANAGE_SERVICES, utmSource);

/**
 * Retrieves the URL for managing team settings with optional UTM parameters.
 * UTM parameters are used in online marketing to track the effectiveness of campaigns.
 *
 * @param utmSource - Optional. The source of the UTM parameters.
 * @returns The URL for managing team settings with optional UTM parameters.
 */
export const getManageTeamUrl = (utmSource?: string): string | undefined =>
  getTeamSettingsUrl(URL.URL_PATH?.MANAGE_TEAM, utmSource);

const getCreateTeamUrl = (): string | undefined =>
  Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION ? `${URL.TEAMS_BASE}${URL.URL_PATH.CREATE_TEAM}` : undefined;

const addLocaleToUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (!isProductionWebsite) {
    return url;
  }
  const language = currentLanguage().slice(0, 2);
  const websiteLanguage = language == 'de' ? language : 'en';
  return url.replace(Config.getConfig().URL.WEBSITE_BASE, `${Config.getConfig().URL.WEBSITE_BASE}/${websiteLanguage}`);
};

export const externalUrl = {
  createTeam: getCreateTeamUrl(),
  passwordReset: getAccountPagesUrl(URL.URL_PATH?.PASSWORD_RESET),
  privacyPolicy: getPrivacyPolicyUrl(),
  termsOfUsePersonnal: getTermsOfUsePersonalUrl(),
  termsOfUseTeam: getTermsOfUseTeamUrl(),
  website: getWebsiteUrl(),
};
