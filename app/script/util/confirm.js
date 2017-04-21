/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

/**
 * show confirm template inside the specified element
 *
 * @example show confirm dialog
 *
 * $('#parent').confirm
 *  template: '#template-confirm'
 *  data:
 *    foo: 'bar'
 *  confirm: ->
 *    ... do something on confirm ...
 *  cancel: ->
 *    ... do something on cancel ...
 *
 * @param [Object]
 * @option template: [String] template that will be displayed
 * @option data: [object] used as viewmodel for this dialog
 * @option confirm: [Function] will be executed when confirm button is clicked
 * @option cancel: [Function] will be executed when cancel button is clicked
 */

$.fn.confirm = function(config) {

  const template_html = $(config.template).html();
  const parent = $(this);
  parent.append(template_html);

  const confirm = parent.find('.confirm');
  const group = parent.find('.participants-group');
  let is_visible = true;

  const is_small = group.hasClass('small');
  if (is_small) {
    group.removeClass('small');
  }

  ko.applyBindings(config.data, confirm[0]);

  if (config.data && config.data.user) {
    const stripped_user_name = config.data.user.first_name();
    parent
      .find('.user')
      .html(z.util.escape_html(stripped_user_name));
  }

  window.requestAnimationFrame(() => confirm.addClass('confirm-is-visible'));

  this.destroy = function() {
    is_visible = false;
    ko.cleanNode(confirm[0]);

    if (is_small) {
      group.addClass('small');
    }

    parent.find('.confirm').remove();
  };

  this.is_visible = () => is_visible;

  $('[data-action="cancel"]', confirm).click(() => {

    if (typeof config.cancel === 'function') {
      config.cancel(config.data);
    }

    this.destroy();
  });

  $('[data-action="confirm"]', confirm).click(() => {

    if (typeof config.confirm === 'function') {
      config.confirm(config.data);
    }

    this.destroy();
  });

  return this;
};
