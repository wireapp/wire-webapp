/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Page} from '@playwright/test';

import {MarketingConsentModal} from './team_management/modals/marketingConsent.modal';
import {TeamDataShareConsentModal} from './team_management/modals/teamsDataShareConsent.modal';
import {SetUsernamePage} from './team_management/pages/setUsername.page';
import {TeamLoginPage} from './team_management/pages/teamLogin.page';
import {TeamsPage} from './team_management/pages/teams.page';
import {TeamSignUpPage} from './team_management/pages/teamSignUp.page';
import {CellsConversationPage} from './webapp/cells/cellsConversation.page';
import {CellsConversationFilesPage} from './webapp/cells/cellsConversationFiles.page';
import {CellsFileDetailViewModal} from './webapp/cells/cellsFileDetailView.modal';
import {ContactList} from './webapp/components/conversationList.component';
import {ConversationSidebar} from './webapp/components/conversationSidebar.component';
import {InputBarControls} from './webapp/components/inputBarControls.component';
import {AcknowledgeModal} from './webapp/modals/acknowledge.modal';
import {AppLockModal} from './webapp/modals/appLock.modal';
import {BlockWarningModal} from './webapp/modals/blockWarning.modal';
import {CallNotEstablishedModal} from './webapp/modals/callNotEstablished.modal';
import {CancelRequestModal} from './webapp/modals/cancelRequest.modal';
import {ConfirmModal} from './webapp/modals/confirm.modal';
import {ConfirmLogoutModal} from './webapp/modals/confirmLogout.modal';
import {CopyPasswordModal} from './webapp/modals/copyPassword.modal';
import {CreatGuestLinkModal} from './webapp/modals/createGuestLink.modal';
import {DataShareConsentModal} from './webapp/modals/dataShareConsent.modal';
import {DeleteAccountModal} from './webapp/modals/deleteAccount.modal';
import {DetailViewModal} from './webapp/modals/detailView.modal';
import {ErrorModal} from './webapp/modals/error.modal';
import {ExportBackupModal} from './webapp/modals/exportBackup.modal';
import {importBackupModal} from './webapp/modals/importBackup.modal';
import {LeaveConversationModal} from './webapp/modals/leaveConversation.modal';
import {PasswordModal} from './webapp/modals/password.modal';
import {RemoveMemberModal} from './webapp/modals/removeMember.modal';
import {UnableToOpenConversationModal} from './webapp/modals/unableToOpenConversation.modal';
import {UserProfileModal} from './webapp/modals/userProfile.modal';
import {VerifyEmailModal} from './webapp/modals/verifyEmail.modal';
import {AccountPage} from './webapp/pages/account.page';
import {AudioVideoSettingsPage} from './webapp/pages/audioVideoSettings.page';
import {CallingPage} from './webapp/pages/calling.page';
import {CollectionPage} from './webapp/pages/collection.page';
import {ConnectRequestPage} from './webapp/pages/connectRequest.page';
import {ConversationPage} from './webapp/pages/conversation.page';
import {ConversationDetailsPage} from './webapp/pages/conversationDetails.page';
import {ConversationListPage} from './webapp/pages/conversationList.page';
import {DeleteAccountPage} from './webapp/pages/deleteAccount.page';
import {DevicesPage} from './webapp/pages/devices.page';
import {EmailVerificationPage} from './webapp/pages/emailVerification.page';
import {GroupCreationPage} from './webapp/pages/groupCreation.page';
import {GuestOptionsPage} from './webapp/pages/guestOptions.page';
import {HistoryExportPage} from './webapp/pages/historyExport.page';
import {HistoryImportPage} from './webapp/pages/historyImport.page';
import {HistoryInfoPage} from './webapp/pages/infoHistory.page';
import {LoginPage} from './webapp/pages/login.page';
import {MessageDetailsPage} from './webapp/pages/messageDetails.page';
import {OptionsPage} from './webapp/pages/options.page';
import {OutgoingConnectionPage} from './webapp/pages/outgoingConnection.page';
import {ParticipantDetails} from './webapp/pages/participantDetails.page';
import {RegisterSuccessPage} from './webapp/pages/registerSuccess.page';
import {RegistrationPage} from './webapp/pages/registration.page';
import {RequestResetPasswordPage} from './webapp/pages/requestResetPassword.page';
import {ResetPasswordPage} from './webapp/pages/resetPassword.page';
import {SettingsPage} from './webapp/pages/settings.page';
import {SingleSignOnPage} from './webapp/pages/singleSignOn.page';
import {StartUIPage} from './webapp/pages/startUI.page';
import {WelcomePage} from './webapp/pages/welcome.page';

export const webAppPath = process.env.WEBAPP_URL ?? '';
const teamManagementPath = process.env.TEAM_MANAGEMENT_URL ?? '';

export class PageManager {
  private readonly cache = new Map<string, any>();

  constructor(private readonly page: Page) {}

  static from(page: Page): PageManager;
  static from(page: Promise<Page>): Promise<PageManager>;
  static from(page: Page | Promise<Page>): PageManager | Promise<PageManager> {
    return 'then' in page ? page.then(p => new PageManager(p)) : new PageManager(page);
  }

  openNewTab = async <T>(url?: string, handler?: (tab: PageManager) => Promise<T>): Promise<T> => {
    const newPage = await this.page.context().newPage();
    if (url) {
      await newPage.goto(url);
    }
    const tabManager = new PageManager(newPage);
    try {
      return handler ? await handler(tabManager) : (tabManager as T);
    } finally {
      await newPage.close();
    }
  };

  openMainPage = () => {
    return this.page.goto(webAppPath, {waitUntil: 'networkidle'});
  };

  openLoginPage = async () => {
    await this.page.goto(`${webAppPath}auth/#/login`);
  };

  openUrl = (url: string) => {
    return this.page.goto(url, {waitUntil: 'networkidle'});
  };

  openTeamManagementPage = () => {
    return this.page.goto(teamManagementPath, {waitUntil: 'networkidle'});
  };

  refreshPage = (options: {waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'} = {waitUntil: 'networkidle'}) => {
    return this.page.reload(options);
  };

  waitForTimeout = (timeout: number) => {
    return this.page.waitForTimeout(timeout);
  };

  getContext = () => {
    return this.page.context();
  };

  getPage = async () => {
    return await this.page;
  };

  waitForRequest = (url: string) => {
    return this.page.waitForRequest(url);
  };

  // Helper method to get or create a page or modal instance
  // This method uses a cache to avoid creating multiple instances of the same page/modal
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    return this.cache.get(key)!;
  }

  // ───────────── WEBAPP ─────────────
  public webapp = {
    pages: {
      login: () => this.getOrCreate('webapp.pages.login', () => new LoginPage(this.page)),
      singleSignOn: () => this.getOrCreate('webapp.pages.singleSignOn', () => new SingleSignOnPage(this.page)),
      welcome: () => this.getOrCreate('webapp.pages.welcome', () => new WelcomePage(this.page)),
      registration: () => this.getOrCreate('webapp.pages.registration', () => new RegistrationPage(this.page)),
      startUI: () => this.getOrCreate('webapp.pages.startUI', () => new StartUIPage(this.page)),
      account: () => this.getOrCreate('webapp.pages.account', () => new AccountPage(this.page)),
      conversationList: () =>
        this.getOrCreate('webapp.pages.conversationList', () => new ConversationListPage(this.page)),
      conversationDetails: () =>
        this.getOrCreate('webapp.pages.conversationDetails', () => new ConversationDetailsPage(this.page)),
      conversation: () => this.getOrCreate('webapp.pages.conversation', () => new ConversationPage(this.page)),
      collection: () => this.getOrCreate('webapp.pages.collection', () => new CollectionPage(this.page)),
      cellsConversation: () =>
        this.getOrCreate('webapp.pages.cellsConversation', () => new CellsConversationPage(this.page)),
      cellsConversationFiles: () =>
        this.getOrCreate('webapp.pages.cellsConversationFiles', () => new CellsConversationFilesPage(this.page)),
      connectRequest: () => this.getOrCreate('webapp.pages.connectRequest', () => new ConnectRequestPage(this.page)),
      calling: () => this.getOrCreate('webapp.pages.calling', () => new CallingPage(this.page)),
      settings: () => this.getOrCreate('webapp.pages.settings', () => new SettingsPage(this.page)),
      devices: () => this.getOrCreate('webapp.pages.devices', () => new DevicesPage(this.page)),
      options: () => this.getOrCreate('webapp.pages.options', () => new OptionsPage(this.page)),
      audioVideoSettings: () =>
        this.getOrCreate('webapp.pages.audioVideoSettings', () => new AudioVideoSettingsPage(this.page)),
      outgoingConnection: () =>
        this.getOrCreate('webapp.pages.outgoingConnection', () => new OutgoingConnectionPage(this.page)),
      guestOptions: () => this.getOrCreate('webapp.pages.guestOptions', () => new GuestOptionsPage(this.page)),
      deleteAccount: () => this.getOrCreate('webapp.pages.deleteAccount', () => new DeleteAccountPage(this.page)),
      groupCreation: () => this.getOrCreate('webapp.pages.groupCreation', () => new GroupCreationPage(this.page)),
      historyInfo: () => this.getOrCreate('webapp.pages.infoHostory', () => new HistoryInfoPage(this.page)),
      historyExport: () => this.getOrCreate('webapp.pages.historyExport', () => new HistoryExportPage(this.page)),
      historyImport: () => this.getOrCreate('webapp.pages.historyImport', () => new HistoryImportPage(this.page)),
      messageDetails: () => this.getOrCreate('webapp.pages.messageDetails', () => new MessageDetailsPage(this.page)),
      participantDetails: () =>
        this.getOrCreate('webapp.pages.participantsDetails', () => new ParticipantDetails(this.page)),
      requestResetPassword: () =>
        this.getOrCreate('webapp.pages.requestResetPassword', () => new RequestResetPasswordPage(this.page)),
      resetPassword: () => this.getOrCreate('webapp.pages.resetPassword', () => new ResetPasswordPage(this.page)),
      registerSuccess: () => this.getOrCreate('webapp.pages.registerSuccess', () => new RegisterSuccessPage(this.page)),
      emailVerification: () =>
        this.getOrCreate('webapp.pages.verification', () => new EmailVerificationPage(this.page)),
      setUsername: () => this.getOrCreate('webapp.pages.setUsername', () => new SetUsernamePage(this.page)),
    },
    modals: {
      errorModal: () => this.getOrCreate('webapp.modals.errorModal', () => new ErrorModal(this.page)),
      dataShareConsent: () =>
        this.getOrCreate('webapp.modals.dataShareConsent', () => new DataShareConsentModal(this.page)),
      appLock: () => this.getOrCreate('webapp.modals.appLock', () => new AppLockModal(this.page)),
      userProfile: () => this.getOrCreate('webapp.modals.userProfile', () => new UserProfileModal(this.page)),
      blockWarning: () => this.getOrCreate('webapp.modals.blockWarning', () => new BlockWarningModal(this.page)),
      callNotEstablished: () =>
        this.getOrCreate('webapp.modals.callNotEstablished', () => new CallNotEstablishedModal(this.page)),
      deleteAccount: () => this.getOrCreate('webapp.modals.deleteAccount', () => new DeleteAccountModal(this.page)),
      confirmLogout: () => this.getOrCreate('webapp.modals.confirmLogout', () => new ConfirmLogoutModal(this.page)),
      leaveConversation: () =>
        this.getOrCreate('webapp.modals.leaveConversation', () => new LeaveConversationModal(this.page)),
      exportBackup: () => this.getOrCreate('webapp.modals.exportBackup', () => new ExportBackupModal(this.page)),
      unableToOpenConversation: () =>
        this.getOrCreate('webapp.modals.unableToOpenConversation', () => new UnableToOpenConversationModal(this.page)),
      detailViewModal: () => this.getOrCreate('webapp.modals.detailView', () => new DetailViewModal(this.page)),
      importBackup: () => this.getOrCreate('webapp.modals.importBackup', () => new importBackupModal(this.page)),
      removeMember: () => this.getOrCreate('webapp.modals.removeMember', () => new RemoveMemberModal(this.page)),
      copyPassword: () => this.getOrCreate('webapp.modals.copyPassword', () => new CopyPasswordModal(this.page)),
      createGuestLink: () =>
        this.getOrCreate('webapp.modals.createGuestLink', () => new CreatGuestLinkModal(this.page)),
      verifyEmail: () => this.getOrCreate('webapp.modals.verifyEmail', () => new VerifyEmailModal(this.page)),
      marketingConsent: () =>
        this.getOrCreate('webapp.modals.marketingConsent', () => new MarketingConsentModal(this.page)),
      acknowledge: () => this.getOrCreate('webapp.modals.marketingConsent', () => new AcknowledgeModal(this.page)),
      confirm: () => this.getOrCreate('webapp.modals.confirm', () => new ConfirmModal(this.page)),
      password: () => this.getOrCreate('webapp.modals.password', () => new PasswordModal(this.page)),
      cellsFileDetailView: () =>
        this.getOrCreate('webapp.modals.cellsFileDetailView', () => new CellsFileDetailViewModal(this.page)),
      cancelRequest: () =>
        this.getOrCreate('webapp.modals.cancelRequestModal', () => new CancelRequestModal(this.page)),
    },
    components: {
      contactList: () => this.getOrCreate('webapp.components.ContactList', () => new ContactList(this.page)),
      conversationSidebar: () =>
        this.getOrCreate('webapp.components.conversationSidebar', () => new ConversationSidebar(this.page)),
      inputBarControls: () =>
        this.getOrCreate('webapp.components.inputBarControls', () => new InputBarControls(this.page)),
      calling: () => this.getOrCreate('webapp.components.calling', () => new CallingPage(this.page)),
    },
  } as const;

  // ───────────── TEAM MANAGEMENT ─────────────
  public tm = {
    pages: {
      teamLogin: () => this.getOrCreate('tm.pages.teamLogin', () => new TeamLoginPage(this.page)),
      teamSignUp: () => this.getOrCreate('tm.pages.teamSignUp', () => new TeamSignUpPage(this.page)),
      teams: () => this.getOrCreate('tm.pages.teams', () => new TeamsPage(this.page)),
    },
    modals: {
      dataShareConsent: () =>
        this.getOrCreate('tm.modals.dataShareConsent', () => new TeamDataShareConsentModal(this.page)),
    },
  } as const;
}
