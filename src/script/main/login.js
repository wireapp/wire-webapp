import $ from 'jquery';

import {enableLogging} from 'Util/LoggerUtil';

import {AuthViewModel} from '../view_model/AuthViewModel';
import {Config} from '../auth/config';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {BackendClient} from '../service/BackendClient';

$(() => {
  enableLogging(Config.FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();
  if ($('.auth-page').length) {
    const backendClient = new BackendClient();
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });
    new AuthViewModel(backendClient);
  }
});
