import $ from 'jquery';
import AuthViewModel from '../view_model/AuthViewModel';

$(() => {
  if ($('.auth-page').length) {
    new AuthViewModel(wire.auth);
  }
});
