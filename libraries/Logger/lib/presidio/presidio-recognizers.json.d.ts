declare const _default: {
  version: '1.0.0';
  updated: '2025-12-29T17:01:02.545Z';
  recognizers: [
    {
      name: 'Credit Card Recognizer';
      supported_language: 'all';
      supported_entity: 'CREDIT_CARD';
      patterns: [
        {
          name: 'Credit Card (Medium)';
          regex: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})\\b';
          score: 0.8;
        },
      ];
    },
    {
      name: 'Email Recognizer';
      supported_language: 'all';
      supported_entity: 'EMAIL_ADDRESS';
      patterns: [
        {
          name: 'Email (Medium)';
          regex: '[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}';
          score: 0.5;
        },
      ];
    },
    {
      name: 'Phone Number Recognizer';
      supported_language: 'all';
      supported_entity: 'PHONE_NUMBER';
      patterns: [
        {
          name: 'Phone Number (Weak)';
          regex: '\\+?[\\d\\s\\-\\(\\)]{10,}';
          score: 0.4;
        },
      ];
    },
    {
      name: 'IP Address Recognizer (IPv4)';
      supported_language: 'all';
      supported_entity: 'IP_ADDRESS';
      patterns: [
        {
          name: 'IPv4 Address';
          regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b';
          score: 0.6;
        },
      ];
    },
    {
      name: 'IP Address Recognizer (IPv6)';
      supported_language: 'all';
      supported_entity: 'IP_ADDRESS';
      patterns: [
        {
          name: 'IPv6 Address';
          regex: '(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7})';
          score: 0.7;
        },
      ];
    },
    {
      name: 'IBAN Recognizer';
      supported_language: 'all';
      supported_entity: 'IBAN_CODE';
      patterns: [
        {
          name: 'IBAN (Medium)';
          regex: '\\b[A-Z]{2}\\d{2}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{0,4}[ ]?[A-Z0-9]{0,4}\\b';
          score: 0.7;
        },
      ];
    },
    {
      name: 'URL Recognizer';
      supported_language: 'all';
      supported_entity: 'URL';
      patterns: [
        {
          name: 'URL (Medium)';
          regex: 'https?://[^\\s\'"]+';
          score: 0.5;
        },
      ];
    },
    {
      name: 'Crypto Wallet Recognizer';
      supported_language: 'all';
      supported_entity: 'CRYPTO';
      patterns: [
        {
          name: 'Bitcoin Address';
          regex: '\\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\\b';
          score: 0.7;
        },
      ];
    },
    {
      name: 'US SSN Recognizer';
      supported_language: 'en';
      supported_entity: 'US_SSN';
      patterns: [
        {
          name: 'SSN (Medium)';
          regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b';
          score: 0.8;
        },
      ];
    },
    {
      name: 'US Passport Recognizer';
      supported_language: 'en';
      supported_entity: 'US_PASSPORT';
      patterns: [
        {
          name: 'US Passport';
          regex: '\\b[A-Z]{1,2}[0-9]{6,9}\\b';
          score: 0.4;
        },
      ];
    },
    {
      name: 'UK NHS Number Recognizer';
      supported_language: 'en';
      supported_entity: 'UK_NHS';
      patterns: [
        {
          name: 'NHS Number';
          regex: '\\b\\d{3}[ -]?\\d{3}[ -]?\\d{4}\\b';
          score: 0.5;
        },
      ];
    },
    {
      name: 'German Tax ID Recognizer';
      supported_language: 'de';
      supported_entity: 'DE_TAX_ID';
      patterns: [
        {
          name: 'German Tax ID';
          regex: '\\b\\d{11}\\b';
          score: 0.6;
        },
      ];
    },
    {
      name: 'German VAT ID Recognizer';
      supported_language: 'de';
      supported_entity: 'DE_VAT_ID';
      patterns: [
        {
          name: 'German VAT ID';
          regex: '\\bDE\\d{9}\\b';
          score: 0.8;
        },
      ];
    },
    {
      name: 'Austrian VAT ID Recognizer';
      supported_language: 'de';
      supported_entity: 'AT_VAT_ID';
      patterns: [
        {
          name: 'Austrian VAT ID';
          regex: '\\bATU\\d{8}\\b';
          score: 0.8;
        },
      ];
    },
    {
      name: 'Swiss VAT ID Recognizer';
      supported_language: 'de';
      supported_entity: 'CH_VAT_ID';
      patterns: [
        {
          name: 'Swiss VAT ID';
          regex: '\\bCHE-\\d{3}\\.\\d{3}\\.\\d{3}\\b';
          score: 0.8;
        },
      ];
    },
    {
      name: 'Swiss AHV Number Recognizer';
      supported_language: 'de';
      supported_entity: 'CH_AHV';
      patterns: [
        {
          name: 'Swiss AHV Number';
          regex: '\\b756\\.\\d{4}\\.\\d{4}\\.\\d{2}\\b';
          score: 0.9;
        },
      ];
    },
    {
      name: 'German License Plate Recognizer';
      supported_language: 'de';
      supported_entity: 'DE_LICENSE_PLATE';
      patterns: [
        {
          name: 'German License Plate';
          regex: '\\b[A-ZÖÜÄ]{1,3}-[A-ZÖÜÄ]{1,2}\\s?\\d{1,4}[HE]?\\b';
          score: 0.5;
        },
      ];
    },
    {
      name: 'Spanish NIF Recognizer';
      supported_language: 'es';
      supported_entity: 'ES_NIF';
      patterns: [
        {
          name: 'Spanish NIF';
          regex: '\\b\\d{8}[A-Z]\\b';
          score: 0.7;
        },
      ];
    },
    {
      name: 'Italian Fiscal Code Recognizer';
      supported_language: 'it';
      supported_entity: 'IT_FISCAL_CODE';
      patterns: [
        {
          name: 'Italian Fiscal Code';
          regex: '\\b[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]\\b';
          score: 0.8;
        },
      ];
    },
  ];
};

export default _default;
