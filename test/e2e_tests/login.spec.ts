import path from 'path';
import {config} from 'dotenv';
import {WelcomePage} from './pages/welcome.page';
import {LoginPage} from './pages/login.page';
import {test, expect} from '@playwright/test';

// Load the .env file from e2e_tests folder
config({path: path.join(__dirname, '.env')});

test('Verify sign in error appearance in case of wrong credentials', async ({page}) => {
  // Reading WEB_AAP_PATH from .env file
  const webAppPath: string = process.env.WEB_APP_PATH ?? '';

  const welcomePage = new WelcomePage(page);
  const loginPage = new LoginPage(page);

  await page.goto(webAppPath);
  await welcomePage.clickLogin();
  await loginPage.inputEmail('blablabla@gmail.com');
  await loginPage.inputPassword('Aq1234567!');
  await loginPage.clickSignInButton();

  const errorMessage = await loginPage.getErrorMessage();

  expect(errorMessage).toBe('Please verify your details and try again');
});
