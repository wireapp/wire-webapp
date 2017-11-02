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

// grunt test_init && grunt test_run:localization/Localizer

'use strict';

describe('l10n', () => {
  it('can get localized strings', () => {
    const text = z.l10n.text(z.string.wire);
    expect(text).toBe(z.string.wire);
  });

  it('can get localized strings when value is observable', () => {
    const text = z.l10n.text(ko.observable(z.string.wire));
    expect(text).toBe(z.string.wire);
  });

  it('can replace placeholders in localized strings using shorthand string version', () => {
    const text = z.l10n.text('Hey {{name}}', 'Tod');
    expect(text).toBe('Hey Tod');
  });

  it('can replace placeholders in localized strings using an object', () => {
    const text = z.l10n.text('Hey {{name}}', {name: 'Tod'});
    expect(text).toBe('Hey Tod');
  });

  it('can replace placeholders in localized strings using a more complex object', () => {
    const text = z.l10n.text('{{greeting}} {{name}}', {greeting: 'Hey', name: 'Tod'});
    expect(text).toBe('Hey Tod');
  });

  it('can replace duplicate placeholders in localized strings using a more complex object', () => {
    const text = z.l10n.text('{{greeting}} {{greeting}} {{name}}', {greeting: 'Hey', name: 'Tod'});
    expect(text).toBe('Hey Hey Tod');
  });
});
