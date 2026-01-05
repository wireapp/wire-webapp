import * as fs from 'fs';
import * as path from 'path';
function getDefaultExportFromCjs(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, 'default') ? e.default : e;
}
var logdown_min = {exports: {}},
  hasRequiredLogdown_min;
function requireLogdown_min() {
  return (
    hasRequiredLogdown_min ||
      ((hasRequiredLogdown_min = 1),
      (function (module, exports$1) {
        (function (e, t) {
          module.exports = t();
        })(window, function () {
          return (function (e) {
            var t = {};
            function r(n) {
              if (t[n]) return t[n].exports;
              var a = (t[n] = {i: n, l: !1, exports: {}});
              return (e[n].call(a.exports, a, a.exports, r), (a.l = !0), a.exports);
            }
            return (
              (r.m = e),
              (r.c = t),
              (r.d = function (n, a, i) {
                r.o(n, a) || Object.defineProperty(n, a, {enumerable: !0, get: i});
              }),
              (r.r = function (n) {
                (typeof Symbol < 'u' &&
                  Symbol.toStringTag &&
                  Object.defineProperty(n, Symbol.toStringTag, {value: 'Module'}),
                  Object.defineProperty(n, '__esModule', {value: !0}));
              }),
              (r.t = function (n, a) {
                if ((1 & a && (n = r(n)), 8 & a || (4 & a && typeof n == 'object' && n && n.__esModule))) return n;
                var i = /* @__PURE__ */ Object.create(null);
                if (
                  (r.r(i),
                  Object.defineProperty(i, 'default', {enumerable: !0, value: n}),
                  2 & a && typeof n != 'string')
                )
                  for (var o in n)
                    r.d(
                      i,
                      o,
                      function (s) {
                        return n[s];
                      }.bind(null, o),
                    );
                return i;
              }),
              (r.n = function (n) {
                var a =
                  n && n.__esModule
                    ? function () {
                        return n.default;
                      }
                    : function () {
                        return n;
                      };
                return (r.d(a, 'a', a), a);
              }),
              (r.o = function (n, a) {
                return Object.prototype.hasOwnProperty.call(n, a);
              }),
              (r.p = ''),
              r((r.s = 0))
            );
          })([
            function (e, t, r) {
              var n,
                a = r(1)(),
                i = r(3),
                o = r(5),
                s = r(8)();
              ((a.prefixColors = ['#F2777A', '#F99157', '#FFCC66', '#99CC99', '#66CCCC', '#6699CC', '#CC99CC']),
                (a._setPrefixRegExps = function () {
                  try {
                    s.localStorage &&
                      typeof s.localStorage.getItem('debug') == 'string' &&
                      ((a._prefixRegExps = []),
                      s.localStorage
                        .getItem('debug')
                        .split(',')
                        .forEach(function (c) {
                          var u = 'enable';
                          (c = c.trim())[0] === '-' && ((c = c.substr(1)), (u = 'disable'));
                          var d = a._prepareRegExpForPrefixSearch(c);
                          a._prefixRegExps.push({type: u, regExp: d});
                        }));
                  } catch {}
                }),
                (a._getNextPrefixColor =
                  ((n = 0),
                  function () {
                    return ((n += 1), a.prefixColors[n % a.prefixColors.length]);
                  })),
                (a.prototype._getDecoratedPrefix = function () {
                  var c = [];
                  return (
                    o()
                      ? (c.push('%c' + this.opts.prefix + '%c '),
                        c.push('color:' + this.opts.prefixColor + '; font-weight:bold;', ''))
                      : c.push('[' + this.opts.prefix + '] '),
                    c
                  );
                }),
                (a.prototype._prepareOutput = function (c) {
                  var u,
                    d = this._getDecoratedPrefix();
                  return (
                    typeof c[0] == 'string'
                      ? this.opts.markdown && o()
                        ? ((u = i.parse(c[0])), (d[0] = d[0] + u.text), (d = d.concat(u.styles)))
                        : (d[0] = d[0] + c[0])
                      : d.push(c[0]),
                    1 < c.length && (d = d.concat(c.slice(1))),
                    d
                  );
                }),
                a._setPrefixRegExps(),
                (e.exports = a));
            },
            function (e, t, r) {
              var n = r(2);
              e.exports = function () {
                function a(i, o) {
                  return this instanceof a
                    ? a._isPrefixAlreadyInUse(i)
                      ? a._getInstanceByPrefix(i)
                      : ((this.opts = a._normalizeOpts(i, o)),
                        (this.state = a._getInitialState(this.opts)),
                        a._decorateLoggerMethods(this),
                        a._instances.push(this),
                        this)
                    : new a(i, o);
                }
                return (
                  (a.transports = []),
                  (a._instances = []),
                  (a._prefixRegExps = []),
                  (a._prepareRegExpForPrefixSearch = function (i) {
                    return new RegExp('^' + i.replace(/\*/g, '.*?') + '$');
                  }),
                  (a._isPrefixAlreadyInUse = function (i) {
                    return a._instances.some(function (o) {
                      return o.opts.prefix === i;
                    });
                  }),
                  (a._getInstanceByPrefix = function (i) {
                    return a._instances.filter(function (o) {
                      return o.opts.prefix === i;
                    })[0];
                  }),
                  (a._normalizeOpts = function (i, o) {
                    if (typeof i != 'string') throw new TypeError('prefix must be a string');
                    var s = (o = o || {}).markdown === void 0 || !!o.markdown,
                      c = o.prefixColor || a._getNextPrefixColor();
                    return {
                      logger: o.logger || console,
                      markdown: s,
                      plaintext: !!o.plaintext,
                      prefix: i,
                      prefixColor: c,
                    };
                  }),
                  (a._getInitialState = function (i) {
                    return {isEnabled: a._getEnableState(i)};
                  }),
                  (a._getEnableState = function (i) {
                    var o = !1;
                    return (
                      a._prefixRegExps.forEach(function (s) {
                        s.type === 'enable' && s.regExp.test(i.prefix)
                          ? (o = !0)
                          : s.type === 'disable' && s.regExp.test(i.prefix) && (o = !1);
                      }),
                      o
                    );
                  }),
                  (a._decorateLoggerMethods = function (i) {
                    var o = i.opts.logger,
                      s = Object.keys(o).filter(function (c) {
                        return typeof o[c] == 'function';
                      });
                    (s.length === 0 && (s = ['debug', 'log', 'warn', 'error', 'info']),
                      s.forEach(function (c) {
                        i[c] = function () {
                          var u = n(arguments),
                            d = this.opts.prefix;
                          if (a.transports.length) {
                            var f =
                              '[' +
                              d +
                              '] ' +
                              u
                                .filter(function (p) {
                                  return typeof p != 'object';
                                })
                                .join(' ');
                            a.transports.forEach(
                              function (p) {
                                p({state: this.state, instance: d, level: c, args: u, msg: f});
                              }.bind(this),
                            );
                          }
                          if (this.state.isEnabled) {
                            var l = this._prepareOutput(u, c);
                            o[c].apply(o, l);
                          }
                        };
                      }));
                  }),
                  a
                );
              };
            },
            function (e, t) {
              e.exports = function (r) {
                return Array.prototype.slice.call(r, 0);
              };
            },
            function (e, t, r) {
              var n = [];
              function a(o) {
                return function (s) {
                  return (n.push(o), n.push(''), '%c' + s + '%c');
                };
              }
              var i = new (r(4))({
                renderer: {
                  '*': a('font-weight:bold;'),
                  _: a('font-style:italic;'),
                  '`': a('background-color:rgba(255,204,102, 0.1);color:#FFCC66;padding:2px 5px;border-radius:2px;'),
                },
              });
              e.exports = {
                parse: function (o) {
                  var s = {text: i.parse(o), styles: [].concat(n)};
                  return ((n.length = 0), s);
                },
              };
            },
            function (e, t) {
              var r = /([_*`\\]|[^_*`\\]+)/g,
                n = /[_*`]/;
              function a(o) {
                this.renderer = o.renderer;
              }
              function i(o) {
                return n.test(o);
              }
              ((a.prototype.parse = function (o) {
                if (o === '') return '';
                var s,
                  c,
                  u,
                  d = o.match(r),
                  f = this.renderer,
                  l = '',
                  p = [],
                  g = {},
                  v = 0;
                function m(y) {
                  for (var I = ''; s && s.tag !== y; ) ((I = s.tag + s.text + I), (g[s.tag] = !1), (s = p.pop()));
                  return I;
                }
                for (; (u = d[v]); ) {
                  if (((c = ''), v++, i(u)))
                    if (g[u]) ((c = m(u)), (c = f[s.tag](s.text + c)), (g[u] = !1), (s = p.pop()));
                    else {
                      var h = '';
                      if (u === '`') {
                        var S = d.indexOf(u, v);
                        S !== -1 && ((l += m()), (h = d.slice(v, S).join('')), (v = S));
                      }
                      (s && p.push(s), (g[u] = !0), (s = {tag: u, text: h}));
                    }
                  else if ((c = u) === '\\') {
                    var E = d[v];
                    (i(E) || E === '\\') && ((c = E), v++);
                  }
                  c && (s ? (s.text += c) : (l += c), (c = ''));
                }
                return l + m();
              }),
                (e.exports = a));
            },
            function (e, t, r) {
              var n = r(6),
                a = r(7);
              e.exports = function () {
                return n() || a();
              };
            },
            function (e, t) {
              e.exports = function () {
                try {
                  return 'WebkitAppearance' in document.documentElement.style && !/Edge/.test(navigator.userAgent);
                } catch {
                  return !1;
                }
              };
            },
            function (e, t) {
              e.exports = function () {
                try {
                  return /firefox\/(\d+)/i.test(navigator.userAgent);
                } catch {
                  return !1;
                }
              };
            },
            function (e, t, r) {
              (function (n) {
                function a(i, o) {
                  return (
                    (typeof i == 'object' && i.self === i && i) || (typeof o == 'object' && o.global === o && o) || this
                  );
                }
                ((e.exports = a.bind(this, self, n)), (e.exports.getGlobal = a));
              }).call(this, r(9));
            },
            function (ob, pb) {
              var qb;
              qb = /* @__PURE__ */ (function () {
                return this;
              })();
              try {
                qb = qb || Function('return this')() || eval('this');
              } catch (e) {
                typeof window == 'object' && (qb = window);
              }
              ob.exports = qb;
            },
          ]);
        });
      })(logdown_min)),
    logdown_min.exports
  );
}
var logdown_minExports = requireLogdown_min();
const logdown = /* @__PURE__ */ getDefaultExportFromCjs(logdown_minExports),
  version = '1.0.0',
  updated = '2025-12-29T17:01:02.545Z',
  recognizers = [
    {
      name: 'Credit Card Recognizer',
      supported_language: 'all',
      supported_entity: 'CREDIT_CARD',
      patterns: [
        {
          name: 'Credit Card (Medium)',
          regex:
            '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})\\b',
          score: 0.8,
        },
      ],
    },
    {
      name: 'Email Recognizer',
      supported_language: 'all',
      supported_entity: 'EMAIL_ADDRESS',
      patterns: [{name: 'Email (Medium)', regex: '[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}', score: 0.5}],
    },
    {
      name: 'Phone Number Recognizer',
      supported_language: 'all',
      supported_entity: 'PHONE_NUMBER',
      patterns: [{name: 'Phone Number (Weak)', regex: '\\+?[\\d\\s\\-\\(\\)]{10,}', score: 0.4}],
    },
    {
      name: 'IP Address Recognizer (IPv4)',
      supported_language: 'all',
      supported_entity: 'IP_ADDRESS',
      patterns: [{name: 'IPv4 Address', regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', score: 0.6}],
    },
    {
      name: 'IP Address Recognizer (IPv6)',
      supported_language: 'all',
      supported_entity: 'IP_ADDRESS',
      patterns: [
        {
          name: 'IPv6 Address',
          regex:
            '(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7})',
          score: 0.7,
        },
      ],
    },
    {
      name: 'IBAN Recognizer',
      supported_language: 'all',
      supported_entity: 'IBAN_CODE',
      patterns: [
        {
          name: 'IBAN (Medium)',
          regex:
            '\\b[A-Z]{2}\\d{2}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{0,4}[ ]?[A-Z0-9]{0,4}\\b',
          score: 0.7,
        },
      ],
    },
    {
      name: 'URL Recognizer',
      supported_language: 'all',
      supported_entity: 'URL',
      patterns: [{name: 'URL (Medium)', regex: `https?://[^\\s'"]+`, score: 0.5}],
    },
    {
      name: 'Crypto Wallet Recognizer',
      supported_language: 'all',
      supported_entity: 'CRYPTO',
      patterns: [{name: 'Bitcoin Address', regex: '\\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\\b', score: 0.7}],
    },
    {
      name: 'US SSN Recognizer',
      supported_language: 'en',
      supported_entity: 'US_SSN',
      patterns: [{name: 'SSN (Medium)', regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b', score: 0.8}],
    },
    {
      name: 'US Passport Recognizer',
      supported_language: 'en',
      supported_entity: 'US_PASSPORT',
      patterns: [{name: 'US Passport', regex: '\\b[A-Z]{1,2}[0-9]{6,9}\\b', score: 0.4}],
    },
    {
      name: 'UK NHS Number Recognizer',
      supported_language: 'en',
      supported_entity: 'UK_NHS',
      patterns: [{name: 'NHS Number', regex: '\\b\\d{3}[ -]?\\d{3}[ -]?\\d{4}\\b', score: 0.5}],
    },
    {
      name: 'German Tax ID Recognizer',
      supported_language: 'de',
      supported_entity: 'DE_TAX_ID',
      patterns: [{name: 'German Tax ID', regex: '\\b\\d{11}\\b', score: 0.6}],
    },
    {
      name: 'German VAT ID Recognizer',
      supported_language: 'de',
      supported_entity: 'DE_VAT_ID',
      patterns: [{name: 'German VAT ID', regex: '\\bDE\\d{9}\\b', score: 0.8}],
    },
    {
      name: 'Austrian VAT ID Recognizer',
      supported_language: 'de',
      supported_entity: 'AT_VAT_ID',
      patterns: [{name: 'Austrian VAT ID', regex: '\\bATU\\d{8}\\b', score: 0.8}],
    },
    {
      name: 'Swiss VAT ID Recognizer',
      supported_language: 'de',
      supported_entity: 'CH_VAT_ID',
      patterns: [{name: 'Swiss VAT ID', regex: '\\bCHE-\\d{3}\\.\\d{3}\\.\\d{3}\\b', score: 0.8}],
    },
    {
      name: 'Swiss AHV Number Recognizer',
      supported_language: 'de',
      supported_entity: 'CH_AHV',
      patterns: [{name: 'Swiss AHV Number', regex: '\\b756\\.\\d{4}\\.\\d{4}\\.\\d{2}\\b', score: 0.9}],
    },
    {
      name: 'German License Plate Recognizer',
      supported_language: 'de',
      supported_entity: 'DE_LICENSE_PLATE',
      patterns: [
        {name: 'German License Plate', regex: '\\b[A-ZÖÜÄ]{1,3}-[A-ZÖÜÄ]{1,2}\\s?\\d{1,4}[HE]?\\b', score: 0.5},
      ],
    },
    {
      name: 'Spanish NIF Recognizer',
      supported_language: 'es',
      supported_entity: 'ES_NIF',
      patterns: [{name: 'Spanish NIF', regex: '\\b\\d{8}[A-Z]\\b', score: 0.7}],
    },
    {
      name: 'Italian Fiscal Code Recognizer',
      supported_language: 'it',
      supported_entity: 'IT_FISCAL_CODE',
      patterns: [{name: 'Italian Fiscal Code', regex: '\\b[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]\\b', score: 0.8}],
    },
  ],
  presidioRecognizersJson = {
    version,
    updated,
    recognizers,
  };
function isRegexRecognizer(e) {
  return 'patterns' in e;
}
function isDenyListRecognizer(e) {
  return 'deny_list' in e;
}
var LogLevel = /* @__PURE__ */ (e => (
    (e[(e.TRACE = 0)] = 'TRACE'),
    (e[(e.DEBUG = 1)] = 'DEBUG'),
    (e[(e.INFO = 2)] = 'INFO'),
    (e[(e.WARN = 3)] = 'WARN'),
    (e[(e.ERROR = 4)] = 'ERROR'),
    (e[(e.FATAL = 5)] = 'FATAL'),
    e
  ))(LogLevel || {}),
  SafetyLevel = /* @__PURE__ */ (e => ((e.SAFE = 'safe'), (e.SANITIZED = 'sanitized'), (e.DEV_ONLY = 'dev_only'), e))(
    SafetyLevel || {},
  );
const logger$3 = logdown('@wireapp/logger/PresidioConverter');
logger$3.state.isEnabled = !0;
const ENTITY_REPLACEMENT_MAP = {
  // Global entities
  CREDIT_CARD: '[CREDIT_CARD]',
  CRYPTO: '[CRYPTO_ADDRESS]',
  EMAIL_ADDRESS: '[EMAIL]',
  IBAN_CODE: '[IBAN]',
  IP_ADDRESS: '[IP_ADDRESS]',
  PHONE_NUMBER: '[PHONE]',
  URL: '[URL]',
  PERSON: '[NAME]',
  MEDICAL_LICENSE: '[MEDICAL_LICENSE]',
  // USA
  US_BANK_NUMBER: '[BANK_ACCOUNT]',
  US_DRIVER_LICENSE: '[DRIVER_LICENSE]',
  US_ITIN: '[ITIN]',
  US_PASSPORT: '[PASSPORT]',
  US_SSN: '[SSN]',
  // UK
  UK_NHS: '[NHS_NUMBER]',
  NI_NUMBER: '[NI_NUMBER]',
  // Spain
  ES_NIF: '[NIF]',
  ES_NIE: '[NIE]',
  // Italy
  IT_FISCAL_CODE: '[FISCAL_CODE]',
  IT_DRIVER_LICENSE: '[DRIVER_LICENSE]',
  IT_VAT_CODE: '[VAT_ID]',
  IT_PASSPORT: '[PASSPORT]',
  IT_IDENTITY_CARD: '[ID_CARD]',
  // Poland
  PL_PESEL: '[PESEL]',
  // Singapore
  SG_NRIC_FIN: '[NRIC_FIN]',
  SG_UEN: '[UEN]',
  // Australia
  AU_ABN: '[ABN]',
  AU_ACN: '[ACN]',
  AU_TFN: '[TFN]',
  AU_MEDICARE: '[MEDICARE]',
  // India
  IN_PAN: '[PAN]',
  IN_AADHAAR: '[AADHAAR]',
  IN_VEHICLE_REGISTRATION: '[VEHICLE_REG]',
  IN_VOTER: '[VOTER_ID]',
  IN_PASSPORT: '[PASSPORT]',
  IN_GSTIN: '[GSTIN]',
  // Finland
  FI_PERSONAL_IDENTITY_CODE: '[FI_IDENTITY]',
  // Korea
  KR_RRN: '[RRN]',
  KR_PASSPORT: '[PASSPORT]',
  // Thailand
  TH_NATIONAL_ID: '[TH_NATIONAL_ID]',
  // DACH (Germany, Austria, Switzerland) - our custom additions
  DE_TAX_ID: '[TAX_ID]',
  DE_VAT_ID: '[VAT_ID]',
  AT_VAT_ID: '[VAT_ID]',
  CH_VAT_ID: '[VAT_ID]',
  CH_AHV: '[AHV_NUMBER]',
  DE_LICENSE_PLATE: '[LICENSE_PLATE]',
  DE_ID_CARD: '[ID_CARD]',
  HRB: '[REGISTER_NUMBER]',
  INSURANCE_NUMBER: '[INSURANCE_NUMBER]',
};
function determineSafetyLevels(e, t) {
  return [
    'CREDIT_CARD',
    'US_SSN',
    'IBAN_CODE',
    'CRYPTO',
    'US_PASSPORT',
    'UK_NHS',
    'MEDICAL_LICENSE',
    'IN_AADHAAR',
    'EMAIL_ADDRESS',
    // Email should be masked in production (SAFE mode)
    'IP_ADDRESS',
    // IP addresses should be masked in production
  ].includes(e) || t >= 0.8
    ? [SafetyLevel.SAFE, SafetyLevel.SANITIZED]
    : [SafetyLevel.SANITIZED];
}
function convertRegexRecognizer(e) {
  const t = [],
    r = ENTITY_REPLACEMENT_MAP[e.supported_entity] || `[${e.supported_entity}]`;
  for (const n of e.patterns)
    try {
      const a = convertPythonRegexToJS(n.regex),
        i = determineSafetyLevels(e.supported_entity, n.score);
      t.push({
        pattern: new RegExp(a, 'gi'),
        replacement: r,
        appliesTo: i,
        metadata: {
          source: 'presidio',
          recognizerName: e.name,
          entityType: e.supported_entity,
          confidence: n.score,
        },
      });
    } catch (a) {
      logger$3.warn(`Failed to convert pattern "${n.name}":`, a);
    }
  return t;
}
function convertDenyListRecognizer(e) {
  const t = ENTITY_REPLACEMENT_MAP[e.supported_entity] || `[${e.supported_entity}]`,
    n = `\\b(${e.deny_list.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`;
  return {
    pattern: new RegExp(n, 'gi'),
    replacement: t,
    appliesTo: [SafetyLevel.SANITIZED],
    metadata: {
      source: 'presidio',
      recognizerName: e.name,
      entityType: e.supported_entity,
      denyListSize: e.deny_list.length,
    },
  };
}
function convertPythonRegexToJS(e) {
  let t = e;
  return ((t = t.replace(/\(\?[iLmsux]+\)/g, '')), (t = t.replace(/\(\?P<(\w+)>/g, '(?<$1>')), t);
}
function convertPresidioRecognizers(e) {
  const t = [];
  for (const r of e)
    try {
      isRegexRecognizer(r)
        ? t.push(...convertRegexRecognizer(r))
        : isDenyListRecognizer(r) && t.push(convertDenyListRecognizer(r));
    } catch (n) {
      logger$3.warn(`Failed to convert recognizer "${r.name}":`, n);
    }
  return t;
}
function filterByLanguage(e, t) {
  return e.filter(r => r.supported_language === t || r.supported_language === 'all');
}
function filterByEntityTypes(e, t) {
  const r = new Set(t);
  return e.filter(n => r.has(n.supported_entity));
}
class PresidioLoader {
  constructor() {
    ((this.recognizers = []), (this.version = 'unknown'), (this.lastUpdated = 'unknown'));
  }
  /**
   * Load Presidio recognizers from JSON
   */
  loadFromJSON(t) {
    ((this.recognizers = t.recognizers), (this.version = t.version), (this.lastUpdated = t.updated));
  }
  /**
   * Load Presidio recognizers from a JSON string
   */
  loadFromString(t) {
    try {
      const r = JSON.parse(t);
      this.loadFromJSON(r);
    } catch (r) {
      throw new Error(`Failed to parse Presidio recognizers JSON: ${r}`);
    }
  }
  /**
   * Load Presidio recognizers from a URL (browser/Node.js compatible)
   */
  async loadFromURL(t) {
    try {
      const r = await fetch(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      const n = await r.json();
      this.loadFromJSON(n);
    } catch (r) {
      throw new Error(`Failed to load Presidio recognizers from URL: ${r}`);
    }
  }
  /**
   * Convert loaded recognizers to SanitizationRules
   */
  toSanitizationRules(t = {}) {
    let r = this.recognizers;
    return (
      t.language && (r = filterByLanguage(r, t.language)),
      t.entityTypes && t.entityTypes.length > 0 && (r = filterByEntityTypes(r, t.entityTypes)),
      convertPresidioRecognizers(r)
    );
  }
  /**
   * Get metadata about loaded recognizers
   */
  getMetadata() {
    const t = new Set(this.recognizers.map(n => n.supported_entity)),
      r = new Set(this.recognizers.map(n => n.supported_language));
    return {
      version: this.version,
      lastUpdated: this.lastUpdated,
      recognizerCount: this.recognizers.length,
      entityTypes: Array.from(t).sort(),
      languages: Array.from(r).sort(),
    };
  }
  /**
   * Get all loaded recognizers
   */
  getRecognizers() {
    return [...this.recognizers];
  }
  /**
   * Clear all loaded recognizers
   */
  clear() {
    ((this.recognizers = []), (this.version = 'unknown'), (this.lastUpdated = 'unknown'));
  }
}
const PRESIDIO_LOADER_KEY = Symbol.for('@wireapp/logger:presidioLoader');
function getGlobalPresidioLoader() {
  const e = globalThis[PRESIDIO_LOADER_KEY];
  if (e) return e;
  const t = new PresidioLoader();
  return ((globalThis[PRESIDIO_LOADER_KEY] = t), t);
}
function setGlobalPresidioLoader(e) {
  globalThis[PRESIDIO_LOADER_KEY] = e;
}
async function loadPresidioRulesFromURL(e, t = {}) {
  const r = new PresidioLoader();
  return (await r.loadFromURL(e), r.toSanitizationRules(t));
}
function loadPresidioRulesFromString(e, t = {}) {
  const r = new PresidioLoader();
  return (r.loadFromString(e), r.toSanitizationRules(t));
}
const logger$2 = logdown('@wireapp/logger/ContextWhitelist');
logger$2.state.isEnabled = !0;
const PRODUCTION_CONTEXT_WHITELIST = /* @__PURE__ */ new Set([
  // Identifiers (automatically truncated)
  'conversationId',
  'clientId',
  'userId',
  // Metadata
  'timestamp',
  'duration',
  'errorCode',
  'status',
  'protocol',
  'category',
  'level',
  // Counters
  'count',
  'size',
  'length',
  // Datadog-specific
  'correlationId',
  'sessionId',
]);
function isContextKeyWhitelisted(e) {
  return PRODUCTION_CONTEXT_WHITELIST.has(e);
}
function filterContextWhitelist(e) {
  const t = {};
  for (const r of Object.keys(e)) isContextKeyWhitelisted(r) && (t[r] = e[r]);
  return t;
}
const WIRE_SPECIFIC_SANITIZATION_RULES = [
  // UUID masking (partial replacement - Wire-specific behavior)
  // Presidio doesn't have UUID support, so we keep this
  {
    pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
    replacement: e => `${e.substring(0, 8)}***`,
    appliesTo: [SafetyLevel.SANITIZED],
  },
  // Access token masking (applies to all string values)
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+/gi,
    replacement: 'Bearer [TOKEN]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Message content masking in messages (looks for quoted content in logs)
  {
    pattern: /(?:content|text|message|plaintext)\s*[:=]\s*["'][^"']*["']/gi,
    replacement: e => `${e.split(':')[0] || e.split('=')[0]}: "[MESSAGE_CONTENT]"`,
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Encryption key masking in messages (looks for quoted keys/secrets in logs)
  {
    pattern: /(?:key|secret)\s*[:=]\s*["'][^"']*["']/gi,
    replacement: e => `${e.split(':')[0] || e.split('=')[0]}: "[ENCRYPTED]"`,
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Message content masking (targets specific keys in context) - matches values directly
  {
    pattern: /.+/,
    replacement: '[MESSAGE_CONTENT]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['content', 'text', 'message', 'plaintext'],
  },
  // Encryption key masking (targets specific keys in context) - matches values directly
  {
    pattern: /.+/,
    replacement: '[ENCRYPTED]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['key', 'secret', 'private', 'privateKey'],
  },
  // URL masking (except whitelisted domains)
  {
    pattern: /https?:\/\/[^\s'"]+/gi,
    replacement: e =>
      ['wire.com', 'zinfra.io', 'nginz-https', 'datadoghq.com'].some(n => e.includes(n)) ? e : '[URL]',
    appliesTo: [SafetyLevel.SANITIZED],
  },
  // Stack trace sanitization (applies to error.stack)
  // Wire-specific: Presidio doesn't handle stack traces
  {
    pattern: /at\s+[\w.<>]+\s*\([^)]+\)/g,
    replacement: '[STACK_FRAME]',
    appliesTo: [SafetyLevel.SANITIZED],
  },
  // MAC address masking
  // Wire-specific: Presidio doesn't handle MAC addresses
  {
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    replacement: '[MAC_ADDRESS]',
    appliesTo: [SafetyLevel.SANITIZED],
  },
  // API Keys (Stripe, generic patterns)
  // Wire-specific: Presidio doesn't handle Stripe-specific keys
  {
    pattern: /\b(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{10,}\b/gi,
    replacement: '[API_KEY]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // AWS Access Key ID
  // Wire-specific: More specific than Presidio's generic patterns
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: '[AWS_KEY]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // JWT Token masking
  // Wire-specific: Presidio doesn't have JWT-specific patterns
  {
    pattern: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    replacement: '[JWT_TOKEN]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Generic API/Secret key patterns
  // Wire-specific: Context-aware key detection
  {
    pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{20,}["']?/gi,
    replacement: e => `${e.split(/[:=]/)[0]}: "[API_KEY]"`,
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Name patterns in specific contexts
  {
    pattern: /.+/,
    replacement: '[NAME]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['name', 'fullName', 'firstName', 'lastName', 'displayName', 'username'],
  },
  // Date of birth patterns
  {
    pattern: /.+/,
    replacement: '[DATE_OF_BIRTH]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['dob', 'dateOfBirth', 'birthDate', 'birthday'],
  },
  // Address patterns
  {
    pattern: /.+/,
    replacement: '[ADDRESS]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['address', 'street', 'streetAddress', 'city', 'zipCode', 'postalCode', 'country'],
  },
  // Passport numbers
  {
    pattern: /.+/,
    replacement: '[PASSPORT]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['passport', 'passportNumber'],
  },
  // === Wire-Specific Patterns (Not in Presidio) ===
  // BIC/SWIFT codes (international bank identifier)
  // Wire-specific: Presidio doesn't have BIC/SWIFT support
  // Pattern matches 8-11 character bank codes, but excludes common placeholder words
  {
    pattern: /\b(?!PASSPORT|REGISTER|CREDITCA|INSURANC)[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
    replacement: '[BIC]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // German Handelsregisternummer (Commercial Register Number) - HRB 12345
  // Wire-specific: Presidio doesn't have this pattern
  {
    pattern: /\bHR[AB]\s?\d{1,6}\b/gi,
    replacement: '[REGISTER_NUMBER]',
    appliesTo: [SafetyLevel.SANITIZED],
  },
  // German Personalausweisnummer (ID card) - alphanumeric
  // Wire-specific: Context-aware ID card detection
  {
    pattern: /\b[A-Z0-9]{9,10}\b(?=.*ausweis|.*personalausweis)/gi,
    replacement: '[ID_CARD]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
  // Insurance number patterns
  {
    pattern: /.+/,
    replacement: '[INSURANCE_NUMBER]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['insuranceNumber', 'versicherungsnummer', 'krankenversicherung'],
  },
  // Full object dump sanitization (for development debugging) - matches any object literal
  {
    pattern: /(?:object|state)\s*dump\s*[:=]\s*\{.+?\}/gis,
    replacement: e => e.replace(/\{.+\}/s, '[OBJECT_DUMP]'),
    appliesTo: [SafetyLevel.DEV_ONLY],
  },
  // Error object sanitization (for development debugging)
  {
    pattern: /error\s+occurred\s*[:=]\s*\{.+?\}/gis,
    replacement: e => e.replace(/\{.+\}/s, '[ERROR_OBJECT]'),
    appliesTo: [SafetyLevel.DEV_ONLY],
  },
];
function getDefaultSanitizationRules() {
  try {
    const e = new PresidioLoader();
    e.loadFromJSON(presidioRecognizersJson);
    const r = e.toSanitizationRules().filter(i => i.metadata?.entityType !== 'URL'),
      n = WIRE_SPECIFIC_SANITIZATION_RULES.filter(i => {
        const o = i.pattern.source;
        return (
          o.includes('[a-f0-9]{8}') || // UUID (specific hex pattern)
          o.includes('Bearer') || // Bearer tokens
          o.includes('content|text|message') || // Message content
          o.includes('(?:key|secret)') || // Encryption keys
          (o.includes('https?') && i.replacement instanceof Function) || // URL whitelisting
          (i.appliesToKeys && i.appliesToKeys.length > 0)
        );
      }),
      a = WIRE_SPECIFIC_SANITIZATION_RULES.filter(i => !n.includes(i));
    return [
      ...n,
      // Wire high-priority patterns FIRST
      ...r,
      // Presidio patterns in the middle
      ...a,
      // Wire low-priority patterns LAST
    ];
  } catch (e) {
    return (
      logger$2.warn('Failed to load Presidio patterns, using Wire-specific only:', e),
      WIRE_SPECIFIC_SANITIZATION_RULES
    );
  }
}
const DEFAULT_SANITIZATION_RULES = getDefaultSanitizationRules();
class Sanitizer {
  constructor(t) {
    this.rules = t ?? DEFAULT_SANITIZATION_RULES;
  }
  /**
   * Automatically sanitizes a log entry based on safety level
   * Developers don't need to call this manually - it happens automatically
   */
  sanitize(t, r) {
    let n = t.message;
    const a = t.context ? {...t.context} : void 0;
    let i = t.error;
    for (const o of this.rules)
      if (
        o.appliesTo.includes(r) &&
        (o.appliesToKeys ||
          ((n = this.applyReplacement(n, o.pattern, o.replacement)),
          i?.stack &&
            (i = {
              ...i,
              stack: this.applyReplacement(i.stack, o.pattern, o.replacement),
            }),
          i?.message &&
            (i = {
              ...i,
              message: this.applyReplacement(i.message, o.pattern, o.replacement),
            })),
        a)
      )
        for (const s in a) {
          if (o.appliesToKeys && !o.appliesToKeys.includes(s)) continue;
          const c = a[s];
          typeof c == 'string'
            ? (a[s] = this.applyReplacement(c, o.pattern, o.replacement))
            : typeof c == 'object' &&
              c !== null &&
              (a[s] = this.sanitizeObject(c, o.pattern, o.replacement, o.appliesToKeys));
        }
    return {
      ...t,
      message: n,
      context: a,
      error: i,
    };
  }
  /**
   * Apply replacement pattern to a string
   */
  applyReplacement(t, r, n) {
    return t.replace(r, n);
  }
  /**
   * Recursively sanitize an object
   */
  sanitizeObject(t, r, n, a) {
    if (typeof t != 'object' || t === null) return t;
    if (Array.isArray(t)) return t.map(o => this.sanitizeObject(o, r, n, a));
    const i = {};
    for (const o in t)
      if (Object.prototype.hasOwnProperty.call(t, o)) {
        if (a && !a.includes(o)) {
          i[o] = t[o];
          continue;
        }
        const s = t[o];
        typeof s == 'string'
          ? (i[o] = this.applyReplacement(s, r, n))
          : typeof s == 'object' && s !== null
            ? (i[o] = this.sanitizeObject(s, r, n, a))
            : (i[o] = s);
      }
    return i;
  }
  /**
   * Get all sanitization rules (for testing)
   */
  getRules() {
    return [...this.rules];
  }
  /**
   * Get default sanitization rules (static)
   */
  static getDefaultRules() {
    return [...DEFAULT_SANITIZATION_RULES];
  }
}
class ConsoleTransport {
  constructor(t) {
    ((this.config = t), (this.logdownInstances = /* @__PURE__ */ new Map()));
  }
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(t) {
    return this.config.enabled && t.level >= this.config.level;
  }
  /**
   * Get or create a logdown instance for the logger name
   */
  getLogdownInstance(t) {
    const r = t || 'unknown';
    if (!this.logdownInstances.has(r)) {
      const n = logdown(r);
      ((n.state.isEnabled = !0), this.logdownInstances.set(r, n));
    }
    return this.logdownInstances.get(r);
  }
  /**
   * Write the log entry to console using logdown for consistent formatting
   * Note: Category is omitted from console output as it's typically not useful for local debugging
   */
  write(t) {
    const r = this.getLogdownInstance(t.metadata.logger),
      n = this.mapLogLevel(t.level),
      a = [t.message];
    (t.context && Object.keys(t.context).length > 0 && a.push(t.context),
      t.error && a.push(t.error),
      this.writeToLogdown(r, n, a));
  }
  /**
   * Map log level to logdown method
   */
  mapLogLevel(t) {
    switch (t) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'error';
      default:
        return 'log';
    }
  }
  /**
   * Write to the appropriate logdown method
   */
  writeToLogdown(t, r, n) {
    switch (r) {
      case 'info':
        t.info(...n);
        break;
      case 'warn':
        t.warn(...n);
        break;
      case 'error':
        t.error(...n);
        break;
      case 'debug':
        t.debug(...n);
        break;
      default:
        t.log(...n);
    }
  }
}
function isAllowedAVSLog(e) {
  return (
    e.includes('ccall_hash_user') ||
    e.includes('c3_message_recv') ||
    e.includes('c3_message_send') ||
    e.includes('dce_message_recv') ||
    e.includes('dce_message_send') ||
    e.includes('WAPI wcall: create userid')
  );
}
var ConsoleApiName = {
    log: 'log',
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    error: 'error',
  },
  globalConsole = console,
  originalConsoleMethods = {};
Object.keys(ConsoleApiName).forEach(function (e) {
  originalConsoleMethods[e] = globalConsole[e];
});
var PREFIX = 'Datadog Browser SDK:',
  display = {
    debug: originalConsoleMethods.debug.bind(globalConsole, PREFIX),
    log: originalConsoleMethods.log.bind(globalConsole, PREFIX),
    info: originalConsoleMethods.info.bind(globalConsole, PREFIX),
    warn: originalConsoleMethods.warn.bind(globalConsole, PREFIX),
    error: originalConsoleMethods.error.bind(globalConsole, PREFIX),
  },
  DOCS_ORIGIN = 'https://docs.datadoghq.com',
  DOCS_TROUBLESHOOTING = ''.concat(DOCS_ORIGIN, '/real_user_monitoring/browser/troubleshooting'),
  MORE_DETAILS = 'More details:';
function catchUserErrors(e, t) {
  return function () {
    for (var r = [], n = 0; n < arguments.length; n++) r[n] = arguments[n];
    try {
      return e.apply(void 0, r);
    } catch (a) {
      display.error(t, a);
    }
  };
}
function performDraw(e) {
  return e !== 0 && Math.random() * 100 <= e;
}
function round(e, t) {
  return +e.toFixed(t);
}
function isPercentage(e) {
  return isNumber(e) && e >= 0 && e <= 100;
}
function isNumber(e) {
  return typeof e == 'number';
}
var ONE_SECOND = 1e3,
  ONE_MINUTE = 60 * ONE_SECOND,
  ONE_HOUR = 60 * ONE_MINUTE,
  ONE_DAY = 24 * ONE_HOUR,
  ONE_YEAR = 365 * ONE_DAY;
function relativeToClocks(e) {
  return {relative: e, timeStamp: getCorrectedTimeStamp(e)};
}
function timeStampToClocks(e) {
  return {relative: getRelativeTime(e), timeStamp: e};
}
function getCorrectedTimeStamp(e) {
  var t = dateNow() - performance.now();
  return t > getNavigationStart() ? Math.round(addDuration(t, e)) : getTimeStamp(e);
}
function currentDrift() {
  return Math.round(dateNow() - addDuration(getNavigationStart(), performance.now()));
}
function toServerDuration(e) {
  return isNumber(e) ? round(e * 1e6, 0) : e;
}
function dateNow() {
  return /* @__PURE__ */ new Date().getTime();
}
function timeStampNow() {
  return dateNow();
}
function relativeNow() {
  return performance.now();
}
function clocksNow() {
  return {relative: relativeNow(), timeStamp: timeStampNow()};
}
function clocksOrigin() {
  return {relative: 0, timeStamp: getNavigationStart()};
}
function elapsed(e, t) {
  return t - e;
}
function addDuration(e, t) {
  return e + t;
}
function getRelativeTime(e) {
  return e - getNavigationStart();
}
function getTimeStamp(e) {
  return Math.round(addDuration(getNavigationStart(), e));
}
function looksLikeRelativeTime(e) {
  return e < ONE_YEAR;
}
var navigationStart;
function getNavigationStart() {
  return (navigationStart === void 0 && (navigationStart = performance.timing.navigationStart), navigationStart);
}
var ONE_KIBI_BYTE = 1024,
  ONE_MEBI_BYTE = 1024 * ONE_KIBI_BYTE,
  HAS_MULTI_BYTES_CHARACTERS = /[^\u0000-\u007F]/;
function computeBytesCount(e) {
  return HAS_MULTI_BYTES_CHARACTERS.test(e)
    ? window.TextEncoder !== void 0
      ? new TextEncoder().encode(e).length
      : new Blob([e]).size
    : e.length;
}
function concatBuffers(e) {
  for (
    var t = e.reduce(function (s, c) {
        return s + c.length;
      }, 0),
      r = new Uint8Array(t),
      n = 0,
      a = 0,
      i = e;
    a < i.length;
    a++
  ) {
    var o = i[a];
    (r.set(o, n), (n += o.length));
  }
  return r;
}
function includes(e, t) {
  return e.indexOf(t) !== -1;
}
function arrayFrom(e) {
  if (Array.from) return Array.from(e);
  var t = [];
  if (e instanceof Set)
    e.forEach(function (n) {
      return t.push(n);
    });
  else for (var r = 0; r < e.length; r++) t.push(e[r]);
  return t;
}
function find(e, t) {
  for (var r = 0; r < e.length; r += 1) {
    var n = e[r];
    if (t(n, r)) return n;
  }
}
function findLast(e, t) {
  for (var r = e.length - 1; r >= 0; r -= 1) {
    var n = e[r];
    if (t(n, r, e)) return n;
  }
}
function forEach(e, t) {
  Array.prototype.forEach.call(e, t);
}
function objectValues(e) {
  return Object.keys(e).map(function (t) {
    return e[t];
  });
}
function objectEntries(e) {
  return Object.keys(e).map(function (t) {
    return [t, e[t]];
  });
}
function startsWith(e, t) {
  return e.slice(0, t.length) === t;
}
function endsWith(e, t) {
  return e.slice(-t.length) === t;
}
function assign(e) {
  for (var t = [], r = 1; r < arguments.length; r++) t[r - 1] = arguments[r];
  return (
    t.forEach(function (n) {
      for (var a in n) Object.prototype.hasOwnProperty.call(n, a) && (e[a] = n[a]);
    }),
    e
  );
}
function shallowClone(e) {
  return assign({}, e);
}
function objectHasValue(e, t) {
  return Object.keys(e).some(function (r) {
    return e[r] === t;
  });
}
function isEmptyObject(e) {
  return Object.keys(e).length === 0;
}
function mapValues(e, t) {
  for (var r = {}, n = 0, a = Object.keys(e); n < a.length; n++) {
    var i = a[n];
    r[i] = t(e[i]);
  }
  return r;
}
function getGlobalObject() {
  if (typeof globalThis == 'object') return globalThis;
  Object.defineProperty(Object.prototype, '_dd_temp_', {
    get: function () {
      return this;
    },
    configurable: !0,
  });
  var e = _dd_temp_;
  return (
    delete Object.prototype._dd_temp_,
    typeof e != 'object' &&
      (typeof self == 'object' ? (e = self) : typeof window == 'object' ? (e = window) : (e = {})),
    e
  );
}
function getZoneJsOriginalValue(e, t) {
  var r = getGlobalObject(),
    n;
  return (r.Zone && typeof r.Zone.__symbol__ == 'function' && (n = e[r.Zone.__symbol__(t)]), n || (n = e[t]), n);
}
var __spreadArray = function (e, t, r) {
    if (r || arguments.length === 2)
      for (var n = 0, a = t.length, i; n < a; n++)
        (i || !(n in t)) && (i || (i = Array.prototype.slice.call(t, 0, n)), (i[n] = t[n]));
    return e.concat(i || Array.prototype.slice.call(t));
  },
  onMonitorErrorCollected,
  debugMode = !1;
function startMonitorErrorCollection(e) {
  onMonitorErrorCollected = e;
}
function setDebugMode(e) {
  debugMode = e;
}
function monitored(e, t, r) {
  var n = r.value;
  r.value = function () {
    for (var a = [], i = 0; i < arguments.length; i++) a[i] = arguments[i];
    var o = onMonitorErrorCollected ? monitor(n) : n;
    return o.apply(this, a);
  };
}
function monitor(e) {
  return function () {
    return callMonitored(e, this, arguments);
  };
}
function callMonitored(e, t, r) {
  try {
    return e.apply(t, r);
  } catch (n) {
    if ((displayIfDebugEnabled(n), onMonitorErrorCollected))
      try {
        onMonitorErrorCollected(n);
      } catch (a) {
        displayIfDebugEnabled(a);
      }
  }
}
function displayIfDebugEnabled() {
  for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
  debugMode && display.error.apply(display, __spreadArray(['[MONITOR]'], e, !1));
}
function setTimeout(e, t) {
  return getZoneJsOriginalValue(getGlobalObject(), 'setTimeout')(monitor(e), t);
}
function clearTimeout(e) {
  getZoneJsOriginalValue(getGlobalObject(), 'clearTimeout')(e);
}
function setInterval(e, t) {
  return getZoneJsOriginalValue(getGlobalObject(), 'setInterval')(monitor(e), t);
}
function clearInterval(e) {
  getZoneJsOriginalValue(getGlobalObject(), 'clearInterval')(e);
}
var Observable =
  /** @class */
  (function () {
    function e(t) {
      ((this.onFirstSubscribe = t), (this.observers = []));
    }
    return (
      (e.prototype.subscribe = function (t) {
        var r = this;
        return (
          this.observers.push(t),
          this.observers.length === 1 &&
            this.onFirstSubscribe &&
            (this.onLastUnsubscribe = this.onFirstSubscribe(this) || void 0),
          {
            unsubscribe: function () {
              ((r.observers = r.observers.filter(function (n) {
                return t !== n;
              })),
                !r.observers.length && r.onLastUnsubscribe && r.onLastUnsubscribe());
            },
          }
        );
      }),
      (e.prototype.notify = function (t) {
        this.observers.forEach(function (r) {
          return r(t);
        });
      }),
      e
    );
  })();
function mergeObservables() {
  for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
  return new Observable(function (r) {
    var n = e.map(function (a) {
      return a.subscribe(function (i) {
        return r.notify(i);
      });
    });
    return function () {
      return n.forEach(function (a) {
        return a.unsubscribe();
      });
    };
  });
}
function throttle(e, t, r) {
  var n = r && r.leading !== void 0 ? r.leading : !0,
    a = r && r.trailing !== void 0 ? r.trailing : !0,
    i = !1,
    o,
    s;
  return {
    throttled: function () {
      for (var c = [], u = 0; u < arguments.length; u++) c[u] = arguments[u];
      if (i) {
        o = c;
        return;
      }
      (n ? e.apply(void 0, c) : (o = c),
        (i = !0),
        (s = setTimeout(function () {
          (a && o && e.apply(void 0, o), (i = !1), (o = void 0));
        }, t)));
    },
    cancel: function () {
      (clearTimeout(s), (i = !1), (o = void 0));
    },
  };
}
function noop() {}
function generateUUID(e) {
  return e
    ? // eslint-disable-next-line  no-bitwise
      (parseInt(e, 10) ^ ((Math.random() * 16) >> (parseInt(e, 10) / 4))).toString(16)
    : ''
        .concat(1e7, '-')
        .concat(1e3, '-')
        .concat(4e3, '-')
        .concat(8e3, '-')
        .concat(1e11)
        .replace(/[018]/g, generateUUID);
}
var COMMA_SEPARATED_KEY_VALUE = /([\w-]+)\s*=\s*([^;]+)/g;
function findCommaSeparatedValue(e, t) {
  for (COMMA_SEPARATED_KEY_VALUE.lastIndex = 0; ; ) {
    var r = COMMA_SEPARATED_KEY_VALUE.exec(e);
    if (r) {
      if (r[1] === t) return r[2];
    } else break;
  }
}
function findCommaSeparatedValues(e) {
  var t = /* @__PURE__ */ new Map();
  for (COMMA_SEPARATED_KEY_VALUE.lastIndex = 0; ; ) {
    var r = COMMA_SEPARATED_KEY_VALUE.exec(e);
    if (r) t.set(r[1], r[2]);
    else break;
  }
  return t;
}
function safeTruncate(e, t, r) {
  r === void 0 && (r = '');
  var n = e.charCodeAt(t - 1),
    a = n >= 55296 && n <= 56319,
    i = a ? t + 1 : t;
  return e.length <= i ? e : ''.concat(e.slice(0, i)).concat(r);
}
function isIE() {
  return detectBrowserCached() === 0;
}
function isChromium() {
  return detectBrowserCached() === 1;
}
function isSafari() {
  return detectBrowserCached() === 2;
}
var browserCache;
function detectBrowserCached() {
  return browserCache ?? (browserCache = detectBrowser());
}
function detectBrowser(e) {
  var t;
  e === void 0 && (e = window);
  var r = e.navigator.userAgent;
  return e.chrome || /HeadlessChrome/.test(r)
    ? 1
    : // navigator.vendor is deprecated, but it is the most resilient way we found to detect
      // "Apple maintained browsers" (AKA Safari). If one day it gets removed, we still have the
      // useragent test as a semi-working fallback.
      ((t = e.navigator.vendor) === null || t === void 0 ? void 0 : t.indexOf('Apple')) === 0 ||
        (/safari/i.test(r) && !/chrome|android/i.test(r))
      ? 2
      : e.document.documentMode
        ? 0
        : 3;
}
var ExperimentalFeature;
(function (e) {
  ((e.WRITABLE_RESOURCE_GRAPHQL = 'writable_resource_graphql'),
    (e.REMOTE_CONFIGURATION = 'remote_configuration'),
    (e.LONG_ANIMATION_FRAME = 'long_animation_frame'),
    (e.ANONYMOUS_USER_TRACKING = 'anonymous_user_tracking'),
    (e.ACTION_NAME_MASKING = 'action_name_masking'),
    (e.CONSISTENT_TRACE_SAMPLING = 'consistent_trace_sampling'),
    (e.DELAY_VIEWPORT_COLLECTION = 'delay_viewport_collection'));
})(ExperimentalFeature || (ExperimentalFeature = {}));
var enabledExperimentalFeatures = /* @__PURE__ */ new Set();
function initFeatureFlags(e) {
  Array.isArray(e) &&
    addExperimentalFeatures(
      e.filter(function (t) {
        return objectHasValue(ExperimentalFeature, t);
      }),
    );
}
function addExperimentalFeatures(e) {
  e.forEach(function (t) {
    enabledExperimentalFeatures.add(t);
  });
}
function isExperimentalFeatureEnabled(e) {
  return enabledExperimentalFeatures.has(e);
}
function getExperimentalFeatures() {
  return enabledExperimentalFeatures;
}
function setCookie(e, t, r, n) {
  r === void 0 && (r = 0);
  var a = /* @__PURE__ */ new Date();
  a.setTime(a.getTime() + r);
  var i = 'expires='.concat(a.toUTCString()),
    o = n && n.crossSite ? 'none' : 'strict',
    s = n && n.domain ? ';domain='.concat(n.domain) : '',
    c = n && n.secure ? ';secure' : '',
    u = n && n.partitioned ? ';partitioned' : '';
  document.cookie = ''
    .concat(e, '=')
    .concat(t, ';')
    .concat(i, ';path=/;samesite=')
    .concat(o)
    .concat(s)
    .concat(c)
    .concat(u);
}
function getCookie(e) {
  return findCommaSeparatedValue(document.cookie, e);
}
var initCookieParsed;
function getInitCookie(e) {
  return (initCookieParsed || (initCookieParsed = findCommaSeparatedValues(document.cookie)), initCookieParsed.get(e));
}
function deleteCookie(e, t) {
  setCookie(e, '', 0, t);
}
function areCookiesAuthorized(e) {
  if (document.cookie === void 0 || document.cookie === null) return !1;
  try {
    var t = 'dd_cookie_test_'.concat(generateUUID()),
      r = 'test';
    setCookie(t, r, ONE_MINUTE, e);
    var n = getCookie(t) === r;
    return (deleteCookie(t, e), n);
  } catch (a) {
    return (display.error(a), !1);
  }
}
var getCurrentSiteCache;
function getCurrentSite() {
  if (getCurrentSiteCache === void 0) {
    for (
      var e = 'dd_site_test_'.concat(generateUUID()), t = 'test', r = window.location.hostname.split('.'), n = r.pop();
      r.length && !getCookie(e);
    )
      ((n = ''.concat(r.pop(), '.').concat(n)), setCookie(e, t, ONE_SECOND, {domain: n}));
    (deleteCookie(e, {domain: n}), (getCurrentSiteCache = n));
  }
  return getCurrentSiteCache;
}
var SESSION_STORE_KEY = '_dd_s';
function getType(e) {
  return e === null ? 'null' : Array.isArray(e) ? 'array' : typeof e;
}
function sanitizeUser(e) {
  var t = assign({}, e),
    r = ['id', 'name', 'email'];
  return (
    r.forEach(function (n) {
      n in t && (t[n] = String(t[n]));
    }),
    t
  );
}
function checkUser(e) {
  var t = getType(e) === 'object';
  return (t || display.error('Unsupported user:', e), t);
}
function generateAnonymousId() {
  return Math.floor(Math.random() * Math.pow(2, 53)).toString(36);
}
var SESSION_TIME_OUT_DELAY = 4 * ONE_HOUR,
  SESSION_EXPIRATION_DELAY = 15 * ONE_MINUTE,
  SESSION_COOKIE_EXPIRATION_DELAY = ONE_YEAR,
  SessionPersistence = {
    COOKIE: 'cookie',
    LOCAL_STORAGE: 'local-storage',
  },
  SESSION_ENTRY_REGEXP = /^([a-zA-Z]+)=([a-z0-9-]+)$/,
  SESSION_ENTRY_SEPARATOR = '&';
function isValidSessionString(e) {
  return !!e && (e.indexOf(SESSION_ENTRY_SEPARATOR) !== -1 || SESSION_ENTRY_REGEXP.test(e));
}
var EXPIRED = '1';
function getExpiredSessionState(e) {
  var t = {
    isExpired: EXPIRED,
  };
  return (
    isExperimentalFeatureEnabled(ExperimentalFeature.ANONYMOUS_USER_TRACKING) &&
      (e?.anonymousId ? (t.anonymousId = e?.anonymousId) : (t.anonymousId = generateAnonymousId())),
    t
  );
}
function isSessionInNotStartedState(e) {
  return isEmptyObject(e);
}
function isSessionStarted(e) {
  return !isSessionInNotStartedState(e);
}
function isSessionInExpiredState(e) {
  return e.isExpired !== void 0 || !isActiveSession(e);
}
function isActiveSession(e) {
  return (
    (e.created === void 0 || dateNow() - Number(e.created) < SESSION_TIME_OUT_DELAY) &&
    (e.expire === void 0 || dateNow() < Number(e.expire))
  );
}
function expandSessionState(e) {
  e.expire = String(dateNow() + SESSION_EXPIRATION_DELAY);
}
function toSessionString(e) {
  return objectEntries(e)
    .map(function (t) {
      var r = t[0],
        n = t[1];
      return r === 'anonymousId' ? 'aid='.concat(n) : ''.concat(r, '=').concat(n);
    })
    .join(SESSION_ENTRY_SEPARATOR);
}
function toSessionState(e) {
  var t = {};
  return (
    isValidSessionString(e) &&
      e.split(SESSION_ENTRY_SEPARATOR).forEach(function (r) {
        var n = SESSION_ENTRY_REGEXP.exec(r);
        if (n !== null) {
          var a = n[1],
            i = n[2];
          a === 'aid' ? (t.anonymousId = i) : (t[a] = i);
        }
      }),
    t
  );
}
var OLD_SESSION_COOKIE_NAME = '_dd',
  OLD_RUM_COOKIE_NAME = '_dd_r',
  OLD_LOGS_COOKIE_NAME = '_dd_l',
  RUM_SESSION_KEY$1 = 'rum',
  LOGS_SESSION_KEY$1 = 'logs';
function tryOldCookiesMigration(e) {
  var t = getInitCookie(SESSION_STORE_KEY);
  if (!t) {
    var r = getInitCookie(OLD_SESSION_COOKIE_NAME),
      n = getInitCookie(OLD_RUM_COOKIE_NAME),
      a = getInitCookie(OLD_LOGS_COOKIE_NAME),
      i = {};
    (r && (i.id = r),
      a && /^[01]$/.test(a) && (i[LOGS_SESSION_KEY$1] = a),
      n && /^[012]$/.test(n) && (i[RUM_SESSION_KEY$1] = n),
      isSessionStarted(i) && (expandSessionState(i), e.persistSession(i)));
  }
}
function selectCookieStrategy(e) {
  var t = buildCookieOptions(e);
  return areCookiesAuthorized(t) ? {type: SessionPersistence.COOKIE, cookieOptions: t} : void 0;
}
function initCookieStrategy(e) {
  var t = {
    /**
     * Lock strategy allows mitigating issues due to concurrent access to cookie.
     * This issue concerns only chromium browsers and enabling this on firefox increases cookie write failures.
     */
    isLockEnabled: isChromium(),
    persistSession: persistSessionCookie(e),
    retrieveSession: retrieveSessionCookie,
    expireSession: function (r) {
      return expireSessionCookie(e, r);
    },
  };
  return (tryOldCookiesMigration(t), t);
}
function persistSessionCookie(e) {
  return function (t) {
    setCookie(SESSION_STORE_KEY, toSessionString(t), SESSION_EXPIRATION_DELAY, e);
  };
}
function expireSessionCookie(e, t) {
  var r = getExpiredSessionState(t);
  setCookie(
    SESSION_STORE_KEY,
    toSessionString(r),
    isExperimentalFeatureEnabled(ExperimentalFeature.ANONYMOUS_USER_TRACKING)
      ? SESSION_COOKIE_EXPIRATION_DELAY
      : SESSION_TIME_OUT_DELAY,
    e,
  );
}
function retrieveSessionCookie() {
  var e = getCookie(SESSION_STORE_KEY),
    t = toSessionState(e);
  return t;
}
function buildCookieOptions(e) {
  var t = {};
  return (
    (t.secure =
      !!e.useSecureSessionCookie || !!e.usePartitionedCrossSiteSessionCookie || !!e.useCrossSiteSessionCookie),
    (t.crossSite = !!e.usePartitionedCrossSiteSessionCookie || !!e.useCrossSiteSessionCookie),
    (t.partitioned = !!e.usePartitionedCrossSiteSessionCookie),
    e.trackSessionAcrossSubdomains && (t.domain = getCurrentSite()),
    t
  );
}
var LOCAL_STORAGE_TEST_KEY = '_dd_test_';
function selectLocalStorageStrategy() {
  try {
    var e = generateUUID(),
      t = ''.concat(LOCAL_STORAGE_TEST_KEY).concat(e);
    localStorage.setItem(t, e);
    var r = localStorage.getItem(t);
    return (localStorage.removeItem(t), e === r ? {type: SessionPersistence.LOCAL_STORAGE} : void 0);
  } catch {
    return;
  }
}
function initLocalStorageStrategy() {
  return {
    isLockEnabled: !1,
    persistSession: persistInLocalStorage,
    retrieveSession: retrieveSessionFromLocalStorage,
    expireSession: expireSessionFromLocalStorage,
  };
}
function persistInLocalStorage(e) {
  localStorage.setItem(SESSION_STORE_KEY, toSessionString(e));
}
function retrieveSessionFromLocalStorage() {
  var e = localStorage.getItem(SESSION_STORE_KEY);
  return toSessionState(e);
}
function expireSessionFromLocalStorage(e) {
  persistInLocalStorage(getExpiredSessionState(e));
}
var LOCK_RETRY_DELAY = 10,
  LOCK_MAX_TRIES = 100,
  bufferedOperations = [],
  ongoingOperations;
function processSessionStoreOperations(e, t, r) {
  var n;
  r === void 0 && (r = 0);
  var a = t.isLockEnabled,
    i = t.persistSession,
    o = t.expireSession,
    s = function (l) {
      return i(assign({}, l, {lock: u}));
    },
    c = function () {
      var l = t.retrieveSession(),
        p = l.lock;
      return (
        l.lock && delete l.lock,
        {
          session: l,
          lock: p,
        }
      );
    };
  if ((ongoingOperations || (ongoingOperations = e), e !== ongoingOperations)) {
    bufferedOperations.push(e);
    return;
  }
  if (a && r >= LOCK_MAX_TRIES) {
    next(t);
    return;
  }
  var u,
    d = c();
  if (a) {
    if (d.lock) {
      retryLater(e, t, r);
      return;
    }
    if (((u = generateUUID()), s(d.session), (d = c()), d.lock !== u)) {
      retryLater(e, t, r);
      return;
    }
  }
  var f = e.process(d.session);
  if (a && ((d = c()), d.lock !== u)) {
    retryLater(e, t, r);
    return;
  }
  if (
    (f && (isSessionInExpiredState(f) ? o(f) : (expandSessionState(f), a ? s(f) : i(f))),
    a && !(f && isSessionInExpiredState(f)))
  ) {
    if (((d = c()), d.lock !== u)) {
      retryLater(e, t, r);
      return;
    }
    (i(d.session), (f = d.session));
  }
  ((n = e.after) === null || n === void 0 || n.call(e, f || d.session), next(t));
}
function retryLater(e, t, r) {
  setTimeout(function () {
    processSessionStoreOperations(e, t, r + 1);
  }, LOCK_RETRY_DELAY);
}
function next(e) {
  ongoingOperations = void 0;
  var t = bufferedOperations.shift();
  t && processSessionStoreOperations(t, e);
}
var STORAGE_POLL_DELAY = ONE_SECOND;
function selectSessionStoreStrategyType(e) {
  switch (e.sessionPersistence) {
    case SessionPersistence.COOKIE:
      return selectCookieStrategy(e);
    case SessionPersistence.LOCAL_STORAGE:
      return selectLocalStorageStrategy();
    case void 0: {
      var t = selectCookieStrategy(e);
      return (!t && e.allowFallbackToLocalStorage && (t = selectLocalStorageStrategy()), t);
    }
    default:
      display.error("Invalid session persistence '".concat(String(e.sessionPersistence), "'"));
  }
}
function startSessionStore(e, t, r) {
  var n = new Observable(),
    a = new Observable(),
    i = new Observable(),
    o = e.type === SessionPersistence.COOKIE ? initCookieStrategy(e.cookieOptions) : initLocalStorageStrategy(),
    s = o.expireSession,
    c = setInterval(g, STORAGE_POLL_DELAY),
    u;
  m();
  var d = throttle(function () {
      processSessionStoreOperations(
        {
          process: function (_) {
            if (!isSessionInNotStartedState(_)) {
              var b = v(_);
              return (h(b), b);
            }
          },
          after: function (_) {
            (isSessionStarted(_) && !S() && I(_), (u = _));
          },
        },
        o,
      );
    }, STORAGE_POLL_DELAY),
    f = d.throttled,
    l = d.cancel;
  function p() {
    processSessionStoreOperations(
      {
        process: function (_) {
          return S() ? v(_) : void 0;
        },
      },
      o,
    );
  }
  function g() {
    processSessionStoreOperations(
      {
        process: function (_) {
          return isSessionInExpiredState(_) ? getExpiredSessionState(_) : void 0;
        },
        after: v,
      },
      o,
    );
  }
  function v(_) {
    return (
      isSessionInExpiredState(_) && (_ = getExpiredSessionState(_)),
      S() && (E(_) ? y() : (i.notify({previousState: u, newState: _}), (u = _))),
      _
    );
  }
  function m() {
    processSessionStoreOperations(
      {
        process: function (_) {
          if (isSessionInNotStartedState(_)) return getExpiredSessionState(_);
        },
        after: function (_) {
          u = _;
        },
      },
      o,
    );
  }
  function h(_) {
    if (isSessionInNotStartedState(_)) return !1;
    var b = r(_[t]),
      O = b.trackingType,
      C = b.isTracked;
    ((_[t] = O), delete _.isExpired, C && !_.id && ((_.id = generateUUID()), (_.created = String(dateNow()))));
  }
  function S() {
    return u[t] !== void 0;
  }
  function E(_) {
    return u.id !== _.id || u[t] !== _[t];
  }
  function y() {
    ((u = getExpiredSessionState(u)), a.notify());
  }
  function I(_) {
    ((u = _), n.notify());
  }
  function T(_) {
    processSessionStoreOperations(
      {
        process: function (b) {
          return assign({}, b, _);
        },
        after: v,
      },
      o,
    );
  }
  return {
    expandOrRenewSession: f,
    expandSession: p,
    getSession: function () {
      return u;
    },
    renewObservable: n,
    expireObservable: a,
    sessionStateUpdateObservable: i,
    restartSession: m,
    expire: function () {
      (l(), s(u), v(getExpiredSessionState(u)));
    },
    stop: function () {
      clearInterval(c);
    },
    updateSessionState: T,
  };
}
var TrackingConsent = {
  GRANTED: 'granted',
  NOT_GRANTED: 'not-granted',
};
function createTrackingConsentState(e) {
  var t = new Observable();
  return {
    tryToInit: function (r) {
      e || (e = r);
    },
    update: function (r) {
      ((e = r), t.notify());
    },
    isGranted: function () {
      return e === TrackingConsent.GRANTED;
    },
    observable: t,
  };
}
function jsonStringify(e, t, r) {
  if (typeof e != 'object' || e === null) return JSON.stringify(e);
  var n = detachToJsonMethod(Object.prototype),
    a = detachToJsonMethod(Array.prototype),
    i = detachToJsonMethod(Object.getPrototypeOf(e)),
    o = detachToJsonMethod(e);
  try {
    return JSON.stringify(e, t, r);
  } catch {
    return '<error: unable to serialize object>';
  } finally {
    (n(), a(), i(), o());
  }
}
function detachToJsonMethod(e) {
  var t = e,
    r = t.toJSON;
  return r
    ? (delete t.toJSON,
      function () {
        t.toJSON = r;
      })
    : noop;
}
function normalizeUrl(e) {
  return buildUrl(e, location.href).href;
}
function isValidUrl(e) {
  try {
    return !!buildUrl(e);
  } catch {
    return !1;
  }
}
function getPathName(e) {
  var t = buildUrl(e).pathname;
  return t[0] === '/' ? t : '/'.concat(t);
}
function buildUrl(e, t) {
  var r = getSupportedUrl();
  if (r)
    try {
      return t !== void 0 ? new r(e, t) : new r(e);
    } catch (o) {
      throw new Error('Failed to construct URL: '.concat(String(o), ' ').concat(jsonStringify({url: e, base: t})));
    }
  if (t === void 0 && !/:/.test(e)) throw new Error("Invalid URL: '".concat(e, "'"));
  var n = document,
    a = n.createElement('a');
  if (t !== void 0) {
    n = document.implementation.createHTMLDocument('');
    var i = n.createElement('base');
    ((i.href = t), n.head.appendChild(i), n.body.appendChild(a));
  }
  return ((a.href = e), a);
}
var originalURL = URL,
  isURLSupported;
function getSupportedUrl() {
  if (isURLSupported === void 0)
    try {
      var e = new originalURL('http://test/path');
      isURLSupported = e.href === 'http://test/path';
    } catch {
      isURLSupported = !1;
    }
  return isURLSupported ? originalURL : void 0;
}
var INTAKE_SITE_STAGING = 'datad0g.com',
  INTAKE_SITE_FED_STAGING = 'dd0g-gov.com',
  INTAKE_SITE_US1 = 'datadoghq.com',
  INTAKE_SITE_EU1 = 'datadoghq.eu',
  INTAKE_SITE_US1_FED = 'ddog-gov.com',
  PCI_INTAKE_HOST_US1 = 'pci.browser-intake-datadoghq.com',
  INTAKE_URL_PARAMETERS = ['ddsource', 'ddtags'];
function createEndpointBuilder(e, t, r) {
  var n = createEndpointUrlWithParametersBuilder(e, t);
  return {
    build: function (a, i) {
      var o = buildEndpointParameters(e, t, r, a, i);
      return n(o);
    },
    urlPrefix: n(''),
    trackType: t,
  };
}
function createEndpointUrlWithParametersBuilder(e, t) {
  var r = '/api/v2/'.concat(t),
    n = e.proxy;
  if (typeof n == 'string') {
    var a = normalizeUrl(n);
    return function (o) {
      return ''.concat(a, '?ddforward=').concat(encodeURIComponent(''.concat(r, '?').concat(o)));
    };
  }
  if (typeof n == 'function')
    return function (o) {
      return n({path: r, parameters: o});
    };
  var i = buildEndpointHost(t, e);
  return function (o) {
    return 'https://'.concat(i).concat(r, '?').concat(o);
  };
}
function buildEndpointHost(e, t) {
  var r = t.site,
    n = r === void 0 ? INTAKE_SITE_US1 : r,
    a = t.internalAnalyticsSubdomain;
  if (e === 'logs' && t.usePciIntake && n === INTAKE_SITE_US1) return PCI_INTAKE_HOST_US1;
  if (a && n === INTAKE_SITE_US1) return ''.concat(a, '.').concat(INTAKE_SITE_US1);
  if (n === INTAKE_SITE_FED_STAGING) return 'http-intake.logs.'.concat(n);
  var i = n.split('.'),
    o = i.pop();
  return 'browser-intake-'.concat(i.join('-'), '.').concat(o);
}
function buildEndpointParameters(e, t, r, n, a) {
  var i = e.clientToken,
    o = e.internalAnalyticsSubdomain,
    s = a.retry,
    c = a.encoding,
    u = ['sdk_version:'.concat('5.35.1'), 'api:'.concat(n)].concat(r);
  s && u.push('retry_count:'.concat(s.count), 'retry_after:'.concat(s.lastFailureStatus));
  var d = [
    'ddsource=browser',
    'ddtags='.concat(encodeURIComponent(u.join(','))),
    'dd-api-key='.concat(i),
    'dd-evp-origin-version='.concat(encodeURIComponent('5.35.1')),
    'dd-evp-origin=browser',
    'dd-request-id='.concat(generateUUID()),
  ];
  return (
    c && d.push('dd-evp-encoding='.concat(c)),
    t === 'rum' && d.push('batch_time='.concat(timeStampNow())),
    o && d.reverse(),
    d.join('&')
  );
}
var TAG_SIZE_LIMIT = 200;
function buildTags(e) {
  var t = e.env,
    r = e.service,
    n = e.version,
    a = e.datacenter,
    i = [];
  return (
    t && i.push(buildTag('env', t)),
    r && i.push(buildTag('service', r)),
    n && i.push(buildTag('version', n)),
    a && i.push(buildTag('datacenter', a)),
    i
  );
}
function buildTag(e, t) {
  var r = TAG_SIZE_LIMIT - e.length - 1;
  (t.length > r || hasForbiddenCharacters(t)) &&
    display.warn(
      ''
        .concat(e, " value doesn't meet tag requirements and will be sanitized. ")
        .concat(MORE_DETAILS, ' ')
        .concat(DOCS_ORIGIN, '/getting_started/tagging/#defining-tags'),
    );
  var n = t.replace(/,/g, '_');
  return ''.concat(e, ':').concat(n);
}
function hasForbiddenCharacters(e) {
  return supportUnicodePropertyEscapes() ? new RegExp('[^\\p{Ll}\\p{Lo}0-9_:./-]', 'u').test(e) : !1;
}
function supportUnicodePropertyEscapes() {
  try {
    return (new RegExp('[\\p{Ll}]', 'u'), !0);
  } catch {
    return !1;
  }
}
function computeTransportConfiguration(e) {
  var t = e.site || INTAKE_SITE_US1,
    r = buildTags(e),
    n = computeEndpointBuilders(e, r),
    a = computeReplicaConfiguration(e, r);
  return assign(
    {
      replica: a,
      site: t,
    },
    n,
  );
}
function computeEndpointBuilders(e, t) {
  return {
    logsEndpointBuilder: createEndpointBuilder(e, 'logs', t),
    rumEndpointBuilder: createEndpointBuilder(e, 'rum', t),
    sessionReplayEndpointBuilder: createEndpointBuilder(e, 'replay', t),
  };
}
function computeReplicaConfiguration(e, t) {
  if (e.replica) {
    var r = assign({}, e, {
        site: INTAKE_SITE_US1,
        clientToken: e.replica.clientToken,
      }),
      n = {
        logsEndpointBuilder: createEndpointBuilder(r, 'logs', t),
        rumEndpointBuilder: createEndpointBuilder(r, 'rum', t),
      };
    return assign({applicationId: e.replica.applicationId}, n);
  }
}
function isIntakeUrl(e) {
  return INTAKE_URL_PARAMETERS.every(function (t) {
    return includes(e, t);
  });
}
var DefaultPrivacyLevel = {
    ALLOW: 'allow',
    MASK: 'mask',
    MASK_USER_INPUT: 'mask-user-input',
  },
  TraceContextInjection = {
    ALL: 'all',
    SAMPLED: 'sampled',
  };
function isString(e, t) {
  return e != null && typeof e != 'string' ? (display.error(''.concat(t, ' must be defined as a string')), !1) : !0;
}
function isDatadogSite(e) {
  return e && typeof e == 'string' && !/(datadog|ddog|datad0g|dd0g)/.test(e)
    ? (display.error(
        'Site should be a valid Datadog site. '
          .concat(MORE_DETAILS, ' ')
          .concat(DOCS_ORIGIN, '/getting_started/site/.'),
      ),
      !1)
    : !0;
}
function isSampleRate(e, t) {
  return e !== void 0 && !isPercentage(e)
    ? (display.error(''.concat(t, ' Sample Rate should be a number between 0 and 100')), !1)
    : !0;
}
function validateAndBuildConfiguration(e) {
  var t, r, n, a, i;
  if (!e || !e.clientToken) {
    display.error('Client Token is not configured, we will not send any data.');
    return;
  }
  if (
    !(
      !isDatadogSite(e.site) ||
      !isSampleRate(e.sessionSampleRate, 'Session') ||
      !isSampleRate(e.telemetrySampleRate, 'Telemetry') ||
      !isSampleRate(e.telemetryConfigurationSampleRate, 'Telemetry Configuration') ||
      !isSampleRate(e.telemetryUsageSampleRate, 'Telemetry Usage') ||
      !isString(e.version, 'Version') ||
      !isString(e.env, 'Env') ||
      !isString(e.service, 'Service')
    )
  ) {
    if (e.trackingConsent !== void 0 && !objectHasValue(TrackingConsent, e.trackingConsent)) {
      display.error('Tracking Consent should be either "granted" or "not-granted"');
      return;
    }
    return assign(
      {
        beforeSend: e.beforeSend && catchUserErrors(e.beforeSend, 'beforeSend threw an error:'),
        sessionStoreStrategyType: selectSessionStoreStrategyType(e),
        sessionSampleRate: (t = e.sessionSampleRate) !== null && t !== void 0 ? t : 100,
        telemetrySampleRate: (r = e.telemetrySampleRate) !== null && r !== void 0 ? r : 20,
        telemetryConfigurationSampleRate: (n = e.telemetryConfigurationSampleRate) !== null && n !== void 0 ? n : 5,
        telemetryUsageSampleRate: (a = e.telemetryUsageSampleRate) !== null && a !== void 0 ? a : 5,
        service: e.service || void 0,
        silentMultipleInit: !!e.silentMultipleInit,
        allowUntrustedEvents: !!e.allowUntrustedEvents,
        trackingConsent: (i = e.trackingConsent) !== null && i !== void 0 ? i : TrackingConsent.GRANTED,
        storeContextsAcrossPages: !!e.storeContextsAcrossPages,
        /**
         * beacon payload max queue size implementation is 64kb
         * ensure that we leave room for logs, rum and potential other users
         */
        batchBytesLimit: 16 * ONE_KIBI_BYTE,
        eventRateLimiterThreshold: 3e3,
        maxTelemetryEventsPerPage: 15,
        /**
         * flush automatically, aim to be lower than ALB connection timeout
         * to maximize connection reuse.
         */
        flushTimeout: 30 * ONE_SECOND,
        /**
         * Logs intake limit
         */
        batchMessagesLimit: 50,
        messageBytesLimit: 256 * ONE_KIBI_BYTE,
      },
      computeTransportConfiguration(e),
    );
  }
}
function serializeConfiguration(e) {
  return {
    session_sample_rate: e.sessionSampleRate,
    telemetry_sample_rate: e.telemetrySampleRate,
    telemetry_configuration_sample_rate: e.telemetryConfigurationSampleRate,
    telemetry_usage_sample_rate: e.telemetryUsageSampleRate,
    use_before_send: !!e.beforeSend,
    use_cross_site_session_cookie: e.useCrossSiteSessionCookie,
    use_partitioned_cross_site_session_cookie: e.usePartitionedCrossSiteSessionCookie,
    use_secure_session_cookie: e.useSecureSessionCookie,
    use_proxy: !!e.proxy,
    silent_multiple_init: e.silentMultipleInit,
    track_session_across_subdomains: e.trackSessionAcrossSubdomains,
    session_persistence: e.sessionPersistence,
    allow_fallback_to_local_storage: !!e.allowFallbackToLocalStorage,
    store_contexts_across_pages: !!e.storeContextsAcrossPages,
    allow_untrusted_events: !!e.allowUntrustedEvents,
    tracking_consent: e.trackingConsent,
  };
}
var UNKNOWN_FUNCTION = '?';
function computeStackTrace(e) {
  var t = [],
    r = tryToGetString(e, 'stack'),
    n = String(e);
  return (
    r && startsWith(r, n) && (r = r.slice(n.length)),
    r &&
      r
        .split(
          `
`,
        )
        .forEach(function (a) {
          var i = parseChromeLine(a) || parseChromeAnonymousLine(a) || parseWinLine(a) || parseGeckoLine(a);
          i && (!i.func && i.line && (i.func = UNKNOWN_FUNCTION), t.push(i));
        }),
    {
      message: tryToGetString(e, 'message'),
      name: tryToGetString(e, 'name'),
      stack: t,
    }
  );
}
var fileUrl = '((?:file|https?|blob|chrome-extension|electron|native|eval|webpack|snippet|<anonymous>|\\w+\\.|\\/).*?)',
  filePosition = '(?::(\\d+))',
  CHROME_LINE_RE = new RegExp(
    '^\\s*at (.*?) ?\\('.concat(fileUrl).concat(filePosition, '?').concat(filePosition, '?\\)?\\s*$'),
    'i',
  ),
  CHROME_EVAL_RE = new RegExp('\\((\\S*)'.concat(filePosition).concat(filePosition, '\\)'));
function parseChromeLine(e) {
  var t = CHROME_LINE_RE.exec(e);
  if (t) {
    var r = t[2] && t[2].indexOf('native') === 0,
      n = t[2] && t[2].indexOf('eval') === 0,
      a = CHROME_EVAL_RE.exec(t[2]);
    return (
      n && a && ((t[2] = a[1]), (t[3] = a[2]), (t[4] = a[3])),
      {
        args: r ? [t[2]] : [],
        column: t[4] ? +t[4] : void 0,
        func: t[1] || UNKNOWN_FUNCTION,
        line: t[3] ? +t[3] : void 0,
        url: r ? void 0 : t[2],
      }
    );
  }
}
var CHROME_ANONYMOUS_FUNCTION_RE = new RegExp(
  '^\\s*at ?'.concat(fileUrl).concat(filePosition, '?').concat(filePosition, '??\\s*$'),
  'i',
);
function parseChromeAnonymousLine(e) {
  var t = CHROME_ANONYMOUS_FUNCTION_RE.exec(e);
  if (t)
    return {
      args: [],
      column: t[3] ? +t[3] : void 0,
      func: UNKNOWN_FUNCTION,
      line: t[2] ? +t[2] : void 0,
      url: t[1],
    };
}
var WINJS_LINE_RE =
  /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
function parseWinLine(e) {
  var t = WINJS_LINE_RE.exec(e);
  if (t)
    return {
      args: [],
      column: t[4] ? +t[4] : void 0,
      func: t[1] || UNKNOWN_FUNCTION,
      line: +t[3],
      url: t[2],
    };
}
var GECKO_LINE_RE =
    /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|resource|capacitor|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i,
  GECKO_EVAL_RE = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
function parseGeckoLine(e) {
  var t = GECKO_LINE_RE.exec(e);
  if (t) {
    var r = t[3] && t[3].indexOf(' > eval') > -1,
      n = GECKO_EVAL_RE.exec(t[3]);
    return (
      r && n && ((t[3] = n[1]), (t[4] = n[2]), (t[5] = void 0)),
      {
        args: t[2] ? t[2].split(',') : [],
        column: t[5] ? +t[5] : void 0,
        func: t[1] || UNKNOWN_FUNCTION,
        line: t[4] ? +t[4] : void 0,
        url: t[3],
      }
    );
  }
}
function tryToGetString(e, t) {
  if (!(typeof e != 'object' || !e || !(t in e))) {
    var r = e[t];
    return typeof r == 'string' ? r : void 0;
  }
}
function computeStackTraceFromOnErrorMessage(e, t, r, n) {
  var a = [{url: t, column: n, line: r}],
    i = tryToParseMessage(e),
    o = i.name,
    s = i.message;
  return {
    name: o,
    message: s,
    stack: a,
  };
}
var ERROR_TYPES_RE =
  /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?([\s\S]*)$/;
function tryToParseMessage(e) {
  var t, r, n;
  return (
    {}.toString.call(e) === '[object String]' && ((t = ERROR_TYPES_RE.exec(e)), (r = t[1]), (n = t[2])),
    {name: r, message: n}
  );
}
function createHandlingStack() {
  var e = 2,
    t = new Error(),
    r;
  if (!t.stack)
    try {
      throw t;
    } catch {}
  return (
    callMonitored(function () {
      var n = computeStackTrace(t);
      ((n.stack = n.stack.slice(e)), (r = toStackTraceString(n)));
    }),
    r
  );
}
function toStackTraceString(e) {
  var t = formatErrorMessage(e);
  return (
    e.stack.forEach(function (r) {
      var n = r.func === '?' ? '<anonymous>' : r.func,
        a = r.args && r.args.length > 0 ? '('.concat(r.args.join(', '), ')') : '',
        i = r.line ? ':'.concat(r.line) : '',
        o = r.line && r.column ? ':'.concat(r.column) : '';
      t += `
  at `
        .concat(n)
        .concat(a, ' @ ')
        .concat(r.url)
        .concat(i)
        .concat(o);
    }),
    t
  );
}
function formatErrorMessage(e) {
  return ''.concat(e.name || 'Error', ': ').concat(e.message);
}
function instrumentMethod(e, t, r, n) {
  var a = n === void 0 ? {} : n,
    i = a.computeHandlingStack,
    o = e[t];
  if (typeof o != 'function')
    if (t in e && startsWith(t, 'on')) o = noop;
    else return {stop: noop};
  var s = !1,
    c = function () {
      if (s) return o.apply(this, arguments);
      var u = arrayFrom(arguments),
        d;
      callMonitored(r, null, [
        {
          target: this,
          parameters: u,
          onPostCall: function (l) {
            d = l;
          },
          handlingStack: i ? createHandlingStack() : void 0,
        },
      ]);
      var f = o.apply(this, u);
      return (d && callMonitored(d, null, [f]), f);
    };
  return (
    (e[t] = c),
    {
      stop: function () {
        ((s = !0), e[t] === c && (e[t] = o));
      },
    }
  );
}
function instrumentSetter(e, t, r) {
  var n = Object.getOwnPropertyDescriptor(e, t);
  if (!n || !n.set || !n.configurable) return {stop: noop};
  var a = noop,
    i = function (s, c) {
      setTimeout(function () {
        i !== a && r(s, c);
      }, 0);
    },
    o = function (s) {
      (n.set.call(this, s), i(this, s));
    };
  return (
    Object.defineProperty(e, t, {
      set: o,
    }),
    {
      stop: function () {
        var s;
        (((s = Object.getOwnPropertyDescriptor(e, t)) === null || s === void 0 ? void 0 : s.set) === o &&
          Object.defineProperty(e, t, n),
          (i = a));
      },
    }
  );
}
var SANITIZE_DEFAULT_MAX_CHARACTER_COUNT = 220 * ONE_KIBI_BYTE,
  JSON_PATH_ROOT_ELEMENT = '$',
  KEY_DECORATION_LENGTH = 3;
function sanitize(e, t) {
  t === void 0 && (t = SANITIZE_DEFAULT_MAX_CHARACTER_COUNT);
  var r = detachToJsonMethod(Object.prototype),
    n = detachToJsonMethod(Array.prototype),
    a = [],
    i = /* @__PURE__ */ new WeakMap(),
    o = sanitizeProcessor(e, JSON_PATH_ROOT_ELEMENT, void 0, a, i),
    s = JSON.stringify(o),
    c = s ? s.length : 0;
  if (c > t) {
    warnOverCharacterLimit(t, 'discarded', e);
    return;
  }
  for (; a.length > 0 && c < t; ) {
    var u = a.shift(),
      d = 0;
    if (Array.isArray(u.source))
      for (var f = 0; f < u.source.length; f++) {
        var l = sanitizeProcessor(u.source[f], u.path, f, a, i);
        if ((l !== void 0 ? (c += JSON.stringify(l).length) : (c += 4), (c += d), (d = 1), c > t)) {
          warnOverCharacterLimit(t, 'truncated', e);
          break;
        }
        u.target[f] = l;
      }
    else
      for (var f in u.source)
        if (Object.prototype.hasOwnProperty.call(u.source, f)) {
          var l = sanitizeProcessor(u.source[f], u.path, f, a, i);
          if (
            (l !== void 0 && ((c += JSON.stringify(l).length + d + f.length + KEY_DECORATION_LENGTH), (d = 1)), c > t)
          ) {
            warnOverCharacterLimit(t, 'truncated', e);
            break;
          }
          u.target[f] = l;
        }
  }
  return (r(), n(), o);
}
function sanitizeProcessor(e, t, r, n, a) {
  var i = tryToApplyToJSON(e);
  if (!i || typeof i != 'object') return sanitizePrimitivesAndFunctions(i);
  var o = sanitizeObjects(i);
  if (o !== '[Object]' && o !== '[Array]' && o !== '[Error]') return o;
  var s = e;
  if (a.has(s)) return '[Reference seen at '.concat(a.get(s), ']');
  var c = r !== void 0 ? ''.concat(t, '.').concat(r) : t,
    u = Array.isArray(i) ? [] : {};
  return (a.set(s, c), n.push({source: i, target: u, path: c}), u);
}
function sanitizePrimitivesAndFunctions(e) {
  return typeof e == 'bigint'
    ? '[BigInt] '.concat(e.toString())
    : typeof e == 'function'
      ? '[Function] '.concat(e.name || 'unknown')
      : typeof e == 'symbol'
        ? '[Symbol] '.concat(e.description || e.toString())
        : e;
}
function sanitizeObjects(e) {
  try {
    if (e instanceof Event)
      return {
        isTrusted: e.isTrusted,
      };
    var t = Object.prototype.toString.call(e),
      r = t.match(/\[object (.*)\]/);
    if (r && r[1]) return '['.concat(r[1], ']');
  } catch {}
  return '[Unserializable]';
}
function tryToApplyToJSON(e) {
  var t = e;
  if (t && typeof t.toJSON == 'function')
    try {
      return t.toJSON();
    } catch {}
  return e;
}
function warnOverCharacterLimit(e, t, r) {
  display.warn('The data provided has been '.concat(t, ' as it is over the limit of ').concat(e, ' characters:'), r);
}
var NO_ERROR_STACK_PRESENT_MESSAGE = 'No stack, consider using an instance of Error';
function computeRawError(e) {
  var t = e.stackTrace,
    r = e.originalError,
    n = e.handlingStack,
    a = e.startClocks,
    i = e.nonErrorPrefix,
    o = e.source,
    s = e.handling,
    c = isError(r),
    u = computeMessage(t, c, i, r),
    d = hasUsableStack(c, t) ? toStackTraceString(t) : NO_ERROR_STACK_PRESENT_MESSAGE,
    f = c ? flattenErrorCauses(r, o) : void 0,
    l = t ? t.name : void 0,
    p = tryToGetFingerprint(r);
  return {
    startClocks: a,
    source: o,
    handling: s,
    handlingStack: n,
    originalError: r,
    type: l,
    message: u,
    stack: d,
    causes: f,
    fingerprint: p,
  };
}
function computeMessage(e, t, r, n) {
  return e?.message && e?.name ? e.message : t ? 'Empty message' : ''.concat(r, ' ').concat(jsonStringify(sanitize(n)));
}
function hasUsableStack(e, t) {
  return t === void 0 ? !1 : e ? !0 : t.stack.length > 0 && (t.stack.length > 1 || t.stack[0].url !== void 0);
}
function tryToGetFingerprint(e) {
  return isError(e) && 'dd_fingerprint' in e ? String(e.dd_fingerprint) : void 0;
}
function getFileFromStackTraceString(e) {
  var t;
  return (t = /@ (.+)/.exec(e)) === null || t === void 0 ? void 0 : t[1];
}
function isError(e) {
  return e instanceof Error || Object.prototype.toString.call(e) === '[object Error]';
}
function flattenErrorCauses(e, t) {
  for (var r = e, n = []; isError(r?.cause) && n.length < 10; ) {
    var a = computeStackTrace(r.cause);
    (n.push({
      message: r.cause.message,
      source: t,
      type: a?.name,
      stack: a && toStackTraceString(a),
    }),
      (r = r.cause));
  }
  return n.length ? n : void 0;
}
var ErrorSource = {
  AGENT: 'agent',
  CONSOLE: 'console',
  CUSTOM: 'custom',
  LOGGER: 'logger',
  NETWORK: 'network',
  SOURCE: 'source',
  REPORT: 'report',
};
function trackRuntimeError(e) {
  var t = function (a, i) {
      var o = computeRawError({
        stackTrace: a,
        originalError: i,
        startClocks: clocksNow(),
        nonErrorPrefix: 'Uncaught',
        source: ErrorSource.SOURCE,
        handling: 'unhandled',
      });
      e.notify(o);
    },
    r = instrumentOnError(t).stop,
    n = instrumentUnhandledRejection(t).stop;
  return {
    stop: function () {
      (r(), n());
    },
  };
}
function instrumentOnError(e) {
  return instrumentMethod(window, 'onerror', function (t) {
    var r = t.parameters,
      n = r[0],
      a = r[1],
      i = r[2],
      o = r[3],
      s = r[4],
      c;
    (isError(s) ? (c = computeStackTrace(s)) : (c = computeStackTraceFromOnErrorMessage(n, a, i, o)), e(c, s ?? n));
  });
}
function instrumentUnhandledRejection(e) {
  return instrumentMethod(window, 'onunhandledrejection', function (t) {
    var r = t.parameters[0],
      n = r.reason || 'Empty reason',
      a = computeStackTrace(n);
    e(a, n);
  });
}
function makePublicApi(e) {
  var t = assign(
    {
      version: '5.35.1',
      // This API method is intentionally not monitored, since the only thing executed is the
      // user-provided 'callback'.  All SDK usages executed in the callback should be monitored, and
      // we don't want to interfere with the user uncaught exceptions.
      onReady: function (r) {
        r();
      },
    },
    e,
  );
  return (
    Object.defineProperty(t, '_setDebug', {
      get: function () {
        return setDebugMode;
      },
      enumerable: !1,
    }),
    t
  );
}
function defineGlobal(e, t, r) {
  var n = e[t];
  (n &&
    !n.q &&
    n.version &&
    display.warn('SDK is loaded more than once. This is unsupported and might have unexpected behavior.'),
    (e[t] = r),
    n &&
      n.q &&
      n.q.forEach(function (a) {
        return catchUserErrors(a, 'onReady callback threw an error:')();
      }));
}
function displayAlreadyInitializedError(e, t) {
  t.silentMultipleInit || display.error(''.concat(e, ' is already initialized.'));
}
function addEventListener(e, t, r, n, a) {
  return addEventListeners(e, t, [r], n, a);
}
function addEventListeners(e, t, r, n, a) {
  var i = a === void 0 ? {} : a,
    o = i.once,
    s = i.capture,
    c = i.passive,
    u = monitor(function (g) {
      (!g.isTrusted && !g.__ddIsTrusted && !e.allowUntrustedEvents) || (o && p(), n(g));
    }),
    d = c ? {capture: s, passive: c} : s,
    f = window.EventTarget && t instanceof EventTarget ? window.EventTarget.prototype : t,
    l = getZoneJsOriginalValue(f, 'addEventListener');
  r.forEach(function (g) {
    return l.call(t, g, u, d);
  });
  function p() {
    var g = getZoneJsOriginalValue(f, 'removeEventListener');
    r.forEach(function (v) {
      return g.call(t, v, u, d);
    });
  }
  return {
    stop: p,
  };
}
var RawReportType = {
  intervention: 'intervention',
  deprecation: 'deprecation',
  cspViolation: 'csp_violation',
};
function initReportObservable(e, t) {
  var r = [];
  includes(t, RawReportType.cspViolation) && r.push(createCspViolationReportObservable(e));
  var n = t.filter(function (a) {
    return a !== RawReportType.cspViolation;
  });
  return (n.length && r.push(createReportObservable(n)), mergeObservables.apply(void 0, r));
}
function createReportObservable(e) {
  return new Observable(function (t) {
    if (window.ReportingObserver) {
      var r = monitor(function (a, i) {
          return a.forEach(function (o) {
            return t.notify(buildRawReportErrorFromReport(o));
          });
        }),
        n = new window.ReportingObserver(r, {
          types: e,
          buffered: !0,
        });
      return (
        n.observe(),
        function () {
          n.disconnect();
        }
      );
    }
  });
}
function createCspViolationReportObservable(e) {
  return new Observable(function (t) {
    var r = addEventListener(e, document, 'securitypolicyviolation', function (n) {
      t.notify(buildRawReportErrorFromCspViolation(n));
    }).stop;
    return r;
  });
}
function buildRawReportErrorFromReport(e) {
  var t = e.type,
    r = e.body;
  return buildRawReportError({
    type: r.id,
    message: ''.concat(t, ': ').concat(r.message),
    originalError: e,
    stack: buildStack(r.id, r.message, r.sourceFile, r.lineNumber, r.columnNumber),
  });
}
function buildRawReportErrorFromCspViolation(e) {
  var t = "'".concat(e.blockedURI, "' blocked by '").concat(e.effectiveDirective, "' directive");
  return buildRawReportError({
    type: e.effectiveDirective,
    message: ''.concat(RawReportType.cspViolation, ': ').concat(t),
    originalError: e,
    csp: {
      disposition: e.disposition,
    },
    stack: buildStack(
      e.effectiveDirective,
      e.originalPolicy
        ? ''.concat(t, ' of the policy "').concat(safeTruncate(e.originalPolicy, 100, '...'), '"')
        : 'no policy',
      e.sourceFile,
      e.lineNumber,
      e.columnNumber,
    ),
  });
}
function buildRawReportError(e) {
  return assign(
    {
      startClocks: clocksNow(),
      source: ErrorSource.REPORT,
      handling: 'unhandled',
    },
    e,
  );
}
function buildStack(e, t, r, n, a) {
  return r
    ? toStackTraceString({
        name: e,
        message: t,
        stack: [
          {
            func: '?',
            url: r,
            line: n ?? void 0,
            column: a ?? void 0,
          },
        ],
      })
    : void 0;
}
function sendToExtension(e, t) {
  var r = window.__ddBrowserSdkExtensionCallback;
  r && r({type: e, payload: t});
}
function mergeInto(e, t, r) {
  if ((r === void 0 && (r = createCircularReferenceChecker()), t === void 0)) return e;
  if (typeof t != 'object' || t === null) return t;
  if (t instanceof Date) return new Date(t.getTime());
  if (t instanceof RegExp) {
    var n =
      t.flags || // old browsers compatibility
      [
        t.global ? 'g' : '',
        t.ignoreCase ? 'i' : '',
        t.multiline ? 'm' : '',
        t.sticky ? 'y' : '',
        t.unicode ? 'u' : '',
      ].join('');
    return new RegExp(t.source, n);
  }
  if (!r.hasAlreadyBeenSeen(t)) {
    if (Array.isArray(t)) {
      for (var a = Array.isArray(e) ? e : [], i = 0; i < t.length; ++i) a[i] = mergeInto(a[i], t[i], r);
      return a;
    }
    var o = getType(e) === 'object' ? e : {};
    for (var s in t) Object.prototype.hasOwnProperty.call(t, s) && (o[s] = mergeInto(o[s], t[s], r));
    return o;
  }
}
function deepClone(e) {
  return mergeInto(void 0, e);
}
function combine() {
  for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
  for (var r, n = 0, a = e; n < a.length; n++) {
    var i = a[n];
    i != null && (r = mergeInto(r, i));
  }
  return r;
}
function createCircularReferenceChecker() {
  if (typeof WeakSet < 'u') {
    var e = /* @__PURE__ */ new WeakSet();
    return {
      hasAlreadyBeenSeen: function (r) {
        var n = e.has(r);
        return (n || e.add(r), n);
      },
    };
  }
  var t = [];
  return {
    hasAlreadyBeenSeen: function (r) {
      var n = t.indexOf(r) >= 0;
      return (n || t.push(r), n);
    },
  };
}
function getConnectivity() {
  var e,
    t = window.navigator;
  return {
    status: t.onLine ? 'connected' : 'not_connected',
    interfaces: t.connection && t.connection.type ? [t.connection.type] : void 0,
    effective_type: (e = t.connection) === null || e === void 0 ? void 0 : e.effectiveType,
  };
}
function removeDuplicates(e) {
  var t = /* @__PURE__ */ new Set();
  return (
    e.forEach(function (r) {
      return t.add(r);
    }),
    arrayFrom(t)
  );
}
function removeItem(e, t) {
  var r = e.indexOf(t);
  r >= 0 && e.splice(r, 1);
}
var BUFFER_LIMIT = 500;
function createBoundedBuffer() {
  var e = [],
    t = function (a) {
      var i = e.push(a);
      i > BUFFER_LIMIT && e.splice(0, 1);
    },
    r = function (a) {
      removeItem(e, a);
    },
    n = function (a) {
      (e.forEach(function (i) {
        return i(a);
      }),
        (e.length = 0));
    };
  return {
    add: t,
    remove: r,
    drain: n,
  };
}
var TelemetryType = {
    log: 'log',
    configuration: 'configuration',
    usage: 'usage',
  },
  ALLOWED_FRAME_URLS = [
    'https://www.datadoghq-browser-agent.com',
    'https://www.datad0g-browser-agent.com',
    'https://d3uc069fcn7uxw.cloudfront.net',
    'https://d20xtzwzcl0ceb.cloudfront.net',
    'http://localhost',
    '<anonymous>',
  ],
  TELEMETRY_EXCLUDED_SITES = [INTAKE_SITE_US1_FED],
  preStartTelemetryBuffer = createBoundedBuffer(),
  onRawTelemetryEventCollected = function (e) {
    preStartTelemetryBuffer.add(function () {
      return onRawTelemetryEventCollected(e);
    });
  };
function startTelemetry(e, t) {
  var r,
    n,
    a = new Observable(),
    i = /* @__PURE__ */ new Set(),
    o = !includes(TELEMETRY_EXCLUDED_SITES, t.site) && performDraw(t.telemetrySampleRate),
    s =
      ((r = {}),
      (r[TelemetryType.log] = o),
      (r[TelemetryType.configuration] = o && performDraw(t.telemetryConfigurationSampleRate)),
      (r[TelemetryType.usage] = o && performDraw(t.telemetryUsageSampleRate)),
      r),
    c = getRuntimeEnvInfo();
  ((onRawTelemetryEventCollected = function (d) {
    var f = jsonStringify(d);
    if (s[d.type] && i.size < t.maxTelemetryEventsPerPage && !i.has(f)) {
      var l = u(e, d, c);
      (a.notify(l), sendToExtension('telemetry', l), i.add(f));
    }
  }),
    startMonitorErrorCollection(addTelemetryError));
  function u(d, f, l) {
    return combine(
      {
        type: 'telemetry',
        date: timeStampNow(),
        service: d,
        version: '5.35.1',
        source: 'browser',
        _dd: {
          format_version: 2,
        },
        telemetry: combine(f, {
          runtime_env: l,
          connectivity: getConnectivity(),
          sdk_setup: 'npm',
        }),
        experimental_features: arrayFrom(getExperimentalFeatures()),
      },
      n !== void 0 ? n() : {},
    );
  }
  return {
    setContextProvider: function (d) {
      n = d;
    },
    observable: a,
    enabled: o,
  };
}
function getRuntimeEnvInfo() {
  return {
    is_local_file: window.location.protocol === 'file:',
    is_worker: 'WorkerGlobalScope' in self,
  };
}
function drainPreStartTelemetry() {
  preStartTelemetryBuffer.drain();
}
function isTelemetryReplicationAllowed(e) {
  return e.site === INTAKE_SITE_STAGING;
}
function addTelemetryDebug(e, t) {
  (displayIfDebugEnabled(ConsoleApiName.debug, e, t),
    onRawTelemetryEventCollected(
      assign(
        {
          type: TelemetryType.log,
          message: e,
          status: 'debug',
        },
        t,
      ),
    ));
}
function addTelemetryError(e, t) {
  onRawTelemetryEventCollected(
    assign(
      {
        type: TelemetryType.log,
        status: 'error',
      },
      formatError(e),
      t,
    ),
  );
}
function addTelemetryConfiguration(e) {
  onRawTelemetryEventCollected({
    type: TelemetryType.configuration,
    configuration: e,
  });
}
function addTelemetryUsage(e) {
  onRawTelemetryEventCollected({
    type: TelemetryType.usage,
    usage: e,
  });
}
function formatError(e) {
  if (isError(e)) {
    var t = computeStackTrace(e);
    return {
      error: {
        kind: t.name,
        stack: toStackTraceString(scrubCustomerFrames(t)),
      },
      message: t.message,
    };
  }
  return {
    error: {
      stack: NO_ERROR_STACK_PRESENT_MESSAGE,
    },
    message: ''.concat('Uncaught', ' ').concat(jsonStringify(e)),
  };
}
function scrubCustomerFrames(e) {
  return (
    (e.stack = e.stack.filter(function (t) {
      return (
        !t.url ||
        ALLOWED_FRAME_URLS.some(function (r) {
          return startsWith(t.url, r);
        })
      );
    })),
    e
  );
}
var END_OF_TIMES = 1 / 0,
  CLEAR_OLD_VALUES_INTERVAL = ONE_MINUTE;
function createValueHistory(e) {
  var t = e.expireDelay,
    r = e.maxEntries,
    n = [],
    a = setInterval(function () {
      return i();
    }, CLEAR_OLD_VALUES_INTERVAL);
  function i() {
    for (var l = relativeNow() - t; n.length > 0 && n[n.length - 1].endTime < l; ) n.pop();
  }
  function o(l, p) {
    var g = {
      value: l,
      startTime: p,
      endTime: END_OF_TIMES,
      remove: function () {
        removeItem(n, g);
      },
      close: function (v) {
        g.endTime = v;
      },
    };
    return (r && n.length >= r && n.pop(), n.unshift(g), g);
  }
  function s(l, p) {
    (l === void 0 && (l = END_OF_TIMES), p === void 0 && (p = {returnInactive: !1}));
    for (var g = 0, v = n; g < v.length; g++) {
      var m = v[g];
      if (m.startTime <= l) {
        if (p.returnInactive || l <= m.endTime) return m.value;
        break;
      }
    }
  }
  function c(l) {
    var p = n[0];
    p && p.endTime === END_OF_TIMES && p.close(l);
  }
  function u(l, p) {
    (l === void 0 && (l = END_OF_TIMES), p === void 0 && (p = 0));
    var g = addDuration(l, p);
    return n
      .filter(function (v) {
        return v.startTime <= g && l <= v.endTime;
      })
      .map(function (v) {
        return v.value;
      });
  }
  function d() {
    n = [];
  }
  function f() {
    clearInterval(a);
  }
  return {add: o, find: s, closeActive: c, findAll: u, reset: d, stop: f};
}
var VISIBILITY_CHECK_DELAY = ONE_MINUTE,
  SESSION_CONTEXT_TIMEOUT_DELAY = SESSION_TIME_OUT_DELAY;
function startSessionManager(e, t, r, n) {
  var a = new Observable(),
    i = new Observable(),
    o = startSessionStore(e.sessionStoreStrategyType, t, r),
    s = createValueHistory({
      expireDelay: SESSION_CONTEXT_TIMEOUT_DELAY,
    });
  (o.renewObservable.subscribe(function () {
    (s.add(c(), relativeNow()), a.notify());
  }),
    o.expireObservable.subscribe(function () {
      (i.notify(), s.closeActive(relativeNow()));
    }),
    o.expandOrRenewSession(),
    s.add(c(), clocksOrigin().relative),
    n.observable.subscribe(function () {
      n.isGranted() ? o.expandOrRenewSession() : o.expire();
    }),
    trackActivity(e, function () {
      n.isGranted() && o.expandOrRenewSession();
    }),
    trackVisibility(e, function () {
      return o.expandSession();
    }),
    trackResume(e, function () {
      return o.restartSession();
    }));
  function c() {
    return {
      id: o.getSession().id,
      trackingType: o.getSession()[t],
      isReplayForced: !!o.getSession().forcedReplay,
      anonymousId: o.getSession().anonymousId,
    };
  }
  return {
    findSession: function (u, d) {
      return s.find(u, d);
    },
    renewObservable: a,
    expireObservable: i,
    sessionStateUpdateObservable: o.sessionStateUpdateObservable,
    expire: o.expire,
    updateSessionState: o.updateSessionState,
  };
}
function trackActivity(e, t) {
  addEventListeners(
    e,
    window,
    [
      'click',
      'touchstart',
      'keydown',
      'scroll',
      /* DOM_EVENT.SCROLL */
    ],
    t,
    {capture: !0, passive: !0},
  ).stop;
}
function trackVisibility(e, t) {
  var r = function () {
    document.visibilityState === 'visible' && t();
  };
  (addEventListener(e, document, 'visibilitychange', r).stop, setInterval(r, VISIBILITY_CHECK_DELAY));
}
function trackResume(e, t) {
  addEventListener(e, window, 'resume', t, {capture: !0}).stop;
}
function isServerError(e) {
  return e >= 500;
}
function tryToClone(e) {
  try {
    return e.clone();
  } catch {
    return;
  }
}
var MAX_ONGOING_BYTES_COUNT = 80 * ONE_KIBI_BYTE,
  MAX_ONGOING_REQUESTS = 32,
  MAX_QUEUE_BYTES_COUNT = 3 * ONE_MEBI_BYTE,
  MAX_BACKOFF_TIME = ONE_MINUTE,
  INITIAL_BACKOFF_TIME = ONE_SECOND;
function sendWithRetryStrategy(e, t, r, n, a) {
  t.transportStatus === 0 && t.queuedPayloads.size() === 0 && t.bandwidthMonitor.canHandle(e)
    ? send(e, t, r, {
        onSuccess: function () {
          return retryQueuedPayloads(0, t, r, n, a);
        },
        onFailure: function () {
          (t.queuedPayloads.enqueue(e), scheduleRetry(t, r, n, a));
        },
      })
    : t.queuedPayloads.enqueue(e);
}
function scheduleRetry(e, t, r, n) {
  e.transportStatus === 2 &&
    setTimeout(function () {
      var a = e.queuedPayloads.first();
      send(a, e, t, {
        onSuccess: function () {
          (e.queuedPayloads.dequeue(),
            (e.currentBackoffTime = INITIAL_BACKOFF_TIME),
            retryQueuedPayloads(1, e, t, r, n));
        },
        onFailure: function () {
          ((e.currentBackoffTime = Math.min(MAX_BACKOFF_TIME, e.currentBackoffTime * 2)), scheduleRetry(e, t, r, n));
        },
      });
    }, e.currentBackoffTime);
}
function send(e, t, r, n) {
  var a = n.onSuccess,
    i = n.onFailure;
  (t.bandwidthMonitor.add(e),
    r(e, function (o) {
      (t.bandwidthMonitor.remove(e),
        shouldRetryRequest(o)
          ? ((t.transportStatus = t.bandwidthMonitor.ongoingRequestCount > 0 ? 1 : 2),
            (e.retry = {
              count: e.retry ? e.retry.count + 1 : 1,
              lastFailureStatus: o.status,
            }),
            i())
          : ((t.transportStatus = 0), a()));
    }));
}
function retryQueuedPayloads(e, t, r, n, a) {
  e === 0 &&
    t.queuedPayloads.isFull() &&
    !t.queueFullReported &&
    (a({
      message: 'Reached max '
        .concat(n, ' events size queued for upload: ')
        .concat(MAX_QUEUE_BYTES_COUNT / ONE_MEBI_BYTE, 'MiB'),
      source: ErrorSource.AGENT,
      startClocks: clocksNow(),
    }),
    (t.queueFullReported = !0));
  var i = t.queuedPayloads;
  for (t.queuedPayloads = newPayloadQueue(); i.size() > 0; ) sendWithRetryStrategy(i.dequeue(), t, r, n, a);
}
function shouldRetryRequest(e) {
  return (
    e.type !== 'opaque' &&
    ((e.status === 0 && !navigator.onLine) || e.status === 408 || e.status === 429 || isServerError(e.status))
  );
}
function newRetryState() {
  return {
    transportStatus: 0,
    currentBackoffTime: INITIAL_BACKOFF_TIME,
    bandwidthMonitor: newBandwidthMonitor(),
    queuedPayloads: newPayloadQueue(),
    queueFullReported: !1,
  };
}
function newPayloadQueue() {
  var e = [];
  return {
    bytesCount: 0,
    enqueue: function (t) {
      this.isFull() || (e.push(t), (this.bytesCount += t.bytesCount));
    },
    first: function () {
      return e[0];
    },
    dequeue: function () {
      var t = e.shift();
      return (t && (this.bytesCount -= t.bytesCount), t);
    },
    size: function () {
      return e.length;
    },
    isFull: function () {
      return this.bytesCount >= MAX_QUEUE_BYTES_COUNT;
    },
  };
}
function newBandwidthMonitor() {
  return {
    ongoingRequestCount: 0,
    ongoingByteCount: 0,
    canHandle: function (e) {
      return (
        this.ongoingRequestCount === 0 ||
        (this.ongoingByteCount + e.bytesCount <= MAX_ONGOING_BYTES_COUNT &&
          this.ongoingRequestCount < MAX_ONGOING_REQUESTS)
      );
    },
    add: function (e) {
      ((this.ongoingRequestCount += 1), (this.ongoingByteCount += e.bytesCount));
    },
    remove: function (e) {
      ((this.ongoingRequestCount -= 1), (this.ongoingByteCount -= e.bytesCount));
    },
  };
}
function createHttpRequest(e, t, r) {
  var n = newRetryState(),
    a = function (i, o) {
      return fetchKeepAliveStrategy(e, t, i, o);
    };
  return {
    send: function (i) {
      sendWithRetryStrategy(i, n, a, e.trackType, r);
    },
    /**
     * Since fetch keepalive behaves like regular fetch on Firefox,
     * keep using sendBeaconStrategy on exit
     */
    sendOnExit: function (i) {
      sendBeaconStrategy(e, t, i);
    },
  };
}
function sendBeaconStrategy(e, t, r) {
  var n = !!navigator.sendBeacon && r.bytesCount < t;
  if (n)
    try {
      var a = e.build('beacon', r),
        i = navigator.sendBeacon(a, r.data);
      if (i) return;
    } catch (s) {
      reportBeaconError(s);
    }
  var o = e.build('xhr', r);
  sendXHR(o, r.data);
}
var hasReportedBeaconError = !1;
function reportBeaconError(e) {
  hasReportedBeaconError || ((hasReportedBeaconError = !0), addTelemetryError(e));
}
function fetchKeepAliveStrategy(e, t, r, n) {
  var a = isKeepAliveSupported() && r.bytesCount < t;
  if (a) {
    var i = e.build('fetch', r);
    fetch(i, {method: 'POST', body: r.data, keepalive: !0, mode: 'cors'}).then(
      monitor(function (s) {
        return n?.({status: s.status, type: s.type});
      }),
      monitor(function () {
        var s = e.build('xhr', r);
        sendXHR(s, r.data, n);
      }),
    );
  } else {
    var o = e.build('xhr', r);
    sendXHR(o, r.data, n);
  }
}
function isKeepAliveSupported() {
  try {
    return window.Request && 'keepalive' in new Request('http://a');
  } catch {
    return !1;
  }
}
function sendXHR(e, t, r) {
  var n = new XMLHttpRequest();
  (n.open('POST', e, !0),
    t instanceof Blob && n.setRequestHeader('Content-Type', t.type),
    addEventListener(
      // allow untrusted event to acount for synthetic event dispatched by third party xhr wrapper
      {allowUntrustedEvents: !0},
      n,
      'loadend',
      function () {
        r?.({status: n.status});
      },
      {
        // prevent multiple onResponse callbacks
        // if the xhr instance is reused by a third party
        once: !0,
      },
    ),
    n.send(t));
}
function getEventBridge() {
  var e = getEventBridgeGlobal();
  if (e)
    return {
      getCapabilities: function () {
        var t;
        return JSON.parse(((t = e.getCapabilities) === null || t === void 0 ? void 0 : t.call(e)) || '[]');
      },
      getPrivacyLevel: function () {
        var t;
        return (t = e.getPrivacyLevel) === null || t === void 0 ? void 0 : t.call(e);
      },
      getAllowedWebViewHosts: function () {
        return JSON.parse(e.getAllowedWebViewHosts());
      },
      send: function (t, r, n) {
        var a = n ? {id: n} : void 0;
        e.send(JSON.stringify({eventType: t, event: r, view: a}));
      },
    };
}
function bridgeSupports(e) {
  var t = getEventBridge();
  return !!t && includes(t.getCapabilities(), e);
}
function canUseEventBridge(e) {
  var t;
  e === void 0 && (e = (t = getGlobalObject().location) === null || t === void 0 ? void 0 : t.hostname);
  var r = getEventBridge();
  return (
    !!r &&
    r.getAllowedWebViewHosts().some(function (n) {
      return e === n || endsWith(e, '.'.concat(n));
    })
  );
}
function getEventBridgeGlobal() {
  return getGlobalObject().DatadogEventBridge;
}
var PageExitReason = {
  HIDDEN: 'visibility_hidden',
  UNLOADING: 'before_unload',
  PAGEHIDE: 'page_hide',
  FROZEN: 'page_frozen',
};
function createPageExitObservable(e) {
  return new Observable(function (t) {
    var r = addEventListeners(
        e,
        window,
        [
          'visibilitychange',
          'freeze',
          /* DOM_EVENT.FREEZE */
        ],
        function (a) {
          a.type === 'visibilitychange' && document.visibilityState === 'hidden'
            ? t.notify({reason: PageExitReason.HIDDEN})
            : a.type === 'freeze' && t.notify({reason: PageExitReason.FROZEN});
        },
        {capture: !0},
      ).stop,
      n = addEventListener(e, window, 'beforeunload', function () {
        t.notify({reason: PageExitReason.UNLOADING});
      }).stop;
    return function () {
      (r(), n());
    };
  });
}
function isPageExitReason(e) {
  return includes(objectValues(PageExitReason), e);
}
function createBatch(e) {
  var t = e.encoder,
    r = e.request,
    n = e.flushController,
    a = e.messageBytesLimit,
    i = {},
    o = n.flushObservable.subscribe(function (l) {
      return f(l);
    });
  function s(l, p, g) {
    (n.notifyBeforeAddMessage(p),
      g !== void 0
        ? ((i[g] = l), n.notifyAfterAddMessage())
        : t.write(
            t.isEmpty
              ? l
              : `
`.concat(l),
            function (v) {
              n.notifyAfterAddMessage(v - p);
            },
          ));
  }
  function c(l) {
    return l !== void 0 && i[l] !== void 0;
  }
  function u(l) {
    var p = i[l];
    delete i[l];
    var g = t.estimateEncodedBytesCount(p);
    n.notifyAfterRemoveMessage(g);
  }
  function d(l, p) {
    var g = jsonStringify(l),
      v = t.estimateEncodedBytesCount(g);
    if (v >= a) {
      display.warn(
        'Discarded a message whose size was bigger than the maximum allowed size '
          .concat(a, 'KB. ')
          .concat(MORE_DETAILS, ' ')
          .concat(DOCS_TROUBLESHOOTING, '/#technical-limitations'),
      );
      return;
    }
    (c(p) && u(p), s(g, v, p));
  }
  function f(l) {
    var p = objectValues(i).join(`
`);
    i = {};
    var g = isPageExitReason(l.reason),
      v = g ? r.sendOnExit : r.send;
    if (
      g && // Note: checking that the encoder is async is not strictly needed, but it's an optimization:
      // if the encoder is async we need to send two requests in some cases (one for encoded data
      // and the other for non-encoded data). But if it's not async, we don't have to worry about
      // it and always send a single request.
      t.isAsync
    ) {
      var m = t.finishSync();
      m.outputBytesCount && v(formatPayloadFromEncoder(m));
      var h = [m.pendingData, p].filter(Boolean).join(`
`);
      h &&
        v({
          data: h,
          bytesCount: computeBytesCount(h),
        });
    } else
      (p &&
        t.write(
          t.isEmpty
            ? p
            : `
`.concat(p),
        ),
        t.finish(function (S) {
          v(formatPayloadFromEncoder(S));
        }));
  }
  return {
    flushController: n,
    add: d,
    upsert: d,
    stop: o.unsubscribe,
  };
}
function formatPayloadFromEncoder(e) {
  var t;
  return (
    typeof e.output == 'string'
      ? (t = e.output)
      : (t = new Blob([e.output], {
          // This will set the 'Content-Type: text/plain' header. Reasoning:
          // * The intake rejects the request if there is no content type.
          // * The browser will issue CORS preflight requests if we set it to 'application/json', which
          // could induce higher intake load (and maybe has other impacts).
          // * Also it's not quite JSON, since we are concatenating multiple JSON objects separated by
          // new lines.
          type: 'text/plain',
        })),
    {
      data: t,
      bytesCount: e.outputBytesCount,
      encoding: e.encoding,
    }
  );
}
function createFlushController(e) {
  var t = e.messagesLimit,
    r = e.bytesLimit,
    n = e.durationLimit,
    a = e.pageExitObservable,
    i = e.sessionExpireObservable,
    o = a.subscribe(function (v) {
      return f(v.reason);
    }),
    s = i.subscribe(function () {
      return f('session_expire');
    }),
    c = new Observable(function () {
      return function () {
        (o.unsubscribe(), s.unsubscribe());
      };
    }),
    u = 0,
    d = 0;
  function f(v) {
    if (d !== 0) {
      var m = d,
        h = u;
      ((d = 0),
        (u = 0),
        g(),
        c.notify({
          reason: v,
          messagesCount: m,
          bytesCount: h,
        }));
    }
  }
  var l;
  function p() {
    l === void 0 &&
      (l = setTimeout(function () {
        f('duration_limit');
      }, n));
  }
  function g() {
    (clearTimeout(l), (l = void 0));
  }
  return {
    flushObservable: c,
    get messagesCount() {
      return d;
    },
    /**
     * Notifies that a message will be added to a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right before adding the message, so no flush
     * event can happen after `notifyBeforeAddMessage` and before adding the message.
     *
     * @param estimatedMessageBytesCount: an estimation of the message bytes count once it is
     * actually added.
     */
    notifyBeforeAddMessage: function (v) {
      (u + v >= r && f('bytes_limit'), (d += 1), (u += v), p());
    },
    /**
     * Notifies that a message *was* added to a pool of pending messages waiting to be flushed.
     *
     * This function can be called asynchronously after the message was added, but in this case it
     * should not be called if a flush event occurred in between.
     *
     * @param messageBytesCountDiff: the difference between the estimated message bytes count and
     * its actual bytes count once added to the pool.
     */
    notifyAfterAddMessage: function (v) {
      (v === void 0 && (v = 0), (u += v), d >= t ? f('messages_limit') : u >= r && f('bytes_limit'));
    },
    /**
     * Notifies that a message was removed from a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right after removing the message, so no flush
     * event can happen after removing the message and before `notifyAfterRemoveMessage`.
     *
     * @param messageBytesCount: the message bytes count that was added to the pool. Should
     * correspond to the sum of bytes counts passed to `notifyBeforeAddMessage` and
     * `notifyAfterAddMessage`.
     */
    notifyAfterRemoveMessage: function (v) {
      ((u -= v), (d -= 1), d === 0 && g());
    },
  };
}
function startBatchWithReplica(e, t, r, n, a, i, o) {
  o === void 0 && (o = createBatch);
  var s = u(e, t),
    c = r && u(e, r);
  function u(d, f) {
    var l = f.endpoint,
      p = f.encoder;
    return o({
      encoder: p,
      request: createHttpRequest(l, d.batchBytesLimit, n),
      flushController: createFlushController({
        messagesLimit: d.batchMessagesLimit,
        bytesLimit: d.batchBytesLimit,
        durationLimit: d.flushTimeout,
        pageExitObservable: a,
        sessionExpireObservable: i,
      }),
      messageBytesLimit: d.messageBytesLimit,
    });
  }
  return {
    flushObservable: s.flushController.flushObservable,
    add: function (d, f) {
      (f === void 0 && (f = !0), s.add(d), c && f && c.add(r.transformMessage ? r.transformMessage(d) : d));
    },
    upsert: function (d, f) {
      (s.upsert(d, f), c && c.upsert(r.transformMessage ? r.transformMessage(d) : d, f));
    },
    stop: function () {
      (s.stop(), c && c.stop());
    },
  };
}
function createIdentityEncoder() {
  var e = '',
    t = 0;
  return {
    isAsync: !1,
    get isEmpty() {
      return !e;
    },
    write: function (r, n) {
      var a = computeBytesCount(r);
      ((t += a), (e += r), n && n(a));
    },
    finish: function (r) {
      r(this.finishSync());
    },
    finishSync: function () {
      var r = {
        output: e,
        outputBytesCount: t,
        rawBytesCount: t,
        pendingData: '',
      };
      return ((e = ''), (t = 0), r);
    },
    estimateEncodedBytesCount: function (r) {
      return r.length;
    },
  };
}
var AbstractLifeCycle =
  /** @class */
  (function () {
    function e() {
      this.callbacks = {};
    }
    return (
      (e.prototype.notify = function (t, r) {
        var n = this.callbacks[t];
        n &&
          n.forEach(function (a) {
            return a(r);
          });
      }),
      (e.prototype.subscribe = function (t, r) {
        var n = this;
        return (
          this.callbacks[t] || (this.callbacks[t] = []),
          this.callbacks[t].push(r),
          {
            unsubscribe: function () {
              n.callbacks[t] = n.callbacks[t].filter(function (a) {
                return r !== a;
              });
            },
          }
        );
      }),
      e
    );
  })();
function createEventRateLimiter(e, t, r) {
  var n = 0,
    a = !1;
  return {
    isLimitReached: function () {
      if (
        (n === 0 &&
          setTimeout(function () {
            n = 0;
          }, ONE_MINUTE),
        (n += 1),
        n <= t || a)
      )
        return ((a = !1), !1);
      if (n === t + 1) {
        a = !0;
        try {
          r({
            message: 'Reached max number of '.concat(e, 's by minute: ').concat(t),
            source: ErrorSource.AGENT,
            startClocks: clocksNow(),
          });
        } finally {
          a = !1;
        }
      }
      return !0;
    },
  };
}
function runOnReadyState(e, t, r) {
  if (document.readyState === t || document.readyState === 'complete') return (r(), {stop: noop});
  var n = t === 'complete' ? 'load' : 'DOMContentLoaded';
  return addEventListener(e, window, n, r, {once: !0});
}
var xhrObservable,
  xhrContexts = /* @__PURE__ */ new WeakMap();
function initXhrObservable(e) {
  return (xhrObservable || (xhrObservable = createXhrObservable(e)), xhrObservable);
}
function createXhrObservable(e) {
  return new Observable(function (t) {
    var r = instrumentMethod(XMLHttpRequest.prototype, 'open', openXhr).stop,
      n = instrumentMethod(
        XMLHttpRequest.prototype,
        'send',
        function (i) {
          sendXhr(i, e, t);
        },
        {computeHandlingStack: !0},
      ).stop,
      a = instrumentMethod(XMLHttpRequest.prototype, 'abort', abortXhr).stop;
    return function () {
      (r(), n(), a());
    };
  });
}
function openXhr(e) {
  var t = e.target,
    r = e.parameters,
    n = r[0],
    a = r[1];
  xhrContexts.set(t, {
    state: 'open',
    method: String(n).toUpperCase(),
    url: normalizeUrl(String(a)),
  });
}
function sendXhr(e, t, r) {
  var n = e.target,
    a = e.handlingStack,
    i = xhrContexts.get(n);
  if (i) {
    var o = i;
    ((o.state = 'start'), (o.startClocks = clocksNow()), (o.isAborted = !1), (o.xhr = n), (o.handlingStack = a));
    var s = !1,
      c = instrumentMethod(n, 'onreadystatechange', function () {
        n.readyState === XMLHttpRequest.DONE && u();
      }).stop,
      u = function () {
        if ((d(), c(), !s)) {
          s = !0;
          var f = i;
          ((f.state = 'complete'),
            (f.duration = elapsed(o.startClocks.timeStamp, timeStampNow())),
            (f.status = n.status),
            r.notify(shallowClone(f)));
        }
      },
      d = addEventListener(t, n, 'loadend', u).stop;
    r.notify(o);
  }
}
function abortXhr(e) {
  var t = e.target,
    r = xhrContexts.get(t);
  r && (r.isAborted = !0);
}
var fetchObservable;
function initFetchObservable() {
  return (fetchObservable || (fetchObservable = createFetchObservable()), fetchObservable);
}
function createFetchObservable() {
  return new Observable(function (e) {
    if (window.fetch) {
      var t = instrumentMethod(
        window,
        'fetch',
        function (r) {
          return beforeSend(r, e);
        },
        {
          computeHandlingStack: !0,
        },
      ).stop;
      return t;
    }
  });
}
function beforeSend(e, t) {
  var r = e.parameters,
    n = e.onPostCall,
    a = e.handlingStack,
    i = r[0],
    o = r[1],
    s = o && o.method;
  s === void 0 && i instanceof Request && (s = i.method);
  var c = s !== void 0 ? String(s).toUpperCase() : 'GET',
    u = i instanceof Request ? i.url : normalizeUrl(String(i)),
    d = clocksNow(),
    f = {
      state: 'start',
      init: o,
      input: i,
      method: c,
      startClocks: d,
      url: u,
      handlingStack: a,
    };
  (t.notify(f),
    (r[0] = f.input),
    (r[1] = f.init),
    n(function (l) {
      return afterSend(t, l, f);
    }));
}
function afterSend(e, t, r) {
  var n = r;
  function a(i) {
    ((n.state = 'resolve'), assign(n, i), e.notify(n));
  }
  t.then(
    monitor(function (i) {
      a({
        response: i,
        responseType: i.type,
        status: i.status,
        isAborted: !1,
      });
    }),
    monitor(function (i) {
      var o, s;
      a({
        status: 0,
        isAborted:
          ((s = (o = n.init) === null || o === void 0 ? void 0 : o.signal) === null || s === void 0
            ? void 0
            : s.aborted) ||
          (i instanceof DOMException && i.code === DOMException.ABORT_ERR),
        error: i,
      });
    }),
  );
}
function requestIdleCallback(e, t) {
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    var r = window.requestIdleCallback(monitor(e), t);
    return function () {
      return window.cancelIdleCallback(r);
    };
  }
  return requestIdleCallbackShim(e);
}
var MAX_TASK_TIME = 50;
function requestIdleCallbackShim(e) {
  var t = dateNow(),
    r = setTimeout(function () {
      e({
        didTimeout: !1,
        timeRemaining: function () {
          return Math.max(0, MAX_TASK_TIME - (dateNow() - t));
        },
      });
    }, 0);
  return function () {
    return clearTimeout(r);
  };
}
var IDLE_CALLBACK_TIMEOUT = ONE_SECOND,
  MAX_EXECUTION_TIME_ON_TIMEOUT = 30;
function createTaskQueue() {
  var e = [];
  function t(n) {
    var a;
    if (n.didTimeout) {
      var i = performance.now();
      a = function () {
        return MAX_EXECUTION_TIME_ON_TIMEOUT - (performance.now() - i);
      };
    } else a = n.timeRemaining.bind(n);
    for (; a() > 0 && e.length; ) e.shift()();
    e.length && r();
  }
  function r() {
    requestIdleCallback(t, {timeout: IDLE_CALLBACK_TIMEOUT});
  }
  return {
    push: function (n) {
      e.push(n) === 1 && r();
    },
  };
}
var consoleObservablesByApi = {};
function initConsoleObservable(e) {
  var t = e.map(function (r) {
    return (
      consoleObservablesByApi[r] || (consoleObservablesByApi[r] = createConsoleObservable(r)),
      consoleObservablesByApi[r]
    );
  });
  return mergeObservables.apply(void 0, t);
}
function createConsoleObservable(e) {
  return new Observable(function (t) {
    var r = globalConsole[e];
    return (
      (globalConsole[e] = function () {
        for (var n = [], a = 0; a < arguments.length; a++) n[a] = arguments[a];
        r.apply(console, n);
        var i = createHandlingStack();
        callMonitored(function () {
          t.notify(buildConsoleLog(n, e, i));
        });
      }),
      function () {
        globalConsole[e] = r;
      }
    );
  });
}
function buildConsoleLog(e, t, r) {
  var n = e
      .map(function (o) {
        return formatConsoleParameters(o);
      })
      .join(' '),
    a;
  if (t === ConsoleApiName.error) {
    var i = find(e, isError);
    a = {
      stack: i ? toStackTraceString(computeStackTrace(i)) : void 0,
      fingerprint: tryToGetFingerprint(i),
      causes: i ? flattenErrorCauses(i, 'console') : void 0,
      startClocks: clocksNow(),
      message: n,
      source: ErrorSource.CONSOLE,
      handling: 'handled',
      handlingStack: r,
    };
  }
  return {
    api: t,
    message: n,
    error: a,
    handlingStack: r,
  };
}
function formatConsoleParameters(e) {
  return typeof e == 'string'
    ? sanitize(e)
    : isError(e)
      ? formatErrorMessage(computeStackTrace(e))
      : jsonStringify(sanitize(e), void 0, 2);
}
function createContextManager(e) {
  var t = {},
    r = new Observable(),
    n = {
      getContext: function () {
        return deepClone(t);
      },
      setContext: function (a) {
        (getType(a) === 'object' ? ((t = sanitize(a)), e?.updateCustomerData(t)) : n.clearContext(), r.notify());
      },
      setContextProperty: function (a, i) {
        ((t[a] = sanitize(i)), e?.updateCustomerData(t), r.notify());
      },
      removeContextProperty: function (a) {
        (delete t[a], e?.updateCustomerData(t), r.notify());
      },
      clearContext: function () {
        ((t = {}), e?.resetCustomerData(), r.notify());
      },
      changeObservable: r,
    };
  return n;
}
var CONTEXT_STORE_KEY_PREFIX = '_dd_c',
  storageListeners = [];
function storeContextManager(e, t, r, n) {
  var a = buildStorageKey(r, n);
  (storageListeners.push(
    addEventListener(e, window, 'storage', function (c) {
      var u = c.key;
      a === u && i();
    }),
  ),
    t.changeObservable.subscribe(o),
    t.setContext(combine(s(), t.getContext())));
  function i() {
    t.setContext(s());
  }
  function o() {
    localStorage.setItem(a, JSON.stringify(t.getContext()));
  }
  function s() {
    var c = localStorage.getItem(a);
    return c !== null ? JSON.parse(c) : {};
  }
}
function buildStorageKey(e, t) {
  return ''.concat(CONTEXT_STORE_KEY_PREFIX, '_').concat(e, '_').concat(t);
}
var CUSTOMER_DATA_BYTES_LIMIT = 3 * ONE_KIBI_BYTE,
  CUSTOMER_COMPRESSED_DATA_BYTES_LIMIT = 16 * ONE_KIBI_BYTE,
  BYTES_COMPUTATION_THROTTLING_DELAY = 200;
function createCustomerDataTrackerManager(e) {
  e === void 0 && (e = 2);
  var t = /* @__PURE__ */ new Map(),
    r = !1;
  function n(a) {
    if ((a === void 0 && (a = 0), !(r || e === 0))) {
      var i = e === 2 ? CUSTOMER_DATA_BYTES_LIMIT : CUSTOMER_COMPRESSED_DATA_BYTES_LIMIT,
        o = a;
      (t.forEach(function (s) {
        o += s.getBytesCount();
      }),
        o > i && (displayCustomerDataLimitReachedWarning(i), (r = !0)));
    }
  }
  return {
    /**
     * Creates a detached tracker. The manager will not store a reference to that tracker, and the
     * bytes count will be counted independently from other detached trackers.
     *
     * This is particularly useful when we don't know when the tracker will be unused, so we don't
     * leak memory (ex: when used in Logger instances).
     */
    createDetachedTracker: function () {
      var a = createCustomerDataTracker(function () {
        return n(a.getBytesCount());
      });
      return a;
    },
    /**
     * Creates a tracker if it doesn't exist, and returns it.
     */
    getOrCreateTracker: function (a) {
      return (t.has(a) || t.set(a, createCustomerDataTracker(n)), t.get(a));
    },
    setCompressionStatus: function (a) {
      e === 0 && ((e = a), n());
    },
    getCompressionStatus: function () {
      return e;
    },
    stop: function () {
      (t.forEach(function (a) {
        return a.stop();
      }),
        t.clear());
    },
  };
}
function createCustomerDataTracker(e) {
  var t = 0,
    r = throttle(function (o) {
      ((t = computeBytesCount(jsonStringify(o))), e());
    }, BYTES_COMPUTATION_THROTTLING_DELAY),
    n = r.throttled,
    a = r.cancel,
    i = function () {
      (a(), (t = 0));
    };
  return {
    updateCustomerData: function (o) {
      isEmptyObject(o) ? i() : n(o);
    },
    resetCustomerData: i,
    getBytesCount: function () {
      return t;
    },
    stop: function () {
      a();
    },
  };
}
function displayCustomerDataLimitReachedWarning(e) {
  display.warn(
    'Customer data exceeds the recommended '
      .concat(e / ONE_KIBI_BYTE, 'KiB threshold. ')
      .concat(MORE_DETAILS, ' ')
      .concat(DOCS_TROUBLESHOOTING, '/#customer-data-exceeds-the-recommended-threshold-warning'),
  );
}
function readBytesFromStream(e, t, r) {
  var n = e.getReader(),
    a = [],
    i = 0;
  o();
  function o() {
    n.read().then(
      monitor(function (c) {
        if (c.done) {
          s();
          return;
        }
        (r.collectStreamBody && a.push(c.value), (i += c.value.length), i > r.bytesLimit ? s() : o());
      }),
      monitor(function (c) {
        return t(c);
      }),
    );
  }
  function s() {
    n.cancel().catch(
      // we don't care if cancel fails, but we still need to catch the error to avoid reporting it
      // as an unhandled rejection
      noop,
    );
    var c, u;
    if (r.collectStreamBody) {
      var d;
      if (a.length === 1) d = a[0];
      else {
        d = new Uint8Array(i);
        var f = 0;
        a.forEach(function (l) {
          (d.set(l, f), (f += l.length));
        });
      }
      ((c = d.slice(0, r.bytesLimit)), (u = d.length > r.bytesLimit));
    }
    t(void 0, c, u);
  }
}
var SYNTHETICS_TEST_ID_COOKIE_NAME = 'datadog-synthetics-public-id',
  SYNTHETICS_RESULT_ID_COOKIE_NAME = 'datadog-synthetics-result-id',
  SYNTHETICS_INJECTS_RUM_COOKIE_NAME = 'datadog-synthetics-injects-rum';
function willSyntheticsInjectRum() {
  return !!(window._DATADOG_SYNTHETICS_INJECTS_RUM || getInitCookie(SYNTHETICS_INJECTS_RUM_COOKIE_NAME));
}
function getSyntheticsTestId() {
  var e = window._DATADOG_SYNTHETICS_PUBLIC_ID || getInitCookie(SYNTHETICS_TEST_ID_COOKIE_NAME);
  return typeof e == 'string' ? e : void 0;
}
function getSyntheticsResultId() {
  var e = window._DATADOG_SYNTHETICS_RESULT_ID || getInitCookie(SYNTHETICS_RESULT_ID_COOKIE_NAME);
  return typeof e == 'string' ? e : void 0;
}
function isMatchOption(e) {
  var t = getType(e);
  return t === 'string' || t === 'function' || e instanceof RegExp;
}
function matchList(e, t, r) {
  return (
    r === void 0 && (r = !1),
    e.some(function (n) {
      try {
        if (typeof n == 'function') return n(t);
        if (n instanceof RegExp) return n.test(t);
        if (typeof n == 'string') return r ? startsWith(t, n) : n === t;
      } catch (a) {
        display.error(a);
      }
      return !1;
    })
  );
}
var _a$3;
function isAuthorized(e, t, r) {
  var n = r.getHandler(),
    a = Array.isArray(n) ? n : [n];
  return STATUS_PRIORITIES[e] >= STATUS_PRIORITIES[r.getLevel()] && includes(a, t);
}
var StatusType = {
    ok: 'ok',
    debug: 'debug',
    info: 'info',
    notice: 'notice',
    warn: 'warn',
    error: 'error',
    critical: 'critical',
    alert: 'alert',
    emerg: 'emerg',
  },
  STATUS_PRIORITIES =
    ((_a$3 = {}),
    (_a$3[StatusType.ok] = 0),
    (_a$3[StatusType.debug] = 1),
    (_a$3[StatusType.info] = 2),
    (_a$3[StatusType.notice] = 4),
    (_a$3[StatusType.warn] = 5),
    (_a$3[StatusType.error] = 6),
    (_a$3[StatusType.critical] = 7),
    (_a$3[StatusType.alert] = 8),
    (_a$3[StatusType.emerg] = 9),
    _a$3);
function createErrorFieldFromRawError(e, t) {
  var r = t === void 0 ? {} : t,
    n = r.includeMessage,
    a = n === void 0 ? !1 : n;
  return {
    stack: e.stack,
    kind: e.type,
    message: a ? e.message : void 0,
    causes: e.causes,
    fingerprint: e.fingerprint,
    handling: e.handling,
  };
}
var __decorate = function (e, t, r, n) {
    var a = arguments.length,
      i = a < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
      o;
    if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
    else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (i = (a < 3 ? o(i) : a > 3 ? o(t, r, i) : o(t, r)) || i);
    return (a > 3 && i && Object.defineProperty(t, r, i), i);
  },
  HandlerType = {
    console: 'console',
    http: 'http',
  },
  STATUSES = Object.keys(StatusType),
  Logger$1 =
    /** @class */
    (function () {
      function e(t, r, n, a, i, o) {
        (a === void 0 && (a = HandlerType.http),
          i === void 0 && (i = StatusType.debug),
          o === void 0 && (o = {}),
          (this.handleLogStrategy = t),
          (this.handlerType = a),
          (this.level = i),
          (this.contextManager = createContextManager(r)),
          this.contextManager.setContext(o),
          n && this.contextManager.setContextProperty('logger', {name: n}));
      }
      return (
        (e.prototype.logImplementation = function (t, r, n, a, i) {
          n === void 0 && (n = StatusType.info);
          var o = sanitize(r),
            s;
          if (a != null) {
            var c = computeRawError({
              stackTrace: isError(a) ? computeStackTrace(a) : void 0,
              originalError: a,
              nonErrorPrefix: 'Provided',
              source: ErrorSource.LOGGER,
              handling: 'handled',
              startClocks: clocksNow(),
            });
            s = combine(
              {
                error: createErrorFieldFromRawError(c, {includeMessage: !0}),
              },
              o,
            );
          } else s = o;
          this.handleLogStrategy(
            {
              message: sanitize(t),
              context: s,
              status: n,
            },
            this,
            i,
          );
        }),
        (e.prototype.log = function (t, r, n, a) {
          n === void 0 && (n = StatusType.info);
          var i;
          (isAuthorized(n, HandlerType.http, this) && (i = createHandlingStack()),
            this.logImplementation(t, r, n, a, i));
        }),
        (e.prototype.setContext = function (t) {
          this.contextManager.setContext(t);
        }),
        (e.prototype.getContext = function () {
          return this.contextManager.getContext();
        }),
        (e.prototype.setContextProperty = function (t, r) {
          this.contextManager.setContextProperty(t, r);
        }),
        (e.prototype.removeContextProperty = function (t) {
          this.contextManager.removeContextProperty(t);
        }),
        (e.prototype.clearContext = function () {
          this.contextManager.clearContext();
        }),
        (e.prototype.setHandler = function (t) {
          this.handlerType = t;
        }),
        (e.prototype.getHandler = function () {
          return this.handlerType;
        }),
        (e.prototype.setLevel = function (t) {
          this.level = t;
        }),
        (e.prototype.getLevel = function () {
          return this.level;
        }),
        __decorate([monitored], e.prototype, 'logImplementation', null),
        e
      );
    })();
Logger$1.prototype.ok = createLoggerMethod(StatusType.ok);
Logger$1.prototype.debug = createLoggerMethod(StatusType.debug);
Logger$1.prototype.info = createLoggerMethod(StatusType.info);
Logger$1.prototype.notice = createLoggerMethod(StatusType.notice);
Logger$1.prototype.warn = createLoggerMethod(StatusType.warn);
Logger$1.prototype.error = createLoggerMethod(StatusType.error);
Logger$1.prototype.critical = createLoggerMethod(StatusType.critical);
Logger$1.prototype.alert = createLoggerMethod(StatusType.alert);
Logger$1.prototype.emerg = createLoggerMethod(StatusType.emerg);
function createLoggerMethod(e) {
  return function (t, r, n) {
    var a;
    (isAuthorized(e, HandlerType.http, this) && (a = createHandlingStack()), this.logImplementation(t, r, e, n, a));
  };
}
function buildCommonContext$1(e, t) {
  return {
    view: {
      referrer: document.referrer,
      url: window.location.href,
    },
    context: e.getContext(),
    user: t.getContext(),
  };
}
var DEFAULT_REQUEST_ERROR_RESPONSE_LENGTH_LIMIT = 32 * ONE_KIBI_BYTE;
function validateAndBuildLogsConfiguration(e) {
  e.usePciIntake === !0 &&
    e.site &&
    e.site !== 'datadoghq.com' &&
    display.warn(
      'PCI compliance for Logs is only available for Datadog organizations in the US1 site. Default intake will be used.',
    );
  var t = validateAndBuildConfiguration(e),
    r = validateAndBuildForwardOption(e.forwardConsoleLogs, objectValues(ConsoleApiName), 'Forward Console Logs'),
    n = validateAndBuildForwardOption(e.forwardReports, objectValues(RawReportType), 'Forward Reports');
  if (!(!t || !r || !n))
    return (
      e.forwardErrorsToLogs && !includes(r, ConsoleApiName.error) && r.push(ConsoleApiName.error),
      assign(
        {
          forwardErrorsToLogs: e.forwardErrorsToLogs !== !1,
          forwardConsoleLogs: r,
          forwardReports: n,
          requestErrorResponseLengthLimit: DEFAULT_REQUEST_ERROR_RESPONSE_LENGTH_LIMIT,
          sendLogsAfterSessionExpiration: !!e.sendLogsAfterSessionExpiration,
        },
        t,
      )
    );
}
function validateAndBuildForwardOption(e, t, r) {
  if (e === void 0) return [];
  if (
    !(
      e === 'all' ||
      (Array.isArray(e) &&
        e.every(function (n) {
          return includes(t, n);
        }))
    )
  ) {
    display.error(''.concat(r, ' should be "all" or an array with allowed values "').concat(t.join('", "'), '"'));
    return;
  }
  return e === 'all' ? t : removeDuplicates(e);
}
function serializeLogsConfiguration(e) {
  var t = serializeConfiguration(e);
  return assign(
    {
      forward_errors_to_logs: e.forwardErrorsToLogs,
      forward_console_logs: e.forwardConsoleLogs,
      forward_reports: e.forwardReports,
      use_pci_intake: e.usePciIntake,
      send_logs_after_session_expiration: e.sendLogsAfterSessionExpiration,
    },
    t,
  );
}
function createPreStartStrategy$2(e, t, r) {
  var n = createBoundedBuffer(),
    a,
    i,
    o = t.observable.subscribe(s);
  function s() {
    if (!(!i || !a || !t.isGranted())) {
      o.unsubscribe();
      var c = r(a, i);
      n.drain(c);
    }
  }
  return {
    init: function (c) {
      if (!c) {
        display.error('Missing configuration');
        return;
      }
      if (
        (initFeatureFlags(c.enableExperimentalFeatures),
        canUseEventBridge() && (c = overrideInitConfigurationForBridge$1(c)),
        (a = c),
        i)
      ) {
        displayAlreadyInitializedError('DD_LOGS', c);
        return;
      }
      var u = validateAndBuildLogsConfiguration(c);
      u && ((i = u), initFetchObservable().subscribe(noop), t.tryToInit(u.trackingConsent), s());
    },
    get initConfiguration() {
      return a;
    },
    getInternalContext: noop,
    handleLog: function (c, u, d, f, l) {
      (f === void 0 && (f = e()),
        l === void 0 && (l = timeStampNow()),
        n.add(function (p) {
          return p.handleLog(c, u, d, f, l);
        }));
    },
  };
}
function overrideInitConfigurationForBridge$1(e) {
  return assign({}, e, {clientToken: 'empty'});
}
var LOGS_STORAGE_KEY = 'logs';
function makeLogsPublicApi(e) {
  var t = createCustomerDataTrackerManager(),
    r = createContextManager(
      t.getOrCreateTracker(
        2,
        /* CustomerDataType.GlobalContext */
      ),
    ),
    n = createContextManager(
      t.getOrCreateTracker(
        1,
        /* CustomerDataType.User */
      ),
    ),
    a = createTrackingConsentState();
  function i() {
    return buildCommonContext$1(r, n);
  }
  var o = createPreStartStrategy$2(i, a, function (u, d) {
      u.storeContextsAcrossPages &&
        (storeContextManager(
          d,
          r,
          LOGS_STORAGE_KEY,
          2,
          /* CustomerDataType.GlobalContext */
        ),
        storeContextManager(
          d,
          n,
          LOGS_STORAGE_KEY,
          1,
          /* CustomerDataType.User */
        ));
      var f = e(u, d, i, a);
      return ((o = createPostStartStrategy$2(u, f)), f);
    }),
    s = {},
    c = new Logger$1(function () {
      for (var u = [], d = 0; d < arguments.length; d++) u[d] = arguments[d];
      return o.handleLog.apply(o, u);
    }, t.createDetachedTracker());
  return makePublicApi({
    logger: c,
    init: monitor(function (u) {
      return o.init(u);
    }),
    setTrackingConsent: monitor(function (u) {
      (a.update(u), addTelemetryUsage({feature: 'set-tracking-consent', tracking_consent: u}));
    }),
    getGlobalContext: monitor(function () {
      return r.getContext();
    }),
    setGlobalContext: monitor(function (u) {
      return r.setContext(u);
    }),
    setGlobalContextProperty: monitor(function (u, d) {
      return r.setContextProperty(u, d);
    }),
    removeGlobalContextProperty: monitor(function (u) {
      return r.removeContextProperty(u);
    }),
    clearGlobalContext: monitor(function () {
      return r.clearContext();
    }),
    createLogger: monitor(function (u, d) {
      return (
        d === void 0 && (d = {}),
        (s[u] = new Logger$1(
          function () {
            for (var f = [], l = 0; l < arguments.length; l++) f[l] = arguments[l];
            return o.handleLog.apply(o, f);
          },
          t.createDetachedTracker(),
          sanitize(u),
          d.handler,
          d.level,
          sanitize(d.context),
        )),
        s[u]
      );
    }),
    getLogger: monitor(function (u) {
      return s[u];
    }),
    getInitConfiguration: monitor(function () {
      return deepClone(o.initConfiguration);
    }),
    getInternalContext: monitor(function (u) {
      return o.getInternalContext(u);
    }),
    setUser: monitor(function (u) {
      checkUser(u) && n.setContext(sanitizeUser(u));
    }),
    getUser: monitor(function () {
      return n.getContext();
    }),
    setUserProperty: monitor(function (u, d) {
      var f,
        l = sanitizeUser(((f = {}), (f[u] = d), f))[u];
      n.setContextProperty(u, l);
    }),
    removeUserProperty: monitor(function (u) {
      return n.removeContextProperty(u);
    }),
    clearUser: monitor(function () {
      return n.clearContext();
    }),
  });
}
function createPostStartStrategy$2(e, t) {
  return assign(
    {
      init: function (r) {
        displayAlreadyInitializedError('DD_LOGS', r);
      },
      initConfiguration: e,
    },
    t,
  );
}
var LOGS_SESSION_KEY = 'logs';
function startLogsSessionManager(e, t) {
  var r = startSessionManager(
    e,
    LOGS_SESSION_KEY,
    function (n) {
      return computeSessionState$1(e, n);
    },
    t,
  );
  return {
    findTrackedSession: function (n, a) {
      a === void 0 && (a = {returnInactive: !1});
      var i = r.findSession(n, a);
      return i && i.trackingType === '1'
        ? {
            id: i.id,
          }
        : void 0;
    },
    expireObservable: r.expireObservable,
  };
}
function startLogsSessionManagerStub(e) {
  var t = computeTrackingType(e) === '1',
    r = t ? {} : void 0;
  return {
    findTrackedSession: function () {
      return r;
    },
    expireObservable: new Observable(),
  };
}
function computeTrackingType(e) {
  return performDraw(e.sessionSampleRate) ? '1' : '0';
}
function computeSessionState$1(e, t) {
  var r = hasValidLoggerSession(t) ? t : computeTrackingType(e);
  return {
    trackingType: r,
    isTracked: r === '1',
  };
}
function hasValidLoggerSession(e) {
  return e === '0' || e === '1';
}
var logsSentBeforeRumInjectionTelemetryAdded = !1;
function getRUMInternalContext(e) {
  var t = window;
  if (willSyntheticsInjectRum()) {
    var r = n(t.DD_RUM_SYNTHETICS);
    return (
      !r &&
        !logsSentBeforeRumInjectionTelemetryAdded &&
        ((logsSentBeforeRumInjectionTelemetryAdded = !0),
        addTelemetryDebug('Logs sent before RUM is injected by the synthetics worker', {
          testId: getSyntheticsTestId(),
          resultId: getSyntheticsResultId(),
        })),
      r
    );
  }
  return n(t.DD_RUM);
  function n(a) {
    if (a && a.getInternalContext) return a.getInternalContext(e);
  }
}
function startLogsAssembly(e, t, r, n, a) {
  var i = STATUSES.concat(['custom']),
    o = {};
  (i.forEach(function (s) {
    o[s] = createEventRateLimiter(s, t.eventRateLimiterThreshold, a);
  }),
    r.subscribe(0, function (s) {
      var c,
        u,
        d = s.rawLogsEvent,
        f = s.messageContext,
        l = f === void 0 ? void 0 : f,
        p = s.savedCommonContext,
        g = p === void 0 ? void 0 : p,
        v = s.domainContext,
        m = getRelativeTime(d.date),
        h = e.findTrackedSession(m);
      if (!(!h && (!t.sendLogsAfterSessionExpiration || !e.findTrackedSession(m, {returnInactive: !0})))) {
        var S = g || n(),
          E = combine(
            {
              service: t.service,
              session_id: h ? h.id : void 0,
              session: h ? {id: h.id} : void 0,
              // Insert user first to allow overrides from global context
              usr: isEmptyObject(S.user) ? void 0 : S.user,
              view: S.view,
            },
            S.context,
            getRUMInternalContext(m),
            d,
            l,
          );
        ((c = t.beforeSend) === null || c === void 0 ? void 0 : c.call(t, E, v)) === !1 ||
          (E.origin !== ErrorSource.AGENT &&
            ((u = o[E.status]) !== null && u !== void 0 ? u : o.custom).isLimitReached()) ||
          r.notify(1, E);
      }
    }));
}
var _a$2,
  LogStatusForApi =
    ((_a$2 = {}),
    (_a$2[ConsoleApiName.log] = StatusType.info),
    (_a$2[ConsoleApiName.debug] = StatusType.debug),
    (_a$2[ConsoleApiName.info] = StatusType.info),
    (_a$2[ConsoleApiName.warn] = StatusType.warn),
    (_a$2[ConsoleApiName.error] = StatusType.error),
    _a$2);
function startConsoleCollection(e, t) {
  var r = initConsoleObservable(e.forwardConsoleLogs).subscribe(function (n) {
    var a = {
      rawLogsEvent: {
        date: timeStampNow(),
        message: n.message,
        origin: ErrorSource.CONSOLE,
        error: n.error && createErrorFieldFromRawError(n.error),
        status: LogStatusForApi[n.api],
      },
      domainContext: {
        handlingStack: n.handlingStack,
      },
    };
    t.notify(0, a);
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
function startReportCollection(e, t) {
  var r = initReportObservable(e, e.forwardReports).subscribe(function (n) {
    var a = n.message,
      i,
      o = n.originalError.type === 'deprecation' ? StatusType.warn : StatusType.error;
    (o === StatusType.error
      ? (i = createErrorFieldFromRawError(n))
      : n.stack && (a += ' Found in '.concat(getFileFromStackTraceString(n.stack))),
      t.notify(0, {
        rawLogsEvent: {
          date: timeStampNow(),
          message: a,
          origin: ErrorSource.REPORT,
          error: i,
          status: o,
        },
      }));
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
function startNetworkErrorCollection(e, t) {
  if (!e.forwardErrorsToLogs) return {stop: noop};
  var r = initXhrObservable(e).subscribe(function (i) {
      i.state === 'complete' && a('xhr', i);
    }),
    n = initFetchObservable().subscribe(function (i) {
      i.state === 'resolve' && a('fetch', i);
    });
  function a(i, o) {
    !isIntakeUrl(o.url) &&
      (isRejected(o) || isServerError(o.status)) &&
      ('xhr' in o
        ? computeXhrResponseData(o.xhr, e, s)
        : o.response
          ? computeFetchResponseText(o.response, e, s)
          : o.error && computeFetchErrorText(o.error, e, s));
    function s(c) {
      var u = {
        isAborted: o.isAborted,
        handlingStack: o.handlingStack,
      };
      t.notify(0, {
        rawLogsEvent: {
          message: ''.concat(format(i), ' error ').concat(o.method, ' ').concat(o.url),
          date: o.startClocks.timeStamp,
          error: {
            stack: c || 'Failed to load',
            // We don't know if the error was handled or not, so we set it to undefined
            handling: void 0,
          },
          http: {
            method: o.method,
            // Cast resource method because of case mismatch cf issue RUMF-1152
            status_code: o.status,
            url: o.url,
          },
          status: StatusType.error,
          origin: ErrorSource.NETWORK,
        },
        domainContext: u,
      });
    }
  }
  return {
    stop: function () {
      (r.unsubscribe(), n.unsubscribe());
    },
  };
}
function computeXhrResponseData(e, t, r) {
  typeof e.response == 'string' ? r(truncateResponseText(e.response, t)) : r(e.response);
}
function computeFetchErrorText(e, t, r) {
  r(truncateResponseText(toStackTraceString(computeStackTrace(e)), t));
}
function computeFetchResponseText(e, t, r) {
  var n = tryToClone(e);
  !n || !n.body
    ? r()
    : window.TextDecoder
      ? truncateResponseStream(n.body, t.requestErrorResponseLengthLimit, function (a, i) {
          r(a ? 'Unable to retrieve response: '.concat(a) : i);
        })
      : n.text().then(
          monitor(function (a) {
            return r(truncateResponseText(a, t));
          }),
          monitor(function (a) {
            return r('Unable to retrieve response: '.concat(a));
          }),
        );
}
function isRejected(e) {
  return e.status === 0 && e.responseType !== 'opaque';
}
function truncateResponseText(e, t) {
  return e.length > t.requestErrorResponseLengthLimit
    ? ''.concat(e.substring(0, t.requestErrorResponseLengthLimit), '...')
    : e;
}
function format(e) {
  return e === 'xhr' ? 'XHR' : 'Fetch';
}
function truncateResponseStream(e, t, r) {
  readBytesFromStream(
    e,
    function (n, a, i) {
      if (n) r(n);
      else {
        var o = new TextDecoder().decode(a);
        (i && (o += '...'), r(void 0, o));
      }
    },
    {
      bytesLimit: t,
      collectStreamBody: !0,
    },
  );
}
function startRuntimeErrorCollection(e, t) {
  if (!e.forwardErrorsToLogs) return {stop: noop};
  var r = new Observable(),
    n = trackRuntimeError(r).stop,
    a = r.subscribe(function (i) {
      t.notify(0, {
        rawLogsEvent: {
          message: i.message,
          date: i.startClocks.timeStamp,
          error: createErrorFieldFromRawError(i),
          origin: ErrorSource.SOURCE,
          status: StatusType.error,
        },
      });
    });
  return {
    stop: function () {
      (n(), a.unsubscribe());
    },
  };
}
var LifeCycle$1 = AbstractLifeCycle,
  _a$1;
function startLoggerCollection(e) {
  function t(r, n, a, i, o) {
    var s = combine(n.getContext(), r.context);
    if (
      (isAuthorized(r.status, HandlerType.console, n) && displayInConsole(r, s),
      isAuthorized(r.status, HandlerType.http, n))
    ) {
      var c = {
        rawLogsEvent: {
          date: o || timeStampNow(),
          message: r.message,
          status: r.status,
          origin: ErrorSource.LOGGER,
        },
        messageContext: s,
        savedCommonContext: i,
      };
      (a && (c.domainContext = {handlingStack: a}), e.notify(0, c));
    }
  }
  return {
    handleLog: t,
  };
}
var loggerToConsoleApiName =
  ((_a$1 = {}),
  (_a$1[StatusType.ok] = ConsoleApiName.debug),
  (_a$1[StatusType.debug] = ConsoleApiName.debug),
  (_a$1[StatusType.info] = ConsoleApiName.info),
  (_a$1[StatusType.notice] = ConsoleApiName.info),
  (_a$1[StatusType.warn] = ConsoleApiName.warn),
  (_a$1[StatusType.error] = ConsoleApiName.error),
  (_a$1[StatusType.critical] = ConsoleApiName.error),
  (_a$1[StatusType.alert] = ConsoleApiName.error),
  (_a$1[StatusType.emerg] = ConsoleApiName.error),
  _a$1);
function displayInConsole(e, t) {
  var r = e.status,
    n = e.message;
  originalConsoleMethods[loggerToConsoleApiName[r]].call(globalConsole, n, t);
}
function startLogsBatch(e, t, r, n, a) {
  var i = startBatchWithReplica(
    e,
    {
      endpoint: e.logsEndpointBuilder,
      encoder: createIdentityEncoder(),
    },
    e.replica && {
      endpoint: e.replica.logsEndpointBuilder,
      encoder: createIdentityEncoder(),
    },
    r,
    n,
    a.expireObservable,
  );
  return (
    t.subscribe(1, function (o) {
      i.add(o);
    }),
    i
  );
}
function startLogsBridge(e) {
  var t = getEventBridge();
  e.subscribe(1, function (r) {
    t.send('log', r);
  });
}
function startInternalContext$1(e) {
  return {
    get: function (t) {
      var r = e.findTrackedSession(t);
      if (r)
        return {
          session_id: r.id,
        };
    },
  };
}
function startReportError(e) {
  return function (t) {
    (e.notify(0, {
      rawLogsEvent: {
        message: t.message,
        date: t.startClocks.timeStamp,
        origin: ErrorSource.AGENT,
        status: StatusType.error,
      },
    }),
      addTelemetryDebug('Error reported to customer', {'error.message': t.message}));
  };
}
function startLogsTelemetry(e, t, r, n, a) {
  var i = startTelemetry('browser-logs-sdk', t);
  i.setContextProvider(function () {
    var f, l, p, g, v, m;
    return {
      application: {
        id: (f = getRUMInternalContext()) === null || f === void 0 ? void 0 : f.application_id,
      },
      session: {
        id: (l = a.findTrackedSession()) === null || l === void 0 ? void 0 : l.id,
      },
      view: {
        id:
          (g = (p = getRUMInternalContext()) === null || p === void 0 ? void 0 : p.view) === null || g === void 0
            ? void 0
            : g.id,
      },
      action: {
        id:
          (m = (v = getRUMInternalContext()) === null || v === void 0 ? void 0 : v.user_action) === null || m === void 0
            ? void 0
            : m.id,
      },
    };
  });
  var o = [];
  if (canUseEventBridge()) {
    var s = getEventBridge(),
      c = i.observable.subscribe(function (f) {
        return s.send('internal_telemetry', f);
      });
    o.push(function () {
      return c.unsubscribe();
    });
  } else {
    var u = startBatchWithReplica(
      t,
      {
        endpoint: t.rumEndpointBuilder,
        encoder: createIdentityEncoder(),
      },
      t.replica && {
        endpoint: t.replica.rumEndpointBuilder,
        encoder: createIdentityEncoder(),
      },
      r,
      n,
      a.expireObservable,
    );
    o.push(function () {
      return u.stop();
    });
    var d = i.observable.subscribe(function (f) {
      return u.add(f, isTelemetryReplicationAllowed(t));
    });
    o.push(function () {
      return d.unsubscribe();
    });
  }
  return (
    drainPreStartTelemetry(),
    addTelemetryConfiguration(serializeLogsConfiguration(e)),
    {
      telemetry: i,
      stop: function () {
        o.forEach(function (f) {
          return f();
        });
      },
    }
  );
}
function startLogs(e, t, r, n) {
  var a = new LifeCycle$1(),
    i = [];
  a.subscribe(1, function (p) {
    return sendToExtension('logs', p);
  });
  var o = startReportError(a),
    s = createPageExitObservable(t),
    c =
      t.sessionStoreStrategyType && !canUseEventBridge() && !willSyntheticsInjectRum()
        ? startLogsSessionManager(t, n)
        : startLogsSessionManagerStub(t),
    u = startLogsTelemetry(e, t, o, s, c).stop;
  (i.push(function () {
    return u();
  }),
    startNetworkErrorCollection(t, a),
    startRuntimeErrorCollection(t, a),
    startConsoleCollection(t, a),
    startReportCollection(t, a));
  var d = startLoggerCollection(a).handleLog;
  if ((startLogsAssembly(c, t, a, r, o), canUseEventBridge())) startLogsBridge(a);
  else {
    var f = startLogsBatch(t, a, o, s, c).stop;
    i.push(function () {
      return f();
    });
  }
  var l = startInternalContext$1(c);
  return {
    handleLog: d,
    getInternalContext: l.get,
    stop: function () {
      i.forEach(function (p) {
        return p();
      });
    },
  };
}
var datadogLogs = makeLogsPublicApi(startLogs);
defineGlobal(getGlobalObject(), 'DD_LOGS', datadogLogs);
function buildCommonContext(e, t, r) {
  return {
    context: e.getContext(),
    user: t.getContext(),
    hasReplay: r.isRecording() ? !0 : void 0,
  };
}
function createCustomVitalsState() {
  var e = /* @__PURE__ */ new Map(),
    t = /* @__PURE__ */ new WeakMap();
  return {vitalsByName: e, vitalsByReference: t};
}
function startVitalCollection(e, t, r) {
  function n(i) {
    return !t.wasInPageStateDuringPeriod('frozen', i.startClocks.relative, i.duration);
  }
  function a(i) {
    n(i) && e.notify(12, processVital(i));
  }
  return {
    addDurationVital: a,
    startDurationVital: function (i, o) {
      return (o === void 0 && (o = {}), startDurationVital(r, i, o));
    },
    stopDurationVital: function (i, o) {
      (o === void 0 && (o = {}), stopDurationVital(a, r, i, o));
    },
  };
}
function startDurationVital(e, t, r) {
  var n = e.vitalsByName,
    a = e.vitalsByReference;
  r === void 0 && (r = {});
  var i = {
      name: t,
      startClocks: clocksNow(),
      context: r.context,
      description: r.description,
    },
    o = {__dd_vital_reference: !0};
  return (n.set(t, i), a.set(o, i), o);
}
function stopDurationVital(e, t, r, n) {
  var a = t.vitalsByName,
    i = t.vitalsByReference;
  n === void 0 && (n = {});
  var o = typeof r == 'string' ? a.get(r) : i.get(r);
  o && (e(buildDurationVital(o, o.startClocks, n, clocksNow())), typeof r == 'string' ? a.delete(r) : i.delete(r));
}
function buildDurationVital(e, t, r, n) {
  var a;
  return {
    name: e.name,
    type: 'duration',
    startClocks: t,
    duration: elapsed(t.timeStamp, n.timeStamp),
    context: combine(e.context, r.context),
    description: (a = r.description) !== null && a !== void 0 ? a : e.description,
  };
}
function processVital(e, t) {
  var r = {
    date: e.startClocks.timeStamp,
    vital: {
      id: generateUUID(),
      type: e.type,
      name: e.name,
      duration: toServerDuration(e.duration),
      description: e.description,
    },
    type: 'vital',
  };
  return (
    (r._dd = {
      vital: {
        computed_value: !0,
      },
    }),
    {
      rawRumEvent: r,
      startTime: e.startClocks.relative,
      customerContext: e.context,
      domainContext: {},
    }
  );
}
function getCrypto() {
  return window.crypto || window.msCrypto;
}
function createTraceIdentifier() {
  return createIdentifier(64);
}
function createSpanIdentifier() {
  return createIdentifier(63);
}
var createIdentifierImplementationCache;
function createIdentifier(e) {
  return (
    createIdentifierImplementationCache ||
      (createIdentifierImplementationCache =
        isExperimentalFeatureEnabled(ExperimentalFeature.CONSISTENT_TRACE_SAMPLING) && areBigIntIdentifiersSupported()
          ? createIdentifierUsingBigInt
          : createIdentifierUsingUint32Array),
    createIdentifierImplementationCache(e)
  );
}
function areBigIntIdentifiersSupported() {
  try {
    return (crypto.getRandomValues(new BigUint64Array(1)), !0);
  } catch {
    return !1;
  }
}
function createIdentifierUsingBigInt(e) {
  var t = crypto.getRandomValues(new BigUint64Array(1))[0];
  return (e === 63 && (t >>= BigInt('1')), t);
}
function createIdentifierUsingUint32Array(e) {
  var t = getCrypto().getRandomValues(new Uint32Array(2));
  return (
    e === 63 && (t[t.length - 1] >>>= 1),
    {
      toString: function (r) {
        r === void 0 && (r = 10);
        var n = t[1],
          a = t[0],
          i = '';
        do {
          var o = (n % r) * 4294967296 + a;
          ((n = Math.floor(n / r)), (a = Math.floor(o / r)), (i = (o % r).toString(r) + i));
        } while (n || a);
        return i;
      },
    }
  );
}
function toPaddedHexadecimalString(e) {
  var t = e.toString(16);
  return Array(17 - t.length).join('0') + t;
}
function isTraceSampled(e, t) {
  if (t === 100) return !0;
  if (t === 0) return !1;
  if (typeof e != 'bigint') return performDraw(t);
  var r = BigInt('1111111111111111111'),
    n = BigInt('0x10000000000000000'),
    a = (e * r) % n;
  return Number(a) <= (t / 100) * Number(n);
}
function isTracingOption(e) {
  var t = e;
  return getType(t) === 'object' && isMatchOption(t.match) && Array.isArray(t.propagatorTypes);
}
function clearTracingIfNeeded(e) {
  e.status === 0 && !e.isAborted && ((e.traceId = void 0), (e.spanId = void 0), (e.traceSampled = void 0));
}
function startTracer(e, t) {
  return {
    clearTracingIfNeeded,
    traceFetch: function (r) {
      return injectHeadersIfTracingAllowed(e, r, t, function (n) {
        var a;
        if (r.input instanceof Request && !(!((a = r.init) === null || a === void 0) && a.headers))
          ((r.input = new Request(r.input)),
            Object.keys(n).forEach(function (o) {
              r.input.headers.append(o, n[o]);
            }));
        else {
          r.init = shallowClone(r.init);
          var i = [];
          (r.init.headers instanceof Headers
            ? r.init.headers.forEach(function (o, s) {
                i.push([s, o]);
              })
            : Array.isArray(r.init.headers)
              ? r.init.headers.forEach(function (o) {
                  i.push(o);
                })
              : r.init.headers &&
                Object.keys(r.init.headers).forEach(function (o) {
                  i.push([o, r.init.headers[o]]);
                }),
            (r.init.headers = i.concat(objectEntries(n))));
        }
      });
    },
    traceXhr: function (r, n) {
      return injectHeadersIfTracingAllowed(e, r, t, function (a) {
        Object.keys(a).forEach(function (i) {
          n.setRequestHeader(i, a[i]);
        });
      });
    },
  };
}
function injectHeadersIfTracingAllowed(e, t, r, n) {
  if (!(!isTracingSupported() || !r.findTrackedSession())) {
    var a = find(e.allowedTracingUrls, function (s) {
      return matchList([s.match], t.url, !0);
    });
    if (a) {
      var i = createTraceIdentifier();
      t.traceSampled = isTraceSampled(i, e.traceSampleRate);
      var o = t.traceSampled || e.traceContextInjection === TraceContextInjection.ALL;
      o &&
        ((t.traceId = i),
        (t.spanId = createSpanIdentifier()),
        n(makeTracingHeaders(t.traceId, t.spanId, t.traceSampled, a.propagatorTypes)));
    }
  }
}
function isTracingSupported() {
  return getCrypto() !== void 0;
}
function makeTracingHeaders(e, t, r, n) {
  var a = {};
  return (
    n.forEach(function (i) {
      switch (i) {
        case 'datadog': {
          assign(a, {
            'x-datadog-origin': 'rum',
            'x-datadog-parent-id': t.toString(),
            'x-datadog-sampling-priority': r ? '1' : '0',
            'x-datadog-trace-id': e.toString(),
          });
          break;
        }
        // https://www.w3.org/TR/trace-context/
        case 'tracecontext': {
          assign(a, {
            traceparent: '00-0000000000000000'
              .concat(toPaddedHexadecimalString(e), '-')
              .concat(toPaddedHexadecimalString(t), '-0')
              .concat(r ? '1' : '0'),
          });
          break;
        }
        // https://github.com/openzipkin/b3-propagation
        case 'b3': {
          assign(a, {
            b3: ''
              .concat(toPaddedHexadecimalString(e), '-')
              .concat(toPaddedHexadecimalString(t), '-')
              .concat(r ? '1' : '0'),
          });
          break;
        }
        case 'b3multi': {
          assign(a, {
            'X-B3-TraceId': toPaddedHexadecimalString(e),
            'X-B3-SpanId': toPaddedHexadecimalString(t),
            'X-B3-Sampled': r ? '1' : '0',
          });
          break;
        }
      }
    }),
    a
  );
}
var DEFAULT_PROPAGATOR_TYPES = ['tracecontext', 'datadog'];
function validateAndBuildRumConfiguration(e) {
  var t, r, n;
  if (!e.applicationId) {
    display.error('Application ID is not configured, no RUM data will be collected.');
    return;
  }
  if (!(!isSampleRate(e.sessionReplaySampleRate, 'Session Replay') || !isSampleRate(e.traceSampleRate, 'Trace'))) {
    if (e.excludedActivityUrls !== void 0 && !Array.isArray(e.excludedActivityUrls)) {
      display.error('Excluded Activity Urls should be an array');
      return;
    }
    var a = validateAndBuildTracingOptions(e);
    if (a) {
      var i = validateAndBuildConfiguration(e);
      if (i) {
        var o = (t = e.sessionReplaySampleRate) !== null && t !== void 0 ? t : 0;
        return assign(
          {
            applicationId: e.applicationId,
            version: e.version || void 0,
            actionNameAttribute: e.actionNameAttribute,
            sessionReplaySampleRate: o,
            startSessionReplayRecordingManually:
              e.startSessionReplayRecordingManually !== void 0 ? !!e.startSessionReplayRecordingManually : o === 0,
            traceSampleRate: (r = e.traceSampleRate) !== null && r !== void 0 ? r : 100,
            rulePsr: isNumber(e.traceSampleRate) ? e.traceSampleRate / 100 : void 0,
            allowedTracingUrls: a,
            excludedActivityUrls: (n = e.excludedActivityUrls) !== null && n !== void 0 ? n : [],
            workerUrl: e.workerUrl,
            compressIntakeRequests: !!e.compressIntakeRequests,
            trackUserInteractions: !!e.trackUserInteractions,
            trackViewsManually: !!e.trackViewsManually,
            trackResources: !!e.trackResources,
            trackLongTasks: !!e.trackLongTasks,
            subdomain: e.subdomain,
            defaultPrivacyLevel: objectHasValue(DefaultPrivacyLevel, e.defaultPrivacyLevel)
              ? e.defaultPrivacyLevel
              : DefaultPrivacyLevel.MASK,
            enablePrivacyForActionName: !!e.enablePrivacyForActionName,
            customerDataTelemetrySampleRate: 1,
            traceContextInjection: objectHasValue(TraceContextInjection, e.traceContextInjection)
              ? e.traceContextInjection
              : TraceContextInjection.ALL,
            plugins: e.plugins || [],
          },
          i,
        );
      }
    }
  }
}
function validateAndBuildTracingOptions(e) {
  if (e.allowedTracingUrls === void 0) return [];
  if (!Array.isArray(e.allowedTracingUrls)) {
    display.error('Allowed Tracing URLs should be an array');
    return;
  }
  if (e.allowedTracingUrls.length !== 0 && e.service === void 0) {
    display.error('Service needs to be configured when tracing is enabled');
    return;
  }
  var t = [];
  return (
    e.allowedTracingUrls.forEach(function (r) {
      isMatchOption(r)
        ? t.push({match: r, propagatorTypes: DEFAULT_PROPAGATOR_TYPES})
        : isTracingOption(r)
          ? t.push(r)
          : display.warn(
              'Allowed Tracing Urls parameters should be a string, RegExp, function, or an object. Ignoring parameter',
              r,
            );
    }),
    t
  );
}
function getSelectedTracingPropagators(e) {
  var t = /* @__PURE__ */ new Set();
  return (
    Array.isArray(e.allowedTracingUrls) &&
      e.allowedTracingUrls.length > 0 &&
      e.allowedTracingUrls.forEach(function (r) {
        isMatchOption(r)
          ? DEFAULT_PROPAGATOR_TYPES.forEach(function (n) {
              return t.add(n);
            })
          : getType(r) === 'object' &&
            Array.isArray(r.propagatorTypes) &&
            r.propagatorTypes.forEach(function (n) {
              return t.add(n);
            });
      }),
    arrayFrom(t)
  );
}
function serializeRumConfiguration(e) {
  var t,
    r = serializeConfiguration(e);
  return assign(
    {
      session_replay_sample_rate: e.sessionReplaySampleRate,
      start_session_replay_recording_manually: e.startSessionReplayRecordingManually,
      trace_sample_rate: e.traceSampleRate,
      trace_context_injection: e.traceContextInjection,
      action_name_attribute: e.actionNameAttribute,
      use_allowed_tracing_urls: Array.isArray(e.allowedTracingUrls) && e.allowedTracingUrls.length > 0,
      selected_tracing_propagators: getSelectedTracingPropagators(e),
      default_privacy_level: e.defaultPrivacyLevel,
      enable_privacy_for_action_name: e.enablePrivacyForActionName,
      use_excluded_activity_urls: Array.isArray(e.excludedActivityUrls) && e.excludedActivityUrls.length > 0,
      use_worker_url: !!e.workerUrl,
      compress_intake_requests: e.compressIntakeRequests,
      track_views_manually: e.trackViewsManually,
      track_user_interactions: e.trackUserInteractions,
      track_resources: e.trackResources,
      track_long_task: e.trackLongTasks,
      plugins:
        (t = e.plugins) === null || t === void 0
          ? void 0
          : t.map(function (n) {
              var a;
              return assign(
                {name: n.name},
                (a = n.getConfigurationTelemetry) === null || a === void 0 ? void 0 : a.call(n),
              );
            }),
    },
    r,
  );
}
var REMOTE_CONFIGURATION_URL = 'https://d3uc069fcn7uxw.cloudfront.net/configuration';
function fetchAndApplyRemoteConfiguration(e, t) {
  fetchRemoteConfiguration(e, function (r) {
    t(applyRemoteConfiguration(e, r));
  });
}
function applyRemoteConfiguration(e, t) {
  return assign({}, e, t);
}
function fetchRemoteConfiguration(e, t) {
  var r = new XMLHttpRequest();
  (addEventListener(e, r, 'load', function () {
    r.status === 200 ? t(JSON.parse(r.responseText)) : displayRemoteConfigurationFetchingError();
  }),
    addEventListener(e, r, 'error', function () {
      displayRemoteConfigurationFetchingError();
    }),
    r.open(
      'GET',
      ''.concat(REMOTE_CONFIGURATION_URL, '/').concat(encodeURIComponent(e.remoteConfigurationId), '.json'),
    ),
    r.send());
}
function displayRemoteConfigurationFetchingError() {
  display.error('Error fetching the remote configuration.');
}
function callPluginsMethod(e, t, r) {
  if (e)
    for (var n = 0, a = e; n < a.length; n++) {
      var i = a[n],
        o = i[t];
      o && o(r);
    }
}
function createPreStartStrategy$1(e, t, r, n, a) {
  var i = e.ignoreInitIfSyntheticsWillInjectRum,
    o = e.startDeflateWorker,
    s = createBoundedBuffer(),
    c,
    u,
    d,
    f,
    l = r.observable.subscribe(p);
  function p() {
    if (!(!d || !f || !r.isGranted())) {
      l.unsubscribe();
      var m;
      if (f.trackViewsManually) {
        if (!c) return;
        (s.remove(c.callback), (m = c.options));
      }
      var h = a(f, u, m);
      s.drain(h);
    }
  }
  function g(m) {
    var h = canUseEventBridge();
    if (
      (h && (m = overrideInitConfigurationForBridge(m)),
      (d = m),
      addTelemetryConfiguration(serializeRumConfiguration(m)),
      f)
    ) {
      displayAlreadyInitializedError('DD_RUM', m);
      return;
    }
    var S = validateAndBuildRumConfiguration(m);
    if (S) {
      if (!h && !S.sessionStoreStrategyType) {
        display.warn('No storage available for session. We will not send any data.');
        return;
      }
      (S.compressIntakeRequests &&
        !h &&
        o &&
        ((u = o(
          S,
          'Datadog RUM',
          // Worker initialization can fail asynchronously, especially in Firefox where even CSP
          // issues are reported asynchronously. For now, the SDK will continue its execution even if
          // data won't be sent to Datadog. We could improve this behavior in the future.
          noop,
        )),
        !u)) ||
        ((f = S), initFetchObservable().subscribe(noop), r.tryToInit(S.trackingConsent), p());
    }
  }
  var v = function (m) {
    s.add(function (h) {
      return h.addDurationVital(m);
    });
  };
  return {
    init: function (m, h) {
      if (!m) {
        display.error('Missing configuration');
        return;
      }
      (initFeatureFlags(m.enableExperimentalFeatures),
        (d = m),
        !(i && willSyntheticsInjectRum()) &&
          (callPluginsMethod(m.plugins, 'onInit', {initConfiguration: m, publicApi: h}),
          m.remoteConfigurationId && isExperimentalFeatureEnabled(ExperimentalFeature.REMOTE_CONFIGURATION)
            ? fetchAndApplyRemoteConfiguration(m, g)
            : g(m)));
    },
    get initConfiguration() {
      return d;
    },
    getInternalContext: noop,
    stopSession: noop,
    addTiming: function (m, h) {
      (h === void 0 && (h = timeStampNow()),
        s.add(function (S) {
          return S.addTiming(m, h);
        }));
    },
    startView: function (m, h) {
      h === void 0 && (h = clocksNow());
      var S = function (E) {
        E.startView(m, h);
      };
      (s.add(S), c || ((c = {options: m, callback: S}), p()));
    },
    setViewName: function (m) {
      s.add(function (h) {
        return h.setViewName(m);
      });
    },
    setViewContext: function (m) {
      s.add(function (h) {
        return h.setViewContext(m);
      });
    },
    setViewContextProperty: function (m, h) {
      s.add(function (S) {
        return S.setViewContextProperty(m, h);
      });
    },
    addAction: function (m, h) {
      (h === void 0 && (h = t()),
        s.add(function (S) {
          return S.addAction(m, h);
        }));
    },
    addError: function (m, h) {
      (h === void 0 && (h = t()),
        s.add(function (S) {
          return S.addError(m, h);
        }));
    },
    addFeatureFlagEvaluation: function (m, h) {
      s.add(function (S) {
        return S.addFeatureFlagEvaluation(m, h);
      });
    },
    startDurationVital: function (m, h) {
      return startDurationVital(n, m, h);
    },
    stopDurationVital: function (m, h) {
      stopDurationVital(v, n, m, h);
    },
    addDurationVital: v,
  };
}
function overrideInitConfigurationForBridge(e) {
  var t, r;
  return assign({}, e, {
    applicationId: '00000000-aaaa-0000-aaaa-000000000000',
    clientToken: 'empty',
    sessionSampleRate: 100,
    defaultPrivacyLevel:
      (t = e.defaultPrivacyLevel) !== null && t !== void 0
        ? t
        : (r = getEventBridge()) === null || r === void 0
          ? void 0
          : r.getPrivacyLevel(),
  });
}
var RUM_STORAGE_KEY = 'rum';
function makeRumPublicApi(e, t, r) {
  r === void 0 && (r = {});
  var n = createCustomerDataTrackerManager(
      0,
      /* CustomerDataCompressionStatus.Unknown */
    ),
    a = createContextManager(
      n.getOrCreateTracker(
        2,
        /* CustomerDataType.GlobalContext */
      ),
    ),
    i = createContextManager(
      n.getOrCreateTracker(
        1,
        /* CustomerDataType.User */
      ),
    ),
    o = createTrackingConsentState(),
    s = createCustomVitalsState();
  function c() {
    return buildCommonContext(a, i, t);
  }
  var u = createPreStartStrategy$1(r, c, o, s, function (l, p, g) {
      (l.storeContextsAcrossPages &&
        (storeContextManager(
          l,
          a,
          RUM_STORAGE_KEY,
          2,
          /* CustomerDataType.GlobalContext */
        ),
        storeContextManager(
          l,
          i,
          RUM_STORAGE_KEY,
          1,
          /* CustomerDataType.User */
        )),
        n.setCompressionStatus(
          p ? 1 : 2,
          /* CustomerDataCompressionStatus.Disabled */
        ));
      var v = e(
        l,
        t,
        n,
        c,
        g,
        p && r.createDeflateEncoder
          ? function (m) {
              return r.createDeflateEncoder(l, p, m);
            }
          : createIdentityEncoder,
        o,
        s,
      );
      return (t.onRumStart(v.lifeCycle, l, v.session, v.viewHistory, p), (u = createPostStartStrategy$1(u, v)), v);
    }),
    d = monitor(function (l) {
      var p = typeof l == 'object' ? l : {name: l};
      (p.context &&
        n
          .getOrCreateTracker(
            3,
            /* CustomerDataType.View */
          )
          .updateCustomerData(p.context),
        u.startView(p),
        addTelemetryUsage({feature: 'start-view'}));
    }),
    f = makePublicApi({
      init: monitor(function (l) {
        u.init(l, f);
      }),
      setTrackingConsent: monitor(function (l) {
        (o.update(l), addTelemetryUsage({feature: 'set-tracking-consent', tracking_consent: l}));
      }),
      setViewName: monitor(function (l) {
        u.setViewName(l);
      }),
      setViewContext: monitor(function (l) {
        u.setViewContext(l);
      }),
      setViewContextProperty: monitor(function (l, p) {
        u.setViewContextProperty(l, p);
      }),
      setGlobalContext: monitor(function (l) {
        (a.setContext(l), addTelemetryUsage({feature: 'set-global-context'}));
      }),
      getGlobalContext: monitor(function () {
        return a.getContext();
      }),
      setGlobalContextProperty: monitor(function (l, p) {
        (a.setContextProperty(l, p), addTelemetryUsage({feature: 'set-global-context'}));
      }),
      removeGlobalContextProperty: monitor(function (l) {
        return a.removeContextProperty(l);
      }),
      clearGlobalContext: monitor(function () {
        return a.clearContext();
      }),
      getInternalContext: monitor(function (l) {
        return u.getInternalContext(l);
      }),
      getInitConfiguration: monitor(function () {
        return deepClone(u.initConfiguration);
      }),
      addAction: function (l, p) {
        var g = createHandlingStack();
        callMonitored(function () {
          (u.addAction({
            name: sanitize(l),
            context: sanitize(p),
            startClocks: clocksNow(),
            type: 'custom',
            handlingStack: g,
          }),
            addTelemetryUsage({feature: 'add-action'}));
        });
      },
      addError: function (l, p) {
        var g = createHandlingStack();
        callMonitored(function () {
          (u.addError({
            error: l,
            // Do not sanitize error here, it is needed unserialized by computeRawError()
            handlingStack: g,
            context: sanitize(p),
            startClocks: clocksNow(),
          }),
            addTelemetryUsage({feature: 'add-error'}));
        });
      },
      addTiming: monitor(function (l, p) {
        u.addTiming(sanitize(l), p);
      }),
      setUser: monitor(function (l) {
        (checkUser(l) && i.setContext(sanitizeUser(l)), addTelemetryUsage({feature: 'set-user'}));
      }),
      getUser: monitor(function () {
        return i.getContext();
      }),
      setUserProperty: monitor(function (l, p) {
        var g,
          v = sanitizeUser(((g = {}), (g[l] = p), g))[l];
        (i.setContextProperty(l, v), addTelemetryUsage({feature: 'set-user'}));
      }),
      removeUserProperty: monitor(function (l) {
        return i.removeContextProperty(l);
      }),
      clearUser: monitor(function () {
        return i.clearContext();
      }),
      startView: d,
      stopSession: monitor(function () {
        (u.stopSession(), addTelemetryUsage({feature: 'stop-session'}));
      }),
      addFeatureFlagEvaluation: monitor(function (l, p) {
        (u.addFeatureFlagEvaluation(sanitize(l), sanitize(p)),
          addTelemetryUsage({feature: 'add-feature-flag-evaluation'}));
      }),
      getSessionReplayLink: monitor(function () {
        return t.getSessionReplayLink();
      }),
      startSessionReplayRecording: monitor(function (l) {
        (t.start(l), addTelemetryUsage({feature: 'start-session-replay-recording', force: l && l.force}));
      }),
      stopSessionReplayRecording: monitor(function () {
        return t.stop();
      }),
      addDurationVital: monitor(function (l, p) {
        (addTelemetryUsage({feature: 'add-duration-vital'}),
          u.addDurationVital({
            name: sanitize(l),
            type: 'duration',
            startClocks: timeStampToClocks(p.startTime),
            duration: p.duration,
            context: sanitize(p && p.context),
            description: sanitize(p && p.description),
          }));
      }),
      startDurationVital: monitor(function (l, p) {
        return (
          addTelemetryUsage({feature: 'start-duration-vital'}),
          u.startDurationVital(sanitize(l), {
            context: sanitize(p && p.context),
            description: sanitize(p && p.description),
          })
        );
      }),
      stopDurationVital: monitor(function (l, p) {
        (addTelemetryUsage({feature: 'stop-duration-vital'}),
          u.stopDurationVital(typeof l == 'string' ? sanitize(l) : l, {
            context: sanitize(p && p.context),
            description: sanitize(p && p.description),
          }));
      }),
    });
  return f;
}
function createPostStartStrategy$1(e, t) {
  return assign(
    {
      init: function (r) {
        displayAlreadyInitializedError('DD_RUM', r);
      },
      initConfiguration: e.initConfiguration,
    },
    t,
  );
}
function createDOMMutationObservable() {
  var e = getMutationObserverConstructor();
  return new Observable(function (t) {
    if (e) {
      var r = new e(
        monitor(function () {
          return t.notify();
        }),
      );
      return (
        r.observe(document, {
          attributes: !0,
          characterData: !0,
          childList: !0,
          subtree: !0,
        }),
        function () {
          return r.disconnect();
        }
      );
    }
  });
}
function getMutationObserverConstructor() {
  var e,
    t = window;
  if (t.Zone && ((e = getZoneJsOriginalValue(t, 'MutationObserver')), t.MutationObserver && e === t.MutationObserver)) {
    var r = new t.MutationObserver(noop),
      n = getZoneJsOriginalValue(r, 'originalInstance');
    e = n && n.constructor;
  }
  return (e || (e = t.MutationObserver), e);
}
function createWindowOpenObservable() {
  var e = new Observable(),
    t = instrumentMethod(window, 'open', function () {
      return e.notify();
    }).stop;
  return {observable: e, stop: t};
}
function getSyntheticsContext() {
  var e = getSyntheticsTestId(),
    t = getSyntheticsResultId();
  if (e && t)
    return {
      test_id: e,
      result_id: t,
      injected: willSyntheticsInjectRum(),
    };
}
function limitModification(e, t, r) {
  var n = deepClone(e),
    a = r(n);
  return (
    objectEntries(t).forEach(function (i) {
      var o = i[0],
        s = i[1],
        c = get(n, o),
        u = getType(c);
      u === s ? set(e, o, sanitize(c)) : s === 'object' && (u === 'undefined' || u === 'null') && set(e, o, {});
    }),
    a
  );
}
function get(e, t) {
  for (var r = e, n = 0, a = t.split('.'); n < a.length; n++) {
    var i = a[n];
    if (!isValidObjectContaining(r, i)) return;
    r = r[i];
  }
  return r;
}
function set(e, t, r) {
  for (var n = e, a = t.split('.'), i = 0; i < a.length; i += 1) {
    var o = a[i];
    if (!isValidObject(n)) return;
    i !== a.length - 1 ? (n = n[o]) : (n[o] = r);
  }
}
function isValidObject(e) {
  return getType(e) === 'object';
}
function isValidObjectContaining(e, t) {
  return isValidObject(e) && Object.prototype.hasOwnProperty.call(e, t);
}
var VIEW_MODIFIABLE_FIELD_PATHS = {
    'view.name': 'string',
    'view.url': 'string',
    'view.referrer': 'string',
  },
  USER_CUSTOMIZABLE_FIELD_PATHS = {
    context: 'object',
  },
  ROOT_MODIFIABLE_FIELD_PATHS = {
    service: 'string',
    version: 'string',
  },
  modifiableFieldPathsByEvent;
function startRumAssembly(e, t, r, n, a, i, o, s, c, u) {
  var d, f;
  modifiableFieldPathsByEvent =
    ((d = {}),
    (d.view = assign({}, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS)),
    (d.error = assign(
      {
        'error.message': 'string',
        'error.stack': 'string',
        'error.resource.url': 'string',
        'error.fingerprint': 'string',
      },
      USER_CUSTOMIZABLE_FIELD_PATHS,
      VIEW_MODIFIABLE_FIELD_PATHS,
      ROOT_MODIFIABLE_FIELD_PATHS,
    )),
    (d.resource = assign(
      {
        'resource.url': 'string',
      },
      isExperimentalFeatureEnabled(ExperimentalFeature.WRITABLE_RESOURCE_GRAPHQL)
        ? {
            'resource.graphql': 'object',
          }
        : {},
      USER_CUSTOMIZABLE_FIELD_PATHS,
      VIEW_MODIFIABLE_FIELD_PATHS,
      ROOT_MODIFIABLE_FIELD_PATHS,
    )),
    (d.action = assign(
      {
        'action.target.name': 'string',
      },
      USER_CUSTOMIZABLE_FIELD_PATHS,
      VIEW_MODIFIABLE_FIELD_PATHS,
      ROOT_MODIFIABLE_FIELD_PATHS,
    )),
    (d.long_task = assign({}, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS)),
    (d.vital = assign({}, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS)),
    d);
  var l =
      ((f = {}),
      (f.error = createEventRateLimiter('error', e.eventRateLimiterThreshold, u)),
      (f.action = createEventRateLimiter('action', e.eventRateLimiterThreshold, u)),
      (f.vital = createEventRateLimiter('vital', e.eventRateLimiterThreshold, u)),
      f),
    p = getSyntheticsContext();
  t.subscribe(12, function (g) {
    var v = g.startTime,
      m = g.rawRumEvent,
      h = g.domainContext,
      S = g.savedCommonContext,
      E = g.customerContext,
      y = n.findView(v),
      I = a.findUrl(v),
      T = r.findTrackedSession(v);
    if (T && y && I) {
      var _ = S || c(),
        b = i.findActionId(v),
        O = {
          _dd: {
            format_version: 2,
            drift: currentDrift(),
            configuration: {
              session_sample_rate: round(e.sessionSampleRate, 3),
              session_replay_sample_rate: round(e.sessionReplaySampleRate, 3),
            },
            browser_sdk_version: canUseEventBridge() ? '5.35.1' : void 0,
          },
          application: {
            id: e.applicationId,
          },
          date: timeStampNow(),
          service: y.service || e.service,
          version: y.version || e.version,
          source: 'browser',
          session: {
            id: T.id,
            type: p ? 'synthetics' : s.get() ? 'ci_test' : 'user',
          },
          view: {
            id: y.id,
            name: y.name,
            url: I.url,
            referrer: I.referrer,
          },
          action: needToAssembleWithAction(m) && b ? {id: b} : void 0,
          synthetics: p,
          ci_test: s.get(),
          display: o.get(),
          connectivity: getConnectivity(),
        },
        C = combine(O, m);
      ((C.context = combine(_.context, y.context, E)),
        'has_replay' in C.session || (C.session.has_replay = _.hasReplay),
        C.type === 'view' && (C.session.sampled_for_replay = T.sessionReplay === 1), // TODO: remove ff and should always add anonymous user id
        isExperimentalFeatureEnabled(ExperimentalFeature.ANONYMOUS_USER_TRACKING) &&
          !_.user.anonymous_id &&
          (_.user.anonymous_id = T.anonymousId),
        isEmptyObject(_.user) || (C.usr = _.user),
        shouldSend(C, e.beforeSend, h, l) && (isEmptyObject(C.context) && delete C.context, t.notify(13, C)));
    }
  });
}
function shouldSend(e, t, r, n) {
  var a;
  if (t) {
    var i = limitModification(e, modifiableFieldPathsByEvent[e.type], function (s) {
      return t(s, r);
    });
    if (i === !1 && e.type !== 'view') return !1;
    i === !1 && display.warn("Can't dismiss view events using beforeSend!");
  }
  var o = (a = n[e.type]) === null || a === void 0 ? void 0 : a.isLimitReached();
  return !o;
}
function needToAssembleWithAction(e) {
  return (
    [
      'error',
      'resource',
      'long_task',
      /* RumEventType.LONG_TASK */
    ].indexOf(e.type) !== -1
  );
}
function startInternalContext(e, t, r, n, a) {
  return {
    get: function (i) {
      var o = r.findView(i),
        s = a.findUrl(i),
        c = t.findTrackedSession(i);
      if (c && o && s) {
        var u = n.findActionId(i);
        return {
          application_id: e,
          session_id: c.id,
          user_action: u ? {id: u} : void 0,
          view: {id: o.id, name: o.name, referrer: s.referrer, url: s.url},
        };
      }
    },
  };
}
var LifeCycle = AbstractLifeCycle,
  VIEW_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startViewHistory(e) {
  var t = createValueHistory({expireDelay: VIEW_CONTEXT_TIME_OUT_DELAY});
  (e.subscribe(1, function (n) {
    t.add(r(n), n.startClocks.relative);
  }),
    e.subscribe(6, function (n) {
      var a = n.endClocks;
      t.closeActive(a.relative);
    }),
    e.subscribe(3, function (n) {
      var a = t.find(n.startClocks.relative);
      (a && n.name && (a.name = n.name), a && n.context && (a.context = n.context));
    }),
    e.subscribe(10, function () {
      t.reset();
    }));
  function r(n) {
    return {
      service: n.service,
      version: n.version,
      context: n.context,
      id: n.id,
      name: n.name,
      startClocks: n.startClocks,
    };
  }
  return {
    findView: function (n) {
      return t.find(n);
    },
    stop: function () {
      t.stop();
    },
  };
}
var FAKE_INITIAL_DOCUMENT = 'initial_document',
  RESOURCE_TYPES = [
    [
      'document',
      function (e) {
        return FAKE_INITIAL_DOCUMENT === e;
      },
    ],
    [
      'xhr',
      function (e) {
        return e === 'xmlhttprequest';
      },
    ],
    [
      'fetch',
      function (e) {
        return e === 'fetch';
      },
    ],
    [
      'beacon',
      function (e) {
        return e === 'beacon';
      },
    ],
    [
      'css',
      function (e, t) {
        return /\.css$/i.test(t);
      },
    ],
    [
      'js',
      function (e, t) {
        return /\.js$/i.test(t);
      },
    ],
    [
      'image',
      function (e, t) {
        return includes(['image', 'img', 'icon'], e) || /\.(gif|jpg|jpeg|tiff|png|svg|ico)$/i.exec(t) !== null;
      },
    ],
    [
      'font',
      function (e, t) {
        return /\.(woff|eot|woff2|ttf)$/i.exec(t) !== null;
      },
    ],
    [
      'media',
      function (e, t) {
        return includes(['audio', 'video'], e) || /\.(mp3|mp4)$/i.exec(t) !== null;
      },
    ],
  ];
function computeResourceEntryType(e) {
  var t = e.name;
  if (!isValidUrl(t)) return (addTelemetryDebug('Failed to construct URL for "'.concat(e.name, '"')), 'other');
  for (var r = getPathName(t), n = 0, a = RESOURCE_TYPES; n < a.length; n++) {
    var i = a[n],
      o = i[0],
      s = i[1];
    if (s(e.initiatorType, r)) return o;
  }
  return 'other';
}
function areInOrder() {
  for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
  for (var r = 1; r < e.length; r += 1) if (e[r - 1] > e[r]) return !1;
  return !0;
}
function isResourceEntryRequestType(e) {
  return e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch';
}
function computeResourceEntryDuration(e) {
  var t = e.duration,
    r = e.startTime,
    n = e.responseEnd;
  return t === 0 && r < n ? toServerDuration(elapsed(r, n)) : toServerDuration(t);
}
function computeResourceEntryDetails(e) {
  if (hasValidResourceEntryTimings(e)) {
    var t = e.startTime,
      r = e.fetchStart,
      n = e.workerStart,
      a = e.redirectStart,
      i = e.redirectEnd,
      o = e.domainLookupStart,
      s = e.domainLookupEnd,
      c = e.connectStart,
      u = e.secureConnectionStart,
      d = e.connectEnd,
      f = e.requestStart,
      l = e.responseStart,
      p = e.responseEnd,
      g = {
        download: formatTiming(t, l, p),
        first_byte: formatTiming(t, f, l),
      };
    return (
      0 < n && n < r && (g.worker = formatTiming(t, n, r)),
      r < d && ((g.connect = formatTiming(t, c, d)), c <= u && u <= d && (g.ssl = formatTiming(t, u, d))),
      r < s && (g.dns = formatTiming(t, o, s)),
      t < i && (g.redirect = formatTiming(t, a, i)),
      g
    );
  }
}
function hasValidResourceEntryDuration(e) {
  return e.duration >= 0;
}
function hasValidResourceEntryTimings(e) {
  var t = areInOrder(
      e.startTime,
      e.fetchStart,
      e.domainLookupStart,
      e.domainLookupEnd,
      e.connectStart,
      e.connectEnd,
      e.requestStart,
      e.responseStart,
      e.responseEnd,
    ),
    r = hasRedirection(e) ? areInOrder(e.startTime, e.redirectStart, e.redirectEnd, e.fetchStart) : !0;
  return t && r;
}
function hasRedirection(e) {
  return e.redirectEnd > e.startTime;
}
function formatTiming(e, t, r) {
  if (e <= t && t <= r)
    return {
      duration: toServerDuration(elapsed(t, r)),
      start: toServerDuration(elapsed(e, t)),
    };
}
function computeResourceEntryProtocol(e) {
  return e.nextHopProtocol === '' ? void 0 : e.nextHopProtocol;
}
function computeResourceEntryDeliveryType(e) {
  return e.deliveryType === '' ? 'other' : e.deliveryType;
}
function computeResourceEntrySize(e) {
  if (e.startTime < e.responseStart) {
    var t = e.encodedBodySize,
      r = e.decodedBodySize,
      n = e.transferSize;
    return {
      size: r,
      encoded_body_size: t,
      decoded_body_size: r,
      transfer_size: n,
    };
  }
  return {
    size: void 0,
    encoded_body_size: void 0,
    decoded_body_size: void 0,
    transfer_size: void 0,
  };
}
function isAllowedRequestUrl(e) {
  return e && !isIntakeUrl(e);
}
var DATA_URL_REGEX = /data:(.+)?(;base64)?,/g,
  MAX_ATTRIBUTE_VALUE_CHAR_LENGTH = 24e3;
function isLongDataUrl(e) {
  return e.length <= MAX_ATTRIBUTE_VALUE_CHAR_LENGTH
    ? !1
    : e.substring(0, 5) === 'data:'
      ? ((e = e.substring(0, MAX_ATTRIBUTE_VALUE_CHAR_LENGTH)), !0)
      : !1;
}
function sanitizeDataUrl(e) {
  return ''.concat(e.match(DATA_URL_REGEX)[0], '[...]');
}
var nextRequestIndex = 1;
function startRequestCollection(e, t, r) {
  var n = startTracer(t, r);
  (trackXhr(e, t, n), trackFetch(e, n));
}
function trackXhr(e, t, r) {
  var n = initXhrObservable(t).subscribe(function (a) {
    var i = a;
    if (isAllowedRequestUrl(i.url))
      switch (i.state) {
        case 'start':
          (r.traceXhr(i, i.xhr),
            (i.requestIndex = getNextRequestIndex()),
            e.notify(7, {
              requestIndex: i.requestIndex,
              url: i.url,
            }));
          break;
        case 'complete':
          (r.clearTracingIfNeeded(i),
            e.notify(8, {
              duration: i.duration,
              method: i.method,
              requestIndex: i.requestIndex,
              spanId: i.spanId,
              startClocks: i.startClocks,
              status: i.status,
              traceId: i.traceId,
              traceSampled: i.traceSampled,
              type: 'xhr',
              url: i.url,
              xhr: i.xhr,
              isAborted: i.isAborted,
              handlingStack: i.handlingStack,
            }));
          break;
      }
  });
  return {
    stop: function () {
      return n.unsubscribe();
    },
  };
}
function trackFetch(e, t) {
  var r = initFetchObservable().subscribe(function (n) {
    var a = n;
    if (isAllowedRequestUrl(a.url))
      switch (a.state) {
        case 'start':
          (t.traceFetch(a),
            (a.requestIndex = getNextRequestIndex()),
            e.notify(7, {
              requestIndex: a.requestIndex,
              url: a.url,
            }));
          break;
        case 'resolve':
          waitForResponseToComplete(a, function (i) {
            (t.clearTracingIfNeeded(a),
              e.notify(8, {
                duration: i,
                method: a.method,
                requestIndex: a.requestIndex,
                responseType: a.responseType,
                spanId: a.spanId,
                startClocks: a.startClocks,
                status: a.status,
                traceId: a.traceId,
                traceSampled: a.traceSampled,
                type: 'fetch',
                url: a.url,
                response: a.response,
                init: a.init,
                input: a.input,
                isAborted: a.isAborted,
                handlingStack: a.handlingStack,
              }));
          });
          break;
      }
  });
  return {
    stop: function () {
      return r.unsubscribe();
    },
  };
}
function getNextRequestIndex() {
  var e = nextRequestIndex;
  return ((nextRequestIndex += 1), e);
}
function waitForResponseToComplete(e, t) {
  var r = e.response && tryToClone(e.response);
  !r || !r.body
    ? t(elapsed(e.startClocks.timeStamp, timeStampNow()))
    : readBytesFromStream(
        r.body,
        function () {
          t(elapsed(e.startClocks.timeStamp, timeStampNow()));
        },
        {
          bytesLimit: Number.POSITIVE_INFINITY,
          collectStreamBody: !1,
        },
      );
}
function discardNegativeDuration(e) {
  return isNumber(e) && e < 0 ? void 0 : e;
}
function trackEventCounts(e) {
  var t = e.lifeCycle,
    r = e.isChildEvent,
    n = e.onChange,
    a = n === void 0 ? noop : n,
    i = {
      errorCount: 0,
      longTaskCount: 0,
      resourceCount: 0,
      actionCount: 0,
      frustrationCount: 0,
    },
    o = t.subscribe(13, function (s) {
      var c;
      if (!(s.type === 'view' || s.type === 'vital' || !r(s)))
        switch (s.type) {
          case 'error':
            ((i.errorCount += 1), a());
            break;
          case 'action':
            ((i.actionCount += 1),
              s.action.frustration && (i.frustrationCount += s.action.frustration.type.length),
              a());
            break;
          case 'long_task':
            ((i.longTaskCount += 1), a());
            break;
          case 'resource':
            (!((c = s._dd) === null || c === void 0) && c.discarded) || ((i.resourceCount += 1), a());
            break;
        }
    });
  return {
    stop: function () {
      o.unsubscribe();
    },
    eventCounts: i,
  };
}
function retrieveFirstInputTiming(e, t) {
  var r = dateNow(),
    n = !1,
    a = addEventListeners(
      e,
      window,
      [
        'click',
        'mousedown',
        'keydown',
        'touchstart',
        'pointerdown',
        /* DOM_EVENT.POINTER_DOWN */
      ],
      function (s) {
        if (s.cancelable) {
          var c = {
            entryType: 'first-input',
            processingStart: relativeNow(),
            processingEnd: relativeNow(),
            startTime: s.timeStamp,
            duration: 0,
            // arbitrary value to avoid nullable duration and simplify INP logic
            name: '',
            cancelable: !1,
            target: null,
            toJSON: function () {
              return {};
            },
          };
          s.type === 'pointerdown' ? i(e, c) : o(c);
        }
      },
      {passive: !0, capture: !0},
    ).stop;
  return {stop: a};
  function i(s, c) {
    addEventListeners(
      s,
      window,
      [
        'pointerup',
        'pointercancel',
        /* DOM_EVENT.POINTER_CANCEL */
      ],
      function (u) {
        u.type === 'pointerup' && o(c);
      },
      {once: !0},
    );
  }
  function o(s) {
    if (!n) {
      ((n = !0), a());
      var c = s.processingStart - s.startTime;
      c >= 0 && c < dateNow() - r && t(s);
    }
  }
}
var RumPerformanceEntryType;
(function (e) {
  ((e.EVENT = 'event'),
    (e.FIRST_INPUT = 'first-input'),
    (e.LARGEST_CONTENTFUL_PAINT = 'largest-contentful-paint'),
    (e.LAYOUT_SHIFT = 'layout-shift'),
    (e.LONG_TASK = 'longtask'),
    (e.LONG_ANIMATION_FRAME = 'long-animation-frame'),
    (e.NAVIGATION = 'navigation'),
    (e.PAINT = 'paint'),
    (e.RESOURCE = 'resource'));
})(RumPerformanceEntryType || (RumPerformanceEntryType = {}));
function createPerformanceObservable(e, t) {
  return new Observable(function (r) {
    if (window.PerformanceObserver) {
      var n = function (u) {
          var d = filterRumPerformanceEntries(u);
          d.length > 0 && r.notify(d);
        },
        a,
        i = !0,
        o = new PerformanceObserver(
          monitor(function (u) {
            i
              ? (a = setTimeout(function () {
                  return n(u.getEntries());
                }))
              : n(u.getEntries());
          }),
        );
      try {
        o.observe(t);
      } catch {
        var s = [
          RumPerformanceEntryType.RESOURCE,
          RumPerformanceEntryType.NAVIGATION,
          RumPerformanceEntryType.LONG_TASK,
          RumPerformanceEntryType.PAINT,
        ];
        if (includes(s, t.type)) {
          t.buffered &&
            (a = setTimeout(function () {
              return n(performance.getEntriesByType(t.type));
            }));
          try {
            o.observe({entryTypes: [t.type]});
          } catch {
            return;
          }
        }
      }
      ((i = !1), manageResourceTimingBufferFull(e));
      var c;
      return (
        !supportPerformanceTimingEvent(RumPerformanceEntryType.FIRST_INPUT) &&
          t.type === RumPerformanceEntryType.FIRST_INPUT &&
          (c = retrieveFirstInputTiming(e, function (u) {
            n([u]);
          }).stop),
        function () {
          (o.disconnect(), c && c(), clearTimeout(a));
        }
      );
    }
  });
}
var resourceTimingBufferFullListener;
function manageResourceTimingBufferFull(e) {
  return (
    !resourceTimingBufferFullListener &&
      supportPerformanceObject() &&
      'addEventListener' in performance &&
      (resourceTimingBufferFullListener = addEventListener(e, performance, 'resourcetimingbufferfull', function () {
        performance.clearResourceTimings();
      })),
    function () {
      resourceTimingBufferFullListener?.stop();
    }
  );
}
function supportPerformanceObject() {
  return window.performance !== void 0 && 'getEntries' in performance;
}
function supportPerformanceTimingEvent(e) {
  return (
    window.PerformanceObserver &&
    PerformanceObserver.supportedEntryTypes !== void 0 &&
    PerformanceObserver.supportedEntryTypes.includes(e)
  );
}
function filterRumPerformanceEntries(e) {
  return e.filter(function (t) {
    return !isForbiddenResource(t);
  });
}
function isForbiddenResource(e) {
  return (
    e.entryType === RumPerformanceEntryType.RESOURCE &&
    (!isAllowedRequestUrl(e.name) || !hasValidResourceEntryDuration(e))
  );
}
var PAGE_ACTIVITY_VALIDATION_DELAY = 100,
  PAGE_ACTIVITY_END_DELAY = 100;
function waitPageActivityEnd(e, t, r, n, a, i) {
  var o = createPageActivityObservable(e, t, r, n);
  return doWaitPageActivityEnd(o, a, i);
}
function doWaitPageActivityEnd(e, t, r) {
  var n,
    a = !1,
    i = setTimeout(
      monitor(function () {
        return u({hadActivity: !1});
      }),
      PAGE_ACTIVITY_VALIDATION_DELAY,
    ),
    o =
      r !== void 0
        ? setTimeout(
            monitor(function () {
              return u({hadActivity: !0, end: timeStampNow()});
            }),
            r,
          )
        : void 0,
    s = e.subscribe(function (d) {
      var f = d.isBusy;
      (clearTimeout(i), clearTimeout(n));
      var l = timeStampNow();
      f ||
        (n = setTimeout(
          monitor(function () {
            return u({hadActivity: !0, end: l});
          }),
          PAGE_ACTIVITY_END_DELAY,
        ));
    }),
    c = function () {
      ((a = !0), clearTimeout(i), clearTimeout(n), clearTimeout(o), s.unsubscribe());
    };
  function u(d) {
    a || (c(), t(d));
  }
  return {stop: c};
}
function createPageActivityObservable(e, t, r, n) {
  return new Observable(function (a) {
    var i = [],
      o,
      s = 0;
    return (
      i.push(
        t.subscribe(c),
        r.subscribe(c),
        createPerformanceObservable(n, {type: RumPerformanceEntryType.RESOURCE}).subscribe(function (u) {
          u.some(function (d) {
            return !isExcludedUrl(n, d.name);
          }) && c();
        }),
        e.subscribe(7, function (u) {
          isExcludedUrl(n, u.url) || (o === void 0 && (o = u.requestIndex), (s += 1), c());
        }),
        e.subscribe(8, function (u) {
          isExcludedUrl(n, u.url) ||
            o === void 0 || // If the request started before the tracking start, ignore it
            u.requestIndex < o ||
            ((s -= 1), c());
        }),
      ),
      function () {
        i.forEach(function (u) {
          return u.unsubscribe();
        });
      }
    );
    function c() {
      a.notify({isBusy: s > 0});
    }
  });
}
function isExcludedUrl(e, t) {
  return matchList(e.excludedActivityUrls, t);
}
function cssEscape(e) {
  return window.CSS && window.CSS.escape
    ? window.CSS.escape(e)
    : e.replace(/([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g, function (t, r) {
        return r
          ? t === '\0'
            ? '�'
            : ''.concat(t.slice(0, -1), '\\').concat(t.charCodeAt(t.length - 1).toString(16), ' ')
          : '\\'.concat(t);
      });
}
function elementMatches(e, t) {
  return e.matches ? e.matches(t) : e.msMatchesSelector ? e.msMatchesSelector(t) : !1;
}
function getParentElement(e) {
  if (e.parentElement) return e.parentElement;
  for (; e.parentNode; ) {
    if (e.parentNode.nodeType === Node.ELEMENT_NODE) return e.parentNode;
    e = e.parentNode;
  }
  return null;
}
function getClassList(e) {
  if (e.classList) return e.classList;
  var t = (e.getAttribute('class') || '').trim();
  return t ? t.split(/\s+/) : [];
}
var PLACEHOLDER = 1,
  WeakSet$1 =
    /** @class */
    (function () {
      function e(t) {
        var r = this;
        ((this.map = /* @__PURE__ */ new WeakMap()),
          t &&
            t.forEach(function (n) {
              return r.map.set(n, PLACEHOLDER);
            }));
      }
      return (
        (e.prototype.add = function (t) {
          return (this.map.set(t, PLACEHOLDER), this);
        }),
        (e.prototype.delete = function (t) {
          return this.map.delete(t);
        }),
        (e.prototype.has = function (t) {
          return this.map.has(t);
        }),
        e
      );
    })();
function isTextNode(e) {
  return e.nodeType === Node.TEXT_NODE;
}
function isCommentNode(e) {
  return e.nodeType === Node.COMMENT_NODE;
}
function isElementNode(e) {
  return e.nodeType === Node.ELEMENT_NODE;
}
function isNodeShadowHost(e) {
  return isElementNode(e) && !!e.shadowRoot;
}
function isNodeShadowRoot(e) {
  var t = e;
  return !!t.host && t.nodeType === Node.DOCUMENT_FRAGMENT_NODE && isElementNode(t.host);
}
function hasChildNodes(e) {
  return e.childNodes.length > 0 || isNodeShadowHost(e);
}
function forEachChildNodes(e, t) {
  for (var r = e.firstChild; r; ) (t(r), (r = r.nextSibling));
  isNodeShadowHost(e) && t(e.shadowRoot);
}
function getParentNode(e) {
  return isNodeShadowRoot(e) ? e.host : e.parentNode;
}
var NodePrivacyLevel = {
    IGNORE: 'ignore',
    HIDDEN: 'hidden',
    ALLOW: DefaultPrivacyLevel.ALLOW,
    MASK: DefaultPrivacyLevel.MASK,
    MASK_USER_INPUT: DefaultPrivacyLevel.MASK_USER_INPUT,
  },
  PRIVACY_ATTR_NAME = 'data-dd-privacy',
  PRIVACY_ATTR_VALUE_HIDDEN = 'hidden',
  PRIVACY_CLASS_PREFIX = 'dd-privacy-',
  CENSORED_STRING_MARK = '***',
  CENSORED_IMG_MARK = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  FORM_PRIVATE_TAG_NAMES = {
    INPUT: !0,
    OUTPUT: !0,
    TEXTAREA: !0,
    SELECT: !0,
    OPTION: !0,
    DATALIST: !0,
    OPTGROUP: !0,
  },
  TEXT_MASKING_CHAR = 'x';
function getNodePrivacyLevel(e, t, r) {
  if (r && r.has(e)) return r.get(e);
  var n = getParentNode(e),
    a = n ? getNodePrivacyLevel(n, t, r) : t,
    i = getNodeSelfPrivacyLevel(e),
    o = reducePrivacyLevel(i, a);
  return (r && r.set(e, o), o);
}
function reducePrivacyLevel(e, t) {
  switch (t) {
    // These values cannot be overridden
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return t;
  }
  switch (e) {
    case NodePrivacyLevel.ALLOW:
    case NodePrivacyLevel.MASK:
    case NodePrivacyLevel.MASK_USER_INPUT:
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return e;
    default:
      return t;
  }
}
function getNodeSelfPrivacyLevel(e) {
  if (isElementNode(e)) {
    if (e.tagName === 'BASE') return NodePrivacyLevel.ALLOW;
    if (e.tagName === 'INPUT') {
      var t = e;
      if (t.type === 'password' || t.type === 'email' || t.type === 'tel' || t.type === 'hidden')
        return NodePrivacyLevel.MASK;
      var r = t.getAttribute('autocomplete');
      if (r && (r.startsWith('cc-') || r.endsWith('-password'))) return NodePrivacyLevel.MASK;
    }
    if (elementMatches(e, getPrivacySelector(NodePrivacyLevel.HIDDEN))) return NodePrivacyLevel.HIDDEN;
    if (elementMatches(e, getPrivacySelector(NodePrivacyLevel.MASK))) return NodePrivacyLevel.MASK;
    if (elementMatches(e, getPrivacySelector(NodePrivacyLevel.MASK_USER_INPUT)))
      return NodePrivacyLevel.MASK_USER_INPUT;
    if (elementMatches(e, getPrivacySelector(NodePrivacyLevel.ALLOW))) return NodePrivacyLevel.ALLOW;
    if (shouldIgnoreElement(e)) return NodePrivacyLevel.IGNORE;
  }
}
function shouldMaskNode(e, t) {
  switch (t) {
    case NodePrivacyLevel.MASK:
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return !0;
    case NodePrivacyLevel.MASK_USER_INPUT:
      return isTextNode(e) ? isFormElement(e.parentNode) : isFormElement(e);
    default:
      return !1;
  }
}
function isFormElement(e) {
  if (!e || e.nodeType !== e.ELEMENT_NODE) return !1;
  var t = e;
  if (t.tagName === 'INPUT')
    switch (t.type) {
      case 'button':
      case 'color':
      case 'reset':
      case 'submit':
        return !1;
    }
  return !!FORM_PRIVATE_TAG_NAMES[t.tagName];
}
var censorText = function (e) {
  return e.replace(/\S/g, TEXT_MASKING_CHAR);
};
function getTextContent(e, t, r) {
  var n,
    a = (n = e.parentElement) === null || n === void 0 ? void 0 : n.tagName,
    i = e.textContent || '';
  if (!(t && !i.trim())) {
    var o = r,
      s = a === 'SCRIPT';
    if (s) i = CENSORED_STRING_MARK;
    else if (o === NodePrivacyLevel.HIDDEN) i = CENSORED_STRING_MARK;
    else if (shouldMaskNode(e, o))
      if (
        // Scrambling the child list breaks text nodes for DATALIST/SELECT/OPTGROUP
        a === 'DATALIST' ||
        a === 'SELECT' ||
        a === 'OPTGROUP'
      ) {
        if (!i.trim()) return;
      } else a === 'OPTION' ? (i = CENSORED_STRING_MARK) : (i = censorText(i));
    return i;
  }
}
function shouldIgnoreElement(e) {
  if (e.nodeName === 'SCRIPT') return !0;
  if (e.nodeName === 'LINK') {
    var t = a('rel');
    return (
      // Link as script - Ignore only when rel=preload, modulepreload or prefetch
      (/preload|prefetch/i.test(t) && a('as') === 'script') || // Favicons
      t === 'shortcut icon' ||
      t === 'icon'
    );
  }
  if (e.nodeName === 'META') {
    var r = a('name'),
      t = a('rel'),
      n = a('property');
    return (
      // Favicons
      /^msapplication-tile(image|color)$/.test(r) ||
      r === 'application-name' ||
      t === 'icon' ||
      t === 'apple-touch-icon' ||
      t === 'shortcut icon' || // Description
      r === 'keywords' ||
      r === 'description' || // Social
      /^(og|twitter|fb):/.test(n) ||
      /^(og|twitter):/.test(r) ||
      r === 'pinterest' || // Robots
      r === 'robots' ||
      r === 'googlebot' ||
      r === 'bingbot' || // Http headers. Ex: X-UA-Compatible, Content-Type, Content-Language, cache-control,
      // X-Translated-By
      e.hasAttribute('http-equiv') || // Authorship
      r === 'author' ||
      r === 'generator' ||
      r === 'framework' ||
      r === 'publisher' ||
      r === 'progid' ||
      /^article:/.test(n) ||
      /^product:/.test(n) || // Verification
      r === 'google-site-verification' ||
      r === 'yandex-verification' ||
      r === 'csrf-token' ||
      r === 'p:domain_verify' ||
      r === 'verify-v1' ||
      r === 'verification' ||
      r === 'shopify-checkout-api-token'
    );
  }
  function a(i) {
    return (e.getAttribute(i) || '').toLowerCase();
  }
  return !1;
}
function getPrivacySelector(e) {
  return '['.concat(PRIVACY_ATTR_NAME, '="').concat(e, '"], .').concat(PRIVACY_CLASS_PREFIX).concat(e);
}
var DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE = 'data-dd-action-name',
  ACTION_NAME_PLACEHOLDER = 'Masked Element';
function getActionNameFromElement(e, t, r) {
  var n = t.enablePrivacyForActionName,
    a = t.actionNameAttribute,
    i =
      getActionNameFromElementProgrammatically(e, DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE) ||
      (a && getActionNameFromElementProgrammatically(e, a));
  return i
    ? {
        name: i,
        nameSource: 'custom_attribute',
        /* ActionNameSource.CUSTOM_ATTRIBUTE */
      }
    : r === NodePrivacyLevel.MASK
      ? {
          name: ACTION_NAME_PLACEHOLDER,
          nameSource: 'mask_placeholder',
          /* ActionNameSource.MASK_PLACEHOLDER */
        }
      : getActionNameFromElementForStrategies(e, a, priorityStrategies, n) ||
        getActionNameFromElementForStrategies(e, a, fallbackStrategies, n) || {
          name: '',
          nameSource: 'blank',
          /* ActionNameSource.BLANK */
        };
}
function getActionNameFromElementProgrammatically(e, t) {
  var r;
  if (supportsElementClosest()) r = e.closest('['.concat(t, ']'));
  else
    for (var n = e; n; ) {
      if (n.hasAttribute(t)) {
        r = n;
        break;
      }
      n = getParentElement(n);
    }
  if (r) {
    var a = r.getAttribute(t);
    return truncate(normalizeWhitespace(a.trim()));
  }
}
var priorityStrategies = [
    // associated LABEL text
    function (e, t, r) {
      if (supportsLabelProperty()) {
        if ('labels' in e && e.labels && e.labels.length > 0) return getActionNameFromTextualContent(e.labels[0], t);
      } else if (e.id) {
        var n =
          e.ownerDocument &&
          find(e.ownerDocument.querySelectorAll('label'), function (a) {
            return a.htmlFor === e.id;
          });
        return n && getActionNameFromTextualContent(n, t, r);
      }
    },
    // INPUT button (and associated) value
    function (e) {
      if (e.nodeName === 'INPUT') {
        var t = e,
          r = t.getAttribute('type');
        if (r === 'button' || r === 'submit' || r === 'reset')
          return {
            name: t.value,
            nameSource: 'text_content',
            /* ActionNameSource.TEXT_CONTENT */
          };
      }
    },
    // BUTTON, LABEL or button-like element text
    function (e, t, r) {
      if (e.nodeName === 'BUTTON' || e.nodeName === 'LABEL' || e.getAttribute('role') === 'button')
        return getActionNameFromTextualContent(e, t, r);
    },
    function (e) {
      return getActionNameFromStandardAttribute(e, 'aria-label');
    },
    // associated element text designated by the aria-labelledby attribute
    function (e, t, r) {
      var n = e.getAttribute('aria-labelledby');
      if (n)
        return {
          name: n
            .split(/\s+/)
            .map(function (a) {
              return getElementById(e, a);
            })
            .filter(function (a) {
              return !!a;
            })
            .map(function (a) {
              return getTextualContent(a, t, r);
            })
            .join(' '),
          nameSource: 'text_content',
        };
    },
    function (e) {
      return getActionNameFromStandardAttribute(e, 'alt');
    },
    function (e) {
      return getActionNameFromStandardAttribute(e, 'name');
    },
    function (e) {
      return getActionNameFromStandardAttribute(e, 'title');
    },
    function (e) {
      return getActionNameFromStandardAttribute(e, 'placeholder');
    },
    // SELECT first OPTION text
    function (e, t) {
      if ('options' in e && e.options.length > 0) return getActionNameFromTextualContent(e.options[0], t);
    },
  ],
  fallbackStrategies = [
    function (e, t, r) {
      return getActionNameFromTextualContent(e, t, r);
    },
  ],
  MAX_PARENTS_TO_CONSIDER = 10;
function getActionNameFromElementForStrategies(e, t, r, n) {
  for (
    var a = e, i = 0;
    i <= MAX_PARENTS_TO_CONSIDER && a && a.nodeName !== 'BODY' && a.nodeName !== 'HTML' && a.nodeName !== 'HEAD';
  ) {
    for (var o = 0, s = r; o < s.length; o++) {
      var c = s[o],
        u = c(a, t, n);
      if (u) {
        var d = u.name,
          f = u.nameSource,
          l = d && d.trim();
        if (l) return {name: truncate(normalizeWhitespace(l)), nameSource: f};
      }
    }
    if (a.nodeName === 'FORM') break;
    ((a = getParentElement(a)), (i += 1));
  }
}
function normalizeWhitespace(e) {
  return e.replace(/\s+/g, ' ');
}
function truncate(e) {
  return e.length > 100 ? ''.concat(safeTruncate(e, 100), ' [...]') : e;
}
function getElementById(e, t) {
  return e.ownerDocument ? e.ownerDocument.getElementById(t) : null;
}
function getActionNameFromStandardAttribute(e, t) {
  return {
    name: e.getAttribute(t) || '',
    nameSource: 'standard_attribute',
  };
}
function getActionNameFromTextualContent(e, t, r) {
  return {
    name: getTextualContent(e, t, r) || '',
    nameSource: 'text_content',
  };
}
function getTextualContent(e, t, r) {
  if (!e.isContentEditable) {
    if ('innerText' in e) {
      var n = e.innerText,
        a = function (i) {
          for (var o = e.querySelectorAll(i), s = 0; s < o.length; s += 1) {
            var c = o[s];
            if ('innerText' in c) {
              var u = c.innerText;
              u && u.trim().length > 0 && (n = n.replace(u, ''));
            }
          }
        };
      return (
        supportsInnerTextScriptAndStyleRemoval() || a('script, style'),
        a('['.concat(DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE, ']')),
        t && a('['.concat(t, ']')),
        r &&
          a(
            ''
              .concat(getPrivacySelector(NodePrivacyLevel.HIDDEN), ', ')
              .concat(getPrivacySelector(NodePrivacyLevel.MASK)),
          ),
        n
      );
    }
    return e.textContent;
  }
}
function supportsInnerTextScriptAndStyleRemoval() {
  return !isIE();
}
var supportsLabelPropertyResult;
function supportsLabelProperty() {
  return (
    supportsLabelPropertyResult === void 0 && (supportsLabelPropertyResult = 'labels' in HTMLInputElement.prototype),
    supportsLabelPropertyResult
  );
}
var supportsElementClosestResult;
function supportsElementClosest() {
  return (
    supportsElementClosestResult === void 0 && (supportsElementClosestResult = 'closest' in HTMLElement.prototype),
    supportsElementClosestResult
  );
}
var STABLE_ATTRIBUTES = [
    DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE,
    // Common test attributes (list provided by google recorder)
    'data-testid',
    'data-test',
    'data-qa',
    'data-cy',
    'data-test-id',
    'data-qa-id',
    'data-testing',
    // FullStory decorator attributes:
    'data-component',
    'data-element',
    'data-source-file',
  ],
  GLOBALLY_UNIQUE_SELECTOR_GETTERS = [getStableAttributeSelector, getIDSelector],
  UNIQUE_AMONG_CHILDREN_SELECTOR_GETTERS = [getStableAttributeSelector, getClassSelector, getTagNameSelector];
function getSelectorFromElement(e, t) {
  if (isConnected(e)) {
    for (var r, n = e; n && n.nodeName !== 'HTML'; ) {
      var a = findSelector(n, GLOBALLY_UNIQUE_SELECTOR_GETTERS, isSelectorUniqueGlobally, t, r);
      if (a) return a;
      var i = findSelector(n, UNIQUE_AMONG_CHILDREN_SELECTOR_GETTERS, isSelectorUniqueAmongSiblings, t, r);
      ((r = i || combineSelector(getPositionSelector(n), r)), (n = getParentElement(n)));
    }
    return r;
  }
}
function isGeneratedValue(e) {
  return /[0-9]/.test(e);
}
function getIDSelector(e) {
  if (e.id && !isGeneratedValue(e.id)) return '#'.concat(cssEscape(e.id));
}
function getClassSelector(e) {
  if (e.tagName !== 'BODY')
    for (var t = getClassList(e), r = 0; r < t.length; r += 1) {
      var n = t[r];
      if (!isGeneratedValue(n)) return ''.concat(cssEscape(e.tagName), '.').concat(cssEscape(n));
    }
}
function getTagNameSelector(e) {
  return cssEscape(e.tagName);
}
function getStableAttributeSelector(e, t) {
  if (t) {
    var r = o(t);
    if (r) return r;
  }
  for (var n = 0, a = STABLE_ATTRIBUTES; n < a.length; n++) {
    var i = a[n],
      r = o(i);
    if (r) return r;
  }
  function o(s) {
    if (e.hasAttribute(s))
      return ''
        .concat(cssEscape(e.tagName), '[')
        .concat(s, '="')
        .concat(cssEscape(e.getAttribute(s)), '"]');
  }
}
function getPositionSelector(e) {
  for (var t = getParentElement(e).firstElementChild, r = 1; t && t !== e; )
    (t.tagName === e.tagName && (r += 1), (t = t.nextElementSibling));
  return ''.concat(cssEscape(e.tagName), ':nth-of-type(').concat(r, ')');
}
function findSelector(e, t, r, n, a) {
  for (var i = 0, o = t; i < o.length; i++) {
    var s = o[i],
      c = s(e, n);
    if (c && r(e, c, a)) return combineSelector(c, a);
  }
}
function isSelectorUniqueGlobally(e, t, r) {
  return e.ownerDocument.querySelectorAll(combineSelector(t, r)).length === 1;
}
function isSelectorUniqueAmongSiblings(e, t, r) {
  var n;
  if (r === void 0)
    n = function (s) {
      return elementMatches(s, t);
    };
  else {
    var a = supportScopeSelector() ? combineSelector(''.concat(t, ':scope'), r) : combineSelector(t, r);
    n = function (s) {
      return s.querySelector(a) !== null;
    };
  }
  for (var i = getParentElement(e), o = i.firstElementChild; o; ) {
    if (o !== e && n(o)) return !1;
    o = o.nextElementSibling;
  }
  return !0;
}
function combineSelector(e, t) {
  return t ? ''.concat(e, '>').concat(t) : e;
}
var supportScopeSelectorCache;
function supportScopeSelector() {
  if (supportScopeSelectorCache === void 0)
    try {
      (document.querySelector(':scope'), (supportScopeSelectorCache = !0));
    } catch {
      supportScopeSelectorCache = !1;
    }
  return supportScopeSelectorCache;
}
function isConnected(e) {
  return 'isConnected' in // cast is to make sure `element` is not inferred as `never` after the check
    e
    ? e.isConnected
    : e.ownerDocument.documentElement.contains(e);
}
var MAX_DURATION_BETWEEN_CLICKS = ONE_SECOND,
  MAX_DISTANCE_BETWEEN_CLICKS = 100;
function createClickChain(e, t) {
  var r = [],
    n = 0,
    a;
  i(e);
  function i(c) {
    (c.stopObservable.subscribe(o), r.push(c), clearTimeout(a), (a = setTimeout(s, MAX_DURATION_BETWEEN_CLICKS)));
  }
  function o() {
    n === 1 &&
      r.every(function (c) {
        return c.isStopped();
      }) &&
      ((n = 2), t(r));
  }
  function s() {
    (clearTimeout(a), n === 0 && ((n = 1), o()));
  }
  return {
    tryAppend: function (c) {
      return n !== 0 ? !1 : r.length > 0 && !areEventsSimilar(r[r.length - 1].event, c.event) ? (s(), !1) : (i(c), !0);
    },
    stop: function () {
      s();
    },
  };
}
function areEventsSimilar(e, t) {
  return (
    e.target === t.target &&
    mouseEventDistance(e, t) <= MAX_DISTANCE_BETWEEN_CLICKS &&
    e.timeStamp - t.timeStamp <= MAX_DURATION_BETWEEN_CLICKS
  );
}
function mouseEventDistance(e, t) {
  return Math.sqrt(Math.pow(e.clientX - t.clientX, 2) + Math.pow(e.clientY - t.clientY, 2));
}
function listenActionEvents(e, t) {
  var r = t.onPointerDown,
    n = t.onPointerUp,
    a,
    i = {
      selection: !1,
      input: !1,
      scroll: !1,
    },
    o,
    s = [
      addEventListener(
        e,
        window,
        'pointerdown',
        function (c) {
          isValidPointerEvent(c) &&
            ((a = isSelectionEmpty()),
            (i = {
              selection: !1,
              input: !1,
              scroll: !1,
            }),
            (o = r(c)));
        },
        {capture: !0},
      ),
      addEventListener(
        e,
        window,
        'selectionchange',
        function () {
          (!a || !isSelectionEmpty()) && (i.selection = !0);
        },
        {capture: !0},
      ),
      addEventListener(
        e,
        window,
        'scroll',
        function () {
          i.scroll = !0;
        },
        {capture: !0, passive: !0},
      ),
      addEventListener(
        e,
        window,
        'pointerup',
        function (c) {
          if (isValidPointerEvent(c) && o) {
            var u = i;
            (n(o, c, function () {
              return u;
            }),
              (o = void 0));
          }
        },
        {capture: !0},
      ),
      addEventListener(
        e,
        window,
        'input',
        function () {
          i.input = !0;
        },
        {capture: !0},
      ),
    ];
  return {
    stop: function () {
      s.forEach(function (c) {
        return c.stop();
      });
    },
  };
}
function isSelectionEmpty() {
  var e = window.getSelection();
  return !e || e.isCollapsed;
}
function isValidPointerEvent(e) {
  return (
    e.target instanceof Element && // Only consider 'primary' pointer events for now. Multi-touch support could be implemented in
    // the future.
    e.isPrimary !== !1
  );
}
var MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE = 3;
function computeFrustration(e, t) {
  if (isRage(e))
    return (
      t.addFrustration(
        'rage_click',
        /* FrustrationType.RAGE_CLICK */
      ),
      e.some(isDead) &&
        t.addFrustration(
          'dead_click',
          /* FrustrationType.DEAD_CLICK */
        ),
      t.hasError &&
        t.addFrustration(
          'error_click',
          /* FrustrationType.ERROR_CLICK */
        ),
      {isRage: !0}
    );
  var r = e.some(function (n) {
    return n.getUserActivity().selection;
  });
  return (
    e.forEach(function (n) {
      (n.hasError &&
        n.addFrustration(
          'error_click',
          /* FrustrationType.ERROR_CLICK */
        ),
        isDead(n) && // Avoid considering clicks part of a double-click or triple-click selections as dead clicks
          !r &&
          n.addFrustration(
            'dead_click',
            /* FrustrationType.DEAD_CLICK */
          ));
    }),
    {isRage: !1}
  );
}
function isRage(e) {
  if (
    e.some(function (r) {
      return r.getUserActivity().selection || r.getUserActivity().scroll;
    })
  )
    return !1;
  for (var t = 0; t < e.length - (MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE - 1); t += 1)
    if (e[t + MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE - 1].event.timeStamp - e[t].event.timeStamp <= ONE_SECOND)
      return !0;
  return !1;
}
var DEAD_CLICK_EXCLUDE_SELECTOR =
  // inputs that don't trigger a meaningful event like "input" when clicked, including textual
  // inputs (using a negative selector is shorter here)
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]),textarea,select,[contenteditable],[contenteditable] *,canvas,a[href],a[href] *';
function isDead(e) {
  return e.hasPageActivity || e.getUserActivity().input || e.getUserActivity().scroll
    ? !1
    : !elementMatches(e.event.target, DEAD_CLICK_EXCLUDE_SELECTOR);
}
var CLICK_ACTION_MAX_DURATION = 10 * ONE_SECOND,
  interactionSelectorCache = /* @__PURE__ */ new Map();
function getInteractionSelector(e) {
  var t = interactionSelectorCache.get(e);
  return (interactionSelectorCache.delete(e), t);
}
function updateInteractionSelector(e, t) {
  (interactionSelectorCache.set(e, t),
    interactionSelectorCache.forEach(function (r, n) {
      elapsed(n, relativeNow()) > CLICK_ACTION_MAX_DURATION && interactionSelectorCache.delete(n);
    }));
}
var ACTION_CONTEXT_TIME_OUT_DELAY = 5 * ONE_MINUTE;
function trackClickActions(e, t, r, n) {
  var a = createValueHistory({expireDelay: ACTION_CONTEXT_TIME_OUT_DELAY}),
    i = new Observable(),
    o;
  (e.subscribe(10, function () {
    a.reset();
  }),
    e.subscribe(5, d));
  var s = listenActionEvents(n, {
      onPointerDown: function (f) {
        return processPointerDown(n, e, t, f, r);
      },
      onPointerUp: function (f, l, p) {
        var g = f.clickActionBase,
          v = f.hadActivityOnPointerDown;
        startClickAction(n, e, t, r, a, i, u, g, l, p, v);
      },
    }).stop,
    c = {
      findActionId: function (f) {
        return a.findAll(f);
      },
    };
  return {
    stop: function () {
      (d(), i.notify(), s());
    },
    actionContexts: c,
  };
  function u(f) {
    if (!o || !o.tryAppend(f)) {
      var l = f.clone();
      o = createClickChain(f, function (p) {
        finalizeClicks(p, l);
      });
    }
  }
  function d() {
    o && o.stop();
  }
}
function processPointerDown(e, t, r, n, a) {
  var i = e.enablePrivacyForActionName ? getNodePrivacyLevel(n.target, e.defaultPrivacyLevel) : NodePrivacyLevel.ALLOW;
  if (i !== NodePrivacyLevel.HIDDEN) {
    var o = computeClickActionBase(n, i, e),
      s = !1;
    return (
      waitPageActivityEnd(
        t,
        r,
        a,
        e,
        function (c) {
          s = c.hadActivity;
        },
        // We don't care about the activity duration, we just want to know whether an activity did happen
        // within the "validation delay" or not. Limit the duration so the callback is called sooner.
        PAGE_ACTIVITY_VALIDATION_DELAY,
      ),
      {
        clickActionBase: o,
        hadActivityOnPointerDown: function () {
          return s;
        },
      }
    );
  }
}
function startClickAction(e, t, r, n, a, i, o, s, c, u, d) {
  var f,
    l = newClick(t, a, u, s, c);
  o(l);
  var p = (f = s?.target) === null || f === void 0 ? void 0 : f.selector;
  p && updateInteractionSelector(c.timeStamp, p);
  var g = waitPageActivityEnd(
      t,
      r,
      n,
      e,
      function (h) {
        h.hadActivity && h.end < l.startClocks.timeStamp
          ? l.discard()
          : h.hadActivity
            ? l.stop(h.end)
            : d()
              ? l.stop(
                  // using the click start as activity end, so the click will have some activity but its
                  // duration will be 0 (as the activity started before the click start)
                  l.startClocks.timeStamp,
                )
              : l.stop();
      },
      CLICK_ACTION_MAX_DURATION,
    ).stop,
    v = t.subscribe(5, function (h) {
      var S = h.endClocks;
      l.stop(S.timeStamp);
    }),
    m = i.subscribe(function () {
      l.stop();
    });
  l.stopObservable.subscribe(function () {
    (v.unsubscribe(), g(), m.unsubscribe());
  });
}
function computeClickActionBase(e, t, r) {
  var n = e.target.getBoundingClientRect(),
    a = getSelectorFromElement(e.target, r.actionNameAttribute);
  a && updateInteractionSelector(e.timeStamp, a);
  var i = getActionNameFromElement(e.target, r, t);
  return {
    type: 'click',
    target: {
      width: Math.round(n.width),
      height: Math.round(n.height),
      selector: a,
    },
    position: {
      // Use clientX and Y because for SVG element offsetX and Y are relatives to the <svg> element
      x: Math.round(e.clientX - n.left),
      y: Math.round(e.clientY - n.top),
    },
    name: i.name,
    nameSource: i.nameSource,
  };
}
function newClick(e, t, r, n, a) {
  var i = generateUUID(),
    o = clocksNow(),
    s = t.add(i, o.relative),
    c = trackEventCounts({
      lifeCycle: e,
      isChildEvent: function (g) {
        return g.action !== void 0 && (Array.isArray(g.action.id) ? includes(g.action.id, i) : g.action.id === i);
      },
    }),
    u = 0,
    d,
    f = [],
    l = new Observable();
  function p(g) {
    u === 0 && ((d = g), (u = 1), d ? s.close(getRelativeTime(d)) : s.remove(), c.stop(), l.notify());
  }
  return {
    event: a,
    stop: p,
    stopObservable: l,
    get hasError() {
      return c.eventCounts.errorCount > 0;
    },
    get hasPageActivity() {
      return d !== void 0;
    },
    getUserActivity: r,
    addFrustration: function (g) {
      f.push(g);
    },
    startClocks: o,
    isStopped: function () {
      return u === 1 || u === 2;
    },
    clone: function () {
      return newClick(e, t, r, n, a);
    },
    validate: function (g) {
      if ((p(), u === 1)) {
        var v = c.eventCounts,
          m = v.resourceCount,
          h = v.errorCount,
          S = v.longTaskCount,
          E = assign(
            {
              type: 'click',
              duration: d && elapsed(o.timeStamp, d),
              startClocks: o,
              id: i,
              frustrationTypes: f,
              counts: {
                resourceCount: m,
                errorCount: h,
                longTaskCount: S,
              },
              events: g ?? [a],
              event: a,
            },
            n,
          );
        (e.notify(0, E), (u = 2));
      }
    },
    discard: function () {
      (p(), (u = 2));
    },
  };
}
function finalizeClicks(e, t) {
  var r = computeFrustration(e, t).isRage;
  r
    ? (e.forEach(function (n) {
        return n.discard();
      }),
      t.stop(timeStampNow()),
      t.validate(
        e.map(function (n) {
          return n.event;
        }),
      ))
    : (t.discard(),
      e.forEach(function (n) {
        return n.validate();
      }));
}
function startActionCollection(e, t, r, n, a) {
  var i;
  e.subscribe(0, function (c) {
    return e.notify(12, processAction(c, a));
  });
  var o = {findActionId: noop},
    s = noop;
  return (
    n.trackUserInteractions && ((i = trackClickActions(e, t, r, n)), (o = i.actionContexts), (s = i.stop)),
    {
      addAction: function (c, u) {
        e.notify(
          12,
          assign(
            {
              savedCommonContext: u,
            },
            processAction(c, a),
          ),
        );
      },
      actionContexts: o,
      stop: s,
    }
  );
}
function processAction(e, t) {
  var r = isAutoAction(e)
      ? {
          action: {
            id: e.id,
            loading_time: discardNegativeDuration(toServerDuration(e.duration)),
            frustration: {
              type: e.frustrationTypes,
            },
            error: {
              count: e.counts.errorCount,
            },
            long_task: {
              count: e.counts.longTaskCount,
            },
            resource: {
              count: e.counts.resourceCount,
            },
          },
          _dd: {
            action: {
              target: e.target,
              position: e.position,
              name_source: isExperimentalFeatureEnabled(ExperimentalFeature.ACTION_NAME_MASKING)
                ? e.nameSource
                : void 0,
            },
          },
        }
      : void 0,
    n = isAutoAction(e) ? void 0 : e.context,
    a = combine(
      {
        action: {
          id: generateUUID(),
          target: {
            name: e.name,
          },
          type: e.type,
        },
        date: e.startClocks.timeStamp,
        type: 'action',
        view: {in_foreground: t.wasInPageStateAt('active', e.startClocks.relative)},
      },
      r,
    ),
    i = isAutoAction(e) ? {events: e.events} : {};
  return (
    !isAutoAction(e) && e.handlingStack && (i.handlingStack = e.handlingStack),
    {
      customerContext: n,
      rawRumEvent: a,
      startTime: e.startClocks.relative,
      domainContext: i,
    }
  );
}
function isAutoAction(e) {
  return e.type !== 'custom';
}
function trackConsoleError(e) {
  var t = initConsoleObservable([ConsoleApiName.error]).subscribe(function (r) {
    return e.notify(r.error);
  });
  return {
    stop: function () {
      t.unsubscribe();
    },
  };
}
function trackReportError(e, t) {
  var r = initReportObservable(e, [RawReportType.cspViolation, RawReportType.intervention]).subscribe(function (n) {
    return t.notify(n);
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
function startErrorCollection(e, t, r, n) {
  var a = new Observable();
  return (
    trackConsoleError(a),
    trackRuntimeError(a),
    trackReportError(t, a),
    a.subscribe(function (i) {
      return e.notify(14, {error: i});
    }),
    doStartErrorCollection(e, r, n)
  );
}
function doStartErrorCollection(e, t, r) {
  return (
    e.subscribe(14, function (n) {
      var a = n.error,
        i = n.customerContext,
        o = n.savedCommonContext;
      e.notify(
        12,
        assign(
          {
            customerContext: i,
            savedCommonContext: o,
          },
          processError(a, t, r),
        ),
      );
    }),
    {
      addError: function (n, a) {
        var i = n.error,
          o = n.handlingStack,
          s = n.startClocks,
          c = n.context,
          u = isError(i) ? computeStackTrace(i) : void 0,
          d = computeRawError({
            stackTrace: u,
            originalError: i,
            handlingStack: o,
            startClocks: s,
            nonErrorPrefix: 'Provided',
            source: ErrorSource.CUSTOM,
            handling: 'handled',
          });
        e.notify(14, {
          customerContext: c,
          savedCommonContext: a,
          error: d,
        });
      },
    }
  );
}
function processError(e, t, r) {
  var n = {
      date: e.startClocks.timeStamp,
      error: {
        id: generateUUID(),
        message: e.message,
        source: e.source,
        stack: e.stack,
        handling_stack: e.handlingStack,
        type: e.type,
        handling: e.handling,
        causes: e.causes,
        source_type: 'browser',
        fingerprint: e.fingerprint,
        csp: e.csp,
      },
      type: 'error',
      view: {in_foreground: t.wasInPageStateAt('active', e.startClocks.relative)},
    },
    a = r.findFeatureFlagEvaluations(e.startClocks.relative);
  a && !isEmptyObject(a) && (n.feature_flags = a);
  var i = {
    error: e.originalError,
    handlingStack: e.handlingStack,
  };
  return {
    rawRumEvent: n,
    startTime: e.startClocks.relative,
    domainContext: i,
  };
}
function startLongTaskCollection(e, t) {
  var r = createPerformanceObservable(t, {
    type: RumPerformanceEntryType.LONG_TASK,
    buffered: !0,
  }).subscribe(function (n) {
    for (var a = 0, i = n; a < i.length; a++) {
      var o = i[a];
      if (o.entryType !== RumPerformanceEntryType.LONG_TASK || !t.trackLongTasks) break;
      var s = relativeToClocks(o.startTime),
        c = {
          date: s.timeStamp,
          long_task: {
            id: generateUUID(),
            entry_type: 'long-task',
            duration: toServerDuration(o.duration),
          },
          type: 'long_task',
          _dd: {
            discarded: !1,
          },
        };
      e.notify(12, {
        rawRumEvent: c,
        startTime: s.relative,
        domainContext: {performanceEntry: o},
      });
    }
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
var alreadyMatchedEntries = new WeakSet$1();
function matchRequestResourceEntry(e) {
  if (!(!performance || !('getEntriesByName' in performance))) {
    var t = performance.getEntriesByName(e.url, 'resource');
    if (!(!t.length || !('toJSON' in t[0]))) {
      var r = t
        .filter(function (n) {
          return !alreadyMatchedEntries.has(n);
        })
        .filter(function (n) {
          return hasValidResourceEntryDuration(n) && hasValidResourceEntryTimings(n);
        })
        .filter(function (n) {
          return isBetween(
            n,
            e.startClocks.relative,
            endTime({startTime: e.startClocks.relative, duration: e.duration}),
          );
        });
      if (r.length === 1) return (alreadyMatchedEntries.add(r[0]), r[0].toJSON());
    }
  }
}
function endTime(e) {
  return addDuration(e.startTime, e.duration);
}
function isBetween(e, t, r) {
  var n = 1;
  return e.startTime >= t - n && endTime(e) <= addDuration(r, n);
}
var INITIAL_DOCUMENT_OUTDATED_TRACE_ID_THRESHOLD = 2 * ONE_MINUTE;
function getDocumentTraceId(e) {
  var t = getDocumentTraceDataFromMeta(e) || getDocumentTraceDataFromComment(e);
  if (!(!t || t.traceTime <= dateNow() - INITIAL_DOCUMENT_OUTDATED_TRACE_ID_THRESHOLD)) return t.traceId;
}
function getDocumentTraceDataFromMeta(e) {
  var t = e.querySelector('meta[name=dd-trace-id]'),
    r = e.querySelector('meta[name=dd-trace-time]');
  return createDocumentTraceData(t && t.content, r && r.content);
}
function getDocumentTraceDataFromComment(e) {
  var t = findTraceComment(e);
  if (t)
    return createDocumentTraceData(findCommaSeparatedValue(t, 'trace-id'), findCommaSeparatedValue(t, 'trace-time'));
}
function createDocumentTraceData(e, t) {
  var r = t && Number(t);
  if (!(!e || !r))
    return {
      traceId: e,
      traceTime: r,
    };
}
function findTraceComment(e) {
  for (var t = 0; t < e.childNodes.length; t += 1) {
    var r = getTraceCommentFromNode(e.childNodes[t]);
    if (r) return r;
  }
  if (e.body)
    for (var t = e.body.childNodes.length - 1; t >= 0; t -= 1) {
      var n = e.body.childNodes[t],
        r = getTraceCommentFromNode(n);
      if (r) return r;
      if (!isTextNode(n)) break;
    }
}
function getTraceCommentFromNode(e) {
  if (e && isCommentNode(e)) {
    var t = /^\s*DATADOG;(.*?)\s*$/.exec(e.data);
    if (t) return t[1];
  }
}
function getNavigationEntry() {
  if (supportPerformanceTimingEvent(RumPerformanceEntryType.NAVIGATION)) {
    var e = performance.getEntriesByType(RumPerformanceEntryType.NAVIGATION)[0];
    if (e) return e;
  }
  var t = computeTimingsFromDeprecatedPerformanceTiming(),
    r = assign(
      {
        entryType: RumPerformanceEntryType.NAVIGATION,
        initiatorType: 'navigation',
        name: window.location.href,
        startTime: 0,
        duration: t.responseEnd,
        decodedBodySize: 0,
        encodedBodySize: 0,
        transferSize: 0,
        workerStart: 0,
        toJSON: function () {
          return assign({}, r, {toJSON: void 0});
        },
      },
      t,
    );
  return r;
}
function computeTimingsFromDeprecatedPerformanceTiming() {
  var e = {},
    t = performance.timing;
  for (var r in t)
    if (isNumber(t[r])) {
      var n = r,
        a = t[n];
      e[n] = a === 0 ? 0 : getRelativeTime(a);
    }
  return e;
}
function retrieveInitialDocumentResourceTiming(e, t) {
  runOnReadyState(e, 'interactive', function () {
    var r = assign(getNavigationEntry().toJSON(), {
      entryType: RumPerformanceEntryType.RESOURCE,
      initiatorType: FAKE_INITIAL_DOCUMENT,
      traceId: getDocumentTraceId(document),
      toJSON: function () {
        return assign({}, r, {toJSON: void 0});
      },
    });
    t(r);
  });
}
function startResourceCollection(e, t, r, n, a) {
  (n === void 0 && (n = createTaskQueue()),
    a === void 0 && (a = retrieveInitialDocumentResourceTiming),
    e.subscribe(8, function (s) {
      o(function () {
        return processRequest(s, t, r);
      });
    }));
  var i = createPerformanceObservable(t, {
    type: RumPerformanceEntryType.RESOURCE,
    buffered: !0,
  }).subscribe(function (s) {
    for (
      var c = function (l) {
          isResourceEntryRequestType(l) ||
            o(function () {
              return processResourceEntry(l, t);
            });
        },
        u = 0,
        d = s;
      u < d.length;
      u++
    ) {
      var f = d[u];
      c(f);
    }
  });
  a(t, function (s) {
    o(function () {
      return processResourceEntry(s, t);
    });
  });
  function o(s) {
    n.push(function () {
      var c = s();
      c && e.notify(12, c);
    });
  }
  return {
    stop: function () {
      i.unsubscribe();
    },
  };
}
function processRequest(e, t, r) {
  var n = matchRequestResourceEntry(e),
    a = n ? relativeToClocks(n.startTime) : e.startClocks,
    i = computeRequestTracingInfo(e, t);
  if (!(!t.trackResources && !i)) {
    var o = e.type === 'xhr' ? 'xhr' : 'fetch',
      s = n ? computeResourceEntryMetrics(n) : void 0,
      c = computeRequestDuration(r, a, e.duration),
      u = combine(
        {
          date: a.timeStamp,
          resource: {
            id: generateUUID(),
            type: o,
            duration: c,
            method: e.method,
            status_code: e.status,
            protocol: n && computeResourceEntryProtocol(n),
            url: isLongDataUrl(e.url) ? sanitizeDataUrl(e.url) : e.url,
            delivery_type: n && computeResourceEntryDeliveryType(n),
          },
          type: 'resource',
          _dd: {
            discarded: !t.trackResources,
          },
        },
        i,
        s,
      );
    return {
      startTime: a.relative,
      rawRumEvent: u,
      domainContext: {
        performanceEntry: n,
        xhr: e.xhr,
        response: e.response,
        requestInput: e.input,
        requestInit: e.init,
        error: e.error,
        isAborted: e.isAborted,
        handlingStack: e.handlingStack,
      },
    };
  }
}
function processResourceEntry(e, t) {
  var r = relativeToClocks(e.startTime),
    n = computeResourceEntryTracingInfo(e, t);
  if (!(!t.trackResources && !n)) {
    var a = computeResourceEntryType(e),
      i = computeResourceEntryMetrics(e),
      o = combine(
        {
          date: r.timeStamp,
          resource: {
            id: generateUUID(),
            type: a,
            url: e.name,
            status_code: discardZeroStatus(e.responseStatus),
            protocol: computeResourceEntryProtocol(e),
            delivery_type: computeResourceEntryDeliveryType(e),
          },
          type: 'resource',
          _dd: {
            discarded: !t.trackResources,
          },
        },
        n,
        i,
      );
    return {
      startTime: r.relative,
      rawRumEvent: o,
      domainContext: {
        performanceEntry: e,
      },
    };
  }
}
function computeResourceEntryMetrics(e) {
  var t = e.renderBlockingStatus;
  return {
    resource: assign(
      {
        duration: computeResourceEntryDuration(e),
        render_blocking_status: t,
      },
      computeResourceEntrySize(e),
      computeResourceEntryDetails(e),
    ),
  };
}
function computeRequestTracingInfo(e, t) {
  var r = e.traceSampled && e.traceId && e.spanId;
  if (r)
    return {
      _dd: {
        span_id: e.spanId.toString(),
        trace_id: e.traceId.toString(),
        rule_psr: t.rulePsr,
      },
    };
}
function computeResourceEntryTracingInfo(e, t) {
  var r = e.traceId;
  if (r)
    return {
      _dd: {
        trace_id: e.traceId,
        span_id: createSpanIdentifier().toString(),
        rule_psr: t.rulePsr,
      },
    };
}
function computeRequestDuration(e, t, r) {
  return e.wasInPageStateDuringPeriod('frozen', t.relative, r) ? void 0 : toServerDuration(r);
}
function discardZeroStatus(e) {
  return e === 0 ? void 0 : e;
}
function trackViewEventCounts(e, t, r) {
  var n = trackEventCounts({
      lifeCycle: e,
      isChildEvent: function (o) {
        return o.view.id === t;
      },
      onChange: r,
    }),
    a = n.stop,
    i = n.eventCounts;
  return {
    stop: a,
    eventCounts: i,
  };
}
var FCP_MAXIMUM_DELAY = 10 * ONE_MINUTE;
function trackFirstContentfulPaint(e, t, r) {
  var n = createPerformanceObservable(e, {
    type: RumPerformanceEntryType.PAINT,
    buffered: !0,
  }).subscribe(function (a) {
    var i = find(a, function (o) {
      return o.name === 'first-contentful-paint' && o.startTime < t.timeStamp && o.startTime < FCP_MAXIMUM_DELAY;
    });
    i && r(i.startTime);
  });
  return {
    stop: n.unsubscribe,
  };
}
function trackFirstInput(e, t, r) {
  var n = createPerformanceObservable(e, {
    type: RumPerformanceEntryType.FIRST_INPUT,
    buffered: !0,
  }).subscribe(function (a) {
    var i = find(a, function (c) {
      return c.startTime < t.timeStamp;
    });
    if (i) {
      var o = elapsed(i.startTime, i.processingStart),
        s = void 0;
      (i.target && isElementNode(i.target) && (s = getSelectorFromElement(i.target, e.actionNameAttribute)),
        r({
          // Ensure firstInputDelay to be positive, see
          // https://bugs.chromium.org/p/chromium/issues/detail?id=1185815
          delay: o >= 0 ? o : 0,
          time: i.startTime,
          targetSelector: s,
        }));
    }
  });
  return {
    stop: function () {
      n.unsubscribe();
    },
  };
}
function trackNavigationTimings(e, t, r) {
  return (
    r === void 0 && (r = getNavigationEntry),
    waitAfterLoadEvent(e, function () {
      var n = r();
      isIncompleteNavigation(n) || t(processNavigationEntry(n));
    })
  );
}
function processNavigationEntry(e) {
  return {
    domComplete: e.domComplete,
    domContentLoaded: e.domContentLoadedEventEnd,
    domInteractive: e.domInteractive,
    loadEvent: e.loadEventEnd,
    // In some cases the value reported is negative or is larger
    // than the current page time. Ignore these cases:
    // https://github.com/GoogleChrome/web-vitals/issues/137
    // https://github.com/GoogleChrome/web-vitals/issues/162
    firstByte: e.responseStart >= 0 && e.responseStart <= relativeNow() ? e.responseStart : void 0,
  };
}
function isIncompleteNavigation(e) {
  return e.loadEventEnd <= 0;
}
function waitAfterLoadEvent(e, t) {
  var r,
    n = runOnReadyState(e, 'complete', function () {
      r = setTimeout(function () {
        return t();
      });
    }).stop;
  return {
    stop: function () {
      (n(), clearTimeout(r));
    },
  };
}
var LCP_MAXIMUM_DELAY = 10 * ONE_MINUTE;
function trackLargestContentfulPaint(e, t, r, n) {
  var a = 1 / 0,
    i = addEventListeners(
      e,
      r,
      [
        'pointerdown',
        'keydown',
        /* DOM_EVENT.KEY_DOWN */
      ],
      function (c) {
        a = c.timeStamp;
      },
      {capture: !0, once: !0},
    ).stop,
    o = 0,
    s = createPerformanceObservable(e, {
      type: RumPerformanceEntryType.LARGEST_CONTENTFUL_PAINT,
      buffered: !0,
    }).subscribe(function (c) {
      var u = findLast(c, function (f) {
        return (
          f.entryType === RumPerformanceEntryType.LARGEST_CONTENTFUL_PAINT &&
          f.startTime < a &&
          f.startTime < t.timeStamp &&
          f.startTime < LCP_MAXIMUM_DELAY && // Ensure to get the LCP entry with the biggest size, see
          // https://bugs.chromium.org/p/chromium/issues/detail?id=1516655
          f.size > o
        );
      });
      if (u) {
        var d = void 0;
        (u.element && (d = getSelectorFromElement(u.element, e.actionNameAttribute)),
          n({
            value: u.startTime,
            targetSelector: d,
          }),
          (o = u.size));
      }
    });
  return {
    stop: function () {
      (i(), s.unsubscribe());
    },
  };
}
function trackFirstHidden(e, t) {
  t === void 0 && (t = window);
  var r, n;
  return (
    document.visibilityState === 'hidden'
      ? (r = 0)
      : ((r = 1 / 0),
        (n = addEventListeners(
          e,
          t,
          [
            'pagehide',
            'visibilitychange',
            /* DOM_EVENT.VISIBILITY_CHANGE */
          ],
          function (a) {
            (a.type === 'pagehide' || document.visibilityState === 'hidden') && ((r = a.timeStamp), n());
          },
          {capture: !0},
        ).stop)),
    {
      get timeStamp() {
        return r;
      },
      stop: function () {
        n?.();
      },
    }
  );
}
function trackInitialViewMetrics(e, t, r) {
  var n = {},
    a = trackNavigationTimings(e, function (d) {
      (t(d.loadEvent), (n.navigationTimings = d), r());
    }).stop,
    i = trackFirstHidden(e),
    o = trackFirstContentfulPaint(e, i, function (d) {
      ((n.firstContentfulPaint = d), r());
    }).stop,
    s = trackLargestContentfulPaint(e, i, window, function (d) {
      ((n.largestContentfulPaint = d), r());
    }).stop,
    c = trackFirstInput(e, i, function (d) {
      ((n.firstInput = d), r());
    }).stop;
  function u() {
    (a(), o(), s(), c(), i.stop());
  }
  return {
    stop: u,
    initialViewMetrics: n,
  };
}
function trackCumulativeLayoutShift(e, t, r) {
  if (!isLayoutShiftSupported())
    return {
      stop: noop,
    };
  var n = 0,
    a,
    i;
  r({
    value: 0,
  });
  var o = slidingSessionWindow(),
    s = createPerformanceObservable(e, {
      type: RumPerformanceEntryType.LAYOUT_SHIFT,
      buffered: !0,
    }).subscribe(function (c) {
      for (var u = 0, d = c; u < d.length; u++) {
        var f = d[u];
        if (!(f.hadRecentInput || f.startTime < t)) {
          var l = o.update(f),
            p = l.cumulatedValue,
            g = l.isMaxValue;
          if (g) {
            var v = getTargetFromSource(f.sources);
            ((a = v ? new WeakRef(v) : void 0), (i = elapsed(t, f.startTime)));
          }
          if (p > n) {
            n = p;
            var v = a?.deref();
            r({
              value: round(n, 4),
              targetSelector: v && getSelectorFromElement(v, e.actionNameAttribute),
              time: i,
            });
          }
        }
      }
    });
  return {
    stop: function () {
      s.unsubscribe();
    },
  };
}
function getTargetFromSource(e) {
  var t;
  if (e)
    return (t = find(e, function (r) {
      return !!r.node && isElementNode(r.node);
    })) === null || t === void 0
      ? void 0
      : t.node;
}
var MAX_WINDOW_DURATION = 5 * ONE_SECOND,
  MAX_UPDATE_GAP = ONE_SECOND;
function slidingSessionWindow() {
  var e = 0,
    t,
    r,
    n = 0;
  return {
    update: function (a) {
      var i = t === void 0 || a.startTime - r >= MAX_UPDATE_GAP || a.startTime - t >= MAX_WINDOW_DURATION,
        o;
      return (
        i
          ? ((t = r = a.startTime), (n = e = a.value), (o = !0))
          : ((e += a.value), (r = a.startTime), (o = a.value > n), o && (n = a.value)),
        {
          cumulatedValue: e,
          isMaxValue: o,
        }
      );
    },
  };
}
function isLayoutShiftSupported() {
  return supportPerformanceTimingEvent(RumPerformanceEntryType.LAYOUT_SHIFT) && 'WeakRef' in window;
}
var observer,
  interactionCountEstimate = 0,
  minKnownInteractionId = 1 / 0,
  maxKnownInteractionId = 0;
function initInteractionCountPolyfill() {
  'interactionCount' in performance ||
    observer ||
    ((observer = new window.PerformanceObserver(
      monitor(function (e) {
        e.getEntries().forEach(function (t) {
          var r = t;
          r.interactionId &&
            ((minKnownInteractionId = Math.min(minKnownInteractionId, r.interactionId)),
            (maxKnownInteractionId = Math.max(maxKnownInteractionId, r.interactionId)),
            (interactionCountEstimate = (maxKnownInteractionId - minKnownInteractionId) / 7 + 1));
        });
      }),
    )),
    observer.observe({type: 'event', buffered: !0, durationThreshold: 0}));
}
var getInteractionCount = function () {
    return observer ? interactionCountEstimate : window.performance.interactionCount || 0;
  },
  MAX_INTERACTION_ENTRIES = 10,
  MAX_INP_VALUE = 1 * ONE_MINUTE;
function trackInteractionToNextPaint(e, t, r) {
  if (!isInteractionToNextPaintSupported())
    return {
      getInteractionToNextPaint: function () {},
      setViewEnd: noop,
      stop: noop,
    };
  var n = trackViewInteractionCount(r),
    a = n.getViewInteractionCount,
    i = n.stopViewInteractionCount,
    o = 1 / 0,
    s = trackLongestInteractions(a),
    c = -1,
    u,
    d;
  function f(g) {
    for (var v = 0, m = g; v < m.length; v++) {
      var h = m[v];
      h.interactionId && // Check the entry start time is inside the view bounds because some view interactions can be reported after the view end (if long duration).
        h.startTime >= t &&
        h.startTime <= o &&
        s.process(h);
    }
    var S = s.estimateP98Interaction();
    S &&
      S.duration !== c &&
      ((c = S.duration),
      (d = elapsed(t, S.startTime)),
      (u = getInteractionSelector(S.startTime)),
      !u && S.target && isElementNode(S.target) && (u = getSelectorFromElement(S.target, e.actionNameAttribute)));
  }
  var l = createPerformanceObservable(e, {
      type: RumPerformanceEntryType.FIRST_INPUT,
      buffered: !0,
    }).subscribe(f),
    p = createPerformanceObservable(e, {
      type: RumPerformanceEntryType.EVENT,
      // durationThreshold only impact PerformanceEventTiming entries used for INP computation which requires a threshold at 40 (default is 104ms)
      // cf: https://github.com/GoogleChrome/web-vitals/blob/3806160ffbc93c3c4abf210a167b81228172b31c/src/onINP.ts#L202-L210
      durationThreshold: 40,
      buffered: !0,
    }).subscribe(f);
  return {
    getInteractionToNextPaint: function () {
      if (c >= 0)
        return {
          value: Math.min(c, MAX_INP_VALUE),
          targetSelector: u,
          time: d,
        };
      if (a())
        return {
          value: 0,
        };
    },
    setViewEnd: function (g) {
      ((o = g), i());
    },
    stop: function () {
      (p.unsubscribe(), l.unsubscribe());
    },
  };
}
function trackLongestInteractions(e) {
  var t = [];
  function r() {
    t.sort(function (n, a) {
      return a.duration - n.duration;
    }).splice(MAX_INTERACTION_ENTRIES);
  }
  return {
    /**
     * Process the performance entry:
     * - if its duration is long enough, add the performance entry to the list of worst interactions
     * - if an entry with the same interaction id exists and its duration is lower than the new one, then replace it in the list of worst interactions
     */
    process: function (n) {
      var a = t.findIndex(function (o) {
          return n.interactionId === o.interactionId;
        }),
        i = t[t.length - 1];
      a !== -1
        ? n.duration > t[a].duration && ((t[a] = n), r())
        : (t.length < MAX_INTERACTION_ENTRIES || n.duration > i.duration) && (t.push(n), r());
    },
    /**
     * Compute the p98 longest interaction.
     * For better performance the computation is based on 10 longest interactions and the interaction count of the current view.
     */
    estimateP98Interaction: function () {
      var n = Math.min(t.length - 1, Math.floor(e() / 50));
      return t[n];
    },
  };
}
function trackViewInteractionCount(e) {
  initInteractionCountPolyfill();
  var t = e === 'initial_load' ? 0 : getInteractionCount(),
    r = {stopped: !1};
  function n() {
    return getInteractionCount() - t;
  }
  return {
    getViewInteractionCount: function () {
      return r.stopped ? r.interactionCount : n();
    },
    stopViewInteractionCount: function () {
      r = {stopped: !0, interactionCount: n()};
    },
  };
}
function isInteractionToNextPaintSupported() {
  return (
    supportPerformanceTimingEvent(RumPerformanceEntryType.EVENT) &&
    window.PerformanceEventTiming &&
    'interactionId' in PerformanceEventTiming.prototype
  );
}
function trackLoadingTime(e, t, r, n, a, i, o) {
  var s = a === 'initial_load',
    c = !0,
    u = [],
    d = trackFirstHidden(n);
  function f() {
    if (!c && !s && u.length > 0) {
      var p = Math.max.apply(Math, u);
      p < d.timeStamp && o(p);
    }
  }
  var l = waitPageActivityEnd(e, t, r, n, function (p) {
    c && ((c = !1), p.hadActivity && u.push(elapsed(i.timeStamp, p.end)), f());
  }).stop;
  return {
    stop: function () {
      (l(), d.stop());
    },
    setLoadEvent: function (p) {
      s && ((s = !1), u.push(p), f());
    },
  };
}
function getScrollX() {
  var e,
    t = window.visualViewport;
  return (
    t
      ? (e = t.pageLeft - t.offsetLeft)
      : window.scrollX !== void 0
        ? (e = window.scrollX)
        : (e = window.pageXOffset || 0),
    Math.round(e)
  );
}
function getScrollY() {
  var e,
    t = window.visualViewport;
  return (
    t
      ? (e = t.pageTop - t.offsetTop)
      : window.scrollY !== void 0
        ? (e = window.scrollY)
        : (e = window.pageYOffset || 0),
    Math.round(e)
  );
}
var viewportObservable;
function initViewportObservable(e) {
  return (viewportObservable || (viewportObservable = createViewportObservable(e)), viewportObservable);
}
function createViewportObservable(e) {
  return new Observable(function (t) {
    var r = throttle(function () {
      t.notify(getViewportDimension());
    }, 200).throttled;
    return addEventListener(e, window, 'resize', r, {capture: !0, passive: !0}).stop;
  });
}
function getViewportDimension() {
  var e = window.visualViewport;
  return e
    ? {
        width: Number(e.width * e.scale),
        height: Number(e.height * e.scale),
      }
    : {
        width: Number(window.innerWidth || 0),
        height: Number(window.innerHeight || 0),
      };
}
var THROTTLE_SCROLL_DURATION = ONE_SECOND;
function trackScrollMetrics(e, t, r, n) {
  n === void 0 && (n = createScrollValuesObservable(e));
  var a = 0,
    i = 0,
    o = 0,
    s = n.subscribe(function (c) {
      var u = c.scrollDepth,
        d = c.scrollTop,
        f = c.scrollHeight,
        l = !1;
      if ((u > a && ((a = u), (l = !0)), f > i)) {
        i = f;
        var p = relativeNow();
        ((o = elapsed(t.relative, p)), (l = !0));
      }
      l &&
        r({
          maxDepth: Math.min(a, i),
          maxDepthScrollTop: d,
          maxScrollHeight: i,
          maxScrollHeightTime: o,
        });
    });
  return {
    stop: function () {
      return s.unsubscribe();
    },
  };
}
function computeScrollValues() {
  var e = getScrollY(),
    t = getViewportDimension().height,
    r = Math.round((document.scrollingElement || document.documentElement).scrollHeight),
    n = Math.round(t + e);
  return {
    scrollHeight: r,
    scrollDepth: n,
    scrollTop: e,
  };
}
function createScrollValuesObservable(e, t) {
  return (
    t === void 0 && (t = THROTTLE_SCROLL_DURATION),
    new Observable(function (r) {
      function n() {
        r.notify(computeScrollValues());
      }
      if (window.ResizeObserver) {
        var a = throttle(n, t, {
            leading: !1,
            trailing: !0,
          }),
          i = document.scrollingElement || document.documentElement,
          o = new ResizeObserver(monitor(a.throttled));
        i && o.observe(i);
        var s = addEventListener(e, window, 'scroll', a.throttled, {
          passive: !0,
        });
        return function () {
          (a.cancel(), o.disconnect(), s.stop());
        };
      }
    })
  );
}
function trackCommonViewMetrics(e, t, r, n, a, i, o) {
  var s = {},
    c = trackLoadingTime(e, t, r, n, i, o, function (h) {
      ((s.loadingTime = h), a());
    }),
    u = c.stop,
    d = c.setLoadEvent,
    f = trackScrollMetrics(n, o, function (h) {
      s.scroll = h;
    }).stop,
    l = trackCumulativeLayoutShift(n, o.relative, function (h) {
      ((s.cumulativeLayoutShift = h), a());
    }).stop,
    p = trackInteractionToNextPaint(n, o.relative, i),
    g = p.stop,
    v = p.getInteractionToNextPaint,
    m = p.setViewEnd;
  return {
    stop: function () {
      (u(), l(), f());
    },
    stopINPTracking: g,
    setLoadEvent: d,
    setViewEnd: m,
    getCommonViewMetrics: function () {
      return ((s.interactionToNextPaint = v()), s);
    },
  };
}
var THROTTLE_VIEW_UPDATE_PERIOD = 3e3,
  SESSION_KEEP_ALIVE_INTERVAL = 5 * ONE_MINUTE,
  KEEP_TRACKING_AFTER_VIEW_DELAY = 5 * ONE_MINUTE;
function trackViews(e, t, r, n, a, i, o, s) {
  var c = /* @__PURE__ */ new Set(),
    u = f('initial_load', clocksOrigin(), s);
  l();
  var d;
  o && (d = p(i));
  function f(g, v, m) {
    var h = newView(t, r, n, a, e, g, v, m);
    return (
      c.add(h),
      h.stopObservable.subscribe(function () {
        c.delete(h);
      }),
      h
    );
  }
  function l() {
    (t.subscribe(10, function () {
      u = f('route_change', void 0, {
        name: u.name,
        service: u.service,
        version: u.version,
        context: u.contextManager.getContext(),
      });
    }),
      t.subscribe(9, function () {
        u.end({sessionIsActive: !1});
      }),
      t.subscribe(11, function (g) {
        g.reason === PageExitReason.UNLOADING && u.end();
      }));
  }
  function p(g) {
    return g.subscribe(function (v) {
      var m = v.oldLocation,
        h = v.newLocation;
      areDifferentLocation(m, h) &&
        (u.end(),
        (u = f(
          'route_change',
          /* ViewLoadingType.ROUTE_CHANGE */
        )));
    });
  }
  return {
    addTiming: function (g, v) {
      (v === void 0 && (v = timeStampNow()), u.addTiming(g, v));
    },
    startView: function (g, v) {
      (u.end({endClocks: v}), (u = f('route_change', v, g)));
    },
    setViewContext: function (g) {
      u.contextManager.setContext(g);
    },
    setViewContextProperty: function (g, v) {
      u.contextManager.setContextProperty(g, v);
    },
    setViewName: function (g) {
      u.setViewName(g);
    },
    stop: function () {
      (d && d.unsubscribe(),
        u.end(),
        c.forEach(function (g) {
          return g.stop();
        }));
    },
  };
}
function newView(e, t, r, n, a, i, o, s) {
  o === void 0 && (o = clocksNow());
  var c = generateUUID(),
    u = new Observable(),
    d = {},
    f = 0,
    l,
    p = shallowClone(a),
    g = createContextManager(),
    v = !0,
    m,
    h,
    S,
    E;
  s &&
    ((m = s.name),
    (h = s.service || void 0),
    (S = s.version || void 0),
    s.context && ((E = s.context), g.setContext(E)));
  var y = {
    id: c,
    name: m,
    startClocks: o,
    service: h,
    version: S,
    context: E,
  };
  (e.notify(1, y), e.notify(2, y));
  var I = throttle(L, THROTTLE_VIEW_UPDATE_PERIOD, {
      leading: !1,
    }),
    T = I.throttled,
    _ = I.cancel,
    b = trackCommonViewMetrics(e, t, r, n, T, i, o),
    O = b.setLoadEvent,
    C = b.setViewEnd,
    k = b.stop,
    P = b.stopINPTracking,
    N = b.getCommonViewMetrics,
    D = i === 'initial_load' ? trackInitialViewMetrics(n, O, T) : {stop: noop, initialViewMetrics: {}},
    U = D.stop,
    F = D.initialViewMetrics,
    M = trackViewEventCounts(e, c, T),
    z = M.stop,
    B = M.eventCounts,
    V = setInterval(L, SESSION_KEEP_ALIVE_INTERVAL);
  (L(),
    g.changeObservable.subscribe(function () {
      (e.notify(3, {
        id: c,
        name: m,
        context: g.getContext(),
        startClocks: o,
      }),
        T());
    }));
  function L() {
    (_(), (f += 1));
    var R = l === void 0 ? timeStampNow() : l.timeStamp;
    e.notify(4, {
      customTimings: d,
      documentVersion: f,
      id: c,
      name: m,
      service: h,
      version: S,
      context: g.getContext(),
      loadingType: i,
      location: p,
      startClocks: o,
      commonViewMetrics: N(),
      initialViewMetrics: F,
      duration: elapsed(o.timeStamp, R),
      isActive: l === void 0,
      sessionIsActive: v,
      eventCounts: B,
    });
  }
  return {
    get name() {
      return m;
    },
    service: h,
    version: S,
    contextManager: g,
    stopObservable: u,
    end: function (R) {
      var w = this,
        x,
        A;
      (R === void 0 && (R = {}),
        !l &&
          ((l = (x = R.endClocks) !== null && x !== void 0 ? x : clocksNow()),
          (v = (A = R.sessionIsActive) !== null && A !== void 0 ? A : !0),
          e.notify(5, {endClocks: l}),
          e.notify(6, {endClocks: l}),
          clearInterval(V),
          C(l.relative),
          k(),
          L(),
          setTimeout(function () {
            w.stop();
          }, KEEP_TRACKING_AFTER_VIEW_DELAY)));
    },
    stop: function () {
      (U(), z(), P(), u.notify());
    },
    addTiming: function (R, w) {
      if (!l) {
        var x = looksLikeRelativeTime(w) ? w : elapsed(o.timeStamp, w);
        ((d[sanitizeTiming(R)] = x), T());
      }
    },
    setViewName: function (R) {
      ((m = R), L());
    },
  };
}
function sanitizeTiming(e) {
  var t = e.replace(/[^a-zA-Z0-9-_.@$]/g, '_');
  return (t !== e && display.warn('Invalid timing name: '.concat(e, ', sanitized to: ').concat(t)), t);
}
function areDifferentLocation(e, t) {
  return e.pathname !== t.pathname || (!isHashAnAnchor(t.hash) && getPathFromHash(t.hash) !== getPathFromHash(e.hash));
}
function isHashAnAnchor(e) {
  var t = e.substring(1);
  return t !== '' && !!document.getElementById(t);
}
function getPathFromHash(e) {
  var t = e.indexOf('?');
  return t < 0 ? e : e.slice(0, t);
}
function startViewCollection(e, t, r, n, a, i, o, s, c, u) {
  return (
    e.subscribe(4, function (d) {
      return e.notify(12, processViewUpdate(d, t, o, c, s));
    }),
    trackViews(r, e, n, a, t, i, !t.trackViewsManually, u)
  );
}
function processViewUpdate(e, t, r, n, a) {
  var i,
    o,
    s,
    c,
    u,
    d,
    f,
    l,
    p,
    g,
    v,
    m,
    h,
    S,
    E,
    y,
    I = n.getReplayStats(e.id),
    T = r.findFeatureFlagEvaluations(e.startClocks.relative),
    _ = a.findAll(e.startClocks.relative, e.duration),
    b = {
      _dd: {
        document_version: e.documentVersion,
        replay_stats: I,
        page_states: _,
        configuration: {
          start_session_replay_recording_manually: t.startSessionReplayRecordingManually,
        },
      },
      date: e.startClocks.timeStamp,
      type: 'view',
      view: {
        action: {
          count: e.eventCounts.actionCount,
        },
        frustration: {
          count: e.eventCounts.frustrationCount,
        },
        cumulative_layout_shift:
          (i = e.commonViewMetrics.cumulativeLayoutShift) === null || i === void 0 ? void 0 : i.value,
        cumulative_layout_shift_time: toServerDuration(
          (o = e.commonViewMetrics.cumulativeLayoutShift) === null || o === void 0 ? void 0 : o.time,
        ),
        cumulative_layout_shift_target_selector:
          (s = e.commonViewMetrics.cumulativeLayoutShift) === null || s === void 0 ? void 0 : s.targetSelector,
        first_byte: toServerDuration(
          (c = e.initialViewMetrics.navigationTimings) === null || c === void 0 ? void 0 : c.firstByte,
        ),
        dom_complete: toServerDuration(
          (u = e.initialViewMetrics.navigationTimings) === null || u === void 0 ? void 0 : u.domComplete,
        ),
        dom_content_loaded: toServerDuration(
          (d = e.initialViewMetrics.navigationTimings) === null || d === void 0 ? void 0 : d.domContentLoaded,
        ),
        dom_interactive: toServerDuration(
          (f = e.initialViewMetrics.navigationTimings) === null || f === void 0 ? void 0 : f.domInteractive,
        ),
        error: {
          count: e.eventCounts.errorCount,
        },
        first_contentful_paint: toServerDuration(e.initialViewMetrics.firstContentfulPaint),
        first_input_delay: toServerDuration(
          (l = e.initialViewMetrics.firstInput) === null || l === void 0 ? void 0 : l.delay,
        ),
        first_input_time: toServerDuration(
          (p = e.initialViewMetrics.firstInput) === null || p === void 0 ? void 0 : p.time,
        ),
        first_input_target_selector:
          (g = e.initialViewMetrics.firstInput) === null || g === void 0 ? void 0 : g.targetSelector,
        interaction_to_next_paint: toServerDuration(
          (v = e.commonViewMetrics.interactionToNextPaint) === null || v === void 0 ? void 0 : v.value,
        ),
        interaction_to_next_paint_time: toServerDuration(
          (m = e.commonViewMetrics.interactionToNextPaint) === null || m === void 0 ? void 0 : m.time,
        ),
        interaction_to_next_paint_target_selector:
          (h = e.commonViewMetrics.interactionToNextPaint) === null || h === void 0 ? void 0 : h.targetSelector,
        is_active: e.isActive,
        name: e.name,
        largest_contentful_paint: toServerDuration(
          (S = e.initialViewMetrics.largestContentfulPaint) === null || S === void 0 ? void 0 : S.value,
        ),
        largest_contentful_paint_target_selector:
          (E = e.initialViewMetrics.largestContentfulPaint) === null || E === void 0 ? void 0 : E.targetSelector,
        load_event: toServerDuration(
          (y = e.initialViewMetrics.navigationTimings) === null || y === void 0 ? void 0 : y.loadEvent,
        ),
        loading_time: discardNegativeDuration(toServerDuration(e.commonViewMetrics.loadingTime)),
        loading_type: e.loadingType,
        long_task: {
          count: e.eventCounts.longTaskCount,
        },
        resource: {
          count: e.eventCounts.resourceCount,
        },
        time_spent: toServerDuration(e.duration),
      },
      feature_flags: T && !isEmptyObject(T) ? T : void 0,
      display: e.commonViewMetrics.scroll
        ? {
            scroll: {
              max_depth: e.commonViewMetrics.scroll.maxDepth,
              max_depth_scroll_top: e.commonViewMetrics.scroll.maxDepthScrollTop,
              max_scroll_height: e.commonViewMetrics.scroll.maxScrollHeight,
              max_scroll_height_time: toServerDuration(e.commonViewMetrics.scroll.maxScrollHeightTime),
            },
          }
        : void 0,
      session: {
        has_replay: I ? !0 : void 0,
        is_active: e.sessionIsActive ? void 0 : !1,
      },
      privacy: {
        replay_level: t.defaultPrivacyLevel,
      },
    };
  return (
    isEmptyObject(e.customTimings) || (b.view.custom_timings = mapValues(e.customTimings, toServerDuration)),
    {
      rawRumEvent: b,
      startTime: e.startClocks.relative,
      domainContext: {
        location: e.location,
      },
    }
  );
}
var RUM_SESSION_KEY = 'rum';
function startRumSessionManager(e, t, r) {
  var n = startSessionManager(
    e,
    RUM_SESSION_KEY,
    function (a) {
      return computeSessionState(e, a);
    },
    r,
  );
  return (
    n.expireObservable.subscribe(function () {
      t.notify(
        9,
        /* LifeCycleEventType.SESSION_EXPIRED */
      );
    }),
    n.renewObservable.subscribe(function () {
      t.notify(
        10,
        /* LifeCycleEventType.SESSION_RENEWED */
      );
    }),
    n.sessionStateUpdateObservable.subscribe(function (a) {
      var i = a.previousState,
        o = a.newState;
      if (!i.forcedReplay && o.forcedReplay) {
        var s = n.findSession();
        s && (s.isReplayForced = !0);
      }
    }),
    {
      findTrackedSession: function (a) {
        var i = n.findSession(a);
        if (!(!i || !isTypeTracked(i.trackingType)))
          return {
            id: i.id,
            sessionReplay: i.trackingType === '1' ? 1 : i.isReplayForced ? 2 : 0,
            anonymousId: i.anonymousId,
          };
      },
      expire: n.expire,
      expireObservable: n.expireObservable,
      setForcedReplay: function () {
        return n.updateSessionState({forcedReplay: '1'});
      },
    }
  );
}
function startRumSessionManagerStub() {
  var e = {
    id: '00000000-aaaa-0000-aaaa-000000000000',
    sessionReplay: bridgeSupports(
      'records',
      /* BridgeCapability.RECORDS */
    )
      ? 1
      : 0,
  };
  return {
    findTrackedSession: function () {
      return e;
    },
    expire: noop,
    expireObservable: new Observable(),
    setForcedReplay: noop,
  };
}
function computeSessionState(e, t) {
  var r;
  return (
    hasValidRumSession(t)
      ? (r = t)
      : performDraw(e.sessionSampleRate)
        ? performDraw(e.sessionReplaySampleRate)
          ? (r = '1')
          : (r = '2')
        : (r = '0'),
    {
      trackingType: r,
      isTracked: isTypeTracked(r),
    }
  );
}
function hasValidRumSession(e) {
  return e === '0' || e === '1' || e === '2';
}
function isTypeTracked(e) {
  return e === '2' || e === '1';
}
function startRumBatch(e, t, r, n, a, i, o) {
  var s = e.replica,
    c = startBatchWithReplica(
      e,
      {
        endpoint: e.rumEndpointBuilder,
        encoder: o(
          2,
          /* DeflateEncoderStreamId.RUM */
        ),
      },
      s && {
        endpoint: s.rumEndpointBuilder,
        transformMessage: function (u) {
          return combine(u, {application: {id: s.applicationId}});
        },
        encoder: o(
          3,
          /* DeflateEncoderStreamId.RUM_REPLICA */
        ),
      },
      n,
      a,
      i,
    );
  return (
    t.subscribe(13, function (u) {
      u.type === 'view' ? c.upsert(u, u.view.id) : c.add(u);
    }),
    r.subscribe(function (u) {
      return c.add(u, isTelemetryReplicationAllowed(e));
    }),
    c
  );
}
function startRumEventBridge(e) {
  var t = getEventBridge();
  e.subscribe(13, function (r) {
    t.send('rum', r);
  });
}
var URL_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startUrlContexts(e, t, r) {
  var n = createValueHistory({expireDelay: URL_CONTEXT_TIME_OUT_DELAY}),
    a;
  (e.subscribe(1, function (s) {
    var c = s.startClocks,
      u = r.href;
    (n.add(
      o({
        url: u,
        referrer: a || document.referrer,
      }),
      c.relative,
    ),
      (a = u));
  }),
    e.subscribe(6, function (s) {
      var c = s.endClocks;
      n.closeActive(c.relative);
    }));
  var i = t.subscribe(function (s) {
    var c = s.newLocation,
      u = n.find();
    if (u) {
      var d = relativeNow();
      (n.closeActive(d),
        n.add(
          o({
            url: c.href,
            referrer: u.referrer,
          }),
          d,
        ));
    }
  });
  function o(s) {
    var c = s.url,
      u = s.referrer;
    return {
      url: c,
      referrer: u,
    };
  }
  return {
    findUrl: function (s) {
      return n.find(s);
    },
    stop: function () {
      (i.unsubscribe(), n.stop());
    },
  };
}
function createLocationChangeObservable(e, t) {
  var r = shallowClone(t);
  return new Observable(function (n) {
    var a = trackHistory(e, o).stop,
      i = trackHash(e, o).stop;
    function o() {
      if (r.href !== t.href) {
        var s = shallowClone(t);
        (n.notify({
          newLocation: s,
          oldLocation: r,
        }),
          (r = s));
      }
    }
    return function () {
      (a(), i());
    };
  });
}
function trackHistory(e, t) {
  var r = instrumentMethod(getHistoryInstrumentationTarget('pushState'), 'pushState', function (i) {
      var o = i.onPostCall;
      o(t);
    }).stop,
    n = instrumentMethod(getHistoryInstrumentationTarget('replaceState'), 'replaceState', function (i) {
      var o = i.onPostCall;
      o(t);
    }).stop,
    a = addEventListener(e, window, 'popstate', t).stop;
  return {
    stop: function () {
      (r(), n(), a());
    },
  };
}
function trackHash(e, t) {
  return addEventListener(e, window, 'hashchange', t);
}
function getHistoryInstrumentationTarget(e) {
  return Object.prototype.hasOwnProperty.call(history, e) ? history : History.prototype;
}
var FEATURE_FLAG_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startFeatureFlagContexts(e, t) {
  var r = createValueHistory({
    expireDelay: FEATURE_FLAG_CONTEXT_TIME_OUT_DELAY,
  });
  return (
    e.subscribe(1, function (n) {
      var a = n.startClocks;
      (r.add({}, a.relative), t.resetCustomerData());
    }),
    e.subscribe(6, function (n) {
      var a = n.endClocks;
      r.closeActive(a.relative);
    }),
    {
      findFeatureFlagEvaluations: function (n) {
        return r.find(n);
      },
      addFeatureFlagEvaluation: function (n, a) {
        var i = r.find();
        i && ((i[n] = a), t.updateCustomerData(i));
      },
      stop: function () {
        return t.stop();
      },
    }
  );
}
var MEASURES_PERIOD_DURATION = 10 * ONE_SECOND,
  currentPeriodMeasures,
  currentBatchMeasures,
  batchHasRumEvent;
function startCustomerDataTelemetry(e, t, r, n, a) {
  var i = t.enabled && performDraw(e.customerDataTelemetrySampleRate);
  i &&
    (initCurrentPeriodMeasures(),
    initCurrentBatchMeasures(),
    r.subscribe(13, function (o) {
      ((batchHasRumEvent = !0),
        updateMeasure(
          currentBatchMeasures.globalContextBytes,
          n
            .getOrCreateTracker(
              2,
              /* CustomerDataType.GlobalContext */
            )
            .getBytesCount(),
        ),
        updateMeasure(
          currentBatchMeasures.userContextBytes,
          n
            .getOrCreateTracker(
              1,
              /* CustomerDataType.User */
            )
            .getBytesCount(),
        ),
        updateMeasure(
          currentBatchMeasures.featureFlagBytes,
          includes(
            [
              'view',
              'error',
              /* RumEventType.ERROR */
            ],
            o.type,
          )
            ? n
                .getOrCreateTracker(
                  0,
                  /* CustomerDataType.FeatureFlag */
                )
                .getBytesCount()
            : 0,
        ));
    }),
    a.subscribe(function (o) {
      var s = o.bytesCount,
        c = o.messagesCount;
      batchHasRumEvent &&
        ((currentPeriodMeasures.batchCount += 1),
        updateMeasure(currentPeriodMeasures.batchBytesCount, s),
        updateMeasure(currentPeriodMeasures.batchMessagesCount, c),
        mergeMeasure(currentPeriodMeasures.globalContextBytes, currentBatchMeasures.globalContextBytes),
        mergeMeasure(currentPeriodMeasures.userContextBytes, currentBatchMeasures.userContextBytes),
        mergeMeasure(currentPeriodMeasures.featureFlagBytes, currentBatchMeasures.featureFlagBytes),
        initCurrentBatchMeasures());
    }),
    setInterval(sendCurrentPeriodMeasures, MEASURES_PERIOD_DURATION));
}
function sendCurrentPeriodMeasures() {
  currentPeriodMeasures.batchCount !== 0 &&
    (addTelemetryDebug('Customer data measures', currentPeriodMeasures), initCurrentPeriodMeasures());
}
function createMeasure() {
  return {min: 1 / 0, max: 0, sum: 0};
}
function updateMeasure(e, t) {
  ((e.sum += t), (e.min = Math.min(e.min, t)), (e.max = Math.max(e.max, t)));
}
function mergeMeasure(e, t) {
  ((e.sum += t.sum), (e.min = Math.min(e.min, t.min)), (e.max = Math.max(e.max, t.max)));
}
function initCurrentPeriodMeasures() {
  currentPeriodMeasures = {
    batchCount: 0,
    batchBytesCount: createMeasure(),
    batchMessagesCount: createMeasure(),
    globalContextBytes: createMeasure(),
    userContextBytes: createMeasure(),
    featureFlagBytes: createMeasure(),
  };
}
function initCurrentBatchMeasures() {
  ((batchHasRumEvent = !1),
    (currentBatchMeasures = {
      globalContextBytes: createMeasure(),
      userContextBytes: createMeasure(),
      featureFlagBytes: createMeasure(),
    }));
}
var MAX_PAGE_STATE_ENTRIES = 4e3,
  MAX_PAGE_STATE_ENTRIES_SELECTABLE = 500,
  PAGE_STATE_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startPageStateHistory(e, t) {
  t === void 0 && (t = MAX_PAGE_STATE_ENTRIES_SELECTABLE);
  var r = createValueHistory({
      expireDelay: PAGE_STATE_CONTEXT_TIME_OUT_DELAY,
      maxEntries: MAX_PAGE_STATE_ENTRIES,
    }),
    n;
  i(getPageState(), relativeNow());
  var a = addEventListeners(
    e,
    window,
    ['pageshow', 'focus', 'blur', 'visibilitychange', 'resume', 'freeze', 'pagehide'],
    function (s) {
      i(computePageState(s), s.timeStamp);
    },
    {capture: !0},
  ).stop;
  function i(s, c) {
    (c === void 0 && (c = relativeNow()), s !== n && ((n = s), r.closeActive(c), r.add({state: n, startTime: c}, c)));
  }
  var o = {
    findAll: function (s, c) {
      var u = r.findAll(s, c);
      if (u.length !== 0) {
        for (var d = [], f = Math.max(0, u.length - t), l = u.length - 1; l >= f; l--) {
          var p = u[l],
            g = elapsed(s, p.startTime);
          d.push({
            state: p.state,
            start: toServerDuration(g),
          });
        }
        return d;
      }
    },
    wasInPageStateAt: function (s, c) {
      return o.wasInPageStateDuringPeriod(s, c, 0);
    },
    wasInPageStateDuringPeriod: function (s, c, u) {
      return r.findAll(c, u).some(function (d) {
        return d.state === s;
      });
    },
    addPageState: i,
    stop: function () {
      (a(), r.stop());
    },
  };
  return o;
}
function computePageState(e) {
  return e.type === 'freeze'
    ? 'frozen'
    : e.type === 'pagehide'
      ? e.persisted
        ? 'frozen'
        : 'terminated'
      : getPageState();
}
function getPageState() {
  return document.visibilityState === 'hidden' ? 'hidden' : document.hasFocus() ? 'active' : 'passive';
}
function startDisplayContext(e) {
  var t, r;
  isExperimentalFeatureEnabled(ExperimentalFeature.DELAY_VIEWPORT_COLLECTION)
    ? (r = requestAnimationFrame(function () {
        t = getViewportDimension();
      }))
    : (t = getViewportDimension());
  var n = initViewportObservable(e).subscribe(function (a) {
    t = a;
  }).unsubscribe;
  return {
    get: function () {
      return t ? {viewport: t} : void 0;
    },
    stop: function () {
      (n(), r && cancelAnimationFrame(r));
    },
  };
}
function createCookieObservable(e, t) {
  var r = window.cookieStore ? listenToCookieStoreChange(e) : watchCookieFallback;
  return new Observable(function (n) {
    return r(t, function (a) {
      return n.notify(a);
    });
  });
}
function listenToCookieStoreChange(e) {
  return function (t, r) {
    var n = addEventListener(e, window.cookieStore, 'change', function (a) {
      var i =
        find(a.changed, function (o) {
          return o.name === t;
        }) ||
        find(a.deleted, function (o) {
          return o.name === t;
        });
      i && r(i.value);
    });
    return n.stop;
  };
}
var WATCH_COOKIE_INTERVAL_DELAY = ONE_SECOND;
function watchCookieFallback(e, t) {
  var r = findCommaSeparatedValue(document.cookie, e),
    n = setInterval(function () {
      var a = findCommaSeparatedValue(document.cookie, e);
      a !== r && t(a);
    }, WATCH_COOKIE_INTERVAL_DELAY);
  return function () {
    clearInterval(n);
  };
}
var CI_VISIBILITY_TEST_ID_COOKIE_NAME = 'datadog-ci-visibility-test-execution-id';
function startCiVisibilityContext(e, t) {
  var r;
  t === void 0 && (t = createCookieObservable(e, CI_VISIBILITY_TEST_ID_COOKIE_NAME));
  var n =
      getInitCookie(CI_VISIBILITY_TEST_ID_COOKIE_NAME) ||
      ((r = window.Cypress) === null || r === void 0 ? void 0 : r.env('traceId')),
    a = t.subscribe(function (i) {
      n = i;
    });
  return {
    get: function () {
      if (typeof n == 'string')
        return {
          test_execution_id: n,
        };
    },
    stop: function () {
      return a.unsubscribe();
    },
  };
}
function startLongAnimationFrameCollection(e, t) {
  var r = createPerformanceObservable(t, {
    type: RumPerformanceEntryType.LONG_ANIMATION_FRAME,
    buffered: !0,
  }).subscribe(function (n) {
    for (var a = 0, i = n; a < i.length; a++) {
      var o = i[a],
        s = relativeToClocks(o.startTime),
        c = {
          date: s.timeStamp,
          long_task: {
            id: generateUUID(),
            entry_type: 'long-animation-frame',
            duration: toServerDuration(o.duration),
            blocking_duration: toServerDuration(o.blockingDuration),
            first_ui_event_timestamp: toServerDuration(o.firstUIEventTimestamp),
            render_start: toServerDuration(o.renderStart),
            style_and_layout_start: toServerDuration(o.styleAndLayoutStart),
            start_time: toServerDuration(o.startTime),
            scripts: o.scripts.map(function (u) {
              return {
                duration: toServerDuration(u.duration),
                pause_duration: toServerDuration(u.pauseDuration),
                forced_style_and_layout_duration: toServerDuration(u.forcedStyleAndLayoutDuration),
                start_time: toServerDuration(u.startTime),
                execution_start: toServerDuration(u.executionStart),
                source_url: u.sourceURL,
                source_function_name: u.sourceFunctionName,
                source_char_position: u.sourceCharPosition,
                invoker: u.invoker,
                invoker_type: u.invokerType,
                window_attribution: u.windowAttribution,
              };
            }),
          },
          type: 'long_task',
          _dd: {
            discarded: !1,
          },
        };
      e.notify(12, {
        rawRumEvent: c,
        startTime: s.relative,
        domainContext: {performanceEntry: o},
      });
    }
  });
  return {
    stop: function () {
      return r.unsubscribe();
    },
  };
}
function startRum(e, t, r, n, a, i, o, s) {
  var c = [],
    u = new LifeCycle();
  u.subscribe(13, function (A) {
    return sendToExtension('rum', A);
  });
  var d = startRumTelemetry(e);
  d.setContextProvider(function () {
    var A, G;
    return {
      application: {
        id: e.applicationId,
      },
      session: {
        id: (A = v.findTrackedSession()) === null || A === void 0 ? void 0 : A.id,
      },
      view: {
        id: (G = b.findView()) === null || G === void 0 ? void 0 : G.id,
      },
      action: {
        id: C.findActionId(),
      },
    };
  });
  var f = function (A) {
      (u.notify(14, {error: A}), addTelemetryDebug('Error reported to customer', {'error.message': A.message}));
    },
    l = startFeatureFlagContexts(
      u,
      r.getOrCreateTracker(
        0,
        /* CustomerDataType.FeatureFlag */
      ),
    ),
    p = createPageExitObservable(e),
    g = p.subscribe(function (A) {
      u.notify(11, A);
    });
  c.push(function () {
    return g.unsubscribe();
  });
  var v = canUseEventBridge() ? startRumSessionManagerStub() : startRumSessionManager(e, u, o);
  if (canUseEventBridge()) startRumEventBridge(u);
  else {
    var m = startRumBatch(e, u, d.observable, f, p, v.expireObservable, i);
    (c.push(function () {
      return m.stop();
    }),
      startCustomerDataTelemetry(e, d, u, r, m.flushObservable));
  }
  var h = createDOMMutationObservable(),
    S = createLocationChangeObservable(e, location),
    E = startPageStateHistory(e),
    y = createWindowOpenObservable(),
    I = y.observable,
    T = y.stop;
  c.push(T);
  var _ = startRumEventCollection(u, e, location, v, E, S, h, I, n, f),
    b = _.viewHistory,
    O = _.urlContexts,
    C = _.actionContexts,
    k = _.addAction,
    P = _.stop;
  (c.push(P), drainPreStartTelemetry());
  var N = startViewCollection(u, e, location, h, I, S, l, E, t, a),
    D = N.addTiming,
    U = N.startView,
    F = N.setViewName,
    M = N.setViewContext,
    z = N.setViewContextProperty,
    B = N.stop;
  c.push(B);
  var V = startResourceCollection(u, e, E).stop;
  if ((c.push(V), isExperimentalFeatureEnabled(ExperimentalFeature.LONG_ANIMATION_FRAME))) {
    if (e.trackLongTasks) {
      var L = startLongAnimationFrameCollection(u, e).stop;
      c.push(L);
    }
  } else startLongTaskCollection(u, e);
  var R = startErrorCollection(u, e, E, l).addError;
  startRequestCollection(u, e, v);
  var w = startVitalCollection(u, E, s),
    x = startInternalContext(e.applicationId, v, b, C, O);
  return {
    addAction: k,
    addError: R,
    addTiming: D,
    addFeatureFlagEvaluation: l.addFeatureFlagEvaluation,
    startView: U,
    setViewContext: M,
    setViewContextProperty: z,
    setViewName: F,
    lifeCycle: u,
    viewHistory: b,
    session: v,
    stopSession: function () {
      return v.expire();
    },
    getInternalContext: x.get,
    startDurationVital: w.startDurationVital,
    stopDurationVital: w.stopDurationVital,
    addDurationVital: w.addDurationVital,
    stop: function () {
      c.forEach(function (A) {
        return A();
      });
    },
  };
}
function startRumTelemetry(e) {
  var t = startTelemetry('browser-rum-sdk', e);
  if (canUseEventBridge()) {
    var r = getEventBridge();
    t.observable.subscribe(function (n) {
      return r.send('internal_telemetry', n);
    });
  }
  return t;
}
function startRumEventCollection(e, t, r, n, a, i, o, s, c, u) {
  var d = startViewHistory(e),
    f = startUrlContexts(e, i, r),
    l = startActionCollection(e, o, s, t, a),
    p = startDisplayContext(t),
    g = startCiVisibilityContext(t);
  return (
    startRumAssembly(t, e, n, d, f, l.actionContexts, p, g, c, u),
    {
      viewHistory: d,
      pageStateHistory: a,
      urlContexts: f,
      addAction: l.addAction,
      actionContexts: l.actionContexts,
      stop: function () {
        (l.stop(), g.stop(), p.stop(), f.stop(), d.stop(), a.stop());
      },
    }
  );
}
function getSessionReplayUrl(e, t) {
  var r = t.session,
    n = t.viewContext,
    a = t.errorType,
    i = r ? r.id : 'no-session-id',
    o = [];
  (a !== void 0 && o.push('error-type='.concat(a)),
    n && (o.push('seed='.concat(n.id)), o.push('from='.concat(n.startClocks.timeStamp))));
  var s = getDatadogSiteUrl(e),
    c = '/rum/replay/sessions/'.concat(i);
  return ''.concat(s).concat(c, '?').concat(o.join('&'));
}
function getDatadogSiteUrl(e) {
  var t = e.site,
    r = e.subdomain || getSiteDefaultSubdomain(e);
  return 'https://'.concat(r ? ''.concat(r, '.') : '').concat(t);
}
function getSiteDefaultSubdomain(e) {
  switch (e.site) {
    case INTAKE_SITE_US1:
    case INTAKE_SITE_EU1:
      return 'app';
    case INTAKE_SITE_STAGING:
      return 'dd';
    default:
      return;
  }
}
var MAX_STATS_HISTORY = 10,
  statsPerView;
function getSegmentsCount(e) {
  return getOrCreateReplayStats(e).segments_count;
}
function addSegment(e) {
  getOrCreateReplayStats(e).segments_count += 1;
}
function addRecord(e) {
  getOrCreateReplayStats(e).records_count += 1;
}
function addWroteData(e, t) {
  getOrCreateReplayStats(e).segments_total_raw_size += t;
}
function getReplayStats(e) {
  return statsPerView?.get(e);
}
function getOrCreateReplayStats(e) {
  statsPerView || (statsPerView = /* @__PURE__ */ new Map());
  var t;
  return (
    statsPerView.has(e)
      ? (t = statsPerView.get(e))
      : ((t = {
          records_count: 0,
          segments_count: 0,
          segments_total_raw_size: 0,
        }),
        statsPerView.set(e, t),
        statsPerView.size > MAX_STATS_HISTORY && deleteOldestStats()),
    t
  );
}
function deleteOldestStats() {
  if (statsPerView)
    if (statsPerView.keys) {
      var e = statsPerView.keys().next().value;
      e && statsPerView.delete(e);
    } else {
      var t = !0;
      statsPerView.forEach(function (r, n) {
        t && (statsPerView.delete(n), (t = !1));
      });
    }
}
var serializedNodeIds = /* @__PURE__ */ new WeakMap();
function hasSerializedNode(e) {
  return serializedNodeIds.has(e);
}
function nodeAndAncestorsHaveSerializedNode(e) {
  for (var t = e; t; ) {
    if (!hasSerializedNode(t) && !isNodeShadowRoot(t)) return !1;
    t = getParentNode(t);
  }
  return !0;
}
function getSerializedNodeId(e) {
  return serializedNodeIds.get(e);
}
function setSerializedNodeId(e, t) {
  serializedNodeIds.set(e, t);
}
function getElementInputValue(e, t) {
  var r = e.tagName,
    n = e.value;
  if (shouldMaskNode(e, t)) {
    var a = e.type;
    return r === 'INPUT' && (a === 'button' || a === 'submit' || a === 'reset')
      ? n
      : !n || r === 'OPTION'
        ? void 0
        : CENSORED_STRING_MARK;
  }
  if (r === 'OPTION' || r === 'SELECT') return e.value;
  if (!(r !== 'INPUT' && r !== 'TEXTAREA')) return n;
}
var URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")([^"]*)"|([^)]*))\)/gm,
  ABSOLUTE_URL = /^[A-Za-z]+:|^\/\//,
  DATA_URI = /^data:.*,/i;
function switchToAbsoluteUrl(e, t) {
  return e.replace(URL_IN_CSS_REF, function (r, n, a, i, o, s) {
    var c = a || o || s;
    if (!t || !c || ABSOLUTE_URL.test(c) || DATA_URI.test(c)) return r;
    var u = n || i || '';
    return 'url('.concat(u).concat(makeUrlAbsolute(c, t)).concat(u, ')');
  });
}
function makeUrlAbsolute(e, t) {
  try {
    return buildUrl(e, t).href;
  } catch {
    return e;
  }
}
var TAG_NAME_REGEX = /[^a-z1-6-_]/;
function getValidTagName(e) {
  var t = e.toLowerCase().trim();
  return TAG_NAME_REGEX.test(t) ? 'div' : t;
}
function censoredImageForSize(e, t) {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='"
    .concat(e, "' height='")
    .concat(t, "' style='background-color:silver'%3E%3C/svg%3E");
}
var RecordType = {
    FullSnapshot: 2,
    IncrementalSnapshot: 3,
    Meta: 4,
    Focus: 6,
    ViewEnd: 7,
    VisualViewport: 8,
    FrustrationRecord: 9,
  },
  NodeType = {
    Document: 0,
    DocumentType: 1,
    Element: 2,
    Text: 3,
    CDATA: 4,
    DocumentFragment: 11,
  },
  IncrementalSource = {
    Mutation: 0,
    MouseMove: 1,
    MouseInteraction: 2,
    Scroll: 3,
    ViewportResize: 4,
    Input: 5,
    TouchMove: 6,
    MediaInteraction: 7,
    StyleSheetRule: 8,
    // CanvasMutation : 9,
    // Font : 10,
  },
  MouseInteractionType = {
    MouseUp: 0,
    MouseDown: 1,
    Click: 2,
    ContextMenu: 3,
    DblClick: 4,
    Focus: 5,
    Blur: 6,
    TouchStart: 7,
    TouchEnd: 9,
  },
  MediaInteractionType = {
    Play: 0,
    Pause: 1,
  };
function serializeStyleSheets(e) {
  if (!(e === void 0 || e.length === 0))
    return e.map(function (t) {
      var r = t.cssRules || t.rules,
        n = Array.from(r, function (i) {
          return i.cssText;
        }),
        a = {
          cssRules: n,
          disabled: t.disabled || void 0,
          media: t.media.length > 0 ? Array.from(t.media) : void 0,
        };
      return a;
    });
}
function serializeAttribute(e, t, r, n) {
  if (t === NodePrivacyLevel.HIDDEN) return null;
  var a = e.getAttribute(r);
  if (
    t === NodePrivacyLevel.MASK &&
    r !== PRIVACY_ATTR_NAME &&
    !STABLE_ATTRIBUTES.includes(r) &&
    r !== n.actionNameAttribute
  ) {
    var i = e.tagName;
    switch (r) {
      // Mask Attribute text content
      case 'title':
      case 'alt':
      case 'placeholder':
        return CENSORED_STRING_MARK;
    }
    if (i === 'IMG' && (r === 'src' || r === 'srcset')) {
      var o = e;
      if (o.naturalWidth > 0) return censoredImageForSize(o.naturalWidth, o.naturalHeight);
      var s = e.getBoundingClientRect(),
        c = s.width,
        u = s.height;
      return c > 0 || u > 0 ? censoredImageForSize(c, u) : CENSORED_IMG_MARK;
    }
    if (i === 'SOURCE' && (r === 'src' || r === 'srcset')) return CENSORED_IMG_MARK;
    if ((i === 'A' && r === 'href') || (a && startsWith(r, 'data-')) || (i === 'IFRAME' && r === 'srcdoc'))
      return CENSORED_STRING_MARK;
  }
  return !a || typeof a != 'string' ? a : isLongDataUrl(a) ? sanitizeDataUrl(a) : a;
}
function serializeAttributes(e, t, r) {
  var n;
  if (t === NodePrivacyLevel.HIDDEN) return {};
  for (var a = {}, i = getValidTagName(e.tagName), o = e.ownerDocument, s = 0; s < e.attributes.length; s += 1) {
    var c = e.attributes.item(s),
      u = c.name,
      d = serializeAttribute(e, t, u, r.configuration);
    d !== null && (a[u] = d);
  }
  if (e.value && (i === 'textarea' || i === 'select' || i === 'option' || i === 'input')) {
    var f = getElementInputValue(e, t);
    f !== void 0 && (a.value = f);
  }
  if (i === 'option' && t === NodePrivacyLevel.ALLOW) {
    var l = e;
    l.selected && (a.selected = l.selected);
  }
  if (i === 'link') {
    var p = Array.from(o.styleSheets).find(function (y) {
        return y.href === e.href;
      }),
      g = getCssRulesString(p);
    g && p && (a._cssText = g);
  }
  if (i === 'style' && e.sheet) {
    var g = getCssRulesString(e.sheet);
    g && (a._cssText = g);
  }
  var v = e;
  if (
    (i === 'input' &&
      (v.type === 'radio' || v.type === 'checkbox') &&
      (t === NodePrivacyLevel.ALLOW ? (a.checked = !!v.checked) : shouldMaskNode(v, t) && delete a.checked),
    i === 'audio' || i === 'video')
  ) {
    var m = e;
    a.rr_mediaState = m.paused ? 'paused' : 'played';
  }
  var h,
    S,
    E = r.serializationContext;
  switch (E.status) {
    case 0:
      ((h = Math.round(e.scrollTop)),
        (S = Math.round(e.scrollLeft)),
        (h || S) && E.elementsScrollPositions.set(e, {scrollTop: h, scrollLeft: S}));
      break;
    case 1:
      E.elementsScrollPositions.has(e) &&
        ((n = E.elementsScrollPositions.get(e)), (h = n.scrollTop), (S = n.scrollLeft));
      break;
  }
  return (S && (a.rr_scrollLeft = S), h && (a.rr_scrollTop = h), a);
}
function getCssRulesString(e) {
  if (!e) return null;
  var t;
  try {
    t = e.rules || e.cssRules;
  } catch {}
  if (!t) return null;
  var r = Array.from(t, isSafari() ? getCssRuleStringForSafari : getCssRuleString).join('');
  return switchToAbsoluteUrl(r, e.href);
}
function getCssRuleStringForSafari(e) {
  if (isCSSStyleRule(e) && e.selectorText.includes(':')) {
    var t = /(\[[\w-]+[^\\])(:[^\]]+\])/g;
    return e.cssText.replace(t, '$1\\$2');
  }
  return getCssRuleString(e);
}
function getCssRuleString(e) {
  return (isCSSImportRule(e) && getCssRulesString(e.styleSheet)) || e.cssText;
}
function isCSSImportRule(e) {
  return 'styleSheet' in e;
}
function isCSSStyleRule(e) {
  return 'selectorText' in e;
}
function serializeNodeWithId(e, t) {
  var r = serializeNode(e, t);
  if (!r) return null;
  var n = getSerializedNodeId(e) || generateNextId(),
    a = r;
  return ((a.id = n), setSerializedNodeId(e, n), t.serializedNodeIds && t.serializedNodeIds.add(n), a);
}
var _nextId = 1;
function generateNextId() {
  return _nextId++;
}
function serializeChildNodes(e, t) {
  var r = [];
  return (
    forEachChildNodes(e, function (n) {
      var a = serializeNodeWithId(n, t);
      a && r.push(a);
    }),
    r
  );
}
function serializeNode(e, t) {
  switch (e.nodeType) {
    case e.DOCUMENT_NODE:
      return serializeDocumentNode(e, t);
    case e.DOCUMENT_FRAGMENT_NODE:
      return serializeDocumentFragmentNode(e, t);
    case e.DOCUMENT_TYPE_NODE:
      return serializeDocumentTypeNode(e);
    case e.ELEMENT_NODE:
      return serializeElementNode(e, t);
    case e.TEXT_NODE:
      return serializeTextNode(e, t);
    case e.CDATA_SECTION_NODE:
      return serializeCDataNode();
  }
}
function serializeDocumentNode(e, t) {
  return {
    type: NodeType.Document,
    childNodes: serializeChildNodes(e, t),
    adoptedStyleSheets: serializeStyleSheets(e.adoptedStyleSheets),
  };
}
function serializeDocumentFragmentNode(e, t) {
  var r = isNodeShadowRoot(e);
  return (
    r && t.serializationContext.shadowRootsController.addShadowRoot(e),
    {
      type: NodeType.DocumentFragment,
      childNodes: serializeChildNodes(e, t),
      isShadowRoot: r,
      adoptedStyleSheets: r ? serializeStyleSheets(e.adoptedStyleSheets) : void 0,
    }
  );
}
function serializeDocumentTypeNode(e) {
  return {
    type: NodeType.DocumentType,
    name: e.name,
    publicId: e.publicId,
    systemId: e.systemId,
  };
}
function serializeElementNode(e, t) {
  var r,
    n = getValidTagName(e.tagName),
    a = isSVGElement(e) || void 0,
    i = reducePrivacyLevel(getNodeSelfPrivacyLevel(e), t.parentNodePrivacyLevel);
  if (i === NodePrivacyLevel.HIDDEN) {
    var o = e.getBoundingClientRect(),
      s = o.width,
      c = o.height;
    return {
      type: NodeType.Element,
      tagName: n,
      attributes:
        ((r = {
          rr_width: ''.concat(s, 'px'),
          rr_height: ''.concat(c, 'px'),
        }),
        (r[PRIVACY_ATTR_NAME] = PRIVACY_ATTR_VALUE_HIDDEN),
        r),
      childNodes: [],
      isSVG: a,
    };
  }
  if (i !== NodePrivacyLevel.IGNORE) {
    var u = serializeAttributes(e, i, t),
      d = [];
    if (
      hasChildNodes(e) && // Do not serialize style children as the css rules are already in the _cssText attribute
      n !== 'style'
    ) {
      var f = void 0;
      (t.parentNodePrivacyLevel === i && t.ignoreWhiteSpace === (n === 'head')
        ? (f = t)
        : (f = assign({}, t, {
            parentNodePrivacyLevel: i,
            ignoreWhiteSpace: n === 'head',
          })),
        (d = serializeChildNodes(e, f)));
    }
    return {
      type: NodeType.Element,
      tagName: n,
      attributes: u,
      childNodes: d,
      isSVG: a,
    };
  }
}
function isSVGElement(e) {
  return e.tagName === 'svg' || e instanceof SVGElement;
}
function serializeTextNode(e, t) {
  var r = getTextContent(e, t.ignoreWhiteSpace || !1, t.parentNodePrivacyLevel);
  if (r !== void 0)
    return {
      type: NodeType.Text,
      textContent: r,
    };
}
function serializeCDataNode() {
  return {
    type: NodeType.CDATA,
    textContent: '',
  };
}
function serializeDocument(e, t, r) {
  return serializeNodeWithId(e, {
    serializationContext: r,
    parentNodePrivacyLevel: t.defaultPrivacyLevel,
    configuration: t,
  });
}
function isTouchEvent(e) {
  return !!e.changedTouches;
}
function getEventTarget(e) {
  return e.composed === !0 && isNodeShadowHost(e.target) ? e.composedPath()[0] : e.target;
}
var TOLERANCE = 25;
function isVisualViewportFactoredIn(e) {
  return (
    Math.abs(e.pageTop - e.offsetTop - window.scrollY) > TOLERANCE ||
    Math.abs(e.pageLeft - e.offsetLeft - window.scrollX) > TOLERANCE
  );
}
var convertMouseEventToLayoutCoordinates = function (e, t) {
    var r = window.visualViewport,
      n = {
        layoutViewportX: e,
        layoutViewportY: t,
        visualViewportX: e,
        visualViewportY: t,
      };
    if (r)
      isVisualViewportFactoredIn(r)
        ? ((n.layoutViewportX = Math.round(e + r.offsetLeft)), (n.layoutViewportY = Math.round(t + r.offsetTop)))
        : ((n.visualViewportX = Math.round(e - r.offsetLeft)), (n.visualViewportY = Math.round(t - r.offsetTop)));
    else return n;
    return n;
  },
  getVisualViewport = function (e) {
    return {
      scale: e.scale,
      offsetLeft: e.offsetLeft,
      offsetTop: e.offsetTop,
      pageLeft: e.pageLeft,
      pageTop: e.pageTop,
      height: e.height,
      width: e.width,
    };
  };
function assembleIncrementalSnapshot(e, t) {
  return {
    data: assign(
      {
        source: e,
      },
      t,
    ),
    type: RecordType.IncrementalSnapshot,
    timestamp: timeStampNow(),
  };
}
var MOUSE_MOVE_OBSERVER_THRESHOLD = 50;
function trackMove(e, t) {
  var r = throttle(
      function (o) {
        var s = getEventTarget(o);
        if (hasSerializedNode(s)) {
          var c = tryToComputeCoordinates(o);
          if (!c) return;
          var u = {
            id: getSerializedNodeId(s),
            timeOffset: 0,
            x: c.x,
            y: c.y,
          };
          t(
            assembleIncrementalSnapshot(isTouchEvent(o) ? IncrementalSource.TouchMove : IncrementalSource.MouseMove, {
              positions: [u],
            }),
          );
        }
      },
      MOUSE_MOVE_OBSERVER_THRESHOLD,
      {
        trailing: !1,
      },
    ),
    n = r.throttled,
    a = r.cancel,
    i = addEventListeners(
      e,
      document,
      [
        'mousemove',
        'touchmove',
        /* DOM_EVENT.TOUCH_MOVE */
      ],
      n,
      {
        capture: !0,
        passive: !0,
      },
    ).stop;
  return {
    stop: function () {
      (i(), a());
    },
  };
}
function tryToComputeCoordinates(e) {
  var t = isTouchEvent(e) ? e.changedTouches[0] : e,
    r = t.clientX,
    n = t.clientY;
  if (window.visualViewport) {
    var a = convertMouseEventToLayoutCoordinates(r, n),
      i = a.visualViewportX,
      o = a.visualViewportY;
    ((r = i), (n = o));
  }
  if (!Number.isFinite(r) || !Number.isFinite(n)) {
    e.isTrusted && addTelemetryDebug('mouse/touch event without x/y');
    return;
  }
  return {x: r, y: n};
}
var _a,
  eventTypeToMouseInteraction =
    ((_a = {}), // Listen for pointerup DOM events instead of mouseup for MouseInteraction/MouseUp records. This
    // allows to reference such records from Frustration records.
    //
    // In the context of supporting Mobile Session Replay, we introduced `PointerInteraction` records
    // used by the Mobile SDKs in place of `MouseInteraction`. In the future, we should replace
    // `MouseInteraction` by `PointerInteraction` in the Browser SDK so we have an uniform way to
    // convey such interaction. This would cleanly solve the issue since we would have
    // `PointerInteraction/Up` records that we could reference from `Frustration` records.
    (_a.pointerup = MouseInteractionType.MouseUp),
    (_a.mousedown = MouseInteractionType.MouseDown),
    (_a.click = MouseInteractionType.Click),
    (_a.contextmenu = MouseInteractionType.ContextMenu),
    (_a.dblclick = MouseInteractionType.DblClick),
    (_a.focus = MouseInteractionType.Focus),
    (_a.blur = MouseInteractionType.Blur),
    (_a.touchstart = MouseInteractionType.TouchStart),
    (_a.touchend = MouseInteractionType.TouchEnd),
    _a);
function trackMouseInteraction(e, t, r) {
  var n = function (a) {
    var i = getEventTarget(a);
    if (!(getNodePrivacyLevel(i, e.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN || !hasSerializedNode(i))) {
      var o = getSerializedNodeId(i),
        s = eventTypeToMouseInteraction[a.type],
        c;
      if (s !== MouseInteractionType.Blur && s !== MouseInteractionType.Focus) {
        var u = tryToComputeCoordinates(a);
        if (!u) return;
        c = {id: o, type: s, x: u.x, y: u.y};
      } else c = {id: o, type: s};
      var d = assign({id: r.getIdForEvent(a)}, assembleIncrementalSnapshot(IncrementalSource.MouseInteraction, c));
      t(d);
    }
  };
  return addEventListeners(e, document, Object.keys(eventTypeToMouseInteraction), n, {
    capture: !0,
    passive: !0,
  });
}
var SCROLL_OBSERVER_THRESHOLD = 100;
function trackScroll(e, t, r, n) {
  n === void 0 && (n = document);
  var a = throttle(function (c) {
      var u = getEventTarget(c);
      if (!(!u || getNodePrivacyLevel(u, e.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN || !hasSerializedNode(u))) {
        var d = getSerializedNodeId(u),
          f =
            u === document
              ? {
                  scrollTop: getScrollY(),
                  scrollLeft: getScrollX(),
                }
              : {
                  scrollTop: Math.round(u.scrollTop),
                  scrollLeft: Math.round(u.scrollLeft),
                };
        (r.set(u, f),
          t(
            assembleIncrementalSnapshot(IncrementalSource.Scroll, {
              id: d,
              x: f.scrollLeft,
              y: f.scrollTop,
            }),
          ));
      }
    }, SCROLL_OBSERVER_THRESHOLD),
    i = a.throttled,
    o = a.cancel,
    s = addEventListener(e, n, 'scroll', i, {
      capture: !0,
      passive: !0,
    }).stop;
  return {
    stop: function () {
      (s(), o());
    },
  };
}
var VISUAL_VIEWPORT_OBSERVER_THRESHOLD = 200;
function trackViewportResize(e, t) {
  var r = initViewportObservable(e).subscribe(function (n) {
    t(assembleIncrementalSnapshot(IncrementalSource.ViewportResize, n));
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
function trackVisualViewportResize(e, t) {
  var r = window.visualViewport;
  if (!r) return {stop: noop};
  var n = throttle(
      function () {
        t({
          data: getVisualViewport(r),
          type: RecordType.VisualViewport,
          timestamp: timeStampNow(),
        });
      },
      VISUAL_VIEWPORT_OBSERVER_THRESHOLD,
      {
        trailing: !1,
      },
    ),
    a = n.throttled,
    i = n.cancel,
    o = addEventListeners(
      e,
      r,
      [
        'resize',
        'scroll',
        /* DOM_EVENT.SCROLL */
      ],
      a,
      {
        capture: !0,
        passive: !0,
      },
    ).stop;
  return {
    stop: function () {
      (o(), i());
    },
  };
}
function trackMediaInteraction(e, t) {
  return addEventListeners(
    e,
    document,
    [
      'play',
      'pause',
      /* DOM_EVENT.PAUSE */
    ],
    function (r) {
      var n = getEventTarget(r);
      !n ||
        getNodePrivacyLevel(n, e.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN ||
        !hasSerializedNode(n) ||
        t(
          assembleIncrementalSnapshot(IncrementalSource.MediaInteraction, {
            id: getSerializedNodeId(n),
            type: r.type === 'play' ? MediaInteractionType.Play : MediaInteractionType.Pause,
          }),
        );
    },
    {
      capture: !0,
      passive: !0,
    },
  );
}
function trackStyleSheet(e) {
  function t(a, i) {
    a && hasSerializedNode(a.ownerNode) && i(getSerializedNodeId(a.ownerNode));
  }
  var r = [
    instrumentMethod(CSSStyleSheet.prototype, 'insertRule', function (a) {
      var i = a.target,
        o = a.parameters,
        s = o[0],
        c = o[1];
      t(i, function (u) {
        return e(
          assembleIncrementalSnapshot(IncrementalSource.StyleSheetRule, {
            id: u,
            adds: [{rule: s, index: c}],
          }),
        );
      });
    }),
    instrumentMethod(CSSStyleSheet.prototype, 'deleteRule', function (a) {
      var i = a.target,
        o = a.parameters[0];
      t(i, function (s) {
        return e(
          assembleIncrementalSnapshot(IncrementalSource.StyleSheetRule, {
            id: s,
            removes: [{index: o}],
          }),
        );
      });
    }),
  ];
  typeof CSSGroupingRule < 'u' ? n(CSSGroupingRule) : (n(CSSMediaRule), n(CSSSupportsRule));
  function n(a) {
    r.push(
      instrumentMethod(a.prototype, 'insertRule', function (i) {
        var o = i.target,
          s = i.parameters,
          c = s[0],
          u = s[1];
        t(o.parentStyleSheet, function (d) {
          var f = getPathToNestedCSSRule(o);
          f &&
            (f.push(u || 0),
            e(
              assembleIncrementalSnapshot(IncrementalSource.StyleSheetRule, {
                id: d,
                adds: [{rule: c, index: f}],
              }),
            ));
        });
      }),
      instrumentMethod(a.prototype, 'deleteRule', function (i) {
        var o = i.target,
          s = i.parameters[0];
        t(o.parentStyleSheet, function (c) {
          var u = getPathToNestedCSSRule(o);
          u &&
            (u.push(s),
            e(
              assembleIncrementalSnapshot(IncrementalSource.StyleSheetRule, {
                id: c,
                removes: [{index: u}],
              }),
            ));
        });
      }),
    );
  }
  return {
    stop: function () {
      r.forEach(function (a) {
        return a.stop();
      });
    },
  };
}
function getPathToNestedCSSRule(e) {
  for (var t = [], r = e; r.parentRule; ) {
    var n = Array.from(r.parentRule.cssRules),
      a = n.indexOf(r);
    (t.unshift(a), (r = r.parentRule));
  }
  if (r.parentStyleSheet) {
    var i = Array.from(r.parentStyleSheet.cssRules),
      o = i.indexOf(r);
    return (t.unshift(o), t);
  }
}
function trackFocus(e, t) {
  return addEventListeners(
    e,
    window,
    [
      'focus',
      'blur',
      /* DOM_EVENT.BLUR */
    ],
    function () {
      t({
        data: {has_focus: document.hasFocus()},
        type: RecordType.Focus,
        timestamp: timeStampNow(),
      });
    },
  );
}
function trackFrustration(e, t, r) {
  var n = e.subscribe(12, function (a) {
    var i, o;
    a.rawRumEvent.type === 'action' &&
      a.rawRumEvent.action.type === 'click' &&
      !(
        (o = (i = a.rawRumEvent.action.frustration) === null || i === void 0 ? void 0 : i.type) === null || o === void 0
      ) &&
      o.length &&
      'events' in a.domainContext &&
      a.domainContext.events &&
      a.domainContext.events.length &&
      t({
        timestamp: a.rawRumEvent.date,
        type: RecordType.FrustrationRecord,
        data: {
          frustrationTypes: a.rawRumEvent.action.frustration.type,
          recordIds: a.domainContext.events.map(function (s) {
            return r.getIdForEvent(s);
          }),
        },
      });
  });
  return {
    stop: function () {
      n.unsubscribe();
    },
  };
}
function trackViewEnd(e, t) {
  var r = e.subscribe(5, function () {
    t({
      timestamp: timeStampNow(),
      type: RecordType.ViewEnd,
    });
  });
  return {
    stop: function () {
      r.unsubscribe();
    },
  };
}
function trackInput(e, t, r) {
  r === void 0 && (r = document);
  var n = e.defaultPrivacyLevel,
    a = /* @__PURE__ */ new WeakMap(),
    i = r !== document,
    o = addEventListeners(
      e,
      r,
      // The 'input' event bubbles across shadow roots, so we don't have to listen for it on shadow
      // roots since it will be handled by the event listener that we did add to the document. Only
      // the 'change' event is blocked and needs to be handled on shadow roots.
      i
        ? [
            'change',
            /* DOM_EVENT.CHANGE */
          ]
        : [
            'input',
            'change',
            /* DOM_EVENT.CHANGE */
          ],
      function (f) {
        var l = getEventTarget(f);
        (l instanceof HTMLInputElement || l instanceof HTMLTextAreaElement || l instanceof HTMLSelectElement) && u(l);
      },
      {
        capture: !0,
        passive: !0,
      },
    ).stop,
    s;
  if (i) s = noop;
  else {
    var c = [
      instrumentSetter(HTMLInputElement.prototype, 'value', u),
      instrumentSetter(HTMLInputElement.prototype, 'checked', u),
      instrumentSetter(HTMLSelectElement.prototype, 'value', u),
      instrumentSetter(HTMLTextAreaElement.prototype, 'value', u),
      instrumentSetter(HTMLSelectElement.prototype, 'selectedIndex', u),
    ];
    s = function () {
      c.forEach(function (f) {
        return f.stop();
      });
    };
  }
  return {
    stop: function () {
      (s(), o());
    },
  };
  function u(f) {
    var l = getNodePrivacyLevel(f, n);
    if (l !== NodePrivacyLevel.HIDDEN) {
      var p = f.type,
        g;
      if (p === 'radio' || p === 'checkbox') {
        if (shouldMaskNode(f, l)) return;
        g = {isChecked: f.checked};
      } else {
        var v = getElementInputValue(f, l);
        if (v === void 0) return;
        g = {text: v};
      }
      d(f, g);
      var m = f.name;
      p === 'radio' &&
        m &&
        f.checked &&
        forEach(document.querySelectorAll('input[type="radio"][name="'.concat(cssEscape(m), '"]')), function (h) {
          h !== f && d(h, {isChecked: !1});
        });
    }
  }
  function d(f, l) {
    if (hasSerializedNode(f)) {
      var p = a.get(f);
      (!p || p.text !== l.text || p.isChecked !== l.isChecked) &&
        (a.set(f, l),
        t(
          assembleIncrementalSnapshot(
            IncrementalSource.Input,
            assign(
              {
                id: getSerializedNodeId(f),
              },
              l,
            ),
          ),
        ));
    }
  }
}
var MUTATION_PROCESS_MAX_DELAY = 100,
  MUTATION_PROCESS_MIN_DELAY = 16;
function createMutationBatch(e) {
  var t = noop,
    r = [];
  function n() {
    (t(), e(r), (r = []));
  }
  var a = throttle(n, MUTATION_PROCESS_MIN_DELAY, {
      leading: !1,
    }),
    i = a.throttled,
    o = a.cancel;
  return {
    addMutations: function (s) {
      (r.length === 0 && (t = requestIdleCallback(i, {timeout: MUTATION_PROCESS_MAX_DELAY})), r.push.apply(r, s));
    },
    flush: n,
    stop: function () {
      (t(), o());
    },
  };
}
function trackMutation(e, t, r, n) {
  var a = getMutationObserverConstructor();
  if (!a) return {stop: noop, flush: noop};
  var i = createMutationBatch(function (s) {
      processMutations(s.concat(o.takeRecords()), e, t, r);
    }),
    o = new a(monitor(i.addMutations));
  return (
    o.observe(n, {
      attributeOldValue: !0,
      attributes: !0,
      characterData: !0,
      characterDataOldValue: !0,
      childList: !0,
      subtree: !0,
    }),
    {
      stop: function () {
        (o.disconnect(), i.stop());
      },
      flush: function () {
        i.flush();
      },
    }
  );
}
function processMutations(e, t, r, n) {
  var a = /* @__PURE__ */ new Map();
  e.filter(function (l) {
    return l.type === 'childList';
  }).forEach(function (l) {
    l.removedNodes.forEach(function (p) {
      traverseRemovedShadowDom(p, n.removeShadowRoot);
    });
  });
  var i = e.filter(function (l) {
      return (
        l.target.isConnected &&
        nodeAndAncestorsHaveSerializedNode(l.target) &&
        getNodePrivacyLevel(l.target, r.defaultPrivacyLevel, a) !== NodePrivacyLevel.HIDDEN
      );
    }),
    o = processChildListMutations(
      i.filter(function (l) {
        return l.type === 'childList';
      }),
      r,
      n,
      a,
    ),
    s = o.adds,
    c = o.removes,
    u = o.hasBeenSerialized,
    d = processCharacterDataMutations(
      i.filter(function (l) {
        return l.type === 'characterData' && !u(l.target);
      }),
      r,
      a,
    ),
    f = processAttributesMutations(
      i.filter(function (l) {
        return l.type === 'attributes' && !u(l.target);
      }),
      r,
      a,
    );
  (!d.length && !f.length && !c.length && !s.length) ||
    t(assembleIncrementalSnapshot(IncrementalSource.Mutation, {adds: s, removes: c, texts: d, attributes: f}));
}
function processChildListMutations(e, t, r, n) {
  for (
    var a = /* @__PURE__ */ new Set(),
      i = /* @__PURE__ */ new Map(),
      o = function (T) {
        (T.addedNodes.forEach(function (_) {
          a.add(_);
        }),
          T.removedNodes.forEach(function (_) {
            (a.has(_) || i.set(_, T.target), a.delete(_));
          }));
      },
      s = 0,
      c = e;
    s < c.length;
    s++
  ) {
    var u = c[s];
    o(u);
  }
  var d = Array.from(a);
  sortAddedAndMovedNodes(d);
  for (var f = /* @__PURE__ */ new Set(), l = [], p = 0, g = d; p < g.length; p++) {
    var v = g[p];
    if (!y(v)) {
      var m = getNodePrivacyLevel(v.parentNode, t.defaultPrivacyLevel, n);
      if (!(m === NodePrivacyLevel.HIDDEN || m === NodePrivacyLevel.IGNORE)) {
        var h = serializeNodeWithId(v, {
          serializedNodeIds: f,
          parentNodePrivacyLevel: m,
          serializationContext: {status: 2, shadowRootsController: r},
          configuration: t,
        });
        if (h) {
          var S = getParentNode(v);
          l.push({
            nextId: I(v),
            parentId: getSerializedNodeId(S),
            node: h,
          });
        }
      }
    }
  }
  var E = [];
  return (
    i.forEach(function (T, _) {
      hasSerializedNode(_) &&
        E.push({
          parentId: getSerializedNodeId(T),
          id: getSerializedNodeId(_),
        });
    }),
    {adds: l, removes: E, hasBeenSerialized: y}
  );
  function y(T) {
    return hasSerializedNode(T) && f.has(getSerializedNodeId(T));
  }
  function I(T) {
    for (var _ = T.nextSibling; _; ) {
      if (hasSerializedNode(_)) return getSerializedNodeId(_);
      _ = _.nextSibling;
    }
    return null;
  }
}
function processCharacterDataMutations(e, t, r) {
  for (
    var n,
      a = [],
      i = /* @__PURE__ */ new Set(),
      o = e.filter(function (l) {
        return i.has(l.target) ? !1 : (i.add(l.target), !0);
      }),
      s = 0,
      c = o;
    s < c.length;
    s++
  ) {
    var u = c[s],
      d = u.target.textContent;
    if (d !== u.oldValue) {
      var f = getNodePrivacyLevel(getParentNode(u.target), t.defaultPrivacyLevel, r);
      f === NodePrivacyLevel.HIDDEN ||
        f === NodePrivacyLevel.IGNORE ||
        a.push({
          id: getSerializedNodeId(u.target),
          // TODO: pass a valid "ignoreWhiteSpace" argument
          value: (n = getTextContent(u.target, !1, f)) !== null && n !== void 0 ? n : null,
        });
    }
  }
  return a;
}
function processAttributesMutations(e, t, r) {
  for (
    var n = [],
      a = /* @__PURE__ */ new Map(),
      i = e.filter(function (m) {
        var h = a.get(m.target);
        return h && h.has(m.attributeName)
          ? !1
          : (h ? h.add(m.attributeName) : a.set(m.target, /* @__PURE__ */ new Set([m.attributeName])), !0);
      }),
      o = /* @__PURE__ */ new Map(),
      s = 0,
      c = i;
    s < c.length;
    s++
  ) {
    var u = c[s],
      d = u.target.getAttribute(u.attributeName);
    if (d !== u.oldValue) {
      var f = getNodePrivacyLevel(u.target, t.defaultPrivacyLevel, r),
        l = serializeAttribute(u.target, f, u.attributeName, t),
        p = void 0;
      if (u.attributeName === 'value') {
        var g = getElementInputValue(u.target, f);
        if (g === void 0) continue;
        p = g;
      } else typeof l == 'string' ? (p = l) : (p = null);
      var v = o.get(u.target);
      (v ||
        ((v = {
          id: getSerializedNodeId(u.target),
          attributes: {},
        }),
        n.push(v),
        o.set(u.target, v)),
        (v.attributes[u.attributeName] = p));
    }
  }
  return n;
}
function sortAddedAndMovedNodes(e) {
  e.sort(function (t, r) {
    var n = t.compareDocumentPosition(r);
    return n & Node.DOCUMENT_POSITION_CONTAINED_BY
      ? -1
      : n & Node.DOCUMENT_POSITION_CONTAINS || n & Node.DOCUMENT_POSITION_FOLLOWING
        ? 1
        : n & Node.DOCUMENT_POSITION_PRECEDING
          ? -1
          : 0;
  });
}
function traverseRemovedShadowDom(e, t) {
  (isNodeShadowHost(e) && t(e.shadowRoot),
    forEachChildNodes(e, function (r) {
      return traverseRemovedShadowDom(r, t);
    }));
}
function createElementsScrollPositions() {
  var e = /* @__PURE__ */ new WeakMap();
  return {
    set: function (t, r) {
      (t === document && !document.scrollingElement) || e.set(t === document ? document.scrollingElement : t, r);
    },
    get: function (t) {
      return e.get(t);
    },
    has: function (t) {
      return e.has(t);
    },
  };
}
var initShadowRootsController = function (e, t, r) {
  var n = /* @__PURE__ */ new Map(),
    a = {
      addShadowRoot: function (i) {
        if (!n.has(i)) {
          var o = trackMutation(t, e, a, i),
            s = trackInput(e, t, i),
            c = trackScroll(e, t, r, i);
          n.set(i, {
            flush: function () {
              return o.flush();
            },
            stop: function () {
              (o.stop(), s.stop(), c.stop());
            },
          });
        }
      },
      removeShadowRoot: function (i) {
        var o = n.get(i);
        o && (o.stop(), n.delete(i));
      },
      stop: function () {
        n.forEach(function (i) {
          var o = i.stop;
          return o();
        });
      },
      flush: function () {
        n.forEach(function (i) {
          var o = i.flush;
          return o();
        });
      },
    };
  return a;
};
function startFullSnapshots(e, t, r, n, a, i) {
  var o = function (c, u) {
    (c === void 0 && (c = timeStampNow()),
      u === void 0 &&
        (u = {
          status: 0,
          elementsScrollPositions: e,
          shadowRootsController: t,
        }));
    var d = getViewportDimension(),
      f = d.width,
      l = d.height,
      p = [
        {
          data: {
            height: l,
            href: window.location.href,
            width: f,
          },
          type: RecordType.Meta,
          timestamp: c,
        },
        {
          data: {
            has_focus: document.hasFocus(),
          },
          type: RecordType.Focus,
          timestamp: c,
        },
        {
          data: {
            node: serializeDocument(document, n, u),
            initialOffset: {
              left: getScrollX(),
              top: getScrollY(),
            },
          },
          type: RecordType.FullSnapshot,
          timestamp: c,
        },
      ];
    return (
      window.visualViewport &&
        p.push({
          data: getVisualViewport(window.visualViewport),
          type: RecordType.VisualViewport,
          timestamp: c,
        }),
      p
    );
  };
  i(o());
  var s = r.subscribe(2, function (c) {
    (a(),
      i(
        o(c.startClocks.timeStamp, {
          shadowRootsController: t,
          status: 1,
          elementsScrollPositions: e,
        }),
      ));
  }).unsubscribe;
  return {
    stop: s,
  };
}
function initRecordIds() {
  var e = /* @__PURE__ */ new WeakMap(),
    t = 1;
  return {
    getIdForEvent: function (r) {
      return (e.has(r) || e.set(r, t++), e.get(r));
    },
  };
}
function record(e) {
  var t = e.emit,
    r = e.configuration,
    n = e.lifeCycle;
  if (!t) throw new Error('emit function is required');
  var a = function (l) {
      (t(l), sendToExtension('record', {record: l}));
      var p = e.viewHistory.findView();
      addRecord(p.id);
    },
    i = createElementsScrollPositions(),
    o = initShadowRootsController(r, a, i),
    s = startFullSnapshots(i, o, n, r, c, function (l) {
      return l.forEach(function (p) {
        return a(p);
      });
    }).stop;
  function c() {
    (o.flush(), d.flush());
  }
  var u = initRecordIds(),
    d = trackMutation(a, r, o, document),
    f = [
      d,
      trackMove(r, a),
      trackMouseInteraction(r, a, u),
      trackScroll(r, a, i, document),
      trackViewportResize(r, a),
      trackInput(r, a),
      trackMediaInteraction(r, a),
      trackStyleSheet(a),
      trackFocus(r, a),
      trackVisualViewportResize(r, a),
      trackFrustration(n, a, u),
      trackViewEnd(n, function (l) {
        (c(), a(l));
      }),
    ];
  return {
    stop: function () {
      (o.stop(),
        f.forEach(function (l) {
          return l.stop();
        }),
        s());
    },
    flushMutations: c,
    shadowRootsController: o,
  };
}
function buildReplayPayload(e, t, r) {
  var n = new FormData();
  n.append(
    'segment',
    new Blob([e], {
      type: 'application/octet-stream',
    }),
    ''.concat(t.session.id, '-').concat(t.start),
  );
  var a = assign(
      {
        raw_segment_size: r,
        compressed_segment_size: e.byteLength,
      },
      t,
    ),
    i = JSON.stringify(a);
  return (n.append('event', new Blob([i], {type: 'application/json'})), {data: n, bytesCount: e.byteLength});
}
function createSegment(e) {
  var t = e.context,
    r = e.creationReason,
    n = e.encoder,
    a = 0,
    i = t.view.id,
    o = assign(
      {
        start: 1 / 0,
        end: -1 / 0,
        creation_reason: r,
        records_count: 0,
        has_full_snapshot: !1,
        index_in_view: getSegmentsCount(i),
        source: 'browser',
      },
      t,
    );
  addSegment(i);
  function s(u, d) {
    ((o.start = Math.min(o.start, u.timestamp)),
      (o.end = Math.max(o.end, u.timestamp)),
      (o.records_count += 1),
      o.has_full_snapshot || (o.has_full_snapshot = u.type === RecordType.FullSnapshot));
    var f = n.isEmpty ? '{"records":[' : ',';
    n.write(f + JSON.stringify(u), function (l) {
      ((a += l), d(a));
    });
  }
  function c(u) {
    if (n.isEmpty) throw new Error('Empty segment flushed');
    (n.write(
      '],'.concat(
        JSON.stringify(o).slice(1),
        `
`,
      ),
    ),
      n.finish(function (d) {
        (addWroteData(o.view.id, d.rawBytesCount), u(o, d));
      }));
  }
  return {addRecord: s, flush: c};
}
var SEGMENT_DURATION_LIMIT = 5 * ONE_SECOND,
  SEGMENT_BYTES_LIMIT = 6e4;
function startSegmentCollection(e, t, r, n, a, i) {
  return doStartSegmentCollection(
    e,
    function () {
      return computeSegmentContext(t.applicationId, r, n);
    },
    a,
    i,
  );
}
function doStartSegmentCollection(e, t, r, n) {
  var a = {
      status: 0,
      nextSegmentCreationReason: 'init',
    },
    i = e.subscribe(2, function () {
      s('view_change');
    }).unsubscribe,
    o = e.subscribe(11, function (c) {
      s(c.reason);
    }).unsubscribe;
  function s(c) {
    (a.status === 1 &&
      (a.segment.flush(function (u, d) {
        var f = buildReplayPayload(d.output, u, d.rawBytesCount);
        isPageExitReason(c) ? r.sendOnExit(f) : r.send(f);
      }),
      clearTimeout(a.expirationTimeoutId)),
      c !== 'stop'
        ? (a = {
            status: 0,
            nextSegmentCreationReason: c,
          })
        : (a = {
            status: 2,
          }));
  }
  return {
    addRecord: function (c) {
      if (a.status !== 2) {
        if (a.status === 0) {
          var u = t();
          if (!u) return;
          a = {
            status: 1,
            segment: createSegment({encoder: n, context: u, creationReason: a.nextSegmentCreationReason}),
            expirationTimeoutId: setTimeout(function () {
              s('segment_duration_limit');
            }, SEGMENT_DURATION_LIMIT),
          };
        }
        a.segment.addRecord(c, function (d) {
          d > SEGMENT_BYTES_LIMIT && s('segment_bytes_limit');
        });
      }
    },
    stop: function () {
      (s('stop'), i(), o());
    },
  };
}
function computeSegmentContext(e, t, r) {
  var n = t.findTrackedSession(),
    a = r.findView();
  if (!(!n || !a))
    return {
      application: {
        id: e,
      },
      session: {
        id: n.id,
      },
      view: {
        id: a.id,
      },
    };
}
function startRecordBridge(e) {
  var t = getEventBridge();
  return {
    addRecord: function (r) {
      var n = e.findView();
      t.send('record', r, n.id);
    },
  };
}
function startRecording(e, t, r, n, a, i) {
  var o = [],
    s = function (l) {
      (e.notify(14, {error: l}), addTelemetryDebug('Error reported to customer', {'error.message': l.message}));
    },
    c = i || createHttpRequest(t.sessionReplayEndpointBuilder, SEGMENT_BYTES_LIMIT, s),
    u;
  if (canUseEventBridge()) u = startRecordBridge(n).addRecord;
  else {
    var d = startSegmentCollection(e, t, r, n, c, a);
    ((u = d.addRecord), o.push(d.stop));
  }
  var f = record({
    emit: u,
    configuration: t,
    lifeCycle: e,
    viewHistory: n,
  }).stop;
  return (
    o.push(f),
    {
      stop: function () {
        o.forEach(function (l) {
          return l();
        });
      },
    }
  );
}
function createDeflateEncoder(e, t, r) {
  var n = 0,
    a = [],
    i,
    o = 0,
    s = [],
    c = addEventListener(e, t, 'message', function (f) {
      var l = f.data;
      if (!(l.type !== 'wrote' || l.streamId !== r)) {
        ((n += l.additionalBytesCount), a.push(l.result), (i = l.trailer));
        var p = s.shift();
        p && p.id === l.id
          ? p.writeCallback
            ? p.writeCallback(l.result.byteLength)
            : p.finishCallback && p.finishCallback()
          : (c(), addTelemetryDebug('Worker responses received out of order.'));
      }
    }).stop;
  function u() {
    var f = a.length === 0 ? new Uint8Array(0) : concatBuffers(a.concat(i)),
      l = {
        rawBytesCount: n,
        output: f,
        outputBytesCount: f.byteLength,
        encoding: 'deflate',
      };
    return ((n = 0), (a = []), l);
  }
  function d() {
    o > 0 &&
      (t.postMessage({
        action: 'reset',
        streamId: r,
      }),
      (o = 0));
  }
  return {
    isAsync: !0,
    get isEmpty() {
      return o === 0;
    },
    write: function (f, l) {
      (t.postMessage({
        action: 'write',
        id: o,
        data: f,
        streamId: r,
      }),
        s.push({
          id: o,
          writeCallback: l,
          data: f,
        }),
        (o += 1));
    },
    finish: function (f) {
      (d(),
        s.length
          ? (s.forEach(function (l) {
              delete l.writeCallback;
            }),
            (s[s.length - 1].finishCallback = function () {
              return f(u());
            }))
          : f(u()));
    },
    finishSync: function () {
      d();
      var f = s
        .map(function (l) {
          return (delete l.writeCallback, delete l.finishCallback, l.data);
        })
        .join('');
      return assign(u(), {
        pendingData: f,
      });
    },
    estimateEncodedBytesCount: function (f) {
      return f.length / 8;
    },
    stop: function () {
      c();
    },
  };
}
var INITIALIZATION_TIME_OUT_DELAY = 30 * ONE_SECOND;
function createDeflateWorker(e) {
  return new Worker(
    e.workerUrl ||
      URL.createObjectURL(
        new Blob([
          '!function(){"use strict";function t(t){for(var e=t.reduce((function(t,e){return t+e.length}),0),a=new Uint8Array(e),n=0,r=0,i=t;r<i.length;r++){var s=i[r];a.set(s,n),n+=s.length}return a}function e(t){for(var e=t.length;--e>=0;)t[e]=0}var a=256,n=286,r=30,i=15,s=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),h=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),l=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),_=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=new Array(576);e(o);var d=new Array(60);e(d);var u=new Array(512);e(u);var f=new Array(256);e(f);var c=new Array(29);e(c);var p,g,w,v=new Array(r);function b(t,e,a,n,r){this.static_tree=t,this.extra_bits=e,this.extra_base=a,this.elems=n,this.max_length=r,this.has_stree=t&&t.length}function m(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}e(v);var y=function(t){return t<256?u[t]:u[256+(t>>>7)]},k=function(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255},z=function(t,e,a){t.bi_valid>16-a?(t.bi_buf|=e<<t.bi_valid&65535,k(t,t.bi_buf),t.bi_buf=e>>16-t.bi_valid,t.bi_valid+=a-16):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=a)},x=function(t,e,a){z(t,a[2*e],a[2*e+1])},A=function(t,e){var a=0;do{a|=1&t,t>>>=1,a<<=1}while(--e>0);return a>>>1},U=function(t,e,a){var n,r,s=new Array(16),h=0;for(n=1;n<=i;n++)s[n]=h=h+a[n-1]<<1;for(r=0;r<=e;r++){var l=t[2*r+1];0!==l&&(t[2*r]=A(s[l]++,l))}},I=function(t){var e;for(e=0;e<n;e++)t.dyn_ltree[2*e]=0;for(e=0;e<r;e++)t.dyn_dtree[2*e]=0;for(e=0;e<19;e++)t.bl_tree[2*e]=0;t.dyn_ltree[512]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0},B=function(t){t.bi_valid>8?k(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0},E=function(t,e,a,n){var r=2*e,i=2*a;return t[r]<t[i]||t[r]===t[i]&&n[e]<=n[a]},S=function(t,e,a){for(var n=t.heap[a],r=a<<1;r<=t.heap_len&&(r<t.heap_len&&E(e,t.heap[r+1],t.heap[r],t.depth)&&r++,!E(e,n,t.heap[r],t.depth));)t.heap[a]=t.heap[r],a=r,r<<=1;t.heap[a]=n},C=function(t,e,n){var r,i,l,_,o=0;if(0!==t.last_lit)do{r=t.pending_buf[t.d_buf+2*o]<<8|t.pending_buf[t.d_buf+2*o+1],i=t.pending_buf[t.l_buf+o],o++,0===r?x(t,i,e):(l=f[i],x(t,l+a+1,e),0!==(_=s[l])&&(i-=c[l],z(t,i,_)),r--,l=y(r),x(t,l,n),0!==(_=h[l])&&(r-=v[l],z(t,r,_)))}while(o<t.last_lit);x(t,256,e)},D=function(t,e){var a,n,r,s=e.dyn_tree,h=e.stat_desc.static_tree,l=e.stat_desc.has_stree,_=e.stat_desc.elems,o=-1;for(t.heap_len=0,t.heap_max=573,a=0;a<_;a++)0!==s[2*a]?(t.heap[++t.heap_len]=o=a,t.depth[a]=0):s[2*a+1]=0;for(;t.heap_len<2;)s[2*(r=t.heap[++t.heap_len]=o<2?++o:0)]=1,t.depth[r]=0,t.opt_len--,l&&(t.static_len-=h[2*r+1]);for(e.max_code=o,a=t.heap_len>>1;a>=1;a--)S(t,s,a);r=_;do{a=t.heap[1],t.heap[1]=t.heap[t.heap_len--],S(t,s,1),n=t.heap[1],t.heap[--t.heap_max]=a,t.heap[--t.heap_max]=n,s[2*r]=s[2*a]+s[2*n],t.depth[r]=(t.depth[a]>=t.depth[n]?t.depth[a]:t.depth[n])+1,s[2*a+1]=s[2*n+1]=r,t.heap[1]=r++,S(t,s,1)}while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],function(t,e){var a,n,r,s,h,l,_=e.dyn_tree,o=e.max_code,d=e.stat_desc.static_tree,u=e.stat_desc.has_stree,f=e.stat_desc.extra_bits,c=e.stat_desc.extra_base,p=e.stat_desc.max_length,g=0;for(s=0;s<=i;s++)t.bl_count[s]=0;for(_[2*t.heap[t.heap_max]+1]=0,a=t.heap_max+1;a<573;a++)(s=_[2*_[2*(n=t.heap[a])+1]+1]+1)>p&&(s=p,g++),_[2*n+1]=s,n>o||(t.bl_count[s]++,h=0,n>=c&&(h=f[n-c]),l=_[2*n],t.opt_len+=l*(s+h),u&&(t.static_len+=l*(d[2*n+1]+h)));if(0!==g){do{for(s=p-1;0===t.bl_count[s];)s--;t.bl_count[s]--,t.bl_count[s+1]+=2,t.bl_count[p]--,g-=2}while(g>0);for(s=p;0!==s;s--)for(n=t.bl_count[s];0!==n;)(r=t.heap[--a])>o||(_[2*r+1]!==s&&(t.opt_len+=(s-_[2*r+1])*_[2*r],_[2*r+1]=s),n--)}}(t,e),U(s,o,t.bl_count)},j=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),e[2*(a+1)+1]=65535,n=0;n<=a;n++)r=s,s=e[2*(n+1)+1],++h<l&&r===s||(h<_?t.bl_tree[2*r]+=h:0!==r?(r!==i&&t.bl_tree[2*r]++,t.bl_tree[32]++):h<=10?t.bl_tree[34]++:t.bl_tree[36]++,h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4))},M=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),n=0;n<=a;n++)if(r=s,s=e[2*(n+1)+1],!(++h<l&&r===s)){if(h<_)do{x(t,r,t.bl_tree)}while(0!=--h);else 0!==r?(r!==i&&(x(t,r,t.bl_tree),h--),x(t,16,t.bl_tree),z(t,h-3,2)):h<=10?(x(t,17,t.bl_tree),z(t,h-3,3)):(x(t,18,t.bl_tree),z(t,h-11,7));h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4)}},L=!1,T=function(t,e,a,n){z(t,0+(n?1:0),3),function(t,e,a,n){B(t),n&&(k(t,a),k(t,~a)),t.pending_buf.set(t.window.subarray(e,e+a),t.pending),t.pending+=a}(t,e,a,!0)},H=function(t,e,n,r){var i,s,h=0;t.level>0?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,n=4093624447;for(e=0;e<=31;e++,n>>>=1)if(1&n&&0!==t.dyn_ltree[2*e])return 0;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return 1;for(e=32;e<a;e++)if(0!==t.dyn_ltree[2*e])return 1;return 0}(t)),D(t,t.l_desc),D(t,t.d_desc),h=function(t){var e;for(j(t,t.dyn_ltree,t.l_desc.max_code),j(t,t.dyn_dtree,t.d_desc.max_code),D(t,t.bl_desc),e=18;e>=3&&0===t.bl_tree[2*_[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),i=t.opt_len+3+7>>>3,(s=t.static_len+3+7>>>3)<=i&&(i=s)):i=s=n+5,n+4<=i&&-1!==e?T(t,e,n,r):4===t.strategy||s===i?(z(t,2+(r?1:0),3),C(t,o,d)):(z(t,4+(r?1:0),3),function(t,e,a,n){var r;for(z(t,e-257,5),z(t,a-1,5),z(t,n-4,4),r=0;r<n;r++)z(t,t.bl_tree[2*_[r]+1],3);M(t,t.dyn_ltree,e-1),M(t,t.dyn_dtree,a-1)}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,h+1),C(t,t.dyn_ltree,t.dyn_dtree)),I(t),r&&B(t)},R={_tr_init:function(t){L||(!function(){var t,e,a,_,m,y=new Array(16);for(a=0,_=0;_<28;_++)for(c[_]=a,t=0;t<1<<s[_];t++)f[a++]=_;for(f[a-1]=_,m=0,_=0;_<16;_++)for(v[_]=m,t=0;t<1<<h[_];t++)u[m++]=_;for(m>>=7;_<r;_++)for(v[_]=m<<7,t=0;t<1<<h[_]-7;t++)u[256+m++]=_;for(e=0;e<=i;e++)y[e]=0;for(t=0;t<=143;)o[2*t+1]=8,t++,y[8]++;for(;t<=255;)o[2*t+1]=9,t++,y[9]++;for(;t<=279;)o[2*t+1]=7,t++,y[7]++;for(;t<=287;)o[2*t+1]=8,t++,y[8]++;for(U(o,287,y),t=0;t<r;t++)d[2*t+1]=5,d[2*t]=A(t,5);p=new b(o,s,257,n,i),g=new b(d,h,0,r,i),w=new b(new Array(0),l,0,19,7)}(),L=!0),t.l_desc=new m(t.dyn_ltree,p),t.d_desc=new m(t.dyn_dtree,g),t.bl_desc=new m(t.bl_tree,w),t.bi_buf=0,t.bi_valid=0,I(t)},_tr_stored_block:T,_tr_flush_block:H,_tr_tally:function(t,e,n){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&n,t.last_lit++,0===e?t.dyn_ltree[2*n]++:(t.matches++,e--,t.dyn_ltree[2*(f[n]+a+1)]++,t.dyn_dtree[2*y(e)]++),t.last_lit===t.lit_bufsize-1},_tr_align:function(t){z(t,2,3),x(t,256,o),function(t){16===t.bi_valid?(k(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}(t)}},K=function(t,e,a,n){for(var r=65535&t,i=t>>>16&65535,s=0;0!==a;){a-=s=a>2e3?2e3:a;do{i=i+(r=r+e[n++]|0)|0}while(--s);r%=65521,i%=65521}return r|i<<16},N=new Uint32Array(function(){for(var t,e=[],a=0;a<256;a++){t=a;for(var n=0;n<8;n++)t=1&t?3988292384^t>>>1:t>>>1;e[a]=t}return e}()),O=function(t,e,a,n){var r=N,i=n+a;t^=-1;for(var s=n;s<i;s++)t=t>>>8^r[255&(t^e[s])];return~t},q={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},F=0,G=2,J=3,P=4,Q=0,V=1,W=-1,X=0,Y=8,Z=R._tr_init,$=R._tr_stored_block,tt=R._tr_flush_block,et=R._tr_tally,at=R._tr_align,nt=F,rt=1,it=J,st=P,ht=5,lt=Q,_t=V,ot=-2,dt=-3,ut=-5,ft=W,ct=1,pt=2,gt=3,wt=4,vt=X,bt=2,mt=Y,yt=258,kt=262,zt=103,xt=113,At=666,Ut=function(t,e){return t.msg=q[e],e},It=function(t){return(t<<1)-(t>4?9:0)},Bt=function(t){for(var e=t.length;--e>=0;)t[e]=0},Et=function(t,e,a){return(e<<t.hash_shift^a)&t.hash_mask},St=function(t){var e=t.state,a=e.pending;a>t.avail_out&&(a=t.avail_out),0!==a&&(t.output.set(e.pending_buf.subarray(e.pending_out,e.pending_out+a),t.next_out),t.next_out+=a,e.pending_out+=a,t.total_out+=a,t.avail_out-=a,e.pending-=a,0===e.pending&&(e.pending_out=0))},Ct=function(t,e){tt(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,St(t.strm)},Dt=function(t,e){t.pending_buf[t.pending++]=e},jt=function(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e},Mt=function(t,e){var a,n,r=t.max_chain_length,i=t.strstart,s=t.prev_length,h=t.nice_match,l=t.strstart>t.w_size-kt?t.strstart-(t.w_size-kt):0,_=t.window,o=t.w_mask,d=t.prev,u=t.strstart+yt,f=_[i+s-1],c=_[i+s];t.prev_length>=t.good_match&&(r>>=2),h>t.lookahead&&(h=t.lookahead);do{if(_[(a=e)+s]===c&&_[a+s-1]===f&&_[a]===_[i]&&_[++a]===_[i+1]){i+=2,a++;do{}while(_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&i<u);if(n=yt-(u-i),i=u-yt,n>s){if(t.match_start=e,s=n,n>=h)break;f=_[i+s-1],c=_[i+s]}}}while((e=d[e&o])>l&&0!=--r);return s<=t.lookahead?s:t.lookahead},Lt=function(t){var e,a,n,r,i,s,h,l,_,o,d=t.w_size;do{if(r=t.window_size-t.lookahead-t.strstart,t.strstart>=d+(d-kt)){t.window.set(t.window.subarray(d,d+d),0),t.match_start-=d,t.strstart-=d,t.block_start-=d,e=a=t.hash_size;do{n=t.head[--e],t.head[e]=n>=d?n-d:0}while(--a);e=a=d;do{n=t.prev[--e],t.prev[e]=n>=d?n-d:0}while(--a);r+=d}if(0===t.strm.avail_in)break;if(s=t.strm,h=t.window,l=t.strstart+t.lookahead,_=r,o=void 0,(o=s.avail_in)>_&&(o=_),a=0===o?0:(s.avail_in-=o,h.set(s.input.subarray(s.next_in,s.next_in+o),l),1===s.state.wrap?s.adler=K(s.adler,h,o,l):2===s.state.wrap&&(s.adler=O(s.adler,h,o,l)),s.next_in+=o,s.total_in+=o,o),t.lookahead+=a,t.lookahead+t.insert>=3)for(i=t.strstart-t.insert,t.ins_h=t.window[i],t.ins_h=Et(t,t.ins_h,t.window[i+1]);t.insert&&(t.ins_h=Et(t,t.ins_h,t.window[i+3-1]),t.prev[i&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=i,i++,t.insert--,!(t.lookahead+t.insert<3)););}while(t.lookahead<kt&&0!==t.strm.avail_in)},Tt=function(t,e){for(var a,n;;){if(t.lookahead<kt){if(Lt(t),t.lookahead<kt&&e===nt)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==a&&t.strstart-a<=t.w_size-kt&&(t.match_length=Mt(t,a)),t.match_length>=3)if(n=et(t,t.strstart-t.match_start,t.match_length-3),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=3){t.match_length--;do{t.strstart++,t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart}while(0!=--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=Et(t,t.ins_h,t.window[t.strstart+1]);else n=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(n&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=t.strstart<2?t.strstart:2,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2},Ht=function(t,e){for(var a,n,r;;){if(t.lookahead<kt){if(Lt(t),t.lookahead<kt&&e===nt)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=2,0!==a&&t.prev_length<t.max_lazy_match&&t.strstart-a<=t.w_size-kt&&(t.match_length=Mt(t,a),t.match_length<=5&&(t.strategy===ct||3===t.match_length&&t.strstart-t.match_start>4096)&&(t.match_length=2)),t.prev_length>=3&&t.match_length<=t.prev_length){r=t.strstart+t.lookahead-3,n=et(t,t.strstart-1-t.prev_match,t.prev_length-3),t.lookahead-=t.prev_length-1,t.prev_length-=2;do{++t.strstart<=r&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart)}while(0!=--t.prev_length);if(t.match_available=0,t.match_length=2,t.strstart++,n&&(Ct(t,!1),0===t.strm.avail_out))return 1}else if(t.match_available){if((n=et(t,0,t.window[t.strstart-1]))&&Ct(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return 1}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(n=et(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<2?t.strstart:2,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2};function Rt(t,e,a,n,r){this.good_length=t,this.max_lazy=e,this.nice_length=a,this.max_chain=n,this.func=r}var Kt=[new Rt(0,0,0,0,(function(t,e){var a=65535;for(a>t.pending_buf_size-5&&(a=t.pending_buf_size-5);;){if(t.lookahead<=1){if(Lt(t),0===t.lookahead&&e===nt)return 1;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var n=t.block_start+a;if((0===t.strstart||t.strstart>=n)&&(t.lookahead=t.strstart-n,t.strstart=n,Ct(t,!1),0===t.strm.avail_out))return 1;if(t.strstart-t.block_start>=t.w_size-kt&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):(t.strstart>t.block_start&&(Ct(t,!1),t.strm.avail_out),1)})),new Rt(4,4,8,4,Tt),new Rt(4,5,16,8,Tt),new Rt(4,6,32,32,Tt),new Rt(4,4,16,16,Ht),new Rt(8,16,32,32,Ht),new Rt(8,16,128,128,Ht),new Rt(8,32,128,256,Ht),new Rt(32,128,258,1024,Ht),new Rt(32,258,258,4096,Ht)];function Nt(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=mt,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),Bt(this.dyn_ltree),Bt(this.dyn_dtree),Bt(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),Bt(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),Bt(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var Ot=function(t){if(!t||!t.state)return Ut(t,ot);t.total_in=t.total_out=0,t.data_type=bt;var e=t.state;return e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?42:xt,t.adler=2===e.wrap?0:1,e.last_flush=nt,Z(e),lt},qt=function(t){var e,a=Ot(t);return a===lt&&((e=t.state).window_size=2*e.w_size,Bt(e.head),e.max_lazy_match=Kt[e.level].max_lazy,e.good_match=Kt[e.level].good_length,e.nice_match=Kt[e.level].nice_length,e.max_chain_length=Kt[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0),a},Ft=function(t,e,a,n,r,i){if(!t)return ot;var s=1;if(e===ft&&(e=6),n<0?(s=0,n=-n):n>15&&(s=2,n-=16),r<1||r>9||a!==mt||n<8||n>15||e<0||e>9||i<0||i>wt)return Ut(t,ot);8===n&&(n=9);var h=new Nt;return t.state=h,h.strm=t,h.wrap=s,h.gzhead=null,h.w_bits=n,h.w_size=1<<h.w_bits,h.w_mask=h.w_size-1,h.hash_bits=r+7,h.hash_size=1<<h.hash_bits,h.hash_mask=h.hash_size-1,h.hash_shift=~~((h.hash_bits+3-1)/3),h.window=new Uint8Array(2*h.w_size),h.head=new Uint16Array(h.hash_size),h.prev=new Uint16Array(h.w_size),h.lit_bufsize=1<<r+6,h.pending_buf_size=4*h.lit_bufsize,h.pending_buf=new Uint8Array(h.pending_buf_size),h.d_buf=1*h.lit_bufsize,h.l_buf=3*h.lit_bufsize,h.level=e,h.strategy=i,h.method=a,qt(t)},Gt={deflateInit:function(t,e){return Ft(t,e,mt,15,8,vt)},deflateInit2:Ft,deflateReset:qt,deflateResetKeep:Ot,deflateSetHeader:function(t,e){return t&&t.state?2!==t.state.wrap?ot:(t.state.gzhead=e,lt):ot},deflate:function(t,e){var a,n;if(!t||!t.state||e>ht||e<0)return t?Ut(t,ot):ot;var r=t.state;if(!t.output||!t.input&&0!==t.avail_in||r.status===At&&e!==st)return Ut(t,0===t.avail_out?ut:ot);r.strm=t;var i=r.last_flush;if(r.last_flush=e,42===r.status)if(2===r.wrap)t.adler=0,Dt(r,31),Dt(r,139),Dt(r,8),r.gzhead?(Dt(r,(r.gzhead.text?1:0)+(r.gzhead.hcrc?2:0)+(r.gzhead.extra?4:0)+(r.gzhead.name?8:0)+(r.gzhead.comment?16:0)),Dt(r,255&r.gzhead.time),Dt(r,r.gzhead.time>>8&255),Dt(r,r.gzhead.time>>16&255),Dt(r,r.gzhead.time>>24&255),Dt(r,9===r.level?2:r.strategy>=pt||r.level<2?4:0),Dt(r,255&r.gzhead.os),r.gzhead.extra&&r.gzhead.extra.length&&(Dt(r,255&r.gzhead.extra.length),Dt(r,r.gzhead.extra.length>>8&255)),r.gzhead.hcrc&&(t.adler=O(t.adler,r.pending_buf,r.pending,0)),r.gzindex=0,r.status=69):(Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,9===r.level?2:r.strategy>=pt||r.level<2?4:0),Dt(r,3),r.status=xt);else{var s=mt+(r.w_bits-8<<4)<<8;s|=(r.strategy>=pt||r.level<2?0:r.level<6?1:6===r.level?2:3)<<6,0!==r.strstart&&(s|=32),s+=31-s%31,r.status=xt,jt(r,s),0!==r.strstart&&(jt(r,t.adler>>>16),jt(r,65535&t.adler)),t.adler=1}if(69===r.status)if(r.gzhead.extra){for(a=r.pending;r.gzindex<(65535&r.gzhead.extra.length)&&(r.pending!==r.pending_buf_size||(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending!==r.pending_buf_size));)Dt(r,255&r.gzhead.extra[r.gzindex]),r.gzindex++;r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),r.gzindex===r.gzhead.extra.length&&(r.gzindex=0,r.status=73)}else r.status=73;if(73===r.status)if(r.gzhead.name){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.name.length?255&r.gzhead.name.charCodeAt(r.gzindex++):0,Dt(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.gzindex=0,r.status=91)}else r.status=91;if(91===r.status)if(r.gzhead.comment){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.comment.length?255&r.gzhead.comment.charCodeAt(r.gzindex++):0,Dt(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.status=zt)}else r.status=zt;if(r.status===zt&&(r.gzhead.hcrc?(r.pending+2>r.pending_buf_size&&St(t),r.pending+2<=r.pending_buf_size&&(Dt(r,255&t.adler),Dt(r,t.adler>>8&255),t.adler=0,r.status=xt)):r.status=xt),0!==r.pending){if(St(t),0===t.avail_out)return r.last_flush=-1,lt}else if(0===t.avail_in&&It(e)<=It(i)&&e!==st)return Ut(t,ut);if(r.status===At&&0!==t.avail_in)return Ut(t,ut);if(0!==t.avail_in||0!==r.lookahead||e!==nt&&r.status!==At){var h=r.strategy===pt?function(t,e){for(var a;;){if(0===t.lookahead&&(Lt(t),0===t.lookahead)){if(e===nt)return 1;break}if(t.match_length=0,a=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,a&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2}(r,e):r.strategy===gt?function(t,e){for(var a,n,r,i,s=t.window;;){if(t.lookahead<=yt){if(Lt(t),t.lookahead<=yt&&e===nt)return 1;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=3&&t.strstart>0&&(n=s[r=t.strstart-1])===s[++r]&&n===s[++r]&&n===s[++r]){i=t.strstart+yt;do{}while(n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&r<i);t.match_length=yt-(i-r),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=3?(a=et(t,1,t.match_length-3),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(a=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),a&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2}(r,e):Kt[r.level].func(r,e);if(3!==h&&4!==h||(r.status=At),1===h||3===h)return 0===t.avail_out&&(r.last_flush=-1),lt;if(2===h&&(e===rt?at(r):e!==ht&&($(r,0,0,!1),e===it&&(Bt(r.head),0===r.lookahead&&(r.strstart=0,r.block_start=0,r.insert=0))),St(t),0===t.avail_out))return r.last_flush=-1,lt}return e!==st?lt:r.wrap<=0?_t:(2===r.wrap?(Dt(r,255&t.adler),Dt(r,t.adler>>8&255),Dt(r,t.adler>>16&255),Dt(r,t.adler>>24&255),Dt(r,255&t.total_in),Dt(r,t.total_in>>8&255),Dt(r,t.total_in>>16&255),Dt(r,t.total_in>>24&255)):(jt(r,t.adler>>>16),jt(r,65535&t.adler)),St(t),r.wrap>0&&(r.wrap=-r.wrap),0!==r.pending?lt:_t)},deflateEnd:function(t){if(!t||!t.state)return ot;var e=t.state.status;return 42!==e&&69!==e&&73!==e&&91!==e&&e!==zt&&e!==xt&&e!==At?Ut(t,ot):(t.state=null,e===xt?Ut(t,dt):lt)},deflateSetDictionary:function(t,e){var a=e.length;if(!t||!t.state)return ot;var n=t.state,r=n.wrap;if(2===r||1===r&&42!==n.status||n.lookahead)return ot;if(1===r&&(t.adler=K(t.adler,e,a,0)),n.wrap=0,a>=n.w_size){0===r&&(Bt(n.head),n.strstart=0,n.block_start=0,n.insert=0);var i=new Uint8Array(n.w_size);i.set(e.subarray(a-n.w_size,a),0),e=i,a=n.w_size}var s=t.avail_in,h=t.next_in,l=t.input;for(t.avail_in=a,t.next_in=0,t.input=e,Lt(n);n.lookahead>=3;){var _=n.strstart,o=n.lookahead-2;do{n.ins_h=Et(n,n.ins_h,n.window[_+3-1]),n.prev[_&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=_,_++}while(--o);n.strstart=_,n.lookahead=2,Lt(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=2,n.match_available=0,t.next_in=h,t.input=l,t.avail_in=s,n.wrap=r,lt},deflateInfo:"pako deflate (from Nodeca project)"};for(var Jt=new Uint8Array(256),Pt=0;Pt<256;Pt++)Jt[Pt]=Pt>=252?6:Pt>=248?5:Pt>=240?4:Pt>=224?3:Pt>=192?2:1;Jt[254]=Jt[254]=1;var Qt=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0},Vt=Object.prototype.toString,Wt=F,Xt=G,Yt=J,Zt=P,$t=Q,te=V,ee=W,ae=X,ne=Y;function re(){this.options={level:ee,method:ne,chunkSize:16384,windowBits:15,memLevel:8,strategy:ae};var t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qt,this.strm.avail_out=0;var e=Gt.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(e!==$t)throw new Error(q[e]);if(t.header&&Gt.deflateSetHeader(this.strm,t.header),t.dictionary){var a;if(a="[object ArrayBuffer]"===Vt.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(e=Gt.deflateSetDictionary(this.strm,a))!==$t)throw new Error(q[e]);this._dict_set=!0}}function ie(t,e,a){try{t.postMessage({type:"errored",error:e,streamId:a})}catch(n){t.postMessage({type:"errored",error:String(e),streamId:a})}}function se(t){var e=t.strm.adler;return new Uint8Array([3,0,e>>>24&255,e>>>16&255,e>>>8&255,255&e])}re.prototype.push=function(t,e){var a,n,r=this.strm,i=this.options.chunkSize;if(this.ended)return!1;for(n=e===~~e?e:!0===e?Zt:Wt,"[object ArrayBuffer]"===Vt.call(t)?r.input=new Uint8Array(t):r.input=t,r.next_in=0,r.avail_in=r.input.length;;)if(0===r.avail_out&&(r.output=new Uint8Array(i),r.next_out=0,r.avail_out=i),(n===Xt||n===Yt)&&r.avail_out<=6)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else{if((a=Gt.deflate(r,n))===te)return r.next_out>0&&this.onData(r.output.subarray(0,r.next_out)),a=Gt.deflateEnd(this.strm),this.onEnd(a),this.ended=!0,a===$t;if(0!==r.avail_out){if(n>0&&r.next_out>0)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else if(0===r.avail_in)break}else this.onData(r.output)}return!0},re.prototype.onData=function(t){this.chunks.push(t)},re.prototype.onEnd=function(t){t===$t&&(this.result=function(t){for(var e=0,a=0,n=t.length;a<n;a++)e+=t[a].length;for(var r=new Uint8Array(e),i=0,s=0,h=t.length;i<h;i++){var l=t[i];r.set(l,s),s+=l.length}return r}(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},function(e){void 0===e&&(e=self);try{var a=new Map;e.addEventListener("message",(function(n){try{var r=function(e,a){switch(a.action){case"init":return{type:"initialized",version:"5.35.1"};case"write":var n=e.get(a.streamId);n||(n=new re,e.set(a.streamId,n));var r=n.chunks.length,i=function(t){if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(t);var e,a,n,r,i,s=t.length,h=0;for(r=0;r<s;r++)55296==(64512&(a=t.charCodeAt(r)))&&r+1<s&&56320==(64512&(n=t.charCodeAt(r+1)))&&(a=65536+(a-55296<<10)+(n-56320),r++),h+=a<128?1:a<2048?2:a<65536?3:4;for(e=new Uint8Array(h),i=0,r=0;i<h;r++)55296==(64512&(a=t.charCodeAt(r)))&&r+1<s&&56320==(64512&(n=t.charCodeAt(r+1)))&&(a=65536+(a-55296<<10)+(n-56320),r++),a<128?e[i++]=a:a<2048?(e[i++]=192|a>>>6,e[i++]=128|63&a):a<65536?(e[i++]=224|a>>>12,e[i++]=128|a>>>6&63,e[i++]=128|63&a):(e[i++]=240|a>>>18,e[i++]=128|a>>>12&63,e[i++]=128|a>>>6&63,e[i++]=128|63&a);return e}(a.data);return n.push(i,G),{type:"wrote",id:a.id,streamId:a.streamId,result:t(n.chunks.slice(r)),trailer:se(n),additionalBytesCount:i.length};case"reset":e.delete(a.streamId)}}(a,n.data);r&&e.postMessage(r)}catch(t){ie(e,t,n.data&&"streamId"in n.data?n.data.streamId:void 0)}}))}catch(t){ie(e,t)}}()}();',
        ]),
      ),
  );
}
var state = {
  status: 0,
  /* DeflateWorkerStatus.Nil */
};
function startDeflateWorker(e, t, r, n) {
  switch (
    (n === void 0 && (n = createDeflateWorker), state.status === 0 && doStartDeflateWorker(e, t, n), state.status)
  ) {
    case 1:
      return (state.initializationFailureCallbacks.push(r), state.worker);
    case 3:
      return state.worker;
  }
}
function getDeflateWorkerStatus() {
  return state.status;
}
function doStartDeflateWorker(e, t, r) {
  r === void 0 && (r = createDeflateWorker);
  try {
    var n = r(e),
      a = addEventListener(e, n, 'error', function (s) {
        onError(e, t, s);
      }).stop,
      i = addEventListener(e, n, 'message', function (s) {
        var c = s.data;
        c.type === 'errored'
          ? onError(e, t, c.error, c.streamId)
          : c.type === 'initialized' && onInitialized(c.version);
      }).stop;
    (n.postMessage({action: 'init'}),
      setTimeout(function () {
        return onTimeout(t);
      }, INITIALIZATION_TIME_OUT_DELAY));
    var o = function () {
      (a(), i());
    };
    state = {status: 1, worker: n, stop: o, initializationFailureCallbacks: []};
  } catch (s) {
    onError(e, t, s);
  }
}
function onTimeout(e) {
  state.status === 1 &&
    (display.error(''.concat(e, ' failed to start: a timeout occurred while initializing the Worker')),
    state.initializationFailureCallbacks.forEach(function (t) {
      return t();
    }),
    (state = {
      status: 2,
      /* DeflateWorkerStatus.Error */
    }));
}
function onInitialized(e) {
  state.status === 1 && (state = {status: 3, worker: state.worker, stop: state.stop, version: e});
}
function onError(e, t, r, n) {
  if (state.status === 1 || state.status === 0) {
    if (
      (display.error(''.concat(t, ' failed to start: an error occurred while creating the Worker:'), r),
      r instanceof Event || (r instanceof Error && isMessageCspRelated(r.message)))
    ) {
      var a = void 0;
      (e.workerUrl
        ? (a = 'Please make sure the Worker URL '.concat(e.workerUrl, ' is correct and CSP is correctly configured.'))
        : (a = 'Please make sure CSP is correctly configured.'),
        display.error(
          ''
            .concat(a, ' See documentation at ')
            .concat(
              DOCS_ORIGIN,
              '/integrations/content_security_policy_logs/#use-csp-with-real-user-monitoring-and-session-replay',
            ),
        ));
    } else addTelemetryError(r);
    (state.status === 1 &&
      state.initializationFailureCallbacks.forEach(function (i) {
        return i();
      }),
      (state = {
        status: 2,
        /* DeflateWorkerStatus.Error */
      }));
  } else
    addTelemetryError(r, {
      worker_version: state.status === 3 && state.version,
      stream_id: n,
    });
}
function isMessageCspRelated(e) {
  return (
    includes(e, 'Content Security Policy') || // Related to `require-trusted-types-for` CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for
    includes(e, "requires 'TrustedScriptURL'")
  );
}
function isBrowserSupported() {
  return (
    // Array.from is a bit less supported by browsers than CSSSupportsRule, but has higher chances
    // to be polyfilled. Test for both to be more confident. We could add more things if we find out
    // this test is not sufficient.
    typeof Array.from == 'function' &&
    typeof CSSSupportsRule == 'function' &&
    typeof URL.createObjectURL == 'function' &&
    'forEach' in NodeList.prototype
  );
}
function getSessionReplayLink(e, t, r, n) {
  var a = t.findTrackedSession(),
    i = getErrorType(a, n),
    o = r.findView();
  return getSessionReplayUrl(e, {
    viewContext: o,
    errorType: i,
    session: a,
  });
}
function getErrorType(e, t) {
  if (!isBrowserSupported()) return 'browser-not-supported';
  if (!e) return 'rum-not-tracked';
  if (e.sessionReplay === 0) return 'incorrect-session-plan';
  if (!t) return 'replay-not-started';
}
function createPostStartStrategy(e, t, r, n, a, i) {
  var o = 0;
  (t.subscribe(9, function () {
    (o === 2 || o === 3) && (c(), (o = 1));
  }),
    t.subscribe(11, function (d) {
      d.reason === PageExitReason.UNLOADING && c();
    }),
    t.subscribe(10, function () {
      o === 1 && s();
    }));
  function s(d) {
    var f = r.findTrackedSession();
    if (canStartRecording(f, d)) {
      o = 1;
      return;
    }
    isRecordingInProgress(o) ||
      ((o = 2),
      runOnReadyState(e, 'interactive', function () {
        if (o === 2) {
          var l = i();
          if (!l) {
            o = 0;
            return;
          }
          ((u = a(t, e, r, n, l).stop), (o = 3));
        }
      }),
      shouldForceReplay(f, d) && r.setForcedReplay());
  }
  function c() {
    (o !== 0 && o === 3 && u?.(), (o = 0));
  }
  var u;
  return {
    start: s,
    stop: c,
    getSessionReplayLink: function () {
      return getSessionReplayLink(
        e,
        r,
        n,
        o !== 0,
        /* RecorderStatus.Stopped */
      );
    },
    isRecording: function () {
      return o === 3;
    },
  };
}
function canStartRecording(e, t) {
  return !e || (e.sessionReplay === 0 && (!t || !t.force));
}
function isRecordingInProgress(e) {
  return e === 2 || e === 3;
}
function shouldForceReplay(e, t) {
  return t && t.force && e.sessionReplay === 0;
}
function createPreStartStrategy() {
  var e = 0;
  return {
    strategy: {
      start: function () {
        e = 1;
      },
      stop: function () {
        e = 2;
      },
      isRecording: function () {
        return !1;
      },
      getSessionReplayLink: noop,
    },
    shouldStartImmediately: function (t) {
      return e === 1 || (e === 0 && !t.startSessionReplayRecordingManually);
    },
  };
}
function makeRecorderApi(e, t) {
  if (
    (canUseEventBridge() &&
      !bridgeSupports(
        'records',
        /* BridgeCapability.RECORDS */
      )) ||
    !isBrowserSupported()
  )
    return {
      start: noop,
      stop: noop,
      getReplayStats: function () {},
      onRumStart: noop,
      isRecording: function () {
        return !1;
      },
      getSessionReplayLink: function () {},
    };
  var r = createPreStartStrategy(),
    n = r.strategy,
    a = r.shouldStartImmediately;
  return {
    start: function (o) {
      return n.start(o);
    },
    stop: function () {
      return n.stop();
    },
    getSessionReplayLink: function () {
      return n.getSessionReplayLink();
    },
    onRumStart: i,
    isRecording: function () {
      return getDeflateWorkerStatus() === 3 && n.isRecording();
    },
    getReplayStats: function (o) {
      return getDeflateWorkerStatus() === 3 ? getReplayStats(o) : void 0;
    },
  };
  function i(o, s, c, u, d) {
    var f;
    function l() {
      return (
        f ||
          (d ??
            (d = startDeflateWorker(
              s,
              'Datadog Session Replay',
              function () {
                n.stop();
              },
              t,
            )),
          d &&
            (f = createDeflateEncoder(
              s,
              d,
              1,
              /* DeflateEncoderStreamId.REPLAY */
            ))),
        f
      );
    }
    ((n = createPostStartStrategy(s, o, c, u, e, l)), a(s) && n.start());
  }
}
var recorderApi = makeRecorderApi(startRecording),
  datadogRum = makeRumPublicApi(startRum, recorderApi, {startDeflateWorker, createDeflateEncoder});
defineGlobal(getGlobalObject(), 'DD_RUM', datadogRum);
class DatadogTransport {
  constructor(t) {
    ((this.initialized = !1),
      (this.config = t),
      (this.debugLogger = logdown('@wireapp/logger/DatadogTransport')),
      (this.debugLogger.state.isEnabled = !0));
    const r = !!(t.clientToken && t.applicationId);
    datadogLogs && datadogRum && t.enabled && r
      ? this.initializeDatadog()
      : !r && t.enabled
        ? this.debugLogger.warn(
            'Datadog enabled but missing credentials (clientToken or applicationId); skipping initialization.',
          )
        : this.debugLogger.warn('Datadog SDKs not available or transport disabled; skipping initialization.');
  }
  /**
   * Initialize Datadog SDK
   */
  initializeDatadog() {
    try {
      (datadogLogs.init({
        clientToken: this.config.clientToken,
        site: this.config.site,
        service: this.config.service,
        env: this.config.env,
        version: this.config.version,
        forwardErrorsToLogs: !0,
        forwardConsoleLogs: this.config.forwardConsoleLogs ? 'all' : void 0,
        // Should always be false in config
        sessionSampleRate: 100,
        beforeSend: t => {
          if (t.message && typeof t.message == 'string') {
            if (t.message.match(/@wireapp\/webapp\/avs/) && !isAllowedAVSLog(t.message)) return !1;
            t.message = this.sanitizeMessage(t.message);
          }
          return (t.context && (t.context = this.sanitizeContext(t.context)), (t.view = {url: '/'}), !0);
        },
      }),
        datadogRum.init({
          applicationId: this.config.applicationId,
          clientToken: this.config.clientToken,
          site: this.config.site,
          service: this.config.service,
          env: this.config.env,
          version: this.config.version,
          sessionSampleRate: 100,
          sessionReplaySampleRate: 0,
          // No session replay by default
          trackUserInteractions: !0,
          trackResources: !0,
          trackLongTasks: !0,
          defaultPrivacyLevel: 'mask',
          beforeSend: t => {
            if (t.view) {
              if (t.view.url)
                try {
                  const r = new URL(t.view.url);
                  ((r.search = ''), (t.view.url = r.pathname));
                } catch {
                  t.view.url = '/';
                }
              delete t.view.referrer;
            }
            return !0;
          },
        }),
        datadogRum.startSessionReplayRecording(),
        (this.initialized = !0));
    } catch (t) {
      (this.debugLogger.warn('Failed to initialize:', t), (this.initialized = !1));
    }
  }
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(t) {
    return this.config.enabled && this.initialized && t.isProductionSafe && t.level >= this.config.level;
  }
  /**
   * Write log entry to Datadog
   */
  async write(t) {
    if (!(!this.initialized || !this.shouldWrite(t)))
      try {
        const r = this.mapLogLevel(t.level),
          n = {
            ...t.context,
            logger: t.metadata.logger,
            environment: t.metadata.environment,
            platform: t.metadata.platform,
          };
        switch (
          (t.metadata.correlationId && (n.correlationId = t.metadata.correlationId),
          t.metadata.sessionId && (n.sessionId = t.metadata.sessionId),
          r)
        ) {
          case 'debug':
            datadogLogs.logger.debug(t.message, n, t.error);
            break;
          case 'info':
            datadogLogs.logger.info(t.message, n, t.error);
            break;
          case 'warn':
            datadogLogs.logger.warn(t.message, n, t.error);
            break;
          case 'error':
            datadogLogs.logger.error(t.message, n, t.error);
            break;
        }
        this.debugLogger.debug('Successfully logged to Datadog', {
          level: r,
          message: t.message,
          logger: t.metadata.logger,
        });
      } catch (r) {
        this.debugLogger.warn('Failed to write log:', r);
      }
  }
  /**
   * Map log level to Datadog level
   */
  mapLogLevel(t) {
    switch (t) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'error';
      default:
        return 'info';
    }
  }
  /**
   * Sanitization as defense in depth
   * Note: Primary sanitization happens before this, this is extra protection
   */
  sanitizeMessage(t) {
    return !t || typeof t != 'string'
      ? ''
      : t
          .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
          .replace(/[\w.%+-]+@[\w.-]+\.\w{2,}/gi, '[EMAIL]')
          .replace(/Bearer\s+[A-Za-z0-9\-._~+/=]+/gi, 'Bearer [TOKEN]')
          .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]')
          .replace(/\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g, '[SSN]');
  }
  /**
   * Sanitize context object recursively
   */
  sanitizeContext(t) {
    if (!t || typeof t != 'object') return {};
    const r = /* @__PURE__ */ new WeakSet(),
      n = a => {
        if (a === null || typeof a != 'object') return a;
        if (r.has(a)) return '[Circular]';
        if ((r.add(a), Array.isArray(a))) return a.map(o => n(o));
        const i = {};
        for (const o in a)
          if (Object.prototype.hasOwnProperty.call(a, o)) {
            const s = a[o];
            typeof s == 'string'
              ? (i[o] = this.sanitizeMessage(s))
              : typeof s == 'object' && s !== null
                ? (i[o] = n(s))
                : (i[o] = s);
          }
        return i;
      };
    return n(t);
  }
  /**
   * Check if Datadog is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Get Datadog RUM session ID for correlation
   */
  getSessionId() {
    if (!this.initialized || !datadogRum) return null;
    try {
      return datadogRum.getInternalContext()?.session_id || null;
    } catch {
      return null;
    }
  }
  /**
   * Set user information for DataDog tracking
   * @param userId - User ID to set (will be truncated to first 8 characters)
   */
  setUser(t) {
    if (!(!this.initialized || !datadogRum || !datadogLogs))
      try {
        const r = t.substring(0, 8);
        (datadogRum.setUser({id: r}), datadogLogs.setUser({id: r}));
      } catch (r) {
        this.debugLogger.warn('Failed to set user:', r);
      }
  }
  /**
   * Get the DataDog Logs instance (for advanced use cases)
   */
  getDatadogLogs() {
    return datadogLogs;
  }
  /**
   * Get the DataDog RUM instance (for advanced use cases)
   */
  getDatadogRum() {
    return datadogRum;
  }
}
const logger$1 = logdown('@wireapp/logger/FileTransport');
logger$1.state.isEnabled = !0;
class FileTransport {
  constructor(t) {
    ((this.currentSize = 0), (this.writeQueue = Promise.resolve()), (this.config = t), this.initializeLogFile());
  }
  /**
   * Check if running in Node.js or Electron environment
   */
  isNodeEnvironment() {
    return this.config.runtimeEnvironment.platform === 'node' || this.config.runtimeEnvironment.platform === 'electron';
  }
  /**
   * Initialize log file and directory
   */
  initializeLogFile() {
    if (!(!this.isNodeEnvironment() || !this.config.enabled))
      try {
        const t = path.dirname(this.config.path);
        if ((fs.existsSync(t) || fs.mkdirSync(t, {recursive: !0}), fs.existsSync(this.config.path))) {
          const r = fs.statSync(this.config.path);
          this.currentSize = r.size;
        }
      } catch (t) {
        logger$1.warn('Failed to initialize log file:', t);
      }
  }
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(t) {
    return !(
      !this.config.enabled ||
      !this.isNodeEnvironment() ||
      !t.isProductionSafe ||
      t.level < this.config.level ||
      (t.metadata.logger.includes('@wireapp/webapp/avs') && !isAllowedAVSLog(t.message))
    );
  }
  /**
   * Write the log entry to file
   */
  async write(t) {
    if (!(!this.isNodeEnvironment() || !this.shouldWrite(t)))
      return ((this.writeQueue = this.writeQueue.then(() => this.writeToFile(t))), this.writeQueue);
  }
  /**
   * Write entry to file (internal)
   */
  async writeToFile(t) {
    try {
      this.currentSize >= this.config.maxSize && (await this.rotateLogFile());
      const n = `${this.formatLogEntry(t)}
`;
      (await fs.promises.appendFile(this.config.path, n, 'utf8'), (this.currentSize += Buffer.byteLength(n, 'utf8')));
    } catch (r) {
      logger$1.warn('Failed to write log:', r);
    }
  }
  /**
   * Format the log entry for file output
   */
  formatLogEntry(t) {
    if (this.config.format === 'json')
      return JSON.stringify({
        timestamp: t.metadata.timestamp,
        level: LogLevel[t.level],
        message: t.message,
        context: t.context,
        error: t.error
          ? {
              message: t.error.message,
              stack: t.error.stack,
              name: t.error.name,
            }
          : void 0,
        metadata: t.metadata,
      });
    const r = 5,
      n = 20,
      a = t.metadata.timestamp,
      i = LogLevel[t.level].padEnd(r),
      o = t.metadata.logger.padEnd(n);
    let s = `[${a}] [${i}] [${o}] ${t.message}`;
    return (
      t.context && Object.keys(t.context).length > 0 && (s += ` ${JSON.stringify(t.context)}`),
      t.error &&
        ((s += `
Error: ${t.error.message}`),
        t.error.stack &&
          (s += `
${t.error.stack}`)),
      s
    );
  }
  /**
   * Rotate log file if it exceeds max size
   */
  async rotateLogFile() {
    if (this.isNodeEnvironment())
      try {
        const t = /* @__PURE__ */ new Date().toISOString().replace(/[:.]/g, '-'),
          r = path.extname(this.config.path),
          a = `${this.config.path.slice(0, -r.length)}.${t}${r}`;
        (fs.existsSync(this.config.path) && (await fs.promises.rename(this.config.path, a)),
          (this.currentSize = 0),
          await this.cleanupOldLogs());
      } catch (t) {
        logger$1.warn('Failed to rotate log file:', t);
      }
  }
  /**
   * Get all log files sorted by modification time
   */
  async getLogFiles() {
    if (!this.isNodeEnvironment()) return [];
    try {
      const t = path.dirname(this.config.path),
        r = path.basename(this.config.path),
        n = path.extname(r),
        a = r.slice(0, -n.length),
        o = (await fs.promises.readdir(t))
          .filter(c => c.startsWith(a) && c.endsWith(n))
          .filter(c => c !== r)
          .map(c => path.join(t, c));
      return (
        await Promise.all(
          o.map(async c => ({
            file: c,
            mtime: (await fs.promises.stat(c)).mtime.getTime(),
          })),
        )
      )
        .sort((c, u) => c.mtime - u.mtime)
        .map(c => c.file);
    } catch (t) {
      return (logger$1.warn('Failed to get log files:', t), []);
    }
  }
  /**
   * Clean up old log files beyond maxFiles limit
   */
  async cleanupOldLogs() {
    if (this.isNodeEnvironment())
      try {
        const t = await this.getLogFiles(),
          r = t.slice(0, Math.max(0, t.length - this.config.maxFiles + 1));
        for (const n of r)
          try {
            await fs.promises.unlink(n);
          } catch (a) {
            logger$1.warn(`Failed to delete log file ${n}:`, a);
          }
      } catch (t) {
        logger$1.warn('Failed to cleanup old logs:', t);
      }
  }
  /**
   * Check if transport is initialized
   */
  isInitialized() {
    return this.isNodeEnvironment() && this.config.enabled;
  }
  /**
   * Get current log file size
   */
  getCurrentSize() {
    return this.currentSize;
  }
  /**
   * Flush pending writes (useful for testing)
   */
  async flush() {
    return this.writeQueue;
  }
}
class TransportManager {
  constructor(t) {
    ((this.transports = []), (this.config = t), this.initializeTransports());
  }
  /**
   * Initialize all configured transports
   */
  initializeTransports() {
    (this.config.console?.enabled && this.transports.push(new ConsoleTransport(this.config.console)),
      this.config.file?.enabled && this.transports.push(new FileTransport(this.config.file)),
      this.config.datadog?.enabled && this.transports.push(new DatadogTransport(this.config.datadog)));
  }
  /**
   * Write log entry to all applicable transports
   */
  async write(t) {
    const r = [];
    for (const n of this.transports)
      if (n.shouldWrite(t)) {
        const a = n.write(t);
        a instanceof Promise && r.push(a);
      }
    await Promise.all(r);
  }
  /**
   * Get all transports
   */
  getTransports() {
    return [...this.transports];
  }
  /**
   * Add a custom transport
   */
  addTransport(t) {
    this.transports.push(t);
  }
  /**
   * Remove a transport
   */
  removeTransport(t) {
    const r = this.transports.indexOf(t);
    r > -1 && this.transports.splice(r, 1);
  }
  /**
   * Clear all transports
   */
  clearTransports() {
    this.transports = [];
  }
  /**
   * Check if Datadog transport is enabled and initialized
   */
  isDatadogEnabled() {
    const t = this.transports.find(r => r instanceof DatadogTransport);
    return t !== void 0 && t.isInitialized();
  }
}
const logger = logdown('@wireapp/logger/GlobalConfig');
logger.state.isEnabled = !0;
const LOGGER_GLOBAL_KEY = Symbol.for('@wireapp/logger:globalConfig');
class GlobalLoggerConfig {
  constructor() {
    ((this.config = null), (this.transportManager = null), (this.sanitizer = null), (this.initialized = !1));
  }
  /**
   * Initialize global configuration (call once at app startup)
   *
   * **CRITICAL**: This sets up the global logger singleton that all logger instances share.
   * Call this once during application initialization before any getLogger() calls.
   *
   * ## Security Configuration
   *
   * The initialization controls critical security settings:
   *
   * 1. **Transport Configuration**:
   *    - DataDog: MUST set `forwardConsoleLogs: false` to prevent console.log forwarding
   *    - File: Only writes production-safe logs (isProductionSafe: true)
   *    - Console: Always accepts all logs
   *
   * 2. **Sanitization Rules**:
   *    - Defaults include 45+ PII patterns (UUIDs, emails, tokens, etc.)
   *    - Microsoft Presidio patterns (19+ recognizers)
   *    - Wire-specific patterns (message content, encryption keys)
   *
   * 3. **Context Whitelist**:
   *    - Production logs: Only whitelisted keys allowed
   *    - Whitelist: conversationId, userId, duration, errorCode, etc.
   *    - Unknown keys silently dropped
   *
   * ## Platform Detection
   *
   * - `browser`: Web application (uses localStorage, no file transport)
   * - `electron`: Desktop application (supports file transport)
   * - `node`: Server application (supports file transport)
   *
   * ## Deployment Mode
   *
   * - `development`: More verbose console output, debug logs enabled
   * - `production`: Only INFO+ logs, production-safe defaults
   *
   * @param runtimeEnvironment - Platform and deployment information
   * @param config - Optional partial configuration to override defaults
   *
   * @example
   * ```typescript
   * // Browser application with DataDog
   * initializeLogger(
   *   { platform: 'browser', deployment: 'production' },
   *   {
   *     transports: {
   *       console: { enabled: true, level: LogLevel.INFO },
   *       datadog: {
   *         enabled: true,
   *         clientToken: 'YOUR_TOKEN',
   *         applicationId: 'YOUR_APP_ID',
   *         forwardConsoleLogs: false, // CRITICAL: Never forward console logs
   *       }
   *     }
   *   }
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Electron application with file logging
   * initializeLogger(
   *   { platform: 'electron', deployment: 'production' },
   *   {
   *     transports: {
   *       console: { enabled: true, level: LogLevel.INFO },
   *       file: {
   *         enabled: true,
   *         path: './logs/app.log',
   *         maxSize: 10 * 1024 * 1024, // 10MB
   *         maxFiles: 5,
   *       }
   *     }
   *   }
   * );
   * ```
   *
   * @throws Never throws - logs warnings if already initialized
   */
  initialize(t, r) {
    if (this.initialized) {
      logger.warn('Already initialized. Use updateConfig() to change settings.');
      return;
    }
    ((this.config = this.createDefaultConfig(t, r)),
      (this.transportManager = new TransportManager(this.config.transports)),
      (this.sanitizer = new Sanitizer(this.config.sanitizationRules)),
      (this.initialized = !0));
  }
  /**
   * Update configuration after initialization
   */
  updateConfig(t) {
    if (!this.initialized) throw new Error('[GlobalLoggerConfig] Must call initialize() before updateConfig()');
    ((this.config = {...this.config, ...t}),
      t.transports && (this.transportManager = new TransportManager(this.config.transports)),
      t.sanitizationRules && (this.sanitizer = new Sanitizer(this.config.sanitizationRules)));
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return (
      this.initialized || this.initialize({platform: this.detectPlatform(), deployment: 'development'}),
      {...this.config}
    );
  }
  /**
   * Get transport manager
   */
  getTransportManager() {
    return (
      this.initialized || this.initialize({platform: this.detectPlatform(), deployment: 'development'}),
      this.transportManager
    );
  }
  /**
   * Get sanitizer
   */
  getSanitizer() {
    return (
      this.initialized || this.initialize({platform: this.detectPlatform(), deployment: 'development'}),
      this.sanitizer
    );
  }
  /**
   * Check if initialized
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Reset configuration (useful for tests)
   */
  reset() {
    ((this.config = null), (this.transportManager = null), (this.sanitizer = null), (this.initialized = !1));
  }
  /**
   * Detect runtime platform
   */
  detectPlatform() {
    return typeof window < 'u' ? 'browser' : typeof process < 'u' && process.versions?.electron ? 'electron' : 'node';
  }
  /**
   * Create default configuration
   */
  createDefaultConfig(t, r) {
    const n = t.deployment,
      a = t.platform,
      i = n === 'production',
      o = a === 'electron';
    return {
      environment: n,
      safetyLevel: i ? SafetyLevel.SAFE : SafetyLevel.DEV_ONLY,
      logLevel: i ? LogLevel.INFO : LogLevel.DEBUG,
      contextWhitelist: PRODUCTION_CONTEXT_WHITELIST,
      transports: {
        console: {
          enabled: !0,
          level: i ? LogLevel.WARN : LogLevel.DEBUG,
        },
        file: {
          // File logging enabled by default on Electron, disabled elsewhere
          enabled: o,
          level: LogLevel.DEBUG,
          path: './logs/console.log',
          // eslint-disable-next-line no-magic-numbers
          maxSize: 10 * 1024 * 1024,
          // 10MB (10 * 1024 * 1024)
          maxFiles: 5,
          format: 'json',
          runtimeEnvironment: t,
        },
        datadog: {
          // Datadog disabled by default, must be enabled via config
          enabled: !1,
          level: LogLevel.INFO,
          clientToken: '',
          applicationId: '',
          site: 'datadoghq.eu',
          service: 'wire-webapp',
          forwardConsoleLogs: !1,
          // CRITICAL: NEVER forward console logs
        },
      },
      ...r,
    };
  }
}
function getGlobalConfigInstance() {
  const e = globalThis[LOGGER_GLOBAL_KEY];
  if (e) return e;
  const t = new GlobalLoggerConfig();
  return ((globalThis[LOGGER_GLOBAL_KEY] = t), t);
}
const globalConfig = getGlobalConfigInstance();
function initializeLogger(e, t) {
  getGlobalConfigInstance().initialize(e, t);
}
function updateLoggerConfig(e) {
  getGlobalConfigInstance().updateConfig(e);
}
function getLoggerConfig() {
  return getGlobalConfigInstance().getConfig();
}
function resetLoggerConfig() {
  getGlobalConfigInstance().reset();
}
function isLoggerInitialized() {
  return getGlobalConfigInstance().isInitialized();
}
function getDatadogTransport() {
  const t = getGlobalConfigInstance().transportManager;
  if (!t) return null;
  const r = t.transports;
  return !r || !Array.isArray(r) ? null : r.find(n => n.constructor.name === 'DatadogTransport') || null;
}
function setDatadogUser(e) {
  const t = getDatadogTransport();
  t && typeof t.setUser == 'function' && t.setUser(e);
}
function isDatadogEnabled() {
  const e = getDatadogTransport();
  return !!(e && typeof e.isInitialized == 'function' && e.isInitialized());
}
const DEFAULT_MAX_SIZE = 5e3;
class InMemoryLogBuffer {
  constructor() {
    ((this.buffer = []), (this.maxSize = DEFAULT_MAX_SIZE));
  }
  /**
   * Add a log entry to the buffer
   */
  add(t) {
    (this.buffer.push(t), this.buffer.length > this.maxSize && this.buffer.shift());
  }
  /**
   * Export all logs as JSON string
   */
  export() {
    return JSON.stringify(this.buffer, null, 2);
  }
  /**
   * Get all log entries
   */
  getAll() {
    return [...this.buffer];
  }
  /**
   * Get the number of log entries in the buffer
   */
  size() {
    return this.buffer.length;
  }
  /**
   * Clear all logs from the buffer
   */
  clear() {
    this.buffer = [];
  }
  /**
   * Get Datadog session ID for correlation
   */
  getDatadogSessionId() {
    return (typeof window < 'u' && window.DD_RUM && window.DD_RUM.getInternalContext?.()?.session_id) || null;
  }
  /**
   * Get Datadog RUM status
   */
  getDatadogRumEnabled() {
    return typeof window < 'u' && window.DD_RUM !== void 0;
  }
  /**
   * Set the maximum buffer size
   */
  setMaxSize(t) {
    for (this.maxSize = t; this.buffer.length > this.maxSize; ) this.buffer.shift();
  }
  /**
   * Get the maximum buffer size
   */
  getMaxSize() {
    return this.maxSize;
  }
}
const LOG_BUFFER_KEY = Symbol.for('@wireapp/logger:logBuffer');
function getGlobalLogBuffer() {
  const e = globalThis[LOG_BUFFER_KEY];
  if (e) return e;
  const t = new InMemoryLogBuffer();
  return ((globalThis[LOG_BUFFER_KEY] = t), t);
}
function setGlobalLogBuffer(e) {
  globalThis[LOG_BUFFER_KEY] = e;
}
function clearGlobalLogBuffer() {
  globalThis[LOG_BUFFER_KEY]?.clear();
}
class Logger {
  constructor(t) {
    ((this.logBuffer = getGlobalLogBuffer()),
      (this.name = t),
      (this.logdownInstance = logdown(t)),
      globalConfig.getConfig().environment === 'development' && (this.logdownInstance.state.isEnabled = !0),
      (this.production = {
        info: (n, a) => this.logInternal(LogLevel.INFO, n, !0, a),
        warn: (n, a) => this.logInternal(LogLevel.WARN, n, !0, a),
        error: (n, a, i) => this.logInternal(LogLevel.ERROR, n, !0, i, a),
      }),
      (this.development = {
        info: (n, a) => this.logInternal(LogLevel.INFO, n, !1, a),
        warn: (n, a) => this.logInternal(LogLevel.WARN, n, !1, a),
        error: (n, a, i) => this.logInternal(LogLevel.ERROR, n, !1, i, a),
        debug: (n, a) => this.logInternal(LogLevel.DEBUG, n, !1, a),
        trace: (n, a) => this.logInternal(LogLevel.TRACE, n, !1, a),
      }));
  }
  /**
   * Backward-compatible simple logging methods
   * These route to logdown directly for development (preserves colors and formatting)
   * Use logger.production.* for production-safe logs
   */
  log(...t) {
    this.logdownInstance.log(...t);
  }
  info(...t) {
    this.logdownInstance.info(...t);
  }
  warn(...t) {
    this.logdownInstance.warn(...t);
  }
  error(...t) {
    this.logdownInstance.error(...t);
  }
  debug(...t) {
    this.logdownInstance.debug(...t);
  }
  /**
   * Internal log method - handles all logging logic with sanitization
   */
  logInternal(t, r, n, a, i) {
    const o = globalConfig.getConfig();
    if (t < o.logLevel) return;
    let s = a;
    n && (s = this.filterContextWhitelist(a));
    const c = {
        level: t,
        message: r,
        context: s,
        error: i,
        metadata: this.createMetadata(),
        isProductionSafe: n,
      },
      u = n ? o.safetyLevel : SafetyLevel.DEV_ONLY,
      d = globalConfig.getSanitizer().sanitize(c, u);
    (this.logBuffer.add(d), globalConfig.getTransportManager().write(d));
  }
  /**
   * Filter context to only include whitelisted keys for production
   */
  filterContextWhitelist(t) {
    if (!t) return;
    const r = globalConfig.getConfig(),
      n = {};
    for (const a of Object.keys(t)) r.contextWhitelist.has(a) && (n[a] = t[a]);
    return n;
  }
  /**
   * Create metadata for log entry
   */
  createMetadata() {
    const t = globalConfig.getConfig();
    return {
      timestamp: /* @__PURE__ */ new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      sessionId: this.logBuffer.getDatadogSessionId() ?? void 0,
      environment: t.environment,
      platform: this.detectPlatform(),
      logger: this.name,
    };
  }
  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  /**
   * Detect platform
   */
  detectPlatform() {
    return typeof window < 'u' ? 'browser' : typeof process < 'u' && process.versions?.electron ? 'electron' : 'node';
  }
  /**
   * Get logger name
   */
  getName() {
    return this.name;
  }
  /**
   * Get the underlying logdown instance (for advanced usage)
   */
  getLogdownInstance() {
    return this.logdownInstance;
  }
}
const LOGGER_REGISTRY_KEY = Symbol.for('@wireapp/logger:registry');
function getLoggerRegistry() {
  const e = globalThis[LOGGER_REGISTRY_KEY];
  if (e) return e;
  const t = /* @__PURE__ */ new Map();
  return ((globalThis[LOGGER_REGISTRY_KEY] = t), t);
}
function getLogger(e) {
  const t = getLoggerRegistry();
  if (!t.has(e)) {
    const r = new Logger(e);
    t.set(e, r);
  }
  return t.get(e);
}
function clearLoggers() {
  getLoggerRegistry().clear();
}
function getLoggerNames() {
  const e = getLoggerRegistry();
  return Array.from(e.keys());
}
class WireLoggingHelperImpl {
  exportLogs() {
    return getGlobalLogBuffer().export();
  }
  async copyLogsToClipboard() {
    const t = this.exportLogs();
    if (typeof navigator < 'u' && navigator.clipboard)
      try {
        (await navigator.clipboard.writeText(t),
          console.log('✅ Logs copied to clipboard! Paste them in your support ticket.'));
      } catch (r) {
        (console.error('❌ Failed to copy logs to clipboard:', r),
          console.log('📋 Copy the logs manually from the output below:'),
          console.log(t));
      }
    else (console.log('📋 Clipboard API not available. Copy the logs manually:'), console.log(t));
  }
  getDatadogInfo() {
    const t = getGlobalLogBuffer();
    return {
      sessionId: t.getDatadogSessionId(),
      rumEnabled: t.getDatadogRumEnabled(),
      logCount: t.size(),
    };
  }
  clearLogs() {
    const t = getGlobalLogBuffer(),
      r = t.size();
    (t.clear(), console.log(`🗑️  Cleared ${r} logs from buffer`));
  }
  getLogStats() {
    const t = getGlobalLogBuffer(),
      r = t.getAll();
    return {
      totalLogs: r.length,
      bufferSize: t.getMaxSize(),
      oldestLog: r.length > 0 ? r[0].metadata.timestamp : null,
      newestLog: r.length > 0 ? r[r.length - 1].metadata.timestamp : null,
    };
  }
}
function installWireLoggingHelper() {
  typeof window < 'u' &&
    ((window.wireLogging = new WireLoggingHelperImpl()),
    console.log(`
🔧 Wire Logging Helpers Available:
  • wireLogging.exportLogs() - Export all logs as JSON
  • wireLogging.copyLogsToClipboard() - Copy logs to clipboard
  • wireLogging.getDatadogInfo() - Get Datadog session info
  • wireLogging.clearLogs() - Clear log buffer
  • wireLogging.getLogStats() - Get log statistics
    `));
}
function uninstallWireLoggingHelper() {
  typeof window < 'u' && delete window.wireLogging;
}
function enableDebugLogging(e) {
  const t = e?.storage ?? getDefaultStorage();
  if (!t) return;
  let r = null;
  (e?.namespace
    ? (r = e.namespace)
    : e?.urlParams
      ? (r = (typeof e.urlParams == 'string' ? new URLSearchParams(e.urlParams) : e.urlParams).get('enableLogging'))
      : e?.force && (r = '*'),
    r ? t.setItem('debug', r) : t.removeItem('debug'));
}
function disableDebugLogging(e) {
  const t = e ?? getDefaultStorage();
  t && t.removeItem('debug');
}
function getDebugLogging(e) {
  const t = e ?? getDefaultStorage();
  return t ? t.getItem('debug') : null;
}
function getDefaultStorage() {
  try {
    if (typeof window < 'u' && window.localStorage) return window.localStorage;
  } catch {}
  return null;
}
const originalConsole = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error,
  trace: console.trace,
};
let isOverrideActive = !1;
function installConsoleOverride() {
  if (isOverrideActive) {
    console.warn('[ConsoleOverride] Already installed, skipping');
    return;
  }
  (console.warn('[ConsoleOverride] Manual console override - ensure this is intentional'),
    (console.log = function (...t) {}),
    (console.info = function (...t) {}),
    (console.debug = function (...t) {}),
    (console.trace = function (...t) {}),
    (console.warn = function (...t) {
      originalConsole.warn(...t);
    }),
    (console.error = function (...t) {
      if ((originalConsole.error(...t), typeof window < 'u' && window.DD_RUM))
        try {
          const r = t.map(n => (typeof n == 'string' ? n : JSON.stringify(n))).join(' ');
          window.DD_RUM.addError(new Error(r), {
            source: 'console',
            type: 'console.error',
          });
        } catch (r) {
          originalConsole.warn('[ConsoleOverride] Failed to track error in Datadog RUM:', r);
        }
    }),
    (isOverrideActive = !0),
    console.warn('[ConsoleOverride] Production console override installed'),
    console.warn('[ConsoleOverride] console.log/info/debug are now silenced'),
    console.warn('[ConsoleOverride] Use logger.production.* for production logs'));
}
function restoreConsole() {
  if (!isOverrideActive) {
    console.warn('[ConsoleOverride] Not active, nothing to restore');
    return;
  }
  ((console.log = originalConsole.log),
    (console.info = originalConsole.info),
    (console.debug = originalConsole.debug),
    (console.warn = originalConsole.warn),
    (console.error = originalConsole.error),
    (console.trace = originalConsole.trace),
    (isOverrideActive = !1),
    console.log('[ConsoleOverride] Original console methods restored'));
}
function isConsoleOverrideActive() {
  return isOverrideActive;
}
function getConsoleOverrideInfo() {
  return {
    active: isOverrideActive,
    environment: 'unknown',
    // Environment info should come from GlobalConfig
    silencedMethods: ['log', 'info', 'debug', 'trace'],
    preservedMethods: ['warn', 'error'],
  };
}
export {
  ConsoleTransport,
  DEFAULT_SANITIZATION_RULES,
  DatadogTransport,
  FileTransport,
  InMemoryLogBuffer,
  LogLevel,
  Logger,
  PRODUCTION_CONTEXT_WHITELIST,
  PresidioLoader,
  SafetyLevel,
  Sanitizer,
  TransportManager,
  WIRE_SPECIFIC_SANITIZATION_RULES,
  clearGlobalLogBuffer,
  clearLoggers,
  convertPresidioRecognizers,
  disableDebugLogging,
  enableDebugLogging,
  filterByEntityTypes,
  filterByLanguage,
  filterContextWhitelist,
  getConsoleOverrideInfo,
  getDatadogTransport,
  getDebugLogging,
  getDefaultSanitizationRules,
  getGlobalLogBuffer,
  getGlobalPresidioLoader,
  getLogger,
  getLoggerConfig,
  getLoggerNames,
  initializeLogger,
  installConsoleOverride,
  installWireLoggingHelper,
  isAllowedAVSLog,
  isConsoleOverrideActive,
  isContextKeyWhitelisted,
  isDatadogEnabled,
  isLoggerInitialized,
  loadPresidioRulesFromString,
  loadPresidioRulesFromURL,
  resetLoggerConfig,
  restoreConsole,
  setDatadogUser,
  setGlobalLogBuffer,
  setGlobalPresidioLoader,
  uninstallWireLoggingHelper,
  updateLoggerConfig,
};
