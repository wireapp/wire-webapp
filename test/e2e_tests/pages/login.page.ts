import {Page, Locator} from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  readonly backButton: Locator;
  readonly signInButton: Locator;
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginErrorText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backButton = page.locator('[data-uie-name="go-index"]');
    this.signInButton = page.locator('[data-uie-name="do-sign-in"]');
    this.loginForm = page.locator('[data-uie-name="login"]');
    this.emailInput = this.loginForm.locator('[data-uie-name="enter-email"]');
    this.passwordInput = this.loginForm.locator('[data-uie-name="enter-password"]');
    this.loginErrorText = page.locator('[data-uie-name="error-message"]');
  }

  async isEmailFieldVisible(): Promise<boolean> {
    return await this.emailInput.isVisible();
  }

  async inputEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async inputPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickSignInButton(): Promise<void> {
    await this.signInButton.waitFor({state: 'visible'});
    await this.signInButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.loginErrorText.waitFor({state: 'visible'});
    return (await this.loginErrorText.textContent()) ?? '';
  }
}
