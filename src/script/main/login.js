import $ from 'jquery';

import {enableLogging} from 'Util/LoggerUtil';

import {AuthViewModel} from '../view_model/AuthViewModel';
import {resolve, graph} from '../config/appResolver';
import {Config} from '../auth/config';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {getEphemeralValue} from 'Util/ephemeralValueStore';
import {StorageService} from '../storage';

$(async () => {
  enableLogging(Config.FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();
  if ($('.auth-page').length) {
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });

    const encryptionKey = await getEphemeralValue();
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });

    let engine;

    if (encryptionKey) {
      engine = StorageService.initEncryptedDatabase(encryptionKey);
    }

    new AuthViewModel(backendClient, engine);
  }
});
