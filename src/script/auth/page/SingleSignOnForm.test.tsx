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

import {ReactWrapper} from 'enzyme';
import {createMemoryHistory} from 'history';
import React from 'react';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SingleSignOnForm from './SingleSignOnForm';

describe('SingleSignOnForm', () => {
  let wrapper: ReactWrapper;

  const codeOrEmailInput = () => wrapper.find('input[data-uie-name="enter-code"]').first();
  const submitButton = () => wrapper.find('button[data-uie-name="do-sso-sign-in"]').first();
  const temporaryCheckbox = () => wrapper.find('input[data-uie-name="enter-public-computer-sso-sign-in"]');
  const errorMessage = (errorLabel?: string) =>
    wrapper.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  it('successfully logs into account with initial SSO code', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');
    const doLogin = jasmine.createSpy().and.returnValue((code: string) => Promise.resolve());
    const code = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';

    spyOn(actionRoot.authAction, 'validateSSOCode').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').and.returnValue(() => Promise.resolve());

    wrapper = mountComponent(
      <SingleSignOnForm doLogin={doLogin} initialCode={code} />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      history,
    );

    expect(codeOrEmailInput().exists())
      .withContext('Code input exists')
      .toBe(true);

    expect(codeOrEmailInput().props().value)
      .withContext('Code input has initial code value')
      .toEqual(code);

    expect(actionRoot.authAction.validateSSOCode)
      .withContext('validateSSOCode function was called')
      .toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(doLogin)
        .withContext('external login function was called')
        .toHaveBeenCalledTimes(1);
    });

    expect(actionRoot.authAction.doFinalizeSSOLogin)
      .withContext('doFinalizeSSOLogin function was called')
      .toHaveBeenCalledTimes(1);

    expect(historyPushSpy)
      .withContext('navigation to history page was triggered')
      .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
  });

  it('shows invalid code or email error', async () => {
    const code = 'invalid-code';

    wrapper = mountComponent(
      <SingleSignOnForm doLogin={() => Promise.reject()} />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(codeOrEmailInput().exists())
      .withContext('Code input exists')
      .toBe(true);

    expect(submitButton().props().disabled)
      .withContext('Submit button is disabled')
      .toBe(true);

    codeOrEmailInput().simulate('change', {target: {value: code}});

    expect(submitButton().props().disabled)
      .withContext('Submit button is enabled')
      .toBe(false);

    submitButton().simulate('submit');

    expect(errorMessage('sso-code-patternMismatch').exists())
      .withContext('Error "sso-code-patternMismatch" message exists')
      .toBe(true);
  });

  it('successfully redirects with registered domain and permanent client', async () => {
    const email = 'mail@mail.com';
    const inputHost = 'http://localhost:8080?test=true';
    const expectedHost = 'http://localhost:8080?test=true&clienttype=permanent';

    spyOn(actionRoot.authAction, 'doGetDomainInfo').and.returnValue(() =>
      Promise.resolve({config_json_url: '', webapp_welcome_url: inputHost}),
    );
    spyOn(actionRoot.navigationAction, 'doNavigate').and.returnValue(() => {});

    wrapper = mountComponent(
      <SingleSignOnForm doLogin={() => Promise.reject()} />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(codeOrEmailInput().exists())
      .withContext('Email input exists')
      .toBe(true);

    expect(submitButton().props().disabled)
      .withContext('Submit button is disabled')
      .toBe(true);

    codeOrEmailInput().simulate('change', {target: {value: email}});

    expect(submitButton().props().disabled)
      .withContext('Submit button is enabled')
      .toBe(false);

    submitButton().simulate('submit');

    expect(actionRoot.authAction.doGetDomainInfo)
      .withContext('domain data got fetched')
      .toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(actionRoot.navigationAction.doNavigate)
        .withContext('navigates to expected host')
        .toHaveBeenCalledWith(expectedHost);
    });
  });

  it('successfully redirects with registered domain and temporary client', async () => {
    const email = 'mail@mail.com';
    const inputHost = 'http://localhost:8080?test=true';
    const expectedHost = 'http://localhost:8080?test=true&clienttype=temporary';

    spyOn(actionRoot.authAction, 'doGetDomainInfo').and.returnValue(() =>
      Promise.resolve({config_json_url: '', webapp_welcome_url: inputHost}),
    );
    spyOn(actionRoot.navigationAction, 'doNavigate').and.returnValue(() => {});

    wrapper = mountComponent(
      <SingleSignOnForm doLogin={() => Promise.reject()} />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(codeOrEmailInput().exists())
      .withContext('Email input exists')
      .toBe(true);

    expect(submitButton().props().disabled)
      .withContext('Submit button is disabled')
      .toBe(true);

    codeOrEmailInput().simulate('change', {target: {value: email}});
    temporaryCheckbox().simulate('change', {target: {checked: true}});

    expect(submitButton().props().disabled)
      .withContext('Submit button is enabled')
      .toBe(false);

    submitButton().simulate('submit');

    expect(actionRoot.authAction.doGetDomainInfo)
      .withContext('domain data got fetched')
      .toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(actionRoot.navigationAction.doNavigate)
        .withContext('navigates to expected host')
        .toHaveBeenCalledWith(expectedHost);
    });
  });
});
