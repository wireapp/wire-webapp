/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isNonEmptyString} from '@sindresorhus/is';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import {twoFactorStyles} from 'Components/twoFactor/twoFactor.styles';
import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {TwoFactorSettings} from './accountPreferences/twoFactorSettings';
import {PreferencesPage} from './components/preferencesPage';
import {PreferencesSection} from './components/preferencesSection';

import {externalUrl} from '../../../../externalRoute';

export function SecurityPreferences({selfUser}: {selfUser: User}) {
  const {translate} = useApplicationContext();
  const {email} = useKoSubscribableChildren(selfUser, ['email']);

  return (
    <PreferencesPage title={translate('preferencesSecurity')}>
      <div className="preferences-wrapper" css={twoFactorStyles}>
        {!selfUser.isNoPasswordSSO && (
          <PreferencesSection title={translate('preferencesSecuritySignIn')}>
            <div className="two-factor-row">
              <strong>{translate('preferencesSecurityPassword')}</strong>
              <Link variant={LinkVariant.PRIMARY} href={externalUrl.passwordReset} targetBlank>
                {translate('preferencesAccountResetPassword')}
              </Link>
            </div>
          </PreferencesSection>
        )}
        <PreferencesSection title={translate('preferencesSecurityTwoFactorAuthentication')}>
          {isNonEmptyString(email) && !selfUser.isNoPasswordSSO && <TwoFactorSettings key={email} email={email} />}
        </PreferencesSection>
      </div>
    </PreferencesPage>
  );
}
