/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.Namespace('zeta.webapp.module');

  zeta.webapp.module.Modal = (function() {
    function Modal(modal, hide_callback, before_hide_callback) {
      this.modal = modal;
      this.hide_callback = hide_callback;
      this.before_hide_callback = before_hide_callback;
      this._hide = bind(this._hide, this);
      this.autoclose = true;
      this.init_exits();
    }

    Modal.prototype.init_exits = function() {
      keyboardJS.bind('esc', this._hide);
      return $(this.modal).click((function(_this) {
        return function(e) {
          if (e.target === $(_this.modal)[0]) {
            return _this._hide();
          }
        };
      })(this));
    };

    Modal.prototype._hide = function() {
      if (this.autoclose) {
        return this.hide();
      }
    };

    Modal.prototype.show = function() {
      $(this.modal).addClass('modal-show');
      return setTimeout((function(_this) {
        return function() {
          return $(_this.modal).addClass('modal-fadein');
        };
      })(this), 50);
    };

    Modal.prototype.hide = function(callback) {
      if (typeof this.before_hide_callback === "function") {
        this.before_hide_callback();
      }
      return $(this.modal).removeClass('modal-fadein').one('transitionend', (function(_this) {
        return function() {
          $(_this.modal).removeClass('modal-show');
          if (typeof _this.hide_callback === "function") {
            _this.hide_callback();
          }
          return typeof callback === "function" ? callback() : void 0;
        };
      })(this));
    };

    Modal.prototype.toggle = function() {
      if (this.is_shown()) {
        return this.hide();
      } else {
        return this.show();
      }
    };

    Modal.prototype.is_shown = function() {
      return $(this.modal).hasClass('modal-show');
    };

    Modal.prototype.is_hidden = function() {
      return !this.is_shown();
    };

    Modal.prototype.set_autoclose = function(autoclose) {
      return this.autoclose = autoclose;
    };

    Modal.prototype.destroy = function() {
      $(this.modal).off('click');
      return keyboardJS.unbind('esc', this._hide);
    };

    return Modal;

  })();

}).call(this);
