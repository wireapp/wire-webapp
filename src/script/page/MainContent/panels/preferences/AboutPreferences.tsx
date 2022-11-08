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

import React, {useMemo} from 'react';

import {container} from 'tsyringe';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {PreferencesPage} from './components/PreferencesPage';
import {PreferencesSection} from './components/PreferencesSection';

import {Config} from '../../../../Config';
import {getPrivacyPolicyUrl, getTermsOfUsePersonalUrl, getTermsOfUseTeamUrl, URL} from '../../../../externalRoute';
import {UserState} from '../../../../user/UserState';
import {useKoSubscribableChildren} from '../../../../util/ComponentUtil';

interface AboutPreferencesProps {
  userState?: UserState;
}

const AboutPreferences: React.FC<AboutPreferencesProps> = ({userState = container.resolve(UserState)}) => {
  const {self} = useKoSubscribableChildren(userState, ['self']);
  const {inTeam} = useKoSubscribableChildren(self, ['inTeam']);
  const config = Config.getConfig();
  const websiteUrl = URL.WEBSITE;
  const privacyPolicyUrl = getPrivacyPolicyUrl();
  const termsOfUseUrl = useMemo(() => {
    if (self) {
      return inTeam ? getTermsOfUseTeamUrl() : getTermsOfUsePersonalUrl();
    }
    return '';
  }, [self, inTeam]);

  const showWireSection = !!(termsOfUseUrl || websiteUrl || privacyPolicyUrl);
  const showSupportSection = !!(config.URL.SUPPORT.INDEX || config.URL.SUPPORT.CONTACT);

  return (
    <PreferencesPage title={t('preferencesAbout')}>
      {showSupportSection && (
        <PreferencesSection title={t('preferencesAboutSupport')}>
          <ul className="preferences-about-list">
            <li className="preferences-about-list-item">
              <Link
                variant={LinkVariant.PRIMARY}
                targetBlank
                href={config.URL.SUPPORT.INDEX}
                data-uie-name="go-support"
              >
                {t('preferencesAboutSupportWebsite')}
              </Link>
            </li>
            <li className="preferences-about-list-item">
              <Link
                variant={LinkVariant.PRIMARY}
                targetBlank
                href={config.URL.SUPPORT.CONTACT}
                data-uie-name="go-contact-support"
              >
                {t('preferencesAboutSupportContact')}
              </Link>
            </li>
          </ul>
        </PreferencesSection>
      )}
      {showWireSection && (
        <PreferencesSection title={config.BRAND_NAME}>
          <ul className="preferences-about-list">
            {termsOfUseUrl && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={termsOfUseUrl} data-uie-name="go-legal">
                  {t('preferencesAboutTermsOfUse')}
                </Link>
              </li>
            )}
            {privacyPolicyUrl && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={privacyPolicyUrl} data-uie-name="go-privacy">
                  {t('preferencesAboutPrivacyPolicy')}
                </Link>
              </li>
            )}
            {websiteUrl && (
              <li className="preferences-about-list-item">
                <Link variant={LinkVariant.PRIMARY} targetBlank href={websiteUrl} data-uie-name="go-wire-dot-com">
                  {t('preferencesAboutWebsite', config.BRAND_NAME)}
                </Link>
              </li>
            )}
          </ul>
        </PreferencesSection>
      )}
      <PreferencesSection hasSeparator>
        <p className="preferences-detail">{t('preferencesAboutVersion', config.VERSION)}</p>
        <p className="preferences-detail">{t('preferencesAboutCopyright')}</p>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AboutPreferences};
