/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

// grunt test_run:localization/Localizer

'use strict';

describe('l10n', () => {
  describe('text', () => {
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

    it('can replace placeholders in localized strings using shorthand number version', () => {
      const text = z.l10n.text('Number {{name}} is alive', 5);

      expect(text).toBe('Number 5 is alive');
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

  describe('safeHtml', () => {
    it('escapes the raw string given', () => {
      const tests = [
        {expected: '&lt;script&gt;alert(&quot;fail&quot;)&lt;/script&gt;', raw: '<script>alert("fail")</script>'},
        {expected: '', raw: ''},
        {expected: 'félix', raw: 'félix'},
      ];

      tests.forEach(({raw, expected}) => {
        const result = z.l10n.safeHtml(raw);

        expect(result).toBe(expected);
      });
    });

    it('escapes raw substitutions string or number', () => {
      const tests = [
        {
          expected: '&lt;scri&gt;alert(&quot;&lt;script&gt;alert(&quot;felix&quot;)&lt;/script&gt;&quot;)&lt;/scri&gt;',
          params: {substitutions: '<script>alert("felix")</script>', text: '<scri>alert("{{userName}}")</scri>'},
        },
        {
          expected: '&lt;scri&gt;alert(&quot;12&quot;)&lt;/scri&gt;',
          params: {substitutions: 12, text: '<scri>alert("{{userName}}")</scri>'},
        },
        {
          expected: '&lt;scri&gt;alert(&quot;{{userName}}&quot;)&lt;/scri&gt;',
          params: {text: '<scri>alert("{{userName}}")</scri>'},
        },
      ];

      tests.forEach(({params, expected}) => {
        const result = z.l10n.safeHtml(params.text, params.substitutions);

        expect(result).toBe(expected);
      });
    });

    it('escapes substitutions object', () => {
      const tests = [
        {
          // simple replacement
          expected: '&lt;scri&gt;alert(&quot;&lt;script&gt;alert(&quot;felix&quot;)&lt;/script&gt;&quot;)&lt;/scri&gt;',
          params: {
            substitutions: {replace: {user: '<script>alert("felix")</script>'}},
            text: '<scri>alert("{{user}}")</scri>',
          },
        },
        {
          // multiple replacement of the same key
          expected: 'nan nan nan Batman!',
          params: {
            substitutions: {replace: {user: 'nan'}},
            text: '{{user}} {{user}} {{user}} Batman!',
          },
        },
        {
          // multi key replacement
          expected: 'Hello Rick, you are &lt;script&gt;a pickle&lt;/script&gt;',
          params: {
            substitutions: {replace: {status: '<script>a pickle</script>', user: 'Rick'}},
            text: 'Hello {{user}}, you are {{status}}',
          },
        },
      ];

      tests.forEach(({params, expected}) => {
        const result = z.l10n.safeHtml(params.text, params.substitutions);

        expect(result).toBe(expected);
      });
    });

    it("doesn't escape substitutions acknowledged as dangerous", () => {
      const tests = [
        {
          // no safe replacement
          expected: '<user>Felix</user>',
          params: {
            substitutions: {replaceDangerously: {'/user': '</user>', user: '<user>'}},
            text: '[user]Felix[/user]',
          },
        },
        {
          // safe and unsafe replacements
          expected: '<user>&lt;script&gt;alert(&quot;felix&quot;)&lt;/script&gt;<user>',
          params: {
            substitutions: {replace: {user: '<script>alert("felix")</script>'}, replaceDangerously: {user: '<user>'}},
            text: '[user]{{user}}[user]',
          },
        },
      ];

      tests.forEach(({params, expected}) => {
        const result = z.l10n.safeHtml(params.text, params.substitutions);

        expect(result).toBe(expected);
      });
    });

    it('replaces default known tags', () => {
      const tests = [
        {
          // no safe replacement
          expected: '<b>Felix</b> is <b>a</b> <i>pickle</i>',
          params: {
            text: '[bold]Felix[/bold] is [bold]a[/bold] [italic]pickle[/italic]',
          },
        },
      ];

      tests.forEach(({params, expected}) => {
        const result = z.l10n.safeHtml(params.text, params.substitutions);

        expect(result).toBe(expected);
      });
    });
  });
});
