/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {fireEvent, waitFor} from '@testing-library/react';

import {TypeUtil} from '@wireapp/commons';

import {SingleSignOnForm} from './SingleSignOnForm';

import {Config, Configuration} from '../../Config';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {initialRootState} from '../module/reducer';
import {ROUTE, QUERY_KEY} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

const codeOrEmailInputId = 'enter-code';
const submitButtonId = 'do-sso-sign-in';
const temporaryCheckboxId = 'enter-public-computer-sso-sign-in';
const errorId = 'error-message';

describe('SingleSignOnForm', () => {
  it('prefills code and disables input with initial SSO code', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: false,
      },
    });

    const doLogin = jasmine.createSpy().and.returnValue((code: string) => Promise.resolve());
    const initialCode = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';

    spyOn(actionRoot.authAction, 'validateSSOCode').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(
      <SingleSignOnForm {...{doLogin, initialCode}} />,
      mockStoreFactory()(initialRootState),
    );

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;

    expect(codeOrEmailInput.value).toEqual(initialCode);

    expect(codeOrEmailInput.disabled).toBe(true);

    expect(submitButton.disabled).toEqual(false);
  });

  it('successfully logs into account with SSO code', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: false,
      },
    });

    const historyPushSpy = spyOn(history, 'pushState');
    const doLogin = jasmine.createSpy().and.returnValue((code: string) => Promise.resolve());
    const code = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';

    spyOn(actionRoot.authAction, 'validateSSOCode').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(<SingleSignOnForm {...{doLogin}} />, mockStoreFactory()(initialRootState));

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;

    fireEvent.change(codeOrEmailInput, {target: {value: code}});
    fireEvent.click(submitButton);

    expect(actionRoot.authAction.validateSSOCode).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(doLogin).toHaveBeenCalledTimes(1);
    });

    expect(actionRoot.authAction.doFinalizeSSOLogin).toHaveBeenCalledTimes(1);

    expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.HISTORY_INFO}`);
  });

  it('shows invalid code or email error', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
      },
    });
    const code = 'invalid-code';

    const {getByTestId, container} = mountComponent(
      <SingleSignOnForm {...{doLogin: () => Promise.reject()}} />,
      mockStoreFactory()(initialRootState),
    );

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;

    expect(submitButton.disabled).toBe(true);

    fireEvent.change(codeOrEmailInput, {target: {value: code}});

    expect(submitButton.disabled).toBe(false);

    fireEvent.submit(container.querySelector('form')!);

    const errorMessage = getByTestId(errorId);
    expect(errorMessage.dataset.uieValue).toBe(ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH);
  });

  it('disallows email when domain discovery is disabled', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: false,
      },
    });
    const email = 'email@mail.com';

    const {getByTestId, container} = mountComponent(
      <SingleSignOnForm {...{doLogin: () => Promise.reject()}} />,
      mockStoreFactory()(initialRootState),
    );

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;

    expect(submitButton.disabled).toBe(true);

    fireEvent.change(codeOrEmailInput, {target: {value: email}});

    expect(submitButton.disabled).toBe(false);

    fireEvent.submit(container.querySelector('form')!);

    const errorMessage = getByTestId(errorId);
    expect(errorMessage.dataset.uieValue).toBe(ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH);
  });

  it('successfully redirects with registered domain and permanent client', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
      },
    });
    const email = ' mail@mail.com ';
    const inputHost = 'http://localhost:8080?test=true';
    const expectedHost = `/auth?${QUERY_KEY.DESTINATION_URL}=${encodeURIComponent(
      `${inputHost}&clienttype=permanent&sso_auto_login=true`,
    )}#${ROUTE.CUSTOM_ENV_REDIRECT}`;

    spyOn(actionRoot.authAction, 'doGetDomainInfo').and.returnValue(() =>
      Promise.resolve({config_json_url: '', webapp_welcome_url: inputHost}),
    );
    spyOn(actionRoot.navigationAction, 'doNavigate').and.returnValue(() => {});

    const {getByTestId, container} = mountComponent(
      <SingleSignOnForm {...{doLogin: () => Promise.reject()}} />,
      mockStoreFactory()(initialRootState),
    );

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;

    expect(submitButton.disabled).toBe(true);

    fireEvent.change(codeOrEmailInput, {target: {value: email}});

    expect(submitButton.disabled).toBe(false);

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(actionRoot.authAction.doGetDomainInfo).toHaveBeenCalledTimes(1);
      expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledWith(expectedHost);
    });
  });

  it('successfully redirects with registered domain and temporary client', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
      },
    });
    const email = ' mail@mail.com ';
    const inputHost = 'http://localhost:8080?test=true';
    const expectedHost = `/auth?${QUERY_KEY.DESTINATION_URL}=${encodeURIComponent(
      `${inputHost}&clienttype=temporary&sso_auto_login=true`,
    )}#${ROUTE.CUSTOM_ENV_REDIRECT}`;

    spyOn(actionRoot.authAction, 'doGetDomainInfo').and.returnValue(() =>
      Promise.resolve({config_json_url: '', webapp_welcome_url: inputHost}),
    );
    spyOn(actionRoot.navigationAction, 'doNavigate').and.returnValue(() => {});

    const {getByTestId, container} = mountComponent(
      <SingleSignOnForm {...{doLogin: () => Promise.reject()}} />,
      mockStoreFactory()(initialRootState),
    );

    const codeOrEmailInput = getByTestId(codeOrEmailInputId) as HTMLInputElement;
    const submitButton = getByTestId(submitButtonId) as HTMLInputElement;
    const temporaryCheckbox = getByTestId(temporaryCheckboxId) as HTMLInputElement;

    expect(submitButton.disabled).toBe(true);

    fireEvent.change(codeOrEmailInput, {target: {value: email}});
    fireEvent.click(temporaryCheckbox);

    expect(submitButton.disabled).toBe(false);

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(actionRoot.authAction.doGetDomainInfo).toHaveBeenCalledTimes(1);
      expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledWith(expectedHost);
    });
  });
});
