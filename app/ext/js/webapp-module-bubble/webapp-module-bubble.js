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

  zeta.webapp.module.Bubble = (function() {
    function Bubble(options) {
      this.is_visible = bind(this.is_visible, this);
      this.on_scroll = bind(this.on_scroll, this);
      this.on_window_resize = bind(this.on_window_resize, this);
      this.on_window_click = bind(this.on_window_click, this);
      this.on_click = bind(this.on_click, this);
      var ref;
      options = $.extend({
        host_selector: void 0,
        scroll_selector: void 0,
        enable_click: false,
        modal: true,
        offset: void 0,
        arrow_size: 16,
        resize: true,
        on_show: function() {},
        on_hide: function() {}
      }, options);
      $.extend(this, options);
      this.init();
      if (!this.elements_are_present()) {
        console.warn("Cannot create bubble for '" + this.host_selector + "'. Selector not found.");
        if ((ref = this.observer) != null) {
          ref.disconnect();
        }
        return;
      }
      if (this.enable_click) {
        this.host.on('mousedown', this.on_click);
      }
      this.observer = new MutationObserver((function(_this) {
        return function(mutations) {
          return _this.recalculate();
        };
      })(this));
      this.host_observer = new MutationObserver((function(_this) {
        return function(mutations) {
          return _this.recalculate();
        };
      })(this));
    }

    Bubble.prototype.elements_are_present = function() {
      var are_present, bubble, host;
      are_present = true;
      host = $(this.host_selector);
      bubble = $(host.data('bubble'));
      if (host.length === 0) {
        are_present = false;
      }
      if (bubble.parent().get(0) === void 0) {
        are_present = false;
      }
      return are_present;
    };

    Bubble.prototype.apply_offsets = function() {
      var position_left, reposition_left;
      if (this.offset) {
        if (this.offset.left) {
          position_left = this.bubble.position().left;
          reposition_left = position_left + this.offset.left;
          this.bubble.css('left', reposition_left);
        }
        return true;
      } else {
        return false;
      }
    };

    Bubble.prototype.init = function() {
      var ref;
      this.host = $(this.host_selector);
      this.bubble = $(this.host.data('bubble'));
      this.placement = this.host.data('placement') || 'top';
      this.arrow_diagonal = Math.round(Math.sqrt(this.arrow_size * this.arrow_size * 2));
      this["class"] = '';
      this.bubble.removeClass('bubble-top bubble-left bubble-right bubble-bottom bubble-bottom-right');
      this.bubble.css('top', 'auto');
      this.bubble.css('right', 'auto');
      this.bubble.css('bottom', 'auto');
      this.bubble.css('left', 'auto');
      if ((ref = this.placement) === 'top' || ref === 'vertical') {
        this["class"] = 'bubble-bottom';
      }
      if (this.placement === 'bottom') {
        this["class"] = 'bubble-top';
      }
      if (this.placement === 'left') {
        this["class"] = 'bubble-right';
      }
      if (this.placement === 'right') {
        this["class"] = 'bubble-left';
      }
      if (this.placement === 'top-left') {
        this["class"] = 'bubble-bottom-right';
      }
      if (this.placement === 'bottom-left') {
        this["class"] = 'bubble-top-right';
      }
      return true;
    };

    Bubble.prototype.recalculate = function() {
      var bubble_height, bubble_width, distance_from_top, host_bottom, host_height, host_left, host_midpoint, host_right, host_top, host_width, parent_offset, position, ref, window_height;
      position = (ref = this.host.get(0)) != null ? ref.getBoundingClientRect() : void 0;
      host_width = this.host.outerWidth();
      host_height = this.host.outerHeight();
      if (!position || host_width === 0 || host_height === 0) {
        return this.hide();
      }
      host_left = position.left;
      host_top = position.top;
      host_bottom = host_top + host_height;
      host_right = host_left + host_width;
      bubble_width = this.bubble.outerWidth();
      bubble_height = this.bubble.outerHeight();
      parent_offset = this.bubble.parent().get(0).getBoundingClientRect();
      window_height = $(window).innerHeight();
      if (this.placement === 'top') {
        this.bubble.css('top', host_top - this.arrow_diagonal / 2 - bubble_height - parent_offset.top);
        this.bubble.css('left', host_left + (host_width - bubble_width) / 2 - parent_offset.left);
      }
      if (this.placement === 'bottom') {
        this.bubble.css('top', host_bottom + this.arrow_diagonal / 2 - parent_offset.top);
        this.bubble.css('left', host_left + (host_width - bubble_width) / 2 - parent_offset.left);
      }
      if (this.placement === 'right') {
        this.bubble.css('top', host_top + (host_height - bubble_height) / 2 - parent_offset.top);
        this.bubble.css('left', host_right + this.arrow_diagonal / 2 - parent_offset.left);
      }
      if (this.placement === 'left') {
        this.bubble.css('top', host_top + (host_height - bubble_height) / 2 - parent_offset.top);
        this.bubble.css('left', host_left - bubble_width - this.arrow_diagonal / 2 - parent_offset.left);
      }
      if (this.placement === 'top-left') {
        this.bubble.css('top', host_top - this.arrow_diagonal / 2 - bubble_height - parent_offset.top);
        this.bubble.css('left', host_left - (bubble_width - host_width) - parent_offset.left);
      }
      if (this.placement === 'bottom-left') {
        this.bubble.css('top', host_bottom + this.arrow_diagonal / 2 - parent_offset.top);
        this.bubble.css('left', host_left - (bubble_width - host_width) - parent_offset.left);
      }
      if (this.placement === 'vertical') {
        this.bubble.css('top', host_top - this.arrow_diagonal / 2 - bubble_height - parent_offset.top);
        this.bubble.css('left', host_left + (host_width - bubble_width) / 2 - parent_offset.left);
      }
      if (this.placement === 'vertical') {
        distance_from_top = host_top - this.arrow_diagonal / 2 - bubble_height;
        this.bubble.css('left', host_left + (host_width - bubble_width) / 2 - parent_offset.left);
        if (distance_from_top >= 0) {
          this.bubble.css('top', host_top - this.arrow_diagonal / 2 - bubble_height - parent_offset.top);
          this.bubble.addClass('bubble-bottom').removeClass('bubble-top');
        } else {
          this.bubble.css('top', host_bottom + this.arrow_diagonal / 2 - parent_offset.top);
          this.bubble.addClass('bubble-top').removeClass('bubble-bottom');
        }
      }
      if (this.placement === 'right-flex') {
        host_midpoint = host_top + host_height / 2;
        if (host_midpoint < bubble_height / 2) {
          this.bubble.css('top', host_top - parent_offset.top);
          this.bubble.addClass('bubble-left-top').removeClass('bubble-left bubble-left-bottom');
        } else if (host_midpoint + bubble_height / 2 > window_height) {
          this.bubble.css('top', host_bottom - bubble_height - parent_offset.top);
          this.bubble.addClass('bubble-left-bottom').removeClass('bubble-left bubble-left-top');
        } else {
          this.bubble.css('top', host_top + (host_height - bubble_height) / 2 - parent_offset.top);
          this.bubble.addClass('bubble-left').removeClass('bubble-left-top bubble-left-bottom');
        }
        this.bubble.css('left', host_right + this.arrow_diagonal / 2 - parent_offset.left);
      }
      return true;
    };

    Bubble.prototype.show = function() {
      this.init();
      this.recalculate();
      this.apply_offsets();
      this.bubble.off('transitionend');
      return new Promise((function(_this) {
        return function(resolve, reject) {
          if (!_this.bubble[0]) {
            return reject();
          }
          _this.observer.observe(_this.bubble[0], {
            childList: true,
            subtree: true
          });
          if (!_this.host.parent()[0]) {
            return reject();
          }
          _this.host_observer.observe(_this.host.parent()[0], {
            childList: true,
            subtree: true
          });
          return setTimeout(function() {
            if (!_this.bubble[0]) {
              return reject();
            }
            _this.bubble.addClass("bubble-show " + _this["class"]);
            if (_this.resize) {
              $(window).on('resize', _this.on_window_resize);
            }
            if (_this.modal) {
              $(window).one('mousedown', _this.on_window_click);
              _this.bubble.on('mousedown', _this.on_cancel_click);
            }
            if (_this.scroll_selector != null) {
              $(_this.scroll_selector).one('mousewheel', _this.on_scroll);
            }
            _this.on_show();
            return setTimeout(function() {
              if (!_this.bubble[0]) {
                return _this.hide().then(function() {
                  return reject();
                });
              }
              _this.bubble.addClass('bubble-animation-show');
              return resolve();
            }, 10);
          });
        };
      })(this), 10);
    };

    Bubble.prototype.hide = function() {
      var ref;
      $(window).off('mousedown', this.on_window_click);
      this.bubble.off('mousedown', this.on_cancel_click);
      $(window).off('resize', this.on_window_resize);
      $(this.scroll_selector).off('scroll', this.on_scroll);
      if ((ref = this.observer) != null) {
        ref.disconnect();
      }
      return new Promise((function(_this) {
        return function(resolve) {
          _this.bubble.off('transitionend').removeClass('bubble-animation-show').one('transitionend', function() {});
          _this.bubble.removeClass("bubble-show " + _this["class"]);
          _this.on_hide();
          return resolve();
        };
      })(this));
    };

    Bubble.prototype.toggle = function() {
      if (this.is_visible()) {
        return this.hide();
      } else {
        return this.show();
      }
    };

    Bubble.prototype.on_click = function(e) {
      e.stopPropagation();
      return this.toggle();
    };

    Bubble.prototype.on_window_click = function(e) {
      e.stopPropagation();
      return this.hide();
    };

    Bubble.prototype.on_cancel_click = function(e) {
      return e.stopPropagation();
    };

    Bubble.prototype.on_window_resize = function() {
      if (this.is_visible()) {
        return this.recalculate();
      }
    };

    Bubble.prototype.on_scroll = function() {
      return this.hide();
    };

    Bubble.prototype.is_visible = function() {
      return $(this.host.data('bubble')).hasClass('bubble-show');
    };

    return Bubble;

  })();

}).call(this);
