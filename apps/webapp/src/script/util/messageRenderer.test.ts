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

import {renderMessage, getRenderedTextContent} from './messageRenderer';

import {MentionEntity} from '../message/MentionEntity';

const escapeLink = (link: string) => link.replace(/&/g, '&amp;');

describe('renderMessage', () => {
  it('renders a normal link', () => {
    const expected =
      'Check this: <a href="http://www.wire.com/" target="_blank" rel="nofollow noopener noreferrer">http://www.wire.com/</a>';

    expect(renderMessage('Check this: http://www.wire.com/')).toBe(expected);
  });

  it('renders a normal link without protocol', () => {
    const expected =
      'Check this: <a href="http://wire.com/about/" target="_blank" rel="nofollow noopener noreferrer">wire.com/about/</a>';

    expect(renderMessage('Check this: wire.com/about/')).toBe(expected);
  });

  it('renders complicated image links', () => {
    const link =
      'http://static.err.ee/gridfs/95E91BE0D28DF7236BC00EE349284A451C05949C2D04E7857BC686E4394F1585.jpg?&crop=(0,27,848,506.0960451977401)&cropxunits=848&cropyunits=595&format=jpg&quality=90&width=752&maxheight=42';
    const expected = `<a href="${escapeLink(link)}" target="_blank" rel="nofollow noopener noreferrer">${escapeLink(
      link,
    )}</a>`;

    expect(renderMessage(link)).toBe(expected);
  });

  it('renders URLs with underscores', () => {
    const link = 'http://en.wikipedia.org/wiki/Stormtrooper_(Star_Wars)';
    const expected = `Stormtroopers: <a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a> !!!`;

    expect(renderMessage(`Stormtroopers: ${link} !!!`)).toBe(expected);
  });

  it('renders links with multiple underscores', () => {
    const link =
      'https://www.nike.com/events-registration/event?id=6245&languageLocale=de_de&cp=EUNS_KW_DE_&s_kwcid=AL!2799!3!46005237943!b';
    const expected = `<a href="${escapeLink(link)}" target="_blank" rel="nofollow noopener noreferrer">${escapeLink(
      link,
    )}</a>`;

    expect(renderMessage(link)).toBe(expected);
  });

  it('renders URLs without a trailing slash', () => {
    const link = 'http://www.underscore.com';
    const expected = `e.g. <a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a>.`;

    expect(renderMessage(`e.g. ${link}.`)).toBe(expected);
  });

  it('renders URLs with braces in the path component', () => {
    const link = 'https://www.underscore.com/api/{version}/endpoint';
    const expected = `e.g. <a href="https://www.underscore.com/api/%7Bversion%7D/endpoint" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">https://www.underscore.com/api/{version}/endpoint</a>.`;

    expect(renderMessage(`e.g. ${link}.`)).toBe(expected);
  });

  it('renders URLs with escaped parameters', () => {
    const link = 'http://www.underscore.com/?parameter=%2f';
    const expected = `e.g. <a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a>.`;

    expect(renderMessage(`e.g. ${link}.`)).toBe(expected);
  });

  it('renders localhost links', () => {
    const link = 'http://localhost:8888/';
    const expected = `<a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a>`;

    expect(renderMessage(link)).toBe(expected);
  });

  it('renders links with IP addresses', () => {
    const link = 'http://192.168.10.44:8080//job/webapp_atomic_test/4290/cucumber-html-reports';
    const expected = `<a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a>`;

    expect(renderMessage(link)).toBe(expected);
  });

  it('renders URLs with @-signs correctly', () => {
    const link = 'https://www.mail-archive.com/debian-bugs-dist@lists.debian.org/msg1448956.html';
    const expected = `<a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a>`;

    expect(renderMessage(link)).toBe(expected);
  });

  it('renders URLs with @-signs and text correctly', () => {
    const link = 'https://t.facdn.net/22382738@400-1485204208.jpg';
    const expected = `Just click <a href="${link}" target="_blank" rel="nofollow noopener noreferrer">${link}</a> and download it`;

    expect(renderMessage(`Just click ${link} and download it`)).toBe(expected);
  });

  it('escapes links when they are posted as plain HTML', () => {
    const expected = "&lt;a href=&quot;javascript:alert('ohoh!')&quot;&gt;what?&lt;/a&gt;";

    expect(renderMessage('<a href="javascript:alert(\'ohoh!\')">what?</a>')).toBe(expected);
  });

  it('renders an escaped version of an xss attempt', () => {
    const expected =
      '<a href="http://wire.de/jaVasCript:/" target="_blank" rel="nofollow noopener noreferrer">wire.de/jaVasCript:/</a><em>-/</em><code>/*\\</code>/<em>\'/</em>&quot;/<strong>/(/</strong>/oNcliCk=alert())//%0D%0A%0d%0a//&lt;/stYle/&lt;/titLe/&lt;/teXtarEa/&lt;/scRipt/--!&gt;\\x3csVg/&lt;sVg/oNloAd=alert()//&gt;\\x3e';

    expect(
      renderMessage(
        'wire.de/jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/**/oNcliCk=alert())//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e',
      ),
    ).toBe(expected);
  });

  it('renders an email address', () => {
    const expected = 'send it over to <a href="mailto:hello@wire.com" data-email-link="true">hello@wire.com</a>';

    expect(renderMessage('send it over to hello@wire.com')).toBe(expected);
  });

  it('renders an email address with pluses', () => {
    const expected =
      'send it over to <a href="mailto:hello+world@wire.com" data-email-link="true">hello+world@wire.com</a>';

    expect(renderMessage('send it over to hello+world@wire.com')).toBe(expected);
  });

  it('renders an email long domains', () => {
    const expected =
      'send it over to <a href="mailto:janedoe@school.university.edu" data-email-link="true">janedoe@school.university.edu</a>';

    expect(renderMessage('send it over to janedoe@school.university.edu')).toBe(expected);
  });

  it('renders an email with multiple subdomains', () => {
    const expected = 'send it over to <a href="mailto:bla@foo.co.uk" data-email-link="true">bla@foo.co.uk</a>';

    expect(renderMessage('send it over to bla@foo.co.uk')).toBe(expected);
  });

  // The tag "<br>" is preferred for compatibility sake.
  // @see http://stackoverflow.com/a/1946442/451634
  it('renders endlines to <br>', () => {
    expect(renderMessage('Hello,\nworld!\nHow is it going?\n')).toBe('Hello,<br>world!<br>How is it going?');
  });

  it('renders text with more than one newline in between', () => {
    expect(renderMessage('Hello,\n\n\n\n\n\n\nworld!')).toBe('Hello,<br><br><br><br><br><br><br>world!');
  });

  it('does not render URLs within <code> tags', () => {
    expect(renderMessage('```Url url = new Url("wire.com");```')).toBe(
      '<code>Url url = new Url(&quot;wire.com&quot;);</code>',
    );
  });

  it('does not render emails within <code> tags', () => {
    expect(renderMessage('```this.isValid("opensource@wire.com")```')).toBe(
      '<code>this.isValid(&quot;opensource@wire.com&quot;)</code>',
    );
  });

  it('renders an emoticon of someone shrugging', () => {
    expect(renderMessage('¯_(ツ)_/¯')).toBe('¯_(ツ)_/¯');
  });

  it('renders a link from markdown notation', () => {
    expect(renderMessage('[doop](http://www.example.com)')).toBe(
      '<a href="http://www.example.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">doop</a>',
    );
  });

  it('renders a wire deeplink from markdown notation', () => {
    expect(renderMessage('[my friend](wire://user/51052526-ee3f-434a-a296-f3545ee929fc)')).toBe(
      '<a href="wire://user/51052526-ee3f-434a-a296-f3545ee929fc" target="_blank" rel="nofollow noopener noreferrer" data-uie-name="wire-deep-link">my friend</a>',
    );
  });

  it('renders a wire deeplink with config url', () => {
    expect(renderMessage('wire://access/?config=https://test.com/deeplink.json')).toBe(
      '<a href="wire://access/?config=https://test.com/deeplink.json" target="_blank" rel="nofollow noopener noreferrer" data-uie-name="wire-deep-link">wire://access/?config=https://test.com/deeplink.json</a>',
    );
  });

  it('renders a wire deeplink with config url with alias', () => {
    expect(renderMessage('[deeplink](wire://access/?config=https://test.com/deeplink.json)')).toBe(
      '<a href="wire://access/?config=https://test.com/deeplink.json" target="_blank" rel="nofollow noopener noreferrer" data-uie-name="wire-deep-link">deeplink</a>',
    );
  });

  it('renders a link from markdown notation with formatting', () => {
    expect(renderMessage('[**doop**](http://www.example.com)')).toBe(
      '<a href="http://www.example.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link"><strong>doop</strong></a>',
    );
  });

  it('renders a without protocol link from markdown notation', () => {
    expect(renderMessage('[doop](www.example.com)')).toBe(
      '<a href="https://www.example.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">doop</a>',
    );
  });

  it('does not render a js link from markdown notation', () => {
    expect(renderMessage("[doop](javascript:alert('nope'))")).toBe("[doop](javascript:alert('nope'))");
    expect(renderMessage("[doop](javaScript:alert('nope'))")).toBe("[doop](javaScript:alert('nope'))");
  });

  it('does not render a link to a custom protocol from markdown notation', () => {
    expect(renderMessage('[doop](something://123-444-666)')).toBe('[doop](something://123-444-666)');
  });

  it('does not render a data URL from markdown notation', () => {
    expect(
      renderMessage('[doop](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)'),
    ).toBe('[doop](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)');
    expect(
      renderMessage('[**doop**](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)'),
    ).toBe('[<strong>doop</strong>](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)');
  });

  it('does not render markdown links with empty or only whitespace values', () => {
    expect(renderMessage('[](http://example.com)')).toBe('[](http://example.com)');
    expect(renderMessage('[   ](http://example.com)')).toBe('[   ](http://example.com)');
    expect(renderMessage('[link]()')).toBe('[link]()');
    expect(renderMessage('[link](    )')).toBe('[link]()');
  });

  it('renders special escaped email links from markdown notation', () => {
    expect(renderMessage('[email](mailto:test@email.com)')).toBe(
      '<a href="mailto:test@email.com" data-email-link="true" data-md-link="true" data-uie-name="markdown-link">email</a>',
    );

    expect(renderMessage("[email](mailto:'\\);alert\\('pwned'\\)//)")).toBe(
      '<a href="mailto:\');alert(\'pwned\')//" data-email-link="true" data-md-link="true" data-uie-name="markdown-link">email</a>',
    );
  });

  it('renders a link from markdown notation with a title', () => {
    expect(renderMessage('[sometext](https://some.domain "this is a title")')).toBe(
      `<a href="https://some.domain" title="this is a title" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">sometext</a>`,
    );
  });

  it('escapes links with an xss attempt on their url', () => {
    expect(renderMessage(`[sometext](https://some.domain"><script>alert("oops")</script>)`)).toBe(
      `<a href=\"https://some.domain%22%3E%3Cscript%3Ealert(%22oops%22)%3C/script%3E\" target=\"_blank\" rel=\"nofollow noopener noreferrer\" data-md-link=\"true\" data-uie-name=\"markdown-link\">sometext</a>`,
    );
  });

  it('does not add a < behind URLs within <code> tags 2', () => {
    expect(renderMessage('` http://wire.com`\n`123`')).toBe('<code> http://wire.com</code><br><code>123</code>');
  });
  it('does not add a < behind URLs within <code> tags', () => {
    expect(renderMessage('` http://wire.com`')).toBe('<code> http://wire.com</code>');
  });

  it('escapes url params', () => {
    expect(renderMessage(`[sometext](https://some.domain?param1=a&param2=b)`)).toBe(
      `<a href="https://some.domain?param1=a&amp;param2=b" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">sometext</a>`,
    );
  });

  it('escapes links with html charachters on their title', () => {
    expect(renderMessage(`[sometext](https://some.domain "<this> &' >that<")`)).toBe(
      `<a href="https://some.domain" title="&lt;this&gt; &amp;' &gt;that&lt;" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">sometext</a>`,
    );
  });

  it('escapes links with an xss attempt on their title', () => {
    expect(renderMessage(`[sometext](https://some.domain '"><script>alert("oops")</script>')`)).toBe(
      `<a href="https://some.domain" title="&quot;&gt;&lt;script&gt;alert(&quot;oops&quot;)&lt;/script&gt;" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">sometext</a>`,
    );
  });

  it('renders links without changing their appearance', () => {
    const punyLink = 'https://xn--outfank-jdc.nl/';

    expect(renderMessage(punyLink)).toBe(
      `<a href="${punyLink}" target="_blank" rel="nofollow noopener noreferrer">${punyLink}</a>`,
    );
  });

  it('conversts unicode links to punycode', () => {
    const expected = `<a href="https://xn--mller-kva.de" target="_blank" rel="nofollow noopener noreferrer" data-md-link=\"true\" data-uie-name=\"markdown-link\">https://müller.de</a>`;
    expect(renderMessage('https://müller.de')).toBe(
      // if this test fails because the rendering of the url was changed to no longer generate the same output as the markdown code below,
      // then this output needs to be verified against potential unicode confusable output
      expected,
    );

    expect(renderMessage('[https://müller.de](https://müller.de)')).toBe(expected);
  });
  it('unicode confusables generate a code', () => {
    const expected = `<a href="https://xn--vlid-53d.domain" target="_blank" rel="nofollow noopener noreferrer" data-md-link=\"true\" data-uie-name=\"markdown-link\">https://v\u0430lid.domain</a>`;
    expect(renderMessage('https://v\u0430lid.domain')).toBe(
      // if this test fails because the rendering of the url was changed to no longer generate the same output as the markdown code below,
      // then this output needs to be verified against potential unicode confusable output
      expected,
    );

    expect(renderMessage('[https://v\u0430lid.domain](https://v\u0430lid.domain)')).toBe(expected);
  });

  describe('Mentions', () => {
    const tests = [
      {
        expected:
          'bonjour <span class="message-mention" data-uie-name="label-other-mention" data-user-id="user-id" role="button"><span class="mention-at-sign">@</span>felix</span>',
        mentions: [{length: 6, startIndex: 8, userId: 'user-id'}],
        testCase: 'replaces single mention in simple text',
        text: 'bonjour @felix',
      },
      {
        expected:
          'bonjour <span class="message-mention" data-uie-name="label-other-mention" data-user-id="user-id" role="button"><span class="mention-at-sign">@</span>felix</span>, tu vas bien <span class="message-mention" data-uie-name="label-other-mention" data-user-id="user-id" role="button"><span class="mention-at-sign">@</span>felix</span>?',
        mentions: [
          {length: 6, startIndex: 8, userId: 'user-id'},
          {length: 6, startIndex: 28, userId: 'user-id'},
        ],
        testCase: 'replaces two mentions to same user in simple text',
        text: 'bonjour @felix, tu vas bien @felix?',
      },
      {
        expected:
          'salut <span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>&#x60;I am a **pain** in the __a**__&#x60;</span>',
        mentions: [{length: 33, startIndex: 6, userId: 'pain-id'}],
        testCase: "doesn't parse markdown in user names",
        text: 'salut @`I am a **pain** in the __a**__`',
      },
      {
        expected:
          '<strong>salut</strong> <span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>you</span>',
        mentions: [{length: 4, startIndex: 10, userId: 'pain-id'}],
        testCase: 'parses markdown outside of mentions',
        text: '**salut** @you',
      },
      {
        expected:
          '<strong>salut</strong> <span class="message-mention self-mention" data-uie-name="label-self-mention" role="button"><span class="mention-at-sign">@</span>you</span> and <span class="message-mention" data-uie-name="label-other-mention" data-user-id="toi-id" role="button"><span class="mention-at-sign">@</span>toi</span>',
        mentions: [
          {length: 4, startIndex: 10, userId: 'self-id'},
          {length: 4, startIndex: 19, userId: 'toi-id'},
        ],
        testCase: 'displays self mentions differently',
        text: '**salut** @you and @toi',
      },
      {
        expected:
          'salut<pre><code><span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>you</span>\n</code></pre>',
        mentions: [{length: 4, startIndex: 10, userId: 'pain-id'}],
        testCase: 'displays mention inside code block',
        text: 'salut\n```\n@you\n```',
      },
      {
        expected: 'salut<pre><code class="lang-@you"></code></pre>',
        mentions: [{length: 4, startIndex: 10, userId: 'pain-id'}],
        testCase: 'mention does not affect code language',
        text: 'salut\n\n```@you\n```',
      },
      {
        expected:
          '<a href="https://wire.com/#@you" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">text</a>',
        mentions: [{length: 4, startIndex: 25, userId: 'pain-id'}],
        testCase: 'mention does not affect url',
        text: '[text](https://wire.com/#@you)',
      },
      {
        expected:
          '<a href="https://wire.com/#" title="@you" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">text</a>',
        mentions: [{length: 4, startIndex: 27, userId: 'pain-id'}],
        testCase: 'mention in title is displayed correctly',
        text: '[text](https://wire.com/# "@you")',
      },
      {
        expected:
          '<a href="https://wire.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link"><span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>you</span></a>',
        mentions: [{length: 4, startIndex: 1, userId: 'pain-id'}],
        testCase: 'mention works correctly as part of a link text',
        text: '[@you](https://wire.com)',
      },
      {
        expected:
          '<a href="http://wire.com#@you" target="_blank" rel="nofollow noopener noreferrer">http://wire.com#<span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>you</span></a>',
        mentions: [{length: 4, startIndex: 16, userId: 'pain-id'}],
        testCase: "mentions don't affect auto-detected links",
        text: 'http://wire.com#@you',
      },
    ];

    tests.forEach(({expected, mentions, testCase, text}) => {
      const mentionEntities = mentions.map(mention => {
        const mentionEntity = new MentionEntity(mention.startIndex, mention.length, mention.userId);
        return mentionEntity;
      });

      // eslint-disable-next-line jest/valid-title
      it(testCase, () => {
        const result = renderMessage(text, {domain: '', id: 'self-id'}, mentionEntities);

        expect(result).toEqual(expected);
      });
    });

    it('does not try to match mention to self id if no userId given', () => {
      const expected =
        'hey <span class="message-mention" data-uie-name="label-other-mention" data-user-id="pain-id" role="button"><span class="mention-at-sign">@</span>user</span>';
      const mentions = [{length: 5, startIndex: 4, userId: 'pain-id'}];
      const mentionEntities = mentions.map(mention => {
        const mentionEntity = new MentionEntity(mention.startIndex, mention.length, mention.userId);
        return mentionEntity;
      });
      const result = renderMessage('hey @user', undefined, mentionEntities);

      expect(result).toEqual(expected);
    });
  });
});

describe('Markdown for bold text', () => {
  it('renders bold text', () => {
    expect(renderMessage('**bold text (not italic)**')).toBe('<strong>bold text (not italic)</strong>');
  });

  it('renders a bold word within a sentence', () => {
    expect(renderMessage('Markdown **just** rocks!')).toEqual('Markdown <strong>just</strong> rocks!');
  });

  it('renders bold text with italic words', () => {
    expect(renderMessage('**bold text with *italic* !!**')).toBe('<strong>bold text with <em>italic</em> !!</strong>');
  });

  it('renders text which is partly bold and partly italic', () => {
    expect(renderMessage('**part bold,** *part italic*')).toBe('<strong>part bold,</strong> <em>part italic</em>');
  });

  it('renders mixed text with bold and italic words', () => {
    expect(renderMessage('*italic* **bold** *italic* **bold**')).toBe(
      '<em>italic</em> <strong>bold</strong> <em>italic</em> <strong>bold</strong>',
    );
  });

  it('renders words which are just bold', () => {
    expect(renderMessage('**A**')).toBe('<strong>A</strong>');
  });
});

describe('Markdown for italic text', () => {
  it('renders italic text', () => {
    expect(renderMessage('*This text is italic.*')).toBe('<em>This text is italic.</em>');
  });

  it('renders partially italic text', () => {
    expect(renderMessage('This text is *partially* italic')).toBe('This text is <em>partially</em> italic');
  });

  it('renders text with multiple italic words', () => {
    expect(renderMessage('This text has *two* *italic* bits')).toBe('This text has <em>two</em> <em>italic</em> bits');
  });

  it('renders italic text with bold words', () => {
    expect(renderMessage('*italic text **with bold***')).toBe('<em>italic text <strong>with bold</strong></em>');
  });

  it('renders words which are bold-italic', () => {
    expect(renderMessage('***A***')).toBe('<em><strong>A</strong></em>');
  });
});

describe('Markdown for code snippets', () => {
  it('renders code blocks', () => {
    expect(renderMessage("```console.log('A')```")).toEqual("<code>console.log('A')</code>");
  });

  it('can escape HTML in rendered code blocks', () => {
    expect(renderMessage('```<b>Hello</b>```')).toEqual('<code>&lt;b&gt;Hello&lt;/b&gt;</code>');
  });

  it('renders code within code spans', () => {
    expect(renderMessage('This is `code`.')).toEqual('This is <code>code</code>.');
  });

  it('renders code within code blocks', () => {
    expect(renderMessage('This is ```code```.')).toEqual('This is <code>code</code>.');
  });

  it(`doesn't render code within a code span`, () => {
    expect(renderMessage('`com.ibm.icu`')).toEqual('<code>com.ibm.icu</code>');
  });

  it(`doesn't render links within code blocks`, () => {
    const expected = `<pre><code class="lang-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>dependency</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>groupId</span><span class="token punctuation">></span></span>com.ibm.icu<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>groupId</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>artifactId</span><span class="token punctuation">></span></span>icu4j<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>artifactId</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>version</span><span class="token punctuation">></span></span>53.1<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>version</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>dependency</span><span class="token punctuation">></span></span>
</code></pre>`;

    expect(
      renderMessage(
        '```xml\n<dependency>\n  <groupId>com.ibm.icu</groupId>\n  <artifactId>icu4j</artifactId>\n  <version>53.1</version>\n</dependency>\n```',
      ),
    ).toEqual(expected);
  });
});

describe('Markdown for headings', () => {
  it('differentiate heading size by its level', () => {
    expect(renderMessage('# heading')).toBe('<div class="md-heading md-heading--1">heading</div>');
    expect(renderMessage('## heading')).toBe('<div class="md-heading md-heading--2">heading</div>');
    expect(renderMessage('### heading')).toBe('<div class="md-heading md-heading--3">heading</div>');
    expect(renderMessage('#### heading')).toBe('<div class="md-heading md-heading--4">heading</div>');
  });
});

describe('Markdown with mixed markups', () => {
  it('renders font weights together with links', () => {
    const link_1 = '<a href="http://www.link.com" target="_blank" rel="nofollow noopener noreferrer">www.link.com</a>';
    const link_2 =
      '<a href="http://www.anotherlink.net" target="_blank" rel="nofollow noopener noreferrer">www.anotherlink.net</a>';
    const expected = `This is <em>italic</em> and <strong>bold</strong> and <em><strong>bold-italic</strong></em> with a ${link_1} and ${link_2}.`;

    expect(
      renderMessage('This is *italic* and **bold** and ***bold-italic*** with a www.link.com and www.anotherlink.net.'),
    ).toEqual(expected);
  });
});

describe('Ignored Markdown syntax', () => {
  it('only renders correct Markdown syntax', () => {
    expect(renderMessage('This text is not italic.')).toBe('This text is not italic.');
  });

  it('does not render bold text when there is only a single asterisk', () => {
    expect(renderMessage('random *asterisk')).toBe('random *asterisk');
  });

  it('does not render horizontal lines', () => {
    expect(renderMessage('***\nNo horizontal lines\n***')).toBe('***<br>No horizontal lines<br>***');
  });

  it('does not render underline headers', () => {
    expect(renderMessage('no h1\n===')).toBe('no h1<br>===');
    expect(renderMessage('no h2\n---')).toBe('no h2<br>---');
  });

  it('does not render tables', () => {
    const input = 'First Header | Second Header\n------------ | -------------\nCell 1 | Cell 2';
    const expected = 'First Header | Second Header<br>------------ | -------------<br>Cell 1 | Cell 2';

    expect(renderMessage(input)).toBe(expected);
  });
});

// The exceptions are not fixed yet, that's why we collect and exclude them here
describe('Markdown exceptions', () => {
  it('handles the URLs that start with : after the protocol', () => {
    const text = 'http://:';

    expect(renderMessage(text)).toBe(text);
  });

  it('does not render underscores to italic when they are within a sentence', () => {
    const text = 'calling__voice_channel__fulltitle';

    expect(renderMessage(text)).toBe(text);
  });
});

describe('getRenderedTextContent', () => {
  it('strips all markdown notation from the message', () => {
    const input = 'This is *italic* and\n**bold** and\n***bold-italic*** and [email](mailto:test@email.com)';
    const expected = 'This is italic and\nbold and\nbold-italic and email';

    expect(getRenderedTextContent(input)).toBe(expected);
  });

  it('keeps special characters as they are', () => {
    const input = '17 % 5 == 2 && 3 < 4';

    expect(getRenderedTextContent(input)).toBe(input);
  });
});
