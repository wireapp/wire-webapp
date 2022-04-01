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
import {t} from 'Util/LocalizerUtil';
import {Config} from '../../Config';
import {getPrivacyPolicyUrl, getTermsOfUsePersonalUrl, getTermsOfUseTeamUrl, URL} from '../../externalRoute';
import {UserState} from '../../user/UserState';
import {registerReactComponent, useKoSubscribableChildren} from '../../util/ComponentUtil';
import PreferencesLink from './components/PreferencesLink';
import PreferencesPage from './components/PreferencesPage';
import PreferencesSection from './components/PreferencesSection';

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
              <PreferencesLink href={config.URL.SUPPORT.INDEX} uie="go-support">
                {t('preferencesAboutSupportWebsite')}
              </PreferencesLink>
            </li>
            <li className="preferences-about-list-item">
              <PreferencesLink href={config.URL.SUPPORT.CONTACT} uie="go-contact-support">
                {t('preferencesAboutSupportContact')}
              </PreferencesLink>
            </li>
          </ul>
        </PreferencesSection>
      )}
      {showWireSection && (
        <PreferencesSection title={config.BRAND_NAME}>
          <ul className="preferences-about-list">
            {termsOfUseUrl && (
              <li className="preferences-about-list-item">
                <PreferencesLink href={termsOfUseUrl} uie="go-legal">
                  {t('preferencesAboutTermsOfUse')}
                </PreferencesLink>
              </li>
            )}
            {privacyPolicyUrl && (
              <li className="preferences-about-list-item">
                <PreferencesLink href={privacyPolicyUrl} uie="go-privacy">
                  {t('preferencesAboutPrivacyPolicy')}
                </PreferencesLink>
              </li>
            )}
            {websiteUrl && (
              <li className="preferences-about-list-item">
                <PreferencesLink href={websiteUrl} uie="go-wire-dot-com">
                  {t('preferencesAboutWebsite', config.BRAND_NAME)}
                </PreferencesLink>
              </li>
            )}
          </ul>
        </PreferencesSection>
      )}
      <PreferencesSection hasSeparator>
        <div className="preferences-detail">{t('preferencesAboutVersion', config.VERSION)}</div>
        <div className="preferences-detail">{t('preferencesAboutCopyright')}</div>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export default AboutPreferences;

registerReactComponent('about-preferences', {
  component: AboutPreferences,
  template: '<div data-bind="react: {}"></div>',
});
