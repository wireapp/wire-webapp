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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {container} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {getCertificateDetails} from 'Util/certificateDetails';
import * as util from 'Util/util';

import {E2EIHandler, E2EIHandlerStep} from './E2EIdentityEnrollment';
import {hasActiveCertificate} from './E2EIdentityVerification';
import {getModalOptions, ModalType} from './Modals';

jest.mock('./OIDCService', () => {
  return {
    // Mock the OIDCService class
    OIDCService: jest.fn().mockImplementation(() => ({
      handleSilentAuthentication: jest.fn().mockResolvedValue({
        id_token: 'ID_TOKEN',
        access_token: 'ACCESS_TOKEN',
        refresh_token: 'REFRESH_TOKEN  ',
        token_type: 'auth',
        profile: 'sub',
      }),
      clearProgress: jest.fn(),
      handleAuthentication: jest.fn().mockResolvedValue({}),
      // ... other methods of OIDCService
    })),
    getOIDCServiceInstance: jest.fn(), // if needed
  };
});

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

jest.mock('./E2EIdentityVerification', () => ({
  ...jest.requireActual('./E2EIdentityVerification'),
  hasActiveCertificate: jest.fn().mockResolvedValue(false),
  getActiveWireIdentity: jest.fn().mockResolvedValue({certificate: 'certificate data'}),
  isE2EIEnabled: jest.fn().mockReturnValue(true),
  isFreshMLSSelfClient: jest.fn().mockResolvedValue(false),
}));

// These values should lead to renewalPromptTime being less than the mocked current time
jest.mock('Util/certificateDetails', () => ({
  getCertificateDetails: jest.fn().mockReturnValue({
    timeRemainingMS: 5 * 24 * 60 * 60 * 1000,
    certificateCreationTime: new Date().getTime() - 10 * 24 * 60 * 60 * 1000,
  }),
}));

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    jest
      .spyOn(container.resolve(UserState), 'self')
      .mockReturnValue({name: () => 'John Doe', username: () => 'johndoe'});
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockResolvedValue(true);
    container.resolve(Core).key = new Uint8Array();
  });

  it('should create instance with valid params', async () => {
    const instance = E2EIHandler.getInstance().initialize(params);
    expect(instance).toBeInstanceOf(E2EIHandler);
  });

  it('should always return the same instance', async () => {
    const instance1 = E2EIHandler.getInstance().initialize(params);
    const instance2 = E2EIHandler.getInstance().initialize(params);
    expect(instance1).toBe(instance2);
  });

  it('should set currentStep to INITIALIZE after initialize is called', async () => {
    const instance = E2EIHandler.getInstance();
    instance.initialize(params);
    void instance.attemptEnrollment();
    await wait(1);
    expect(instance['currentStep']).toBe(E2EIHandlerStep.INITIALIZED);
  });

  it('should set currentStep to SUCCESS when enrollE2EI is called and enrollment succeeds', async () => {
    jest
      .spyOn(container.resolve(UserState), 'self')
      .mockReturnValue({name: () => 'John Doe', username: () => 'johndoe'});

    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockResolvedValueOnce(true);

    const instance = E2EIHandler.getInstance().initialize(params);
    void instance['enroll']();
    await wait(1);
    expect(instance['currentStep']).toBe(E2EIHandlerStep.SUCCESS);
  });

  it('should set currentStep to ERROR when enrolE2EI is called and enrolment fails', async () => {
    // Mock the Core service to return an error
    jest.spyOn(container.resolve(Core), 'enrollE2EI').mockImplementationOnce(jest.fn(() => Promise.reject()));
    jest.spyOn(container.resolve(UserState), 'self').mockImplementationOnce(() => user);

    const instance = E2EIHandler.getInstance().initialize(params);
    void instance['enroll']();
    await wait(1);
    expect(instance['currentStep']).toBe(E2EIHandlerStep.ERROR);
  });

  it('should display user info message when initialized', async () => {
    const instance = E2EIHandler.getInstance().initialize(params);
    void instance.attemptEnrollment();
    await wait(1);
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
    void handler['enroll']();
    await wait(1);
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
    void handler['enroll']();
    await wait(1);
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
    void handler['enroll']();
    await wait(1);
    expect(getModalOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ModalType.ERROR,
      }),
    );
  });

  it('should call renewCertificate when conditions are met', async () => {
    const handler = E2EIHandler.getInstance();

    // set active certificate to be truthy
    (hasActiveCertificate as jest.Mock).mockResolvedValue(true);

    jest.spyOn(container.resolve(Core).service!.e2eIdentity!, 'isEnrollmentInProgress').mockReturnValue(false);

    // Spy on renewCertificate to check if it's called
    const renewCertificateSpy = jest.spyOn(handler as any, 'renewCertificate');

    // Initialize E2EI
    handler.initialize(params);
    void handler.attemptRenewal();
    await wait(1);

    // Assert that renewCertificate was called
    expect(getCertificateDetails as jest.Mock).toHaveBeenCalled();
    expect(renewCertificateSpy).toHaveBeenCalled();
  });

  it('should handle enrollment in progress', async () => {
    const handler = E2EIHandler.getInstance();

    // Set active certificate to be truthy and enrollment in progress
    (hasActiveCertificate as jest.Mock).mockResolvedValue(true);
    jest.spyOn(container.resolve(Core).service!.e2eIdentity!, 'isEnrollmentInProgress').mockReturnValue(true);

    // Spy on enroll to check if it's called
    const enrollSpy = jest.spyOn(handler, 'enroll');

    // Initialize E2EI
    handler.initialize(params);
    void handler.attemptRenewal();
    await wait(1);

    // Assert that enroll was called to continue the current enrollment
    expect(enrollSpy).toHaveBeenCalled();

    // Spy on renewCertificate to check its not called since an enrollment is in progress
    const renewCertificateSpy = jest.spyOn(handler as any, 'renewCertificate');
    expect(renewCertificateSpy).not.toHaveBeenCalled();
  });

  it('should not call renewCertificate when the renewal time is in the future', async () => {
    const handler = E2EIHandler.getInstance();

    // Set active certificate to be truthy and enrollment not in progress
    (hasActiveCertificate as jest.Mock).mockResolvedValue(true);
    jest.spyOn(container.resolve(Core).service!.e2eIdentity!, 'isEnrollmentInProgress').mockReturnValue(false);

    const timeRemainingMS = 60 * TimeInMillis.DAY; // 60 days remaining

    // Mock getCertificateDetails to return a certificate with enough time remaining
    (getCertificateDetails as jest.Mock).mockReturnValue({
      timeRemainingMS,
      certificateCreationTime: new Date().getTime() - 10 * TimeInMillis.DAY,
    });

    jest.spyOn(handler as any, 'shouldRefresh').mockReturnValue(true);

    const renewCertificateSpy = jest.spyOn(handler as any, 'renewCertificate');

    // Initialize E2EI
    handler.initialize(params);
    void handler.attemptRenewal();
    await wait(1);

    expect(getCertificateDetails as jest.Mock).toHaveBeenCalled();
    expect(renewCertificateSpy).not.toHaveBeenCalled();
  });

  it('call startEnrollment when no active certificate is found', async () => {
    const handler = E2EIHandler.getInstance();

    // Set active certificate to be false
    (hasActiveCertificate as jest.Mock).mockResolvedValue(false);

    const renewCertificateSpy = jest.spyOn(handler as any, 'renewCertificate');
    const startEnrollmentSpy = jest.spyOn(handler as any, 'startEnrollment');

    // Initialize E2EI
    handler.initialize(params);
    void handler.attemptEnrollment();
    await wait(1);

    expect(renewCertificateSpy).not.toHaveBeenCalled();
    expect(startEnrollmentSpy).toHaveBeenCalled();
  });

  it('for invalid certificate user can not get another certificate until deleting a client', async () => {
    const handler = E2EIHandler.getInstance();

    // Set active certificate to be true
    (hasActiveCertificate as jest.Mock).mockResolvedValue(true);

    const renewCertificateSpy = jest.spyOn(handler as any, 'renewCertificate');
    const startEnrollmentSpy = jest.spyOn(handler as any, 'startEnrollment');

    const timeRemainingMS = 5 * TimeInMillis.DAY; // 5 days remaining

    // Mock getCertificateDetails to return a certificate with enough time remaining
    (getCertificateDetails as jest.Mock).mockReturnValue({
      timeRemainingMS,
      certificateCreationTime: new Date().getTime() - 10 * TimeInMillis.DAY,
    });

    jest.spyOn(handler as any, 'shouldRefresh').mockReturnValue(false);

    // Initialize E2EI
    handler.initialize(params);
    void handler.attemptRenewal();
    await wait(1);

    expect(renewCertificateSpy).not.toHaveBeenCalled();
    expect(startEnrollmentSpy).not.toHaveBeenCalled();
  });
});
