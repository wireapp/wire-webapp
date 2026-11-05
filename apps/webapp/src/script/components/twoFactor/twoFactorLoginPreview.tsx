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

import {useState} from 'react';

import {Button, ButtonVariant, CodeInput, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {ShieldIcon} from 'Components/icon';
import {Layout} from 'src/script/auth/component/layout';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {takeoverStyles} from './twoFactor.styles';

const codeLength = 6;
const sampleApps = ['preview-app-1', 'preview-app-2'];

/** UI preview only. Does not perform backend TOTP authentication. */
export function TwoFactorLoginPreview({onContinue}: {onContinue: () => void}) {
  const {translate} = useApplicationContext();
  const [selectedApp, setSelectedApp] = useState(sampleApps[0]);
  const [choosingApp, setChoosingApp] = useState(false);
  const [code, setCode] = useState('');
  const appName = (id: string) => {
    return translate('preferencesSecurityUnnamedApp', {index: sampleApps.indexOf(id) + 1});
  };
  return (
    <Layout>
      <section css={takeoverStyles} aria-label={translate('preferencesSecurityTwoFactorAuthentication')}>
        <main className="two-factor-main">
          <div className="two-factor-content">
            <div className="two-factor-hero">
              <ShieldIcon aria-hidden="true" />
            </div>
            <h2>
              {translate(choosingApp ? 'preferencesSecurityChooseAuthenticator' : 'preferencesSecurityLoginCodeTitle')}
            </h2>
            <p role="status">{translate('preferencesSecurityLoginPreview')}</p>
            {choosingApp ? (
              <div css={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {sampleApps.map(id => {
                  return (
                    <Button
                      key={id}
                      variant={ButtonVariant.SECONDARY}
                      onClick={() => {
                        setSelectedApp(id);
                        setCode('');
                        setChoosingApp(false);
                      }}
                    >
                      {appName(id)}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <>
                <p>{translate('preferencesSecurityLoginCodeDetail', {name: appName(selectedApp)})}</p>
                <CodeInput
                  key={selectedApp}
                  digits={codeLength}
                  codeInputLabel={translate('preferencesSecurityAuthenticationCode')}
                  codePlaceholder={translate('preferencesSecurityDigit')}
                  onCodeChange={setCode}
                />
                <div className="two-factor-footer two-factor-footer--stacked">
                  <Button
                    data-uie-name="do-totp-login-verify"
                    disabled={code.length !== codeLength}
                    onClick={() => {
                      if (/^\d{6}$/.test(code)) {
                        onContinue();
                      }
                    }}
                  >
                    {translate('preferencesSecurityVerify')}
                  </Button>
                  <Link
                    variant={LinkVariant.PRIMARY}
                    href="#choose-authenticator"
                    css={{textAlign: 'center', marginTop: 8}}
                    onClick={event => {
                      event.preventDefault();
                      setCode('');
                      setChoosingApp(true);
                    }}
                  >
                    {translate('preferencesSecurityChooseAnotherAuthenticator')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </main>
      </section>
    </Layout>
  );
}
