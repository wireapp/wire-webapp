import $ from 'jquery';

import {enableLogging} from 'Util/LoggerUtil';

import {AuthViewModel} from '../view_model/AuthViewModel';
import {resolve, graph} from '../config/appResolver';
import {Config} from '../auth/config';

$(() => {
  enableLogging(Config.FEATURE.ENABLE_DEBUG);
  if ($('.auth-page').length) {
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });
    new AuthViewModel(backendClient);
  }
});
