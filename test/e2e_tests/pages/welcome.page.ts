import {Locator, Page} from '@playwright/test';

export class WelcomePage {
  readonly page: Page;

  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loginButton = page.locator('[data-uie-name="go-login"]');
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }
}
