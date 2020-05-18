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
import {initialRootState, RootState, Api} from '../module/reducer';
import {ROUTE, QUERY_KEY} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SingleSignOnForm, {SingleSignOnFormProps} from './SingleSignOnForm';
import {ValidationError} from '../module/action/ValidationError';
import {TypeUtil} from '@wireapp/commons';
import {Config, Configuration} from '../../Config';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';

class SingleSignOnFormPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    componentProps: SingleSignOnFormProps,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<SingleSignOnForm {...componentProps} />, store, history);
  }

  getCodeOrEmailInput = () => this.driver.find('input[data-uie-name="enter-code"]');
  getSubmitButton = () => this.driver.find('button[data-uie-name="do-sso-sign-in"]');
  getTemporaryCheckbox = () => this.driver.find('input[data-uie-name="enter-public-computer-sso-sign-in"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickSubmitButton = () => this.getSubmitButton().simulate('submit');

  enterCodeOrEmail = (value: string) => this.getCodeOrEmailInput().simulate('change', {target: {value}});

  update = () => this.driver.update();
}

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

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin, initialCode},
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('code input exists').toBe(true);

    expect(singleSignOnFormPage.getCodeOrEmailInput().props().value)
      .withContext('code input has initial code value')
      .toEqual(initialCode);

    expect(singleSignOnFormPage.getCodeOrEmailInput().props().disabled)
      .withContext('code input is disabled when prefilled')
      .toBe(true);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled)
      .withContext('submit button is enabled')
      .toEqual(false);
  });

  it('successfully logs into account with SSO code', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: false,
      },
    });

    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');
    const doLogin = jasmine.createSpy().and.returnValue((code: string) => Promise.resolve());
    const code = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';

    spyOn(actionRoot.authAction, 'validateSSOCode').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').and.returnValue(() => Promise.resolve());

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin},
      history,
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('code input exists').toBe(true);

    singleSignOnFormPage.enterCodeOrEmail(code);
    singleSignOnFormPage.clickSubmitButton();

    expect(actionRoot.authAction.validateSSOCode)
      .withContext('validateSSOCode function was called')
      .toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(doLogin).withContext('external login function was called').toHaveBeenCalledTimes(1);
    });

    expect(actionRoot.authAction.doFinalizeSSOLogin)
      .withContext('doFinalizeSSOLogin function was called')
      .toHaveBeenCalledTimes(1);

    expect(historyPushSpy)
      .withContext('navigation to history page was triggered')
      .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
  });

  it('shows invalid code or email error', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
      },
    });
    const code = 'invalid-code';

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin: () => Promise.reject()},
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('Code input exists').toBe(true);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is disabled').toBe(true);

    singleSignOnFormPage.enterCodeOrEmail(code);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is enabled').toBe(false);

    singleSignOnFormPage.clickSubmitButton();

    expect(singleSignOnFormPage.getErrorMessage(ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH).exists())
      .withContext(`Error "${ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH}" message exists`)
      .toBe(true);
  });

  it('disallows email when domain discovery is disabled', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: false,
      },
    });
    const email = 'email@mail.com';

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin: () => Promise.reject()},
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('code/email input exists').toBe(true);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is disabled').toBe(true);

    singleSignOnFormPage.enterCodeOrEmail(email);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is enabled').toBe(false);

    singleSignOnFormPage.clickSubmitButton();

    expect(singleSignOnFormPage.getErrorMessage(ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH).exists())
      .withContext(`Error "${ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH}" message exists`)
      .toBe(true);
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

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin: () => Promise.reject()},
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('Email input exists').toBe(true);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is disabled').toBe(true);

    singleSignOnFormPage.enterCodeOrEmail(email);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is enabled').toBe(false);

    singleSignOnFormPage.clickSubmitButton();

    expect(actionRoot.authAction.doGetDomainInfo).withContext('domain data got fetched').toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(actionRoot.navigationAction.doNavigate)
        .withContext('navigates to expected host')
        .toHaveBeenCalledWith(expectedHost);
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

    const singleSignOnFormPage = new SingleSignOnFormPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {doLogin: () => Promise.reject()},
    );

    expect(singleSignOnFormPage.getCodeOrEmailInput().exists()).withContext('Email input exists').toBe(true);

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is disabled').toBe(true);

    singleSignOnFormPage.enterCodeOrEmail(email);
    singleSignOnFormPage.getTemporaryCheckbox().simulate('change', {target: {checked: true}});

    expect(singleSignOnFormPage.getSubmitButton().props().disabled).withContext('Submit button is enabled').toBe(false);

    singleSignOnFormPage.clickSubmitButton();

    expect(actionRoot.authAction.doGetDomainInfo).withContext('domain data got fetched').toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(actionRoot.navigationAction.doNavigate)
        .withContext('navigates to expected host')
        .toHaveBeenCalledWith(expectedHost);
    });
  });
});
