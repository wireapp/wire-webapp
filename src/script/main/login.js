import $ from 'jquery';
import AuthViewModel from '../view_model/AuthViewModel';
import {resolve, graph} from '../config/appResolver';
import {enableLogging} from '../util/LoggerUtil';
import {BACKEND_REST, BACKEND_WS, FEATURE} from '../auth/config';

$(() => {
  enableLogging(FEATURE.ENABLE_DEBUG);
  if ($('.auth-page').length) {
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: BACKEND_REST,
      webSocketUrl: BACKEND_WS,
    });
    new AuthViewModel(backendClient);
  }
});
