import $ from 'jquery';
import AuthViewModel from '../view_model/AuthViewModel';
import {ENVIRONMENT, isEnvironment} from '../auth/Environment';
import {enableLogging} from '../util/LoggerUtil';

$(() => {
  enableLogging(isEnvironment(ENVIRONMENT.LOCAL));
  if ($('.auth-page').length) {
    new AuthViewModel(wire.auth);
  }
});
