import {LoginData} from '@wireapp/api-client/dist/commonjs/auth/index';

export default class LoginSanitizer {
  constructor() {}

  public static removeNonPrintableCharacters(loginData: LoginData): void {
    const nonPrintableCharacters = new RegExp('[^\x20-\x7E]+', 'gm');

    if (loginData.email) {
      loginData.email = loginData.email.replace(nonPrintableCharacters, '');
    }

    if (loginData.handle) {
      loginData.handle = loginData.handle.replace(nonPrintableCharacters, '');
    }

    if (loginData.password) {
      loginData.password = loginData.password.toString().replace(nonPrintableCharacters, '');
    }
  }
}
