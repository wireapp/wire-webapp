/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {container} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import * as util from 'Util/util';

import {E2EIHandler, E2EIHandlerStep} from './E2EIdentityEnrollment';
import {getModalOptions, ModalType} from './Modals';
import {OIDCService} from './OIDCService/OIDCService';

jest.mock('./OIDCService', () => ({
  getOIDCServiceInstance: jest.fn().mockReturnValue({
    clearProgress: jest.fn(),
  } as unknown as OIDCService),
}));

jest.mock('./Modals', () => ({
  getModalOptions: jest.fn().mockReturnValue({
    modalOptions: {},
    modalType: 'someType',
  }),
  ModalType: {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    ENROLL: 'enroll',
  },
}));

describe('E2EIHandler', () => {
  const params = {discoveryUrl: 'http://example.com', gracePeriodInSeconds: 30};
  const user = {name: () => 'John Doe', username: () => 'johndoe'};

  beforeEach(() => {
    jest.spyOn(util, 'supportsMLS').mockReturnValue(true);
    // Reset the singleton instance before each test
    E2EIHandler.resetInstance();
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the Config service to return true for ENABLE_E2EI
    (util.supportsMLS as jest.Mock).mockReturnValue(true);
    Config.getConfig = jest.fn().mockReturnValue({FEATURE: {ENABLE_E2EI: true}});

    jest.spyOn(PrimaryModal, 'show');
    (getModalOptions as jest.Mock).mockClear();

    jest
      .spyOn(container.resolve(UserState), 'self')
      .mockReturnValue({name: () => 'John Doe', username: () => 'johndoe'});
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockResolvedValue(true);
  });

  it('should create instance with valid params', () => {
    const instance = E2EIHandler.getInstance().initialize(params);
    expect(instance).toBeInstanceOf(E2EIHandler);
  });

  it('should always return the same instance', () => {
    const instance1 = E2EIHandler.getInstance().initialize(params);
    const instance2 = E2EIHandler.getInstance().initialize(params);
    expect(instance1).toBe(instance2);
  });

  it('should set currentStep to INITIALIZE after initialize is called', () => {
    const instance = E2EIHandler.getInstance();
    instance.initialize(params);
    expect(instance['currentStep']).toBe(E2EIHandlerStep.INITIALIZED);
  });

  it('should set currentStep to SUCCESS when enrollE2EI is called and enrollment succeeds', async () => {
    jest
      .spyOn(container.resolve(UserState), 'self')
      .mockReturnValue({name: () => 'John Doe', username: () => 'johndoe'});

    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockResolvedValueOnce(true);

    const instance = E2EIHandler.getInstance().initialize(params);
    await instance['enroll']();

    expect(instance['currentStep']).toBe(E2EIHandlerStep.SUCCESS);
  });

  it('should set currentStep to ERROR when enrolE2EI is called and enrolment fails', async () => {
    // Mock the Core service to return an error
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockImplementationOnce(jest.fn(() => Promise.reject()));
    jest.spyOn(container.resolve(UserState), 'self').mockImplementationOnce(() => user);

    const instance = E2EIHandler.getInstance().initialize(params);
    await instance['enroll']();
    expect(instance['currentStep']).toBe(E2EIHandlerStep.ERROR);
  });

  it('should display user info message when initialized', async () => {
    E2EIHandler.getInstance().initialize(params);
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.ENROLL,
      }),
    );
  });

  it('should throw error if trying to enroll with no config given', async () => {
    await expect(E2EIHandler.getInstance().enroll()).rejects.toEqual(
      new Error('Trying to enroll for E2EI without initializing the E2EIHandler'),
    );
  });

  it('should display loading message when enroled', async () => {
    const handler = E2EIHandler.getInstance().initialize(params);
    await handler['enroll']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.LOADING,
      }),
    );
  });

  it('should display success message when enrollment is done', async () => {
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockResolvedValueOnce(true);

    const handler = E2EIHandler.getInstance().initialize(params);
    handler['showLoadingMessage'] = jest.fn();
    await handler['enroll']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.SUCCESS,
      }),
    );
  });

  it('should display error message when enrollment fails', async () => {
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockRejectedValueOnce(false);

    const handler = E2EIHandler.getInstance().initialize(params);
    handler['showLoadingMessage'] = jest.fn();
    await handler['enroll']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.ERROR,
      }),
    );
  });
});
