/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */
/*global define*/

// Need to keep those imporst as commonjs flavor because this file uses `module.exports`
const _ = require('underscore');
require('./linkify');

(function() {
  /**
   * Block-Level Grammar
   */

  const block = {
    blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
    code: noop,
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
    fences: noop,
    hr: /^( *[-*_]){3,} *(?:\n+|$)/,
    html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
    list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
    newline: /^\n+/,
    paragraph: /^((?:[^\n]+\n?(?!hr|blockquote|tag|def))+)\n*/,
    text: /^[^\n]+/,
  };

  block.bullet = /(?:[*+-]|\d+\.)/;
  block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
  block.item = replace(block.item, 'gm')(/bull/g, block.bullet)();

  block.list = replace(block.list)(/bull/g, block.bullet)('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')(
    'def',
    '\\n+(?=' + block.def.source + ')' //eslint-disable-line
  )();

  block.blockquote = replace(block.blockquote)('def', block.def)();

  block._tag =
    '(?!(?:' +
    'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code' +
    '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo' +
    '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

  block.html = replace(block.html)('comment', /<!--[\s\S]*?-->/)('closed', /<(tag)[\s\S]+?<\/\1>/)(
    'closing',
    /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/
  )(/tag/g, block._tag)();

  block.paragraph = replace(block.paragraph)('blockquote', block.blockquote)('tag', `<${block._tag}`)(
    'def',
    block.def
  )();

  /**
   * Normal Block Grammar
   */

  block.normal = merge({}, block);

  /**
   * GFM Block Grammar
   */

  block.gfm = merge({}, block.normal, {
    fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
    paragraph: /^/,
  });

  block.gfm.paragraph = replace(block.paragraph)(
    '(?!',
    `(?!${block.gfm.fences.source.replace('\\1', '\\2')}|${block.list.source.replace('\\1', '\\3')}|`
  )();

  /**
   * Block Lexer
   */

  function Lexer(options) {
    this.tokens = [];
    this.tokens.links = {};
    this.options = options || marked.defaults;
    this.rules = block.normal;

    if (this.options.gfm) {
      this.rules = block.gfm;
    }
  }

  /**
   * Expose Block Rules
   */

  Lexer.rules = block;

  /**
   * Static Lex Method
   */

  Lexer.lex = function(src, options) {
    const lexer = new Lexer(options);
    return lexer.lex(src);
  };

  /**
   * Preprocessing
   */

  Lexer.prototype.lex = function(src) {
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n');

    return this.token(src, true);
  };

  /**
   * Lexing
   */

  Lexer.prototype.token = function(src, top, bq) {
    src = src.replace(/^ +$/gm, '');
    let cap;

    while (src) {
      // newline
      if ((cap = this.rules.newline.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[0].length > 1) {
          this.tokens.push({
            type: 'space',
          });
        }
      }

      // code
      if ((cap = this.rules.code.exec(src))) {
        src = src.substring(cap[0].length);
        cap = cap[0].replace(/^ {4}/gm, '');
        this.tokens.push({
          text: !this.options.pedantic ? cap.replace(/\n+$/, '') : cap,
          type: 'code',
        });
        continue;
      }

      // fences (gfm)
      if ((cap = this.rules.fences.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          lang: cap[2],
          text: cap[3] || '',
          type: 'code',
        });
        continue;
      }

      // html
      if ((cap = this.rules.html.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: cap[0],
          type: this.options.sanitize ? 'paragraph' : 'html',
        });
        continue;
      }

      // def
      if (!bq && top && (cap = this.rules.def.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.links[cap[1].toLowerCase()] = {
          href: cap[2],
          title: cap[3],
        };
        continue;
      }

      // top-level paragraph
      if (top && (cap = this.rules.paragraph.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          text: cap[0],
          type: 'paragraph',
        });
        continue;
      }

      // text
      if ((cap = this.rules.text.exec(src))) {
        // Top-level should never reach here.
        src = src.substring(cap[0].length);
        this.tokens.push({
          text: cap[0],
          type: 'text',
        });
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return this.tokens;
  };

  /**
   * Inline-Level Grammar
   */

  const inline = {
    autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
    br: /^ {2,}\n(?!\s*$)/,
    code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
    del: noop,
    em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
    escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
    link: /^!?\[(inside)\]\(href\)/,
    nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
    reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
    strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
    tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
    text: /^[_*` ]|^[\s\S]+?\s(?=[_*`])|^[\s\S]+?(?=[\\<!\[]| {2,}\n|$)/,
    url: noop,
  };

  inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
  inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

  inline.link = replace(inline.link)('inside', inline._inside)('href', inline._href)();

  inline.reflink = replace(inline.reflink)('inside', inline._inside)();

  /**
   * Normal Inline Grammar
   */

  inline.normal = merge({}, inline);

  /**
   * Pedantic Inline Grammar
   */

  inline.pedantic = merge({}, inline.normal, {
    em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
    strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  });

  /**
   * GFM Inline Grammar
   */

  inline.gfm = merge({}, inline.normal, {
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    escape: replace(inline.escape)('])', '~|])')(),
    text: replace(inline.text)(']|', '~]|')('|', '|https?://|')(),
    url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  });

  /**
   * GFM + Line Breaks Inline Grammar
   */

  inline.breaks = merge({}, inline.gfm, {
    br: replace(inline.br)('{2,}', '*')(),
    text: replace(inline.gfm.text)('{2,}', '*')(),
  });

  /**
   * Inline Lexer & Compiler
   */

  function InlineLexer(links, options) {
    this.options = options || marked.defaults;
    this.links = links;
    this.rules = inline.normal;
    this.renderer = this.options.renderer || new Renderer();
    this.renderer.options = this.options;

    if (!this.links) {
      throw new Error('Tokens array requires a `links` property.');
    }

    if (this.options.gfm) {
      this.rules = this.options.breaks ? inline.breaks : inline.gfm;
    } else if (this.options.pedantic) {
      this.rules = inline.pedantic;
    }
  }

  /**
   * Expose Inline Rules
   */

  InlineLexer.rules = inline;

  /**
   * Static Lexing/Compiling Method
   */

  InlineLexer.output = function(src, links, options) {
    const newInline = new InlineLexer(links, options);
    return newInline.output(src);
  };

  /**
   * Lexing/Compiling
   */

  InlineLexer.prototype.output = function(src) {
    let out = '';
    let cap;

    while (src) {
      // escape
      if ((cap = this.rules.escape.exec(src))) {
        src = src.substring(cap[0].length);
        out += cap[1];
        continue;
      }

      // tag
      if ((cap = this.rules.tag.exec(src))) {
        if (!this.inLink && /^<a /i.test(cap[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
          this.inLink = false;
        }
        src = src.substring(cap[0].length);
        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escape(cap[0])
          : cap[0];
        continue;
      }

      // strong
      if ((cap = this.rules.strong.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(this.output(cap[2] || cap[1]));
        continue;
      }

      // em
      if ((cap = this.rules.em.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.em(this.output(cap[2] || cap[1]));
        continue;
      }

      // code
      if ((cap = this.rules.code.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.codespan(escape(cap[2], true));
        continue;
      }

      // br
      if ((cap = this.rules.br.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      if ((cap = linkify.find(src)[0])) {
        const pos = Math.max(0, src.indexOf(cap.value));
        const preString = this.output(src.substring(0, pos));
        if (!/[_*`]$/.test(preString)) {
          src = src.substring(pos + cap.value.length);
          const cleanHref = escape(cap.href);
          const cleanValue = escape(cap.value);
          out +=
            cap.type === 'email'
              ? `${preString}<a href="${cleanHref}" onclick="z.util.SanitizationUtil.safeMailtoOpen(event, '${cleanHref.replace(
                  /^mailto:/,
                  ''
                )}')">${cleanValue}</a>`
              : `${preString}<a href="${cleanHref}" target="_blank" rel="nofollow noopener noreferrer">${cleanValue}</a>`;
          continue;
        }
      }

      // text
      if ((cap = this.rules.text.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.text(escape(this.smartypants(cap[0])));
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return out;
  };

  /**
   * Compile Link
   */

  InlineLexer.prototype.outputLink = function(cap, link) {
    const href = escape(link.href);
    const title = link.title ? escape(link.title) : null;

    return cap[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, cap[1])
      : this.renderer.image(href, title, escape(cap[1]));
  };

  /**
   * Smartypants Transformations
   */

  InlineLexer.prototype.smartypants = function(text) {
    if (!this.options.smartypants) {
      return text;
    }
    return (
      text
        // em-dashes
        .replace(/---/g, '\u2014')
        // en-dashes
        .replace(/--/g, '\u2013')
        // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing singles & apostrophes
        .replace(/'/g, '\u2019')
        // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing doubles
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026')
    );
  };

  /**
   * Mangle Links
   */

  InlineLexer.prototype.mangle = function(text) {
    if (!this.options.mangle) {
      return text;
    }
    let out = '';
    const l = text.length;
    let i = 0;
    let ch;

    for (; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = `x${ch.toString(16)}`;
      }
      out += `&#${ch};`;
    }

    return out;
  };

  /**
   * Renderer
   */

  function Renderer(options) {
    this.options = options || {};
  }

  Renderer.prototype.code = function(code, lang, escaped) {
    code = _.unescape(code);
    code = code.replace(/&#x27;/g, "'");

    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }

    if (!lang) {
      return `<pre><code>${escaped ? code : escape(code, true)}\n</code></pre>`;
    }

    return `<pre><code class="${this.options.langPrefix}${escape(lang, true)}">${
      escaped ? code : escape(code, true)
    }\n</code></pre>\n`;
  };

  Renderer.prototype.blockquote = function(quote) {
    return `<blockquote>\n${quote}</blockquote>\n`;
  };

  Renderer.prototype.html = function(html) {
    return html;
  };

  Renderer.prototype.hr = function() {
    return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
  };

  Renderer.prototype.list = function(body, ordered) {
    const type = ordered ? 'ol' : 'ul';
    return `<${type}>\n${body}</${type}>\n`;
  };

  Renderer.prototype.listitem = function(text) {
    return `<li>${text}</li>\n`;
  };

  Renderer.prototype.paragraph = function(text) {
    return `${text.replace(/\n$/, '')}\n`;
  };

  // span level renderer
  Renderer.prototype.strong = function(text) {
    return `<strong>${text}</strong>`;
  };

  Renderer.prototype.em = function(text) {
    return `<em>${text}</em>`;
  };

  Renderer.prototype.codespan = function(text) {
    return `<code>${text}</code>`;
  };

  Renderer.prototype.br = function() {
    return this.options.xhtml ? '<br/>' : '<br>';
  };

  Renderer.prototype.del = function(text) {
    return `<del>${text}</del>`;
  };

  Renderer.prototype.link = function(href, title, text) {
    if (this.options.sanitize) {
      let prot;
      try {
        prot = decodeURIComponent(unescape(href))
          .replace(/[^\w:]/g, '')
          .toLowerCase();
      } catch (e) {
        return '';
      }
      if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
        return '';
      }
    }
    let out = `<a href="${href}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += ` target="_blank" rel="nofollow noopener noreferrer">${text}</a>`;
    return out;
  };

  Renderer.prototype.image = function(href, title, text) {
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += this.options.xhtml ? '/>' : '>';
    return out;
  };

  Renderer.prototype.text = function(text) {
    return text;
  };

  /**
   * Parsing & Compiling
   */

  function Parser(options) {
    this.tokens = [];
    this.token = null;
    this.options = options || marked.defaults;
    this.options.renderer = this.options.renderer || new Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
  }

  /**
   * Static Parse Method
   */

  Parser.parse = function(src, options, renderer) {
    const parser = new Parser(options, renderer);
    return parser.parse(src);
  };

  /**
   * Parse Loop
   */

  Parser.prototype.parse = function(src) {
    this.inline = new InlineLexer(src.links, this.options, this.renderer);
    this.tokens = src.reverse();

    let out = '';
    while (this.next()) {
      out += this.tok();
    }

    return out;
  };

  /**
   * Next Token
   */

  Parser.prototype.next = function() {
    return (this.token = this.tokens.pop());
  };

  /**
   * Preview Next Token
   */

  Parser.prototype.peek = function() {
    return this.tokens[this.tokens.length - 1] || 0;
  };

  /**
   * Parse Text Tokens
   */

  Parser.prototype.parseText = function() {
    let body = this.token.text;

    while (this.peek().type === 'text') {
      body += `\n${this.next().text}`;
    }

    return this.inline.output(body);
  };

  /**
   * Parse Current Token
   */

  Parser.prototype.tok = function() {
    switch (this.token.type) {
      case 'space': {
        return '';
      }
      case 'hr': {
        return this.renderer.hr();
      }
      case 'code': {
        return this.renderer.code(this.token.text, this.token.lang, this.token.escaped);
      }
      case 'blockquote_start': {
        let body = '';

        while (this.next().type !== 'blockquote_end') {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case 'list_start': {
        let body = '';
        const ordered = this.token.ordered;

        while (this.next().type !== 'list_end') {
          body += this.tok();
        }

        return this.renderer.list(body, ordered);
      }
      case 'list_item_start': {
        let body = '';

        while (this.next().type !== 'list_item_end') {
          body += this.token.type === 'text' ? this.parseText() : this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'loose_item_start': {
        let body = '';

        while (this.next().type !== 'list_item_end') {
          body += this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'html': {
        const html = !this.token.pre && !this.options.pedantic ? this.inline.output(this.token.text) : this.token.text;
        return this.renderer.html(html);
      }
      case 'paragraph': {
        return this.renderer.paragraph(this.inline.output(this.token.text));
      }
      case 'text': {
        return this.renderer.paragraph(this.parseText());
      }
    }
  };

  /**
   * Helpers
   */

  function escape(html, encode) {
    return html
      .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function unescape(html) {
    // explicitly match decimal, hex, and named HTML entities
    return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, (a, n) => {
      n = n.toLowerCase();
      if (n === 'colon') {
        return ':';
      }
      if (n.charAt(0) === '#') {
        return n.charAt(1) === 'x'
          ? String.fromCharCode(parseInt(n.substring(2), 16))
          : String.fromCharCode(+n.substring(1));
      }
      return '';
    });
  }

  function replace(regex, opt) {
    regex = regex.source;
    opt = opt || '';
    return function self(name, val) {
      if (!name) {
        return new RegExp(regex, opt);
      }
      val = val.source || val;
      val = val.replace(/(^|[^\[])\^/g, '$1');
      regex = regex.replace(name, val);
      return self;
    };
  }

  function noop() {}
  noop.exec = noop;

  function merge(obj) {
    let i = 1;
    let target;
    let key;

    for (; i < arguments.length; i++) {
      target = arguments[i];
      for (key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
          obj[key] = target[key];
        }
      }
    }

    return obj;
  }

  /**
   * Marked
   */

  function marked(src, opt, callback) {
    if (callback || typeof opt === 'function') {
      if (!callback) {
        callback = opt;
        opt = null;
      }

      opt = merge({}, marked.defaults, opt || {});

      const highlight = opt.highlight;
      let tokens;
      let pending;
      let i = 0;

      try {
        tokens = Lexer.lex(src, opt);
      } catch (e) {
        return callback(e);
      }

      pending = tokens.length;

      const done = function(err) {
        if (err) {
          opt.highlight = highlight;
          return callback(err);
        }

        let out;

        try {
          out = Parser.parse(tokens, opt);
        } catch (e) {
          err = e;
        }

        opt.highlight = highlight;

        return err ? callback(err) : callback(null, out);
      };

      if (!highlight || highlight.length < 3) {
        return done();
      }

      delete opt.highlight;

      if (!pending) {
        return done();
      }

      for (; i < tokens.length; i++) {
        (function(token) {
          if (token.type !== 'code') {
            return --pending || done();
          }
          return highlight(token.text, token.lang, (err, code) => {
            if (err) {
              return done(err);
            }
            if (code == null || code === token.text) {
              return --pending || done();
            }
            token.text = code;
            token.escaped = true;
            return --pending || done();
          });
        })(tokens[i]);
      }

      return;
    }

    try {
      if (opt) {
        opt = merge({}, marked.defaults, opt);
      }
      return Parser.parse(Lexer.lex(src, opt), opt);
    } catch (e) {
      e.message += '\nPlease report this to https://github.com/chjj/marked.';
      if ((opt || marked.defaults).silent) {
        return `<p>An error occured:</p><pre>${escape(`${e.message}`, true)}</pre>`;
      }
      throw e;
    }
  }

  /**
   * Options
   */

  marked.options = marked.setOptions = function(opt) {
    merge(marked.defaults, opt);
    return marked;
  };

  marked.defaults = {
    breaks: false,
    gfm: true,
    headerPrefix: '',
    highlight: null,
    langPrefix: 'lang-',
    mangle: true,
    pedantic: false,
    renderer: new Renderer(),
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartLists: false,
    smartypants: false,
    xhtml: false,
  };

  /**
   * Expose
   */

  marked.Parser = Parser;
  marked.parser = Parser.parse;

  marked.Renderer = Renderer;

  marked.Lexer = Lexer;
  marked.lexer = Lexer.lex;

  marked.InlineLexer = InlineLexer;
  marked.inlineLexer = InlineLexer.output;

  marked.parse = marked;

  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = marked;
  } else if (typeof define === 'function' && define.amd) {
    define(() => {
      return marked;
    });
  } else {
    this.marked = marked;
  }
}.call(
  (function() {
    return this || (typeof window !== 'undefined' ? window : global);
  })()
));
