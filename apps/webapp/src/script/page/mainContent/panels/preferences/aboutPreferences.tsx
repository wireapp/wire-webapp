/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useMemo, type FunctionComponent} from 'react';

import {isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';

import {buildMetadata, version as coreCryptoVersion} from '@wireapp/core-crypto';

import {PreferencesPage} from './components/preferencesPage';
import {PreferencesSection} from './components/preferencesSection';
import {DownloadApplicationLogs} from './downloadApplicationLogs';

import {Config} from '../../../../config';
import {externalUrl} from '../../../../externalRoute';
import {User} from '../../../../repositories/entity/user';
import {Link, LinkVariant} from '../../../../uiKit/typography/link/link';
import {useApplicationContext} from '../../../rootProvider';

interface AboutPreferencesProps {
  selfUser: User;
}

const shortCommitLength = 7;

const AboutPreferences: FunctionComponent<AboutPreferencesProps> = ({selfUser}: AboutPreferencesProps) => {
  const {translate, downloadApplicationLogs} = useApplicationContext();
  const config = Config.getConfig();

  const websiteUrl = externalUrl.website;
  const privacyPolicyUrl = externalUrl.privacyPolicy;
  const desktopConfig = Config.getDesktopConfig();
  const coreCryptoBuild = {version: coreCryptoVersion(), commit: buildMetadata().gitSha};

  const termsOfUseUrl = useMemo(() => {
    if (!isNullOrUndefined(selfUser)) {
      return externalUrl.termsOfUse;
    }
    return '';
  }, [selfUser]);

  const showWireSection =
    isNonEmptyString(termsOfUseUrl) || isNonEmptyString(websiteUrl) || isNonEmptyString(privacyPolicyUrl);
  const showSupportSection = isNonEmptyString(config.URL.SUPPORT.INDEX) || isNonEmptyString(config.URL.SUPPORT.CONTACT);

  return (
    <PreferencesPage title={translate('preferencesAbout')}>
      {showSupportSection && (
        <PreferencesSection title={translate('preferencesAboutSupport')}>
          <ul className="preferences-about-list">
            <li className="preferences-about-list-item">
              <Link
                variant={LinkVariant.PRIMARY}
                targetBlank
                href={config.URL.SUPPORT.INDEX}
                data-uie-name="go-support"
              >
                {translate('preferencesAboutSupportWebsite')}
              </Link>
            </li>
            <li className="preferences-about-list-item">
              <Link
                variant={LinkVariant.PRIMARY}
                targetBlank
                href={config.URL.SUPPORT.CONTACT}
                data-uie-name="go-contact-support"
              >
                {translate('preferencesAboutSupportContact')}
              </Link>
            </li>
          </ul>
        </PreferencesSection>
      )}
      <DownloadApplicationLogs downloadApplicationLogs={downloadApplicationLogs} translate={translate} />
      {showWireSection && (
        <PreferencesSection title={config.BRAND_NAME}>
          <ul className="preferences-about-list">
            {isNonEmptyString(termsOfUseUrl) && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={termsOfUseUrl} data-uie-name="go-legal">
                  {translate('preferencesAboutTermsOfUse')}
                </Link>
              </li>
            )}
            {isNonEmptyString(privacyPolicyUrl) && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={privacyPolicyUrl} data-uie-name="go-privacy">
                  {translate('preferencesAboutPrivacyPolicy')}
                </Link>
              </li>
            )}
            {isNonEmptyString(websiteUrl) && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={websiteUrl} data-uie-name="go-wire-dot-com">
                  {translate('preferencesAboutWebsite', {brandName: config.BRAND_NAME})}
                </Link>
              </li>
            )}
          </ul>
        </PreferencesSection>
      )}
      <PreferencesSection hasSeparator>
        {!isNullOrUndefined(desktopConfig) && (
          <p className="preferences-detail">
            {translate('preferencesAboutDesktopVersion', {version: desktopConfig.version})}
          </p>
        )}
        <p className="preferences-detail">
          {translate('preferencesAboutVersion', {brandName: config.BRAND_NAME, version: config.VERSION})}
        </p>
        <p className="preferences-detail">{translate('preferencesAboutAVSVersion', {version: config.AVS_VERSION})}</p>
        <p className="preferences-detail" title={coreCryptoBuild.commit}>
          {translate('preferencesAboutCoreCryptoVersion', {version: coreCryptoBuild.version})}
          {isNonEmptyString(coreCryptoBuild.commit) && ` (${coreCryptoBuild.commit.slice(0, shortCommitLength)})`}
        </p>
        <p className="preferences-detail">{translate('preferencesAboutCopyright')}</p>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AboutPreferences};
