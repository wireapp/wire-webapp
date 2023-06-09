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

import {E2EIHandler, E2EIHandlerStep} from './E2EIdentity';
import {getModalOptions, ModalType} from './Modals';

jest.mock('Util/util');
jest.mock('src/script/Config');
jest.mock('tsyringe');
jest.mock('src/script/service/CoreSingleton', () => {
  return {
    Core: jest.fn().mockImplementation(() => {
      return {startE2EIEnrollment: jest.fn()};
    }),
  };
});
jest.mock('src/script/user/UserState', () => {
  return {
    UserState: jest.fn().mockImplementation(() => {
      return {self: jest.fn()};
    }),
  };
});
jest.mock('Components/Modals/PrimaryModal');
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
jest.mock('src/script/service/CoreSingleton', () => ({
  Core: jest.fn().mockImplementation(() => ({
    startE2EIEnrollment: jest.fn(),
  })),
}));
jest.mock('src/script/user/UserState', () => ({
  UserState: jest.fn().mockImplementation(() => ({
    self: jest.fn(),
  })),
}));

describe('E2EIHandler', () => {
  const params = {discoveryUrl: 'http://example.com', gracePeriodInMS: 30000};
  const newParams = {discoveryUrl: 'http://new-example.com', gracePeriodInMS: 60000};
  const user = {name: () => 'John Doe', username: () => 'johndoe'};
  let coreMock: Core;
  let userStateMock: UserState;

  beforeEach(() => {
    (util.supportsMLS as jest.Mock).mockReturnValue(true);
    // Reset the singleton instance before each test
    E2EIHandler.resetInstance();
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Setup the Core and UserState services mocks
    coreMock = new Core();
    userStateMock = new UserState();
    (userStateMock.self as unknown as jest.Mock).mockReturnValue({name: () => 'John Doe', username: () => 'johndoe'});
    (coreMock.startE2EIEnrollment as jest.Mock).mockResolvedValue(true);

    (container.resolve as jest.Mock).mockImplementation(service => {
      if (service === Core) {
        return coreMock;
      }
      if (service === UserState) {
        return userStateMock;
      }
      return null;
    });

    // Mock the Config service to return true for ENABLE_E2EI
    (util.supportsMLS as jest.Mock).mockReturnValue(true);
    Config.getConfig = jest.fn().mockReturnValue({FEATURE: {ENABLE_E2EI: true}});

    // Mock the PrimaryModal service to return a mock modal
    (PrimaryModal.show as jest.Mock).mockClear();
    (getModalOptions as jest.Mock).mockClear();
  });

  it('should create instance with valid params', () => {
    const instance = E2EIHandler.getInstance(params);
    expect(instance).toBeInstanceOf(E2EIHandler);
  });

  it('should throw error if no params provided', () => {
    expect(() => E2EIHandler.getInstance()).toThrow(
      'GracePeriodTimer is not initialized. Please call getInstance with params.',
    );
  });

  it('should always return the same instance', () => {
    const instance1 = E2EIHandler.getInstance(params);
    const instance2 = E2EIHandler.getInstance(params);
    expect(instance1).toBe(instance2);
  });

  it('should update parameters correctly', () => {
    const instance = E2EIHandler.getInstance(params);

    // Assuming that the instance exposes getters for discoveryUrl and gracePeriodInMS for testing purposes
    expect(instance['discoveryUrl']).toEqual(params.discoveryUrl);
    expect(instance['gracePeriodInMS']).toEqual(params.gracePeriodInMS);

    instance.updateParams(newParams);
    expect(instance['discoveryUrl']).toEqual(newParams.discoveryUrl);
    expect(instance['gracePeriodInMS']).toEqual(newParams.gracePeriodInMS);
  });

  it('should return true when supportsMLS returns true and ENABLE_E2EI is true', () => {
    const instance = E2EIHandler.getInstance(params);
    expect(instance.isE2EIEnabled).toBe(true);
  });

  it('should return false when supportsMLS returns false', () => {
    (util.supportsMLS as jest.Mock).mockReturnValue(false);

    const instance = E2EIHandler.getInstance(params);
    expect(instance.isE2EIEnabled).toBe(false);
  });

  it('should return false when ENABLE_E2EI is false', () => {
    Config.getConfig = jest.fn().mockReturnValue({FEATURE: {ENABLE_E2EI: false}});

    const instance = E2EIHandler.getInstance(params);
    expect(instance.isE2EIEnabled).toBe(false);
  });

  it('should set currentStep to INITIALIZE after initialize is called', () => {
    const instance = E2EIHandler.getInstance(params);
    instance.initialize();
    expect(instance['currentStep']).toBe(E2EIHandlerStep.INITIALIZE);
  });

  it('should set currentStep to ENROLL when enrollE2EI is called and enrollment succeeds', async () => {
    const instance = E2EIHandler.getInstance(params);
    await instance['enrollE2EI']();
    expect(instance['currentStep']).toBe(E2EIHandlerStep.SUCCESS);
  });

  it('should set currentStep to ERROR when enrollE2EI is called and enrollment fails', async () => {
    // Mock the Core service to return an error
    (container.resolve as any) = jest.fn(service => {
      if (service === Core) {
        return {startE2EIEnrollment: jest.fn(() => Promise.reject())};
      }
      return {self: () => user};
    });

    const instance = E2EIHandler.getInstance(params);
    await instance['enrollE2EI']();
    expect(instance['currentStep']).toBe(E2EIHandlerStep.ERROR);
  });

  it('should display user info message when initialized', async () => {
    const handler = E2EIHandler.getInstance(params);
    await handler.initialize();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.ENROLL,
      }),
    );
  });

  it('should display loading message when enrolled', async () => {
    const handler = E2EIHandler.getInstance(params);
    await handler['enrollE2EI']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.LOADING,
      }),
    );
  });

  it('should display success message when enrollment is done', async () => {
    const handler = E2EIHandler.getInstance(params);
    handler['showLoadingMessage'] = jest.fn();
    await handler['enrollE2EI']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.SUCCESS,
      }),
    );
  });

  it('should display error message when enrollment fails', async () => {
    (container.resolve as jest.Mock).mockImplementation(service => {
      if (service === Core) {
        return {startE2EIEnrollment: jest.fn(() => Promise.reject(false))};
      }
      if (service === UserState) {
        return userStateMock;
      }
      return null;
    });
    const handler = E2EIHandler.getInstance(params);
    handler['showLoadingMessage'] = jest.fn();
    await handler['enrollE2EI']();
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.ERROR,
      }),
    );
  });
});
