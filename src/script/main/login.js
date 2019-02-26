import $ from 'jquery';
import AuthViewModel from '../view_model/AuthViewModel';
import {enableLogging} from '../util/LoggerUtil';

$(() => {
  enableLogging();
  if ($('.auth-page').length) {
    new AuthViewModel(wire.auth);
  }
});
