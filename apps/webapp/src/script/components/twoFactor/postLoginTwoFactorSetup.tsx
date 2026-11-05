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

import {useCallback, useEffect, useState} from 'react';

import type {TotpEnrolment} from '@wireapp/api-client/lib/self/totp';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {ShieldIcon} from 'Components/icon';
import {Layout} from 'src/script/auth/component/layout';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {APIClient} from 'src/script/service/apiClientSingleton';

import {takeoverStyles} from './twoFactor.styles';
import {activeCredentials, createTwoFactorApi, type TwoFactorApi, twoFactorError} from './twoFactorApi';
import {TwoFactorEnrollment} from './twoFactorEnrollment';

interface Props {
  email: string;
  password: string;
  onCredentialsConsumed: () => void;
  onContinue: () => void;
  api?: TwoFactorApi;
}

/** Fixed setup-period prompt until the backend exposes enforcement and deadline metadata. */
export function PostLoginTwoFactorSetup({
  email,
  password: initialPassword,
  onCredentialsConsumed,
  onContinue,
  api: providedApi,
}: Props) {
  const {translate, clock} = useApplicationContext();
  const [api] = useState(() => {
    return providedApi ?? createTwoFactorApi(container.resolve(APIClient).transport.http, clock);
  });
  const [password, setPassword] = useState(initialPassword);
  const [setup, setSetup] = useState<Maybe<TotpEnrolment>>(Maybe.nothing());
  const [enrolling, setEnrolling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  useEffect(() => {
    onCredentialsConsumed();
  }, [onCredentialsConsumed]);

  const clearPassword = useCallback(() => {
    setPassword('');
  }, []);

  const begin = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    const listed = await api.list();
    if (listed.isErr) {
      setError(twoFactorError(listed.error, translate));
      setBusy(false);
      return;
    }
    if (activeCredentials(listed.value).length > 0) {
      // Do not create a second enrolment for an account that has already completed setup.
      setPassword('');
      setBusy(false);
      onContinue();
      return;
    }
    const response = await api.enrol(translate('preferencesSecurityDefaultAppName'), {password});
    setBusy(false);
    if (response.isErr) {
      if (response.error === 'totp-required') {
        setAdding(true);
        setEnrolling(true);
        return;
      }
      setError(twoFactorError(response.error, translate));
      return;
    }
    setPassword('');
    setSetup(Maybe.just(response.value));
    setStep(1);
    setEnrolling(true);
  };
  return (
    <Layout variant="two-factor" activeStep={step}>
      <section css={takeoverStyles} aria-label={translate('preferencesSecurityTwoFactorAuthentication')}>
        <main className="two-factor-main">
          <div className="two-factor-content">
            {enrolling ? (
              <TwoFactorEnrollment
                api={api}
                email={email}
                initialSetup={setup.unwrapOr(undefined)}
                initialPassword={password}
                adding={adding}
                afterLogin
                onPasswordConsumed={clearPassword}
                onStepChange={setStep}
                onCancel={onContinue}
                onComplete={onContinue}
              />
            ) : (
              <>
                <div className="two-factor-hero">
                  <ShieldIcon aria-hidden="true" />
                </div>
                <h2>{translate('preferencesSecurityLoginSetupTitle')}</h2>
                <p>
                  <span className="two-factor-status two-factor-status--warning">
                    {translate('preferencesSecurityDaysLeft', {days: 45})}
                  </span>
                </p>
                <p>{translate('preferencesSecurityLoginSetupDetail')}</p>
                <div className="two-factor-footer two-factor-footer--stacked">
                  <Button data-uie-name="do-totp-setup-now" onClick={begin} disabled={busy}>
                    {translate(busy ? 'preferencesSecurityPleaseWait' : 'preferencesSecuritySetUpNow')}
                  </Button>
                  <Button
                    data-uie-name="do-totp-remind-later"
                    className="two-factor-text-button"
                    variant={ButtonVariant.TERTIARY}
                    onClick={onContinue}
                    disabled={busy}
                  >
                    {translate('preferencesSecurityRemindLater')}
                  </Button>
                </div>
                {error !== '' && (
                  <p role="alert" className="two-factor-error">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      </section>
    </Layout>
  );
}
