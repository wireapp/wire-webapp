/* eslint-disable */
'use strict';

(function(window, linkify) {
  const linkifyHtml = (function(linkify) {
    'use strict';

    const HTML5NamedCharRefs = {
      // We don't need the complete named character reference because linkifyHtml
      // does not modify the escape sequences. We do need &nbsp; so that
      // whitespace is parsed properly. Other types of whitespace should already
      // be accounted for
      nbsp: '\xA0',
    };

    function EntityParser(named) {
      this.named = named;
    }

    const HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
    const CHARCODE = /^#([0-9]+)$/;
    const NAMED = /^([A-Za-z0-9]+)$/;

    EntityParser.prototype.parse = function(entity) {
      if (!entity) {
        return;
      }
      let matches = entity.match(HEXCHARCODE);
      if (matches) {
        return `&#x${matches[1]};`;
      }
      matches = entity.match(CHARCODE);
      if (matches) {
        return `&#${matches[1]};`;
      }
      matches = entity.match(NAMED);
      if (matches) {
        return this.named[matches[1]] || `&${matches[1]};`;
      }
    };

    const WSP = /[\t\n\f ]/;
    const ALPHA = /[A-Za-z]/;
    const CRLF = /\r\n?/g;

    function isSpace(char) {
      return WSP.test(char);
    }

    function isAlpha(char) {
      return ALPHA.test(char);
    }

    function preprocessInput(input) {
      return input.replace(CRLF, '\n');
    }

    function EventedTokenizer(delegate, entityParser) {
      this.delegate = delegate;
      this.entityParser = entityParser;

      this.state = null;
      this.input = null;

      this.index = -1;
      this.line = -1;
      this.column = -1;
      this.tagLine = -1;
      this.tagColumn = -1;

      this.reset();
    }

    EventedTokenizer.prototype = {
      reset: function reset() {
        this.state = 'beforeData';
        this.input = '';

        this.index = 0;
        this.line = 1;
        this.column = 0;

        this.tagLine = -1;
        this.tagColumn = -1;

        this.delegate.reset();
      },

      tokenize: function tokenize(input) {
        this.reset();
        this.tokenizePart(input);
        this.tokenizeEOF();
      },

      tokenizePart: function tokenizePart(input) {
        this.input += preprocessInput(input);

        while (this.index < this.input.length) {
          this.states[this.state].call(this);
        }
      },

      tokenizeEOF: function tokenizeEOF() {
        this.flushData();
      },

      flushData: function flushData() {
        if (this.state === 'data') {
          this.delegate.finishData();
          this.state = 'beforeData';
        }
      },

      peek: function peek() {
        return this.input.charAt(this.index);
      },

      consume: function consume() {
        const char = this.peek();

        this.index++;

        if (char === '\n') {
          this.line++;
          this.column = 0;
        } else {
          this.column++;
        }

        return char;
      },

      consumeCharRef: function consumeCharRef() {
        const endIndex = this.input.indexOf(';', this.index);
        if (endIndex === -1) {
          return;
        }
        const entity = this.input.slice(this.index, endIndex);
        const chars = this.entityParser.parse(entity);
        if (chars) {
          let count = entity.length;
          // consume the entity chars
          while (count) {
            this.consume();
            count--;
          }
          // consume the `;`
          this.consume();

          return chars;
        }
      },

      markTagStart: function markTagStart() {
        // these properties to be removed in next major bump
        this.tagLine = this.line;
        this.tagColumn = this.column;

        if (this.delegate.tagOpen) {
          this.delegate.tagOpen();
        }
      },

      states: {
        beforeData: function beforeData() {
          const char = this.peek();

          if (char === '<') {
            this.state = 'tagOpen';
            this.markTagStart();
            this.consume();
          } else {
            this.state = 'data';
            this.delegate.beginData();
          }
        },

        data: function data() {
          const char = this.peek();

          if (char === '<') {
            this.delegate.finishData();
            this.state = 'tagOpen';
            this.markTagStart();
            this.consume();
          } else if (char === '&') {
            this.consume();
            this.delegate.appendToData(this.consumeCharRef() || '&');
          } else {
            this.consume();
            this.delegate.appendToData(char);
          }
        },

        tagOpen: function tagOpen() {
          const char = this.consume();

          if (char === '!') {
            this.state = 'markupDeclaration';
          } else if (char === '/') {
            this.state = 'endTagOpen';
          } else if (isAlpha(char)) {
            this.state = 'tagName';
            this.delegate.beginStartTag();
            this.delegate.appendToTagName(char.toLowerCase());
          }
        },

        markupDeclaration: function markupDeclaration() {
          const char = this.consume();

          if (char === '-' && this.input.charAt(this.index) === '-') {
            this.consume();
            this.state = 'commentStart';
            this.delegate.beginComment();
          }
        },

        commentStart: function commentStart() {
          const char = this.consume();

          if (char === '-') {
            this.state = 'commentStartDash';
          } else if (char === '>') {
            this.delegate.finishComment();
            this.state = 'beforeData';
          } else {
            this.delegate.appendToCommentData(char);
            this.state = 'comment';
          }
        },

        commentStartDash: function commentStartDash() {
          const char = this.consume();

          if (char === '-') {
            this.state = 'commentEnd';
          } else if (char === '>') {
            this.delegate.finishComment();
            this.state = 'beforeData';
          } else {
            this.delegate.appendToCommentData('-');
            this.state = 'comment';
          }
        },

        comment: function comment() {
          const char = this.consume();

          if (char === '-') {
            this.state = 'commentEndDash';
          } else {
            this.delegate.appendToCommentData(char);
          }
        },

        commentEndDash: function commentEndDash() {
          const char = this.consume();

          if (char === '-') {
            this.state = 'commentEnd';
          } else {
            this.delegate.appendToCommentData(`-${char}`);
            this.state = 'comment';
          }
        },

        commentEnd: function commentEnd() {
          const char = this.consume();

          if (char === '>') {
            this.delegate.finishComment();
            this.state = 'beforeData';
          } else {
            this.delegate.appendToCommentData(`--${char}`);
            this.state = 'comment';
          }
        },

        tagName: function tagName() {
          const char = this.consume();

          if (isSpace(char)) {
            this.state = 'beforeAttributeName';
          } else if (char === '/') {
            this.state = 'selfClosingStartTag';
          } else if (char === '>') {
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.delegate.appendToTagName(char);
          }
        },

        beforeAttributeName: function beforeAttributeName() {
          const char = this.peek();

          if (isSpace(char)) {
            this.consume();
          } else if (char === '/') {
            this.state = 'selfClosingStartTag';
            this.consume();
          } else if (char === '>') {
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.state = 'attributeName';
            this.delegate.beginAttribute();
            this.consume();
            this.delegate.appendToAttributeName(char);
          }
        },

        attributeName: function attributeName() {
          const char = this.peek();

          if (isSpace(char)) {
            this.state = 'afterAttributeName';
            this.consume();
          } else if (char === '/') {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.state = 'selfClosingStartTag';
          } else if (char === '=') {
            this.state = 'beforeAttributeValue';
            this.consume();
          } else if (char === '>') {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.consume();
            this.delegate.appendToAttributeName(char);
          }
        },

        afterAttributeName: function afterAttributeName() {
          const char = this.peek();

          if (isSpace(char)) {
            this.consume();
          } else if (char === '/') {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.state = 'selfClosingStartTag';
          } else if (char === '=') {
            this.consume();
            this.state = 'beforeAttributeValue';
          } else if (char === '>') {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.state = 'attributeName';
            this.delegate.beginAttribute();
            this.delegate.appendToAttributeName(char);
          }
        },

        beforeAttributeValue: function beforeAttributeValue() {
          const char = this.peek();

          if (isSpace(char)) {
            this.consume();
          } else if (char === '"') {
            this.state = 'attributeValueDoubleQuoted';
            this.delegate.beginAttributeValue(true);
            this.consume();
          } else if (char === "'") {
            this.state = 'attributeValueSingleQuoted';
            this.delegate.beginAttributeValue(true);
            this.consume();
          } else if (char === '>') {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.state = 'attributeValueUnquoted';
            this.delegate.beginAttributeValue(false);
            this.consume();
            this.delegate.appendToAttributeValue(char);
          }
        },

        attributeValueDoubleQuoted: function attributeValueDoubleQuoted() {
          const char = this.consume();

          if (char === '"') {
            this.delegate.finishAttributeValue();
            this.state = 'afterAttributeValueQuoted';
          } else if (char === '&') {
            this.delegate.appendToAttributeValue(this.consumeCharRef('"') || '&');
          } else {
            this.delegate.appendToAttributeValue(char);
          }
        },

        attributeValueSingleQuoted: function attributeValueSingleQuoted() {
          const char = this.consume();

          if (char === "'") {
            this.delegate.finishAttributeValue();
            this.state = 'afterAttributeValueQuoted';
          } else if (char === '&') {
            this.delegate.appendToAttributeValue(this.consumeCharRef("'") || '&');
          } else {
            this.delegate.appendToAttributeValue(char);
          }
        },

        attributeValueUnquoted: function attributeValueUnquoted() {
          const char = this.peek();

          if (isSpace(char)) {
            this.delegate.finishAttributeValue();
            this.consume();
            this.state = 'beforeAttributeName';
          } else if (char === '&') {
            this.consume();
            this.delegate.appendToAttributeValue(this.consumeCharRef('>') || '&');
          } else if (char === '>') {
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.consume();
            this.delegate.appendToAttributeValue(char);
          }
        },

        afterAttributeValueQuoted: function afterAttributeValueQuoted() {
          const char = this.peek();

          if (isSpace(char)) {
            this.consume();
            this.state = 'beforeAttributeName';
          } else if (char === '/') {
            this.consume();
            this.state = 'selfClosingStartTag';
          } else if (char === '>') {
            this.consume();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.state = 'beforeAttributeName';
          }
        },

        selfClosingStartTag: function selfClosingStartTag() {
          const char = this.peek();

          if (char === '>') {
            this.consume();
            this.delegate.markTagAsSelfClosing();
            this.delegate.finishTag();
            this.state = 'beforeData';
          } else {
            this.state = 'beforeAttributeName';
          }
        },

        endTagOpen: function endTagOpen() {
          const char = this.consume();

          if (isAlpha(char)) {
            this.state = 'tagName';
            this.delegate.beginEndTag();
            this.delegate.appendToTagName(char.toLowerCase());
          }
        },
      },
    };

    function Tokenizer(entityParser, options) {
      this.token = null;
      this.startLine = 1;
      this.startColumn = 0;
      this.options = options || {};
      this.tokenizer = new EventedTokenizer(this, entityParser);
    }

    Tokenizer.prototype = {
      tokenize: function tokenize(input) {
        this.tokens = [];
        this.tokenizer.tokenize(input);
        return this.tokens;
      },

      tokenizePart: function tokenizePart(input) {
        this.tokens = [];
        this.tokenizer.tokenizePart(input);
        return this.tokens;
      },

      tokenizeEOF: function tokenizeEOF() {
        this.tokens = [];
        this.tokenizer.tokenizeEOF();
        return this.tokens[0];
      },

      reset: function reset() {
        this.token = null;
        this.startLine = 1;
        this.startColumn = 0;
      },

      addLocInfo: function addLocInfo() {
        if (this.options.loc) {
          this.token.loc = {
            start: {
              line: this.startLine,
              column: this.startColumn,
            },
            end: {
              line: this.tokenizer.line,
              column: this.tokenizer.column,
            },
          };
        }
        this.startLine = this.tokenizer.line;
        this.startColumn = this.tokenizer.column;
      },

      // Data

      beginData: function beginData() {
        this.token = {
          type: 'Chars',
          chars: '',
        };
        this.tokens.push(this.token);
      },

      appendToData: function appendToData(char) {
        this.token.chars += char;
      },

      finishData: function finishData() {
        this.addLocInfo();
      },

      // Comment

      beginComment: function beginComment() {
        this.token = {
          type: 'Comment',
          chars: '',
        };
        this.tokens.push(this.token);
      },

      appendToCommentData: function appendToCommentData(char) {
        this.token.chars += char;
      },

      finishComment: function finishComment() {
        this.addLocInfo();
      },

      // Tags - basic

      beginStartTag: function beginStartTag() {
        this.token = {
          type: 'StartTag',
          tagName: '',
          attributes: [],
          selfClosing: false,
        };
        this.tokens.push(this.token);
      },

      beginEndTag: function beginEndTag() {
        this.token = {
          type: 'EndTag',
          tagName: '',
        };
        this.tokens.push(this.token);
      },

      finishTag: function finishTag() {
        this.addLocInfo();
      },

      markTagAsSelfClosing: function markTagAsSelfClosing() {
        this.token.selfClosing = true;
      },

      // Tags - name

      appendToTagName: function appendToTagName(char) {
        this.token.tagName += char;
      },

      // Tags - attributes

      beginAttribute: function beginAttribute() {
        this._currentAttribute = ['', '', null];
        this.token.attributes.push(this._currentAttribute);
      },

      appendToAttributeName: function appendToAttributeName(char) {
        this._currentAttribute[0] += char;
      },

      beginAttributeValue: function beginAttributeValue(isQuoted) {
        this._currentAttribute[2] = isQuoted;
      },

      appendToAttributeValue: function appendToAttributeValue(char) {
        this._currentAttribute[1] = this._currentAttribute[1] || '';
        this._currentAttribute[1] += char;
      },

      finishAttributeValue: function finishAttributeValue() {},
    };

    function tokenize$1(input, options) {
      const tokenizer = new Tokenizer(new EntityParser(HTML5NamedCharRefs), options);
      return tokenizer.tokenize(input);
    }

    const HTML5Tokenizer = {
      HTML5NamedCharRefs: HTML5NamedCharRefs,
      EntityParser: EntityParser,
      EventedTokenizer: EventedTokenizer,
      Tokenizer: Tokenizer,
      tokenize: tokenize$1,
    };

    const options = linkify.options;
    const Options = options.Options;

    const StartTag = 'StartTag';
    const EndTag = 'EndTag';
    const Chars = 'Chars';
    const Comment = 'Comment';

    /**
    	`tokens` and `token` in this section refer to tokens generated by the HTML
    	parser.
    */
    function linkifyHtml(str) {
      let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      const tokens = HTML5Tokenizer.tokenize(str);
      const linkifiedTokens = [];
      const linkified = [];
      let i;

      opts = new Options(opts);

      // Linkify the tokens given by the parser
      for (i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === StartTag) {
          linkifiedTokens.push(token);

          // Ignore all the contents of ignored tags
          const tagName = token.tagName.toUpperCase();
          const isIgnored = tagName === 'A' || options.contains(opts.ignoreTags, tagName);
          if (!isIgnored) {
            continue;
          }

          const preskipLen = linkifiedTokens.length;
          skipTagTokens(tagName, tokens, ++i, linkifiedTokens);
          i += linkifiedTokens.length - preskipLen - 1;
          continue;
        } else if (token.type !== Chars) {
          // Skip this token, it's not important
          linkifiedTokens.push(token);
          continue;
        }

        // Valid text token, linkify it!
        const linkifedChars = linkifyChars(token.chars, opts);
        linkifiedTokens.push(...linkifedChars);
      }

      // Convert the tokens back into a string
      for (i = 0; i < linkifiedTokens.length; i++) {
        const _token = linkifiedTokens[i];
        switch (_token.type) {
          case StartTag: {
            let link = `<${_token.tagName}`;
            if (_token.attributes.length > 0) {
              const attrs = attrsToStrings(_token.attributes);
              link += ` ${attrs.join(' ')}`;
            }
            link += '>';
            linkified.push(link);
            break;
          }
          case EndTag:
            linkified.push(`</${_token.tagName}>`);
            break;
          case Chars:
            linkified.push(escapeText(_token.chars));
            break;
          case Comment:
            linkified.push(`<!--${escapeText(_token.chars)}-->`);
            break;
        }
      }

      return linkified.join('');
    }

    /**
    	`tokens` and `token` in this section referes to tokens returned by
    	`linkify.tokenize`. `linkified` will contain HTML Parser-style tokens
    */
    function linkifyChars(str, opts) {
      const tokens = linkify.tokenize(str);
      const result = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'nl' && opts.nl2br) {
          result.push({
            type: StartTag,
            tagName: 'br',
            attributes: [],
            selfClosing: true,
          });
          continue;
        } else if (!token.isLink || !opts.check(token)) {
          result.push({type: Chars, chars: token.toString()});
          continue;
        }

        const _opts$resolve = opts.resolve(token);

        const formatted = _opts$resolve.formatted;

        const formattedHref = _opts$resolve.formattedHref;

        const tagName = _opts$resolve.tagName;

        const className = _opts$resolve.className;

        const target = _opts$resolve.target;

        const attributes = _opts$resolve.attributes;

        // Build up attributes

        const attributeArray = [['href', formattedHref]];

        if (className) {
          attributeArray.push(['class', className]);
        }

        if (target) {
          attributeArray.push(['target', target]);
        }

        for (const attr in attributes) {
          attributeArray.push([attr, attributes[attr]]);
        }

        // Add the required tokens
        result.push({
          type: StartTag,
          tagName: tagName,
          attributes: attributeArray,
          selfClosing: false,
        });
        result.push({type: Chars, chars: formatted});
        result.push({type: EndTag, tagName: tagName});
      }

      return result;
    }

    /**
    	Returns a list of tokens skipped until the closing tag of tagName.

    	* `tagName` is the closing tag which will prompt us to stop skipping
    	* `tokens` is the array of tokens generated by HTML5Tokenizer which
    	* `i` is the index immediately after the opening tag to skip
    	* `skippedTokens` is an array which skipped tokens are being pushed into

    	Caveats

    	* Assumes that i is the first token after the given opening tagName
    	* The closing tag will be skipped, but nothing after it
    	* Will track whether there is a nested tag of the same type
    */
    function skipTagTokens(tagName, tokens, i, skippedTokens) {
      // number of tokens of this type on the [fictional] stack
      let stackCount = 1;

      while (i < tokens.length && stackCount > 0) {
        const token = tokens[i];

        if (token.type === StartTag && token.tagName.toUpperCase() === tagName) {
          // Nested tag of the same type, "add to stack"
          stackCount++;
        } else if (token.type === EndTag && token.tagName.toUpperCase() === tagName) {
          // Closing tag
          stackCount--;
        }

        skippedTokens.push(token);
        i++;
      }

      // Note that if stackCount > 0 here, the HTML is probably invalid
      return skippedTokens;
    }

    function escapeText(text) {
      // Not required, HTML tokenizer ensures this occurs properly
      return text;
    }

    function escapeAttr(attr) {
      return attr.replace(/"/g, '&quot;');
    }

    function attrsToStrings(attrs) {
      const attrStrs = [];
      for (let i = 0; i < attrs.length; i++) {
        const _attrs$i = attrs[i];

        const name = _attrs$i[0];

        const value = _attrs$i[1];

        attrStrs.push(`${name}="${escapeAttr(value)}"`);
      }
      return attrStrs;
    }

    return linkifyHtml;
  })(linkify);

  window.linkifyHtml = linkifyHtml;
})(window, linkify);
