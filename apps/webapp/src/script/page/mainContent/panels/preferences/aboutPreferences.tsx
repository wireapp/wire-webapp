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

import {useMemo} from 'react';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {PreferencesPage} from './components/preferencesPage';
import {PreferencesSection} from './components/preferencesSection';

import {Config} from '../../../../Config';
import {externalUrl} from '../../../../externalRoute';

interface AboutPreferencesProps {
  selfUser: User;
}

const AboutPreferences = ({selfUser}: AboutPreferencesProps) => {
  const {translate} = useApplicationContext();
  const config = Config.getConfig();

  const websiteUrl = externalUrl.website;
  const privacyPolicyUrl = externalUrl.privacyPolicy;
  const desktopConfig = Config.getDesktopConfig();

  const termsOfUseUrl = useMemo(() => {
    if (selfUser !== null && selfUser !== undefined) {
      return externalUrl.termsOfUse;
    }
    return '';
  }, [selfUser]);

  const showWireSection = !!(
    (termsOfUseUrl !== undefined && termsOfUseUrl.length > 0) ||
    (websiteUrl !== null && websiteUrl !== undefined && websiteUrl.length > 0) ||
    (privacyPolicyUrl !== undefined && privacyPolicyUrl.length > 0)
  );
  const supportIndexUrl = config.URL.SUPPORT.INDEX;
  const supportContactUrl = config.URL.SUPPORT.CONTACT;
  const showSupportSection = !!(
    (supportIndexUrl !== undefined && supportIndexUrl.length > 0) ||
    (supportContactUrl !== undefined && supportContactUrl.length > 0)
  );

  return (
    <PreferencesPage title={translate('preferencesAbout')}>
      {showSupportSection && (
        <PreferencesSection title={translate('preferencesAboutSupport')}>
          <ul className="preferences-about-list">
            <li className="preferences-about-list-item">
              <Link variant={LinkVariant.PRIMARY} targetBlank href={supportIndexUrl} data-uie-name="go-support">
                {translate('preferencesAboutSupportWebsite')}
              </Link>
            </li>
            <li className="preferences-about-list-item">
              <Link
                variant={LinkVariant.PRIMARY}
                targetBlank
                href={supportContactUrl}
                data-uie-name="go-contact-support"
              >
                {translate('preferencesAboutSupportContact')}
              </Link>
            </li>
          </ul>
        </PreferencesSection>
      )}
      {showWireSection && (
        <PreferencesSection title={config.BRAND_NAME}>
          <ul className="preferences-about-list">
            {termsOfUseUrl !== undefined && termsOfUseUrl.length > 0 && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={termsOfUseUrl} data-uie-name="go-legal">
                  {translate('preferencesAboutTermsOfUse')}
                </Link>
              </li>
            )}
            {privacyPolicyUrl !== undefined && privacyPolicyUrl.length > 0 && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={privacyPolicyUrl} data-uie-name="go-privacy">
                  {translate('preferencesAboutPrivacyPolicy')}
                </Link>
              </li>
            )}
            {websiteUrl !== null && websiteUrl !== undefined && websiteUrl.length > 0 && (
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
        {desktopConfig !== null && desktopConfig !== undefined && (
          <p className="preferences-detail">
            {translate('preferencesAboutDesktopVersion', {version: desktopConfig.version})}
          </p>
        )}
        <p className="preferences-detail">
          {translate('preferencesAboutVersion', {brandName: config.BRAND_NAME, version: config.VERSION})}
        </p>
        <p className="preferences-detail">{translate('preferencesAboutAVSVersion', {version: config.AVS_VERSION})}</p>
        <p className="preferences-detail">{translate('preferencesAboutCopyright')}</p>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AboutPreferences};
