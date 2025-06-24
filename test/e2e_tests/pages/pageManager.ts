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

import {AccountPage} from './account.page';
import {AppLockModal} from './appLock.modal';
import {BlockWarningModal} from './blockWarning.modal';
import {ConversationPage} from './conversation.page';
import {ConversationListPage} from './conversationList.page';
import {ConversationSidebar} from './conversationSidebar.page';
import {DataShareConsentModal} from './dataShareConsent.modal';
import {DeleteAccountModal} from './deleteAccount.modal';
import {DeleteAccountPage} from './deleteAccount.page';
import {EmailVerificationPage} from './emailVerification.page';
import {GroupCreationPage} from './groupCreation.page';
import {LoginPage} from './login.page';
import {MarketingConsentModal} from './marketingConsent.modal';
import {OutgoingConnectionPage} from './outgoingConnection.page';
import {RegistrationPage} from './registration.page';
import {SetUsernamePage} from './setUsername.page';
import {SingleSignOnPage} from './singleSignOn.page';
import {StartUIPage} from './startUI.page';
import {UserProfileModal} from './userProfile.modal';
import {WelcomePage} from './welcome.page';

const webAppPath = process.env.WEBAPP_URL ?? '';

export class PageManager {
  constructor(private readonly page: Page) {}

  static from(page: Page): PageManager {
    return new PageManager(page);
  }

  async openNewTab<T>(url?: string, handler?: (tab: PageManager) => Promise<T>): Promise<T> {
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
  }

  public openMainPage() {
    return this.page.goto(webAppPath, {
      waitUntil: 'networkidle',
    });
  }

  public refreshPage() {
    return this.page.reload({
      waitUntil: 'networkidle',
    });
  }

  private _singleSignOnPage!: SingleSignOnPage;
  get singleSignOnPage(): SingleSignOnPage {
    return (this._singleSignOnPage ??= new SingleSignOnPage(this.page));
  }

  private _loginPage!: LoginPage;
  get loginPage(): LoginPage {
    return (this._loginPage ??= new LoginPage(this.page));
  }

  private _dataShareConsentModal!: DataShareConsentModal;
  get dataShareConsentModal(): DataShareConsentModal {
    return (this._dataShareConsentModal ??= new DataShareConsentModal(this.page));
  }

  private _conversationSidebar!: ConversationSidebar;
  get conversationSidebar(): ConversationSidebar {
    return (this._conversationSidebar ??= new ConversationSidebar(this.page));
  }

  private _appLockModal!: AppLockModal;
  get appLockModal(): AppLockModal {
    return (this._appLockModal ??= new AppLockModal(this.page));
  }

  private _conversationListPage!: ConversationListPage;
  get conversationListPage(): ConversationListPage {
    return (this._conversationListPage ??= new ConversationListPage(this.page));
  }

  private _accountPage!: AccountPage;
  get accountPage(): AccountPage {
    return (this._accountPage ??= new AccountPage(this.page));
  }

  private _welcomePage!: WelcomePage;
  get welcomePage(): WelcomePage {
    return (this._welcomePage ??= new WelcomePage(this.page));
  }

  private _registrationPage!: RegistrationPage;
  get registrationPage(): RegistrationPage {
    return (this._registrationPage ??= new RegistrationPage(this.page));
  }

  private _verificationPage!: EmailVerificationPage;
  get verificationPage(): EmailVerificationPage {
    return (this._verificationPage ??= new EmailVerificationPage(this.page));
  }
  private _marketingConsentModal!: MarketingConsentModal;
  get marketingConsentModal(): MarketingConsentModal {
    return (this._marketingConsentModal ??= new MarketingConsentModal(this.page));
  }
  private _setUsernamePage!: SetUsernamePage;
  get setUsernamePage(): SetUsernamePage {
    return (this._setUsernamePage ??= new SetUsernamePage(this.page));
  }
  private _startUIPage!: StartUIPage;
  get startUIPage(): StartUIPage {
    return (this._startUIPage ??= new StartUIPage(this.page));
  }
  private _userProfileModal!: UserProfileModal;
  get userProfileModal(): UserProfileModal {
    return (this._userProfileModal ??= new UserProfileModal(this.page));
  }
  private _outgoingConnectionPage!: OutgoingConnectionPage;
  get outgoingConnectionPage(): OutgoingConnectionPage {
    return (this._outgoingConnectionPage ??= new OutgoingConnectionPage(this.page));
  }
  private _blockWarningModal!: BlockWarningModal;
  get blockWarningModal(): BlockWarningModal {
    return (this._blockWarningModal ??= new BlockWarningModal(this.page));
  }
  private _deleteAccountModal!: DeleteAccountModal;
  get deleteAccountModal(): DeleteAccountModal {
    return (this._deleteAccountModal ??= new DeleteAccountModal(this.page));
  }
  private _emailVerificationPage!: EmailVerificationPage;
  get emailVerificationPage(): EmailVerificationPage {
    return (this._emailVerificationPage ??= new EmailVerificationPage(this.page));
  }

  private _conversationPage!: ConversationPage;
  get conversationPage(): ConversationPage {
    return (this._conversationPage ??= new ConversationPage(this.page));
  }

  private _deleteAccountPage!: DeleteAccountPage;
  get deleteAccountPage(): DeleteAccountPage {
    return (this._deleteAccountPage ??= new DeleteAccountPage(this.page));
  }

  private _groupCreationPage!: GroupCreationPage;
  get groupCreationPage(): GroupCreationPage {
    return (this._groupCreationPage ??= new GroupCreationPage(this.page));
  }
}
