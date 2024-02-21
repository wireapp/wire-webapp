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
import {amplify} from 'amplify';
import {User} from 'oidc-client-ts';
import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {getCertificateDetails} from 'Util/certificateDetails';
import {getLogger} from 'Util/Logger';
import {formatDelayTime, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';

import {hasActiveCertificate, getActiveWireIdentity, MLSStatuses, WireIdentity} from './E2EIdentityVerification';
import {getModalOptions, ModalType} from './Modals';
import {OIDCService} from './OIDCService';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';
import {getSnoozeTime, shouldEnableSoftLock} from './SnoozableTimer/delay';
import {SnoozableTimer} from './SnoozableTimer/SnoozableTimer';

export enum E2EIHandlerStep {
  UNINITIALIZED = 'uninitialized',
  INITIALIZED = 'initialized',
  ENROLL = 'enroll',
  SUCCESS = 'success',
  ERROR = 'error',
  SNOOZE = 'snooze',
}

interface E2EIHandlerParams {
  discoveryUrl: string;
  gracePeriodInSeconds: number;
}

type Events = {
  identityUpdated: {enrollmentConfig: EnrollmentConfig; identity?: WireIdentity};
  initialized: {enrollmentConfig: EnrollmentConfig};
};

export type EnrollmentConfig = {
  timer: SnoozableTimer;
  discoveryUrl: string;
  gracePeriodInMs: number;
};

const historyTimeMS = 28 * TimeInMillis.DAY; //HT
export class E2EIHandler extends TypedEventEmitter<Events> {
  private logger = getLogger('E2EIHandler');
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private config?: EnrollmentConfig;
  private currentStep: E2EIHandlerStep = E2EIHandlerStep.UNINITIALIZED;
  private oidcService?: OIDCService;
  public certificateTtl?: number;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  private createOIDCService() {
    const key = this.core.key;
    const targetURL = OIDCServiceStore.get.targetURL();
    if (!key || !targetURL) {
      throw new Error('encryption key or targetURL not set');
    }
    return new OIDCService(key, targetURL);
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * After that, params are optional and can be used to update the grace period timer
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance() {
    E2EIHandler.instance = E2EIHandler.instance ?? new E2EIHandler();
    return E2EIHandler.instance;
  }

  /**
   * Reset the instance
   */
  public static resetInstance() {
    E2EIHandler.instance = null;
  }

  /**
   * Returns true if the current instance has been configured with team settings params
   * @returns
   */
  public isE2EIEnabled() {
    return this.currentStep !== E2EIHandlerStep.UNINITIALIZED;
  }

  public async initialize({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams) {
    const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
    this.config = {
      discoveryUrl,
      gracePeriodInMs,
      timer: new SnoozableTimer({
        gracePeriodInMS: gracePeriodInMs,
        onGracePeriodExpired: () => this.processEnrollmentUponExpiry(),
        onSnoozeExpired: () => this.processEnrollmentUponExpiry(),
      }),
    };

    await this.coreE2EIService.initialize(discoveryUrl);

    this.currentStep = E2EIHandlerStep.INITIALIZED;
    this.emit('initialized', {enrollmentConfig: this.config});
    return this;
  }

  private async processEnrollmentUponExpiry() {
    const hasCertificate = await hasActiveCertificate();
    const enrollmentType = hasCertificate ? ModalType.CERTIFICATE_RENEWAL : ModalType.ENROLL;
    await this.startEnrollment(enrollmentType);
  }

  public async attemptEnrollment(): Promise<void> {
    const hasCertificate = await hasActiveCertificate();
    if (hasCertificate) {
      // If the client already has a certificate, we don't need to start the enrollment
      return;
    }
    return this.startEnrollment(ModalType.ENROLL);
  }

  public async attemptRenewal(): Promise<void> {
    const identity = await getActiveWireIdentity();

    if (!identity?.certificate) {
      return;
    }

    const {timeRemainingMS, certificateCreationTime} = getCertificateDetails(identity.certificate);

    if (!this.shouldRefresh(identity)) {
      return;
    }

    // Check if an enrollment is already in progress
    if (await this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    const renewalTimeMS = this.calculateRenewalTime(timeRemainingMS, historyTimeMS, this.config!.gracePeriodInMs);
    const renewalPromptTime = new Date(certificateCreationTime + renewalTimeMS).getTime();
    const currentTime = new Date().getTime();

    // Check if it's time to renew the certificate
    if (currentTime >= renewalPromptTime) {
      await this.renewCertificate();
      this.emit('identityUpdated', {enrollmentConfig: this.config!, identity});
    }
  }

  private shouldRefresh(identity: WireIdentity) {
    const deviceIdentityStatus = identity.status;
    switch (deviceIdentityStatus) {
      case MLSStatuses.REVOKED:
        return false;
      default:
        return true;
    }
  }

  /**
   * Renew the certificate without user action
   */
  private async renewCertificate(): Promise<void> {
    try {
      this.oidcService = this.createOIDCService();
      // Use the oidc service to get the user data via silent authentication (refresh token)
      const userData = await this.oidcService.handleSilentAuthentication();

      if (!userData) {
        throw new Error('Received no user data from OIDC service');
      }
      // renew without user action
      await this.enroll(userData);
    } catch (error) {
      this.logger.error('Silent authentication with refresh token failed', error);

      // If the silent authentication fails, clear the oidc service progress/data and renew manually
      await this.cleanUp(true);
      await this.startEnrollment(ModalType.CERTIFICATE_RENEWAL);
    }
  }

  /**
   * Calculates the date when the E2EI certificate renewal should be prompted.
   *
   * @param timeRemainingMS - Certificate validity period in days (VP).
   * @param historyTime - Maximum time messages are stored in days (HT).
   * @param gracePeriod - Time to activate certificate in days (GP).
   * @returns The date to start prompting for certificate renewal.
   */
  private calculateRenewalTime(timeRemainingMS: number, historyTimeMS: number, gracePeriodMS: number) {
    // Calculate a random time between 0 and 1 days
    const randomTimeInMS = Math.random() * TimeInMillis.DAY; // Up to 24 hours in milliseconds

    // Calculate the total days to subtract
    const totalDaysToSubtract = historyTimeMS + gracePeriodMS + randomTimeInMS;

    // Calculate the renewal date
    const renewalDate = timeRemainingMS - totalDaysToSubtract;

    return renewalDate;
  }

  /**
   * Used to clean the state/storage after a failed run
   */
  private async cleanUp(includeOidcServiceUserData: boolean) {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    this.oidcService = this.createOIDCService();
    await this.oidcService.clearProgress(includeOidcServiceUserData);
    // Clear the e2e identity progress
    await this.coreE2EIService.clearAllProgress();
  }

  public async enroll(userData?: User) {
    if (!this.config) {
      throw new Error('Trying to enroll for E2EI without initializing the E2EIHandler');
    }
    try {
      // Notify user about E2EI enrolment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      const isCertificateRenewal = await hasActiveCertificate();
      this.showLoadingMessage();

      if (!userData) {
        // If the enrolment is in progress, we need to get the id token from the oidc service, since oauth should have already been completed
        if (await this.coreE2EIService.isEnrollmentInProgress()) {
          // The redirect-url which is needed inside the OIDCService is stored in the OIDCServiceStore previously
          this.oidcService = this.createOIDCService();
          userData = await this.oidcService.handleAuthentication();
          if (!userData) {
            throw new Error('Received no user data from OIDC service');
          }
        }
      }
      const oAuthIdToken = userData?.id_token;

      const displayName = this.userState.self()?.name();
      const handle = this.userState.self()?.username();
      const teamId = this.userState.self()?.teamId;
      // If the user has no username or handle, we cannot enroll
      if (!displayName || !handle || !teamId) {
        throw new Error('Username, handle or teamId not found');
      }
      const enrollmentState = await this.core.enrollE2EI({
        discoveryUrl: this.config.discoveryUrl,
        displayName,
        handle,
        teamId,
        oAuthIdToken,
        certificateTtl: this.certificateTtl,
      });
      // If the data is false or we dont get the ACMEChallenge, enrolment failed

      if (enrollmentState.status === 'authentication') {
        // If the data is authentication flow data, we need to kick off the oauth flow to get an oauth token
        const {challenge, keyAuth} = enrollmentState.authenticationChallenge;
        OIDCServiceStore.store.targetURL(challenge.target);
        this.oidcService = this.createOIDCService();
        await this.oidcService.authenticate(keyAuth, challenge.url);
      }

      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(removeCurrentModal, 0);

      this.currentStep = E2EIHandlerStep.SUCCESS;
      // clear the oidc service progress/data and successful enrolment
      await this.cleanUp(false);

      await this.showSuccessMessage(isCertificateRenewal);
      this.emit('identityUpdated', {enrollmentConfig: this.config!});
    } catch (error) {
      this.currentStep = E2EIHandlerStep.ERROR;
      this.logger.error('E2EI enrollment failed', error);

      setTimeout(removeCurrentModal, 0);
      await this.showErrorMessage();
    }
  }

  private showLoadingMessage(isCertificateRenewal = false): void {
    if (this.currentStep !== E2EIHandlerStep.ENROLL) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.LOADING,
      hideClose: true,
      extraParams: {
        isRenewal: isCertificateRenewal,
      },
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private async showSuccessMessage(isCertificateRenewal = false) {
    if (this.currentStep !== E2EIHandlerStep.SUCCESS) {
      return;
    }

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.SUCCESS,
        hideClose: false,
        extraParams: {
          isRenewal: isCertificateRenewal,
        },
        primaryActionFn: resolve,
        secondaryActionFn: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);
          resolve();
        },
      });
      PrimaryModal.show(modalType, modalOptions);
    });
  }

  private async showErrorMessage(): Promise<void> {
    if (this.currentStep !== E2EIHandlerStep.ERROR) {
      return;
    }

    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    await this.oidcService?.clearProgress();
    // Clear the e2e identity progress
    await this.coreE2EIService.clearAllProgress();

    const disableSnooze = await shouldEnableSoftLock(this.config!);

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.ERROR,
        hideClose: true,
        hideSecondary: disableSnooze,
        primaryActionFn: async () => {
          this.currentStep = E2EIHandlerStep.INITIALIZED;
          await this.enroll();
          resolve();
        },
        secondaryActionFn: async () => {
          await this.startEnrollment(ModalType.ENROLL);
          resolve();
        },
        extraParams: {
          isGracePeriodOver: disableSnooze,
        },
      });

      PrimaryModal.show(modalType, modalOptions);
    });
  }

  private async showEnrollmentModal(
    modalType: ModalType.ENROLL | ModalType.CERTIFICATE_RENEWAL,
    config: EnrollmentConfig,
  ): Promise<void> {
    // Show the modal with the provided modal type
    const disableSnooze = await shouldEnableSoftLock(config);
    return new Promise<void>(resolve => {
      const {modalOptions, modalType: determinedModalType} = getModalOptions({
        hideSecondary: disableSnooze,
        primaryActionFn: async () => {
          await this.enroll();
          resolve();
        },
        secondaryActionFn: () => {
          this.currentStep = E2EIHandlerStep.SNOOZE;
          this.config?.timer.snooze();
          this.showSnoozeConfirmationModal();
          resolve();
        },
        extraParams: {
          isGracePeriodOver: disableSnooze,
        },
        type: modalType,
        hideClose: true,
      });
      PrimaryModal.show(determinedModalType, modalOptions);
    });
  }

  private showSnoozeConfirmationModal() {
    // Show the modal with the provided modal type
    const {modalOptions, modalType: determinedModalType} = getModalOptions({
      type: ModalType.SNOOZE_REMINDER,
      hideClose: true,
      extraParams: {
        delayTime: formatDelayTime(getSnoozeTime(this.config!.gracePeriodInMs)),
      },
    });
    PrimaryModal.show(determinedModalType, modalOptions);
  }

  private async startEnrollment(enrollmentType: ModalType.CERTIFICATE_RENEWAL | ModalType.ENROLL): Promise<void> {
    // If the user has already started enrolment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (await this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    if (this.config?.timer.isSnoozableTimerActive()) {
      // If the user has snoozed, no need to show the notification modal
      return;
    }

    // If the timer is not active, show the notification modal
    if (this.config) {
      return this.showEnrollmentModal(enrollmentType, this.config);
    }
  }
}
