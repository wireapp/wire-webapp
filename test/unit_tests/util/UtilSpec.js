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

// grunt test_init && grunt test_run:util/Util

'use strict';

describe('z.util.render_message', function() {
  it('renders a normal link', function() {
    const expected = 'Check this: <a href="http://www.wire.com/" target="_blank" rel="nofollow noopener noreferrer">http://www.wire.com/</a>';
    expect(z.util.render_message('Check this: http://www.wire.com/')).toBe(expected);
  });

  it('renders a normal link without protocol', function() {
    const expected = 'Check this: <a href="http://wire.com/about/" target="_blank" rel="nofollow noopener noreferrer">wire.com/about/</a>';
    expect(z.util.render_message('Check this: wire.com/about/')).toBe(expected);
  });

  it('renders complicated image links', function() {
    const link = 'http://static.err.ee/gridfs/95E91BE0D28DF7236BC00EE349284A451C05949C2D04E7857BC686E4394F1585.jpg?&crop=(0,27,848,506.0960451977401)&cropxunits=848&cropyunits=595&format=jpg&quality=90&width=752&maxheight=42';
    const link_with_entities = link.split('&').join('&amp;');
    const expected = `<a href=\"${link_with_entities}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link_with_entities}</a>`;
    expect(z.util.render_message(link)).toBe(expected);
  });

  it('renders URLs with underscores', function() {
    const link = 'http://en.wikipedia.org/wiki/Stormtrooper_(Star_Wars)';
    const expected = `Stormtroopers: <a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a> !!!`;
    expect(z.util.render_message(`Stormtroopers: ${link} !!!`)).toBe(expected);
  });

  xit('renders links with multiple underscores', function() {
    const link = 'https://www.nike.com/events-registration/event?id=6245&languageLocale=de_de&cp=EUNS_KW_DE_&s_kwcid=AL!2799!3!46005237943!b!!g!!womens%20running';
    const expected = `<a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a>`;
    expect(z.util.render_message(link)).toBe(expected);
  });

  it('renders URLs without a trailing slash', function() {
    const link = 'http://www.underscore.com';
    const expected = `e.g. <a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a>.`;
    expect(z.util.render_message(`e.g. ${link}.`)).toBe(expected);
  });

  it('renders localhost links', function() {
    const link = 'http://localhost:8888/';
    const expected = `<a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a>`;
    expect(z.util.render_message(link)).toBe(expected);
  });

  it('renders links with IP addresses', function() {
    const link = 'http://192.168.10.44:8080//job/webapp_atomic_test/4290/cucumber-html-reports';
    const expected = `<a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a>`;
    expect(z.util.render_message(link)).toBe(expected);
  });

  it('renders URLs with @-signs correctly', function() {
    const link = 'https://www.mail-archive.com/debian-bugs-dist@lists.debian.org/msg1448956.html';
    const expected = `<a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a>`;
    expect(z.util.render_message(link)).toBe(expected);
  });

  it('renders URLs with @-signs and text correctly', function() {
    const link = 'https://t.facdn.net/22382738@400-1485204208.jpg';
    const expected = `Just click <a href=\"${link}\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">${link}</a> and download it`;
    expect(z.util.render_message(`Just click ${link} and download it`)).toBe(expected);
  });

  it('escapes links when they are posted as plain HTML', function() {
    const expected = '&lt;a href=&quot;javascript:alert(&#x27;ohoh!&#x27;)&quot;&gt;what?&lt;/a&gt;';
    expect(z.util.render_message("<a href=\"javascript:alert('ohoh!')\">what?</a>")).toBe(expected);
  });

  it('renders an email address', function() {
    const expected = 'send it over to <a href="#" onclick="z.util.safe_mailto_open(\'hello@wire.com\')">hello@wire.com</a>';
    expect(z.util.render_message('send it over to hello@wire.com')).toBe(expected);
  });

  it('renders an email address with pluses', function() {
    const expected = 'send it over to <a href="#" onclick="z.util.safe_mailto_open(\'hello+world@wire.com\')">hello+world@wire.com</a>';
    expect(z.util.render_message('send it over to hello+world@wire.com')).toBe(expected);
  });

  it('renders an email long domains', function() {
    const expected = 'send it over to <a href="#" onclick="z.util.safe_mailto_open(\'janedoe@school.university.edu\')">janedoe@school.university.edu</a>';
    expect(z.util.render_message('send it over to janedoe@school.university.edu')).toBe(expected);
  });

  it('renders an email with multiple subdomains', function() {
    const expected = 'send it over to <a href="#" onclick="z.util.safe_mailto_open(\'bla@foo.co.uk\')">bla@foo.co.uk</a>';
    expect(z.util.render_message('send it over to bla@foo.co.uk')).toBe(expected);
  });

  // The tag "<br />" is preferred for compatibility sake.
  // @see http://stackoverflow.com/a/1946442/451634
  it('renders endlines to <br />', function() {
    expect(z.util.render_message('Hello,\nworld!\nHow is it going?\n')).toBe('Hello,<br />world!<br />How is it going?');
  });

  it('renders text with more than one newline in between', function() {
    expect(z.util.render_message('Hello,\n\n\n\n\n\n\nworld!')).toBe('Hello,<br /><br /><br /><br /><br /><br /><br />world!');
  });

  it('does not render URLs within <code> tags', function() {
    expect(z.util.render_message('```Url url = new Url("wire.com");```')).toBe('<code>Url url = new Url(&quot;wire.com&quot;);</code>');
  });

  it('does not render emails within <code> tags', function() {
    expect(z.util.render_message('```this.isValid("opensource@wire.com")```')).toBe('<code>this.isValid(&quot;opensource@wire.com&quot;)</code>');
  });

  xit('renders an emoticon of someone shrugging', function() {
    expect(z.util.render_message('¯\_(ツ)_/¯')).toBe('¯\_(ツ)_/¯');
  });
});


describe('z.util.array_to_md5_base64', function() {
  it('can convert typed array to base64', function() {
    expect(z.util.array_to_md5_base64(new Uint8Array([8, 8]))).toBe('w+7NCDwPSCf1JgWbA7deTA==');
  });
});


describe('z.util.encode_base64', function() {
  it('encodes text', function() {
    expect(z.util.encode_base64('Hello, world!')).toBe('SGVsbG8sIHdvcmxkIQ==');
  });

  it('encodes symbols', function() {
    expect(z.util.encode_base64('Hello, world!@#$%^&*()_+{}[]|<>,.?/~`"')).toBe('SGVsbG8sIHdvcmxkIUAjJCVeJiooKV8re31bXXw8PiwuPy9+YCI=');
  });
});


describe('z.util.encode_base64_sha256', function() {
  it('encodes Base64 and SHA-256 empty string', function() {
    expect(z.util.encode_sha256_base64('')).toBe('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
  });

  it('encodes Base64 and SHA-256 text', function() {
    expect(z.util.encode_sha256_base64('Hello, world!')).toBe('MV9b23bQeMQ7isAGTkoBZGErH853yGk0W/yUx1iU7dM=');
  });

  it('encodes Base64 and SHA-256 symbols', function() {
    expect(z.util.encode_sha256_base64('Hello, world!@#$%^&*()_+{}[]|<>,.?/~`"')).toBe('lt/heVPfGQB07sONclI2TZBZHuIMH86noUEWEbahMw4=');
  });
});


describe('z.util.base64_to_blob', function() {
  it('encodes Base64 data URI to blob', function() {
    const base64 = z.util.array_to_base64(new Uint8Array([1, 2, 3]));
    const data_uri = `data:application/octet-binary;base64,${base64}`;
    const blob = z.util.base64_to_blob(data_uri);
    expect(blob.type).toBe('application/octet-binary');
  });
});


describe('z.util.create_random_uuid', function() {
  it('has the expected format', function() {
    expect(z.util.create_random_uuid().length).toBe(36);
    expect(z.util.create_random_uuid().split('-').length).toBe(5);
    expect(z.util.create_random_uuid()).not.toEqual(z.util.create_random_uuid());
  });
});


describe('z.util.format_bytes', function() {
  it('renders 0 bytes', function() {
    expect(z.util.format_bytes(0)).toEqual('0B');
  });

  it('renders 1KB', function() {
    expect(z.util.format_bytes(1024)).toEqual('1KB');
  });

  it('renders 25MB', function() {
    expect(z.util.format_bytes(25 * 1024 * 1024)).toEqual('25MB');
  });

  it('renders 25GB', function() {
    expect(z.util.format_bytes(25 * 1024 * 1024 * 1024)).toEqual('25GB');
  });
});


describe('z.util.get_file_extension', function() {
  it('returns common extensions', function() {
    expect(z.util.get_file_extension('file.jpg')).toEqual('jpg');
    expect(z.util.get_file_extension('file.png')).toEqual('png');
    expect(z.util.get_file_extension('file.docx')).toEqual('docx');
    expect(z.util.get_file_extension('file.exe')).toEqual('exe');
    expect(z.util.get_file_extension('file.dmg')).toEqual('dmg');
  });

  it('returns extensions for gzip compressed tar archives', function() {
    expect(z.util.get_file_extension('archive.tar.gz')).toEqual('tar.gz');
  });

  it('returns an empty string if filename has no extension', function() {
    expect(z.util.get_file_extension('image')).toEqual('');
  });

  it('returns extension jpg for image.jpg', function() {
    expect(z.util.get_file_extension('path/to/image.jpg')).toEqual('jpg');
  });
});


describe('z.util.trim_file_extension', function() {
  it('returns the filename without extension', function() {
    expect(z.util.trim_file_extension('image.jpg')).toEqual('image');
  });

  it('returns the filename when there is no extension', function() {
    expect(z.util.trim_file_extension('image')).toEqual('image');
  });

  it('returns the filename without extension or directory path', function() {
    expect(z.util.trim_file_extension('foo/bar.exe')).toEqual('foo/bar');
  });

  it('returns the filename without extension for .tar.gz', function() {
    expect(z.util.trim_file_extension('archive.tar.gz')).toEqual('archive');
  });
});


describe('z.util.ko_array_push_all', function() {
  it('appends multiple items', function() {
    const actual = ko.observableArray([1, 2]);
    z.util.ko_array_push_all(actual, [3, 4]);
    expect(actual()).toEqual([1, 2, 3, 4]);
  });
});


describe('z.util.ko_array_unshift_all', function() {
  it('prepends multiple items', function() {
    const actual = ko.observableArray([3, 4]);
    z.util.ko_array_unshift_all(actual, [1, 2]);
    expect(actual()).toEqual([1, 2, 3, 4]);
  });
});


describe('z.util.base64_to_array', function() {
  it('can convert a gif', function() {
    const actual = z.util.base64_to_array('data:image/gif;base64,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');
    /* eslint-disable comma-spacing */
    const expected = new Uint8Array([71,73,70,56,57,97,45,0,48,0,244,7,0,164,0,0,252,248,248,4,0,224,4,40,40,4,128,248,172,120,88,228,168,136,124,0,0,252,0,0,180,0,0,252,252,252,220,152,32,76,104,104,44,72,72,204,232,232,124,120,120,204,204,204,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,255,11,78,69,84,83,67,65,80,69,50,46,48,3,1,0,0,0,33,249,4,4,15,0,255,0,44,0,0,0,0,45,0,48,0,0,4,255,80,201,73,171,189,56,235,205,187,255,96,40,142,100,105,158,104,170,174,108,235,78,67,28,191,87,140,220,247,64,195,3,238,235,52,219,13,64,4,4,2,0,96,171,55,4,28,158,199,192,65,185,98,18,101,88,44,203,42,244,121,169,167,193,181,151,45,131,77,131,169,1,107,48,28,219,129,65,225,92,138,21,218,177,182,123,128,151,211,235,119,107,124,112,131,118,127,36,114,129,131,107,122,130,46,118,141,50,5,147,115,47,113,129,125,90,52,113,114,122,154,155,98,137,148,135,85,9,2,63,59,20,3,166,4,56,164,117,51,18,3,2,2,173,174,21,50,117,178,64,49,180,4,191,4,84,177,175,25,74,198,190,192,177,10,198,136,187,60,180,1,191,203,60,178,176,105,7,10,79,179,200,193,216,218,202,39,79,83,219,200,49,79,65,180,233,192,180,188,185,41,228,220,2,189,73,50,12,196,197,50,233,220,3,11,253,49,253,11,8,52,112,7,98,0,131,131,228,128,5,91,32,206,220,147,5,3,26,72,188,7,67,162,197,109,235,174,53,212,24,227,160,189,15,17,87,31,12,204,87,139,157,140,111,27,47,130,20,57,114,64,156,116,17,47,30,112,224,96,0,205,50,43,29,180,116,41,163,193,3,143,13,28,76,17,87,243,83,135,1,15,176,196,9,80,83,36,75,141,223,150,129,227,112,68,105,213,24,65,91,138,59,128,195,68,148,0,20,170,38,149,241,99,234,10,78,51,140,166,90,187,35,2,0,33,249,4,5,10,0,17,0,44,0,0,8,0,44,0,39,0,0,5,255,160,34,142,100,57,14,40,106,174,108,187,162,72,28,15,110,109,43,176,172,211,119,79,14,58,128,48,16,0,32,120,190,27,16,33,4,28,14,68,34,0,153,116,45,157,169,108,182,90,3,98,117,224,25,183,133,154,106,207,170,241,203,144,53,24,136,110,34,170,64,85,227,220,236,1,62,160,103,243,13,116,118,63,5,110,40,123,125,3,127,129,118,105,3,5,132,125,108,120,146,129,41,92,60,42,115,133,115,143,116,153,152,85,72,152,145,104,149,39,161,34,105,56,142,132,155,142,163,169,151,40,7,34,114,156,157,139,10,7,150,118,79,39,2,4,59,137,34,190,130,35,190,124,192,58,4,60,197,198,199,79,3,9,2,203,3,79,180,207,47,3,192,4,221,204,217,93,220,222,117,224,37,219,2,16,221,16,228,229,39,219,222,223,237,43,201,226,236,242,56,2,249,221,188,247,10,244,249,226,226,221,59,199,13,160,190,51,106,206,0,244,150,15,133,128,119,40,24,48,176,103,165,129,68,137,219,80,116,91,192,209,33,199,5,204,26,52,160,72,70,164,73,135,192,22,102,92,115,120,109,129,150,80,15,180,232,187,22,109,214,74,147,35,147,12,112,128,198,26,205,93,62,163,93,156,168,51,102,10,156,65,107,58,88,202,19,41,137,0,35,160,154,24,48,18,197,131,161,214,152,242,76,186,149,95,173,46,41,28,32,117,64,83,200,202,174,170,122,68,25,192,160,42,10,158,52,193,172,74,91,75,106,23,183,57,132,121,101,65,68,201,22,132,253,190,150,11,1,0,33,249,4,5,10,0,15,0,44,0,0,6,0,44,0,41,0,0,4,255,80,201,73,43,29,120,216,205,59,199,72,136,96,94,105,42,160,168,146,103,59,13,42,16,4,192,234,182,48,2,236,243,188,215,163,155,9,6,200,24,51,53,141,208,51,40,170,158,163,226,146,217,60,30,139,202,105,230,101,200,24,2,3,67,55,208,197,116,95,172,146,146,20,22,183,193,110,114,87,124,102,101,59,89,205,160,224,22,207,252,114,109,5,122,47,67,18,118,5,124,125,116,109,6,137,107,107,39,25,7,104,101,123,137,131,102,105,7,91,55,7,159,10,96,124,86,102,131,18,159,148,83,167,159,162,163,94,143,1,168,170,22,172,24,152,152,26,178,179,27,159,3,2,164,160,187,29,96,2,4,42,4,119,194,31,9,2,199,201,202,22,3,204,206,208,84,197,4,216,200,213,76,215,217,207,219,47,2,2,1,216,96,224,31,190,217,218,231,27,190,221,223,231,196,226,216,240,224,238,226,226,105,236,161,247,248,197,245,202,250,249,251,7,237,8,24,2,3,7,106,59,34,100,0,131,135,15,7,32,92,64,241,151,47,138,11,254,65,140,120,99,64,131,143,31,93,47,162,90,128,97,193,200,95,32,67,118,180,34,0,85,175,1,46,15,88,100,232,2,67,74,95,49,49,196,68,9,82,223,16,135,16,49,56,24,58,84,40,81,7,24,54,250,84,227,177,39,0,7,46,117,162,114,80,228,102,189,0,237,142,32,64,138,74,42,39,7,35,104,14,139,198,16,10,20,20,98,87,218,33,101,228,80,167,125,112,227,70,0,0,33,249,4,5,10,0,11,0,44,1,0,6,0,43,0,38,0,0,4,255,80,201,73,107,29,120,216,205,251,198,72,136,96,94,105,130,98,74,154,44,53,164,64,16,0,106,219,190,8,160,203,178,78,143,182,83,46,67,204,208,52,65,207,0,128,75,169,152,73,229,178,88,100,34,163,153,201,192,144,49,4,182,220,0,23,195,213,174,148,18,18,152,107,240,130,7,98,118,91,179,186,114,144,139,133,98,80,152,183,101,127,113,96,5,121,87,118,31,105,72,124,125,126,109,114,6,5,5,138,138,39,24,7,102,99,139,145,93,103,7,89,54,7,161,10,95,125,84,100,146,18,161,151,81,169,161,164,165,93,155,1,170,172,22,170,175,145,155,26,162,181,28,161,166,2,3,188,189,28,95,4,41,4,193,196,39,199,34,2,9,135,203,22,3,205,33,207,209,210,46,4,219,219,193,216,217,105,220,221,223,224,123,121,121,2,202,229,31,226,222,235,236,221,234,239,20,198,201,233,228,224,24,233,251,242,243,212,252,251,206,9,28,72,176,160,193,5,246,0,166,59,200,176,161,130,134,16,35,74,156,72,177,162,197,139,24,51,106,220,120,49,0,199,142,19,11,62,74,12,208,193,163,72,130,50,34,0,0,33,249,4,5,10,0,17,0,44,2,0,6,0,42,0,40,0,0,5,255,160,34,142,100,105,158,104,170,174,108,203,14,48,236,206,231,128,220,183,76,211,54,238,235,187,149,13,16,8,0,142,191,160,144,88,12,28,14,71,64,78,137,138,89,173,208,41,149,212,243,121,7,217,193,150,123,45,195,0,192,237,160,0,43,26,12,110,131,85,190,10,188,10,242,192,224,61,8,188,229,123,124,99,10,107,121,129,125,127,48,111,108,84,49,122,120,129,124,137,6,5,140,132,98,51,152,50,49,149,149,49,139,155,154,153,35,125,107,102,137,162,34,152,45,154,98,143,159,139,108,171,58,171,172,48,7,34,143,157,158,105,7,49,84,79,185,48,62,4,2,171,193,131,193,122,4,196,198,34,200,131,10,79,190,204,56,2,9,96,208,209,164,4,221,221,198,181,219,92,222,223,225,226,194,16,221,16,2,206,231,38,3,228,224,238,37,203,223,237,243,170,48,246,247,243,240,222,236,0,205,41,41,83,12,160,128,125,2,121,48,96,160,207,24,56,118,255,216,149,217,49,160,65,3,120,11,50,130,203,184,160,27,12,99,11,23,94,204,100,101,193,52,112,211,58,94,74,172,104,209,98,194,119,45,47,78,243,117,107,102,193,43,15,18,218,225,18,146,225,204,154,63,205,56,120,89,130,165,75,7,72,135,102,155,102,244,98,140,156,40,118,146,178,226,32,104,210,170,3,122,230,132,49,146,94,13,170,75,143,204,28,26,83,105,26,18,69,232,89,81,224,229,167,217,138,80,149,72,189,226,5,193,149,174,231,38,94,105,17,2,0,33,249,4,5,15,0,16,0,44,2,0,8,0,42,0,39,0,0,4,255,80,201,73,171,189,56,235,205,59,31,32,232,141,215,128,156,167,72,174,38,138,170,235,7,4,1,96,3,239,16,111,195,65,7,135,160,237,181,195,132,142,199,33,66,87,164,180,92,80,16,110,217,156,32,175,38,41,128,89,29,20,6,1,131,129,38,62,26,122,220,166,23,84,14,151,7,226,111,186,184,134,159,221,103,251,183,58,9,176,197,103,128,122,123,124,18,94,5,136,33,128,6,114,133,125,87,139,132,142,143,138,113,32,1,147,21,126,136,156,3,9,115,153,10,126,46,2,159,161,22,79,4,165,160,59,33,21,79,8,170,2,92,174,44,134,105,3,4,186,178,42,189,182,134,86,185,187,2,179,86,198,36,76,48,96,186,1,196,202,201,49,33,65,10,7,194,178,179,211,65,181,77,218,194,196,206,61,211,106,181,3,196,195,223,197,93,12,73,179,229,231,223,172,29,33,13,4,11,246,32,246,11,214,232,237,48,31,13,0,7,44,8,82,45,220,1,125,187,174,13,96,192,48,222,43,134,235,12,130,32,168,77,192,185,1,0,51,58,180,162,81,98,184,35,230,76,192,129,104,240,160,193,198,91,71,28,56,24,160,178,90,70,147,240,252,140,36,121,82,1,18,7,4,123,56,104,0,177,100,8,153,35,29,60,168,105,83,196,68,138,24,121,210,164,1,230,200,208,24,40,144,6,53,249,204,223,136,16,46,156,130,193,116,234,8,80,162,147,126,20,137,0,0,33,249,4,5,10,0,17,0,44,2,0,8,0,42,0,39,0,0,5,255,160,34,142,100,73,14,40,106,174,108,107,14,72,28,171,110,93,195,114,78,219,252,8,3,129,0,96,168,235,25,7,192,96,224,112,24,2,102,70,91,106,58,109,66,163,44,92,110,59,176,14,176,89,170,24,5,216,129,125,5,84,208,96,88,27,166,239,90,64,90,120,7,6,236,65,128,253,198,231,207,39,117,122,126,122,124,40,108,105,128,41,119,130,124,111,134,6,5,137,10,102,82,34,42,41,146,146,41,136,152,95,148,71,62,140,99,134,159,159,160,61,166,95,163,135,136,105,167,52,167,60,41,7,34,140,154,155,102,7,41,128,76,182,40,57,4,2,167,190,128,35,190,119,4,193,195,34,197,198,199,76,3,202,50,2,9,93,206,207,37,210,4,220,194,149,217,218,221,220,204,224,44,119,16,220,16,2,228,229,43,219,227,223,237,10,201,227,236,242,62,40,245,246,247,239,194,235,235,178,140,137,241,247,79,95,64,48,3,24,48,200,55,108,216,128,117,221,254,137,193,50,160,65,3,105,11,50,58,204,184,128,27,138,97,10,21,94,60,50,101,1,147,3,14,79,100,118,4,88,209,162,197,131,89,92,94,60,185,11,5,205,3,254,168,60,128,57,79,91,200,133,52,109,222,28,51,192,1,207,23,50,139,58,88,42,244,100,203,151,41,118,154,211,54,197,65,80,165,75,119,253,220,137,98,100,137,57,47,170,94,107,2,128,166,81,153,70,121,173,8,242,117,138,130,45,65,211,118,149,122,6,44,165,41,91,16,80,241,42,111,34,149,123,242,66,0,0,33,249,4,5,10,0,15,0,44,2,0,6,0,42,0,40,0,0,4,255,80,201,73,43,29,120,216,205,187,197,72,136,96,94,89,130,98,74,154,236,52,164,64,16,0,106,203,190,8,160,203,178,78,143,182,83,46,67,204,208,52,193,206,0,128,75,169,152,73,229,178,88,100,34,147,25,151,33,99,8,12,12,219,192,22,179,117,173,148,18,210,23,188,246,178,197,91,112,121,117,221,92,53,131,2,27,44,227,195,215,5,120,46,30,72,116,5,122,123,114,107,6,135,133,133,39,24,7,102,99,121,135,129,100,103,7,89,45,7,157,10,94,122,84,100,129,18,157,146,81,10,166,160,161,92,141,1,166,168,21,170,149,150,151,169,167,177,22,157,162,2,3,158,185,28,94,4,41,4,189,192,39,195,34,2,9,117,199,31,201,33,203,205,206,23,4,214,214,189,211,212,105,215,216,218,219,10,3,1,214,1,2,198,224,207,215,217,232,233,197,231,236,19,194,238,239,240,225,3,230,248,244,232,3,243,249,223,199,252,242,9,252,215,162,72,184,126,2,5,16,192,67,196,198,0,6,16,33,6,92,64,49,155,0,138,11,20,62,140,200,128,224,133,6,32,98,65,222,91,96,106,1,6,146,157,50,14,8,41,178,32,21,1,166,118,249,138,153,205,224,141,149,33,239,197,212,52,211,84,47,150,103,32,113,196,224,160,104,81,162,70,29,96,24,90,39,128,20,160,0,28,196,140,100,202,1,19,160,205,156,114,160,130,64,169,41,170,154,28,140,176,73,65,171,5,47,6,157,168,69,96,175,225,89,179,21,220,138,178,233,182,30,170,8,0,33,249,4,5,10,0,11,0,44,1,0,6,0,43,0,38,0,0,4,255,80,201,73,235,28,120,216,205,251,198,72,136,96,94,105,130,98,74,154,44,53,164,64,16,0,106,219,190,8,160,203,178,78,143,182,83,46,67,204,208,52,65,207,0,128,75,169,152,73,229,178,88,100,34,163,153,139,33,99,8,12,12,219,192,22,179,189,172,148,18,210,23,188,246,178,197,91,112,121,117,229,92,7,139,69,129,13,150,245,225,107,5,26,121,105,37,72,116,5,123,124,114,107,6,137,135,135,39,24,7,102,99,3,137,143,100,103,7,89,54,7,159,10,94,123,84,100,130,18,159,148,81,167,159,162,163,92,143,1,168,170,22,172,24,152,152,26,178,179,27,159,3,2,164,160,187,29,94,2,4,41,4,117,194,118,9,2,199,201,202,22,3,204,206,208,82,197,4,216,200,213,74,215,217,207,219,23,2,2,121,121,223,224,10,24,221,218,231,31,226,222,236,22,196,238,235,240,225,226,247,103,240,242,247,238,228,254,255,0,3,10,92,192,175,32,129,129,8,19,6,72,200,176,161,195,135,16,35,74,156,72,177,162,197,139,19,21,96,204,40,97,225,198,134,20,7,2,88,248,24,80,66,4,0,33,249,4,5,10,0,17,0,44,0,0,6,0,44,0,41,0,0,5,255,160,34,142,100,105,158,104,170,174,108,235,42,67,28,191,180,25,35,56,62,212,245,157,255,59,94,107,240,3,24,3,1,0,34,40,76,17,17,70,192,225,128,68,2,152,77,27,78,42,235,118,179,39,34,247,71,214,129,75,177,171,119,61,59,143,6,134,174,193,128,156,35,99,5,108,22,62,143,205,233,124,3,1,112,121,110,48,5,125,124,128,125,131,6,133,123,65,3,5,136,138,138,113,142,59,50,60,145,153,146,137,146,147,121,51,109,122,44,76,156,127,108,133,167,61,34,109,48,160,169,120,156,174,155,49,7,34,119,120,161,147,76,7,154,89,83,111,2,4,64,130,34,194,134,194,131,196,63,4,65,201,134,10,83,191,9,2,206,3,212,210,54,3,196,4,223,207,219,78,222,224,165,226,174,2,2,16,223,16,230,231,49,228,225,231,38,204,228,238,239,233,222,192,243,10,245,249,224,242,230,117,75,247,45,31,193,53,77,214,252,43,40,0,94,183,103,3,24,48,184,231,164,129,68,137,221,98,124,91,192,17,30,199,5,207,26,52,160,136,98,128,200,147,240,136,102,45,160,6,143,218,2,47,61,30,120,33,72,109,138,140,154,38,81,210,24,224,128,77,182,154,191,126,218,188,56,113,167,76,25,39,71,2,141,225,160,105,207,164,88,2,140,144,106,99,100,140,7,68,179,57,237,41,244,0,215,125,185,86,116,113,0,213,65,77,35,44,191,190,114,81,37,162,85,166,93,201,192,90,155,139,170,216,183,62,140,129,69,129,100,200,23,132,252,194,110,11,1,0,59]);
    /* eslint-enable comma-spacing */
    expect(actual).toEqual(expected);
  });

  it('can convert array buffer back and forth', function() {
    const buffer = new ArrayBuffer(8);
    const array = new Uint8Array(buffer);
    const buffer_encoded = z.util.array_to_base64(array);
    const buffer_decoded = z.util.base64_to_array(buffer_encoded);
    expect(buffer_decoded).toEqual(array);
  });
});


describe('z.util.strip_data_uri', function() {
  it('can strip data uri', function() {
    const base64 = 'AAAAAAA';
    const plain_text = z.util.strip_data_uri(base64);
    const text_html = z.util.strip_data_uri(`data:text/html,${base64}`);
    const base64_text_plain = z.util.strip_data_uri(`data:text/plain;base64,${base64}`);
    const base64_gif = z.util.strip_data_uri(`data:image/gif;base64,${base64}`);
    const base64_png = z.util.strip_data_uri(`data:image/png;base64,${base64}`);
    const base64_jpg = z.util.strip_data_uri(`data:image/jpg;base64,${base64}`);
    expect(plain_text).toBe(base64);
    expect(text_html).toBe(base64);
    expect(base64_text_plain).toBe(base64);
    expect(base64_gif).toBe(base64);
    expect(base64_png).toBe(base64);
    expect(base64_jpg).toBe(base64);
  });
});


describe('z.util.phone_number_to_e164', function() {
  it('can convert a US number', function() {
    expect(z.util.phone_number_to_e164('555-666-7777', 'US')).toBe('+15556667777');
  });

  it('can convert a GR number', function() {
    expect(z.util.phone_number_to_e164('2310 863871', 'GR')).toBe('+302310863871');
  });

  it('can convert an unknown number', function() {
    expect(z.util.phone_number_to_e164('2310 863871')).toBe('2310863871');
  });

  it('can convert an invalid number', function() {
    expect(z.util.phone_number_to_e164('foo bar', 'earth')).toBe('');
  });
});


describe('z.util.get_content_type_from_data_url', () =>
  it('can extract the type of a an image', function() {
    const actual = z.util.get_content_type_from_data_url('data:image/gif;base64,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');
    expect(actual).toEqual('image/gif');
  })
);


describe('z.util.is_iso_string', function() {
  it('validates date', function() {
    expect(z.util.is_iso_string()).toBeFalsy();
    expect(z.util.is_iso_string(new Date().getTime())).toBeFalsy();
    expect(z.util.is_iso_string('2011-90-05T14:48:00.000Z')).toBeFalsy();
    expect(z.util.is_iso_string('2011-10-05T14:48:00.000')).toBeFalsy();
    expect(z.util.is_iso_string(new Date().toISOString())).toBeTruthy();
    expect(z.util.is_iso_string('2011-10-05T14:48:00.000Z')).toBeTruthy();
  });
});


describe('z.util.sort_groups_by_last_event', function() {
  it('finds out that Group A is more recent than Group B', function() {
    const group_a = new z.entity.Conversation();
    group_a.name('Latest');
    group_a.last_event_timestamp(1414505857975);

    const group_b = new z.entity.Conversation();
    group_b.name('Older');
    group_b.last_event_timestamp(1414505766449);

    const groups = [group_a, group_b];
    const ordered_groups = groups.sort(z.util.sort_groups_by_last_event);

    expect(ordered_groups[0].name()).toEqual(group_a.name());
    expect(ordered_groups[1].name()).toEqual(group_b.name());
  });

  it('finds out that Group B is more recent than Group A', function() {
    const group_a = new z.entity.Conversation();
    group_a.name('Older');
    group_a.last_event_timestamp(1414505766449);

    const group_b = new z.entity.Conversation();
    group_b.name('Latest');
    group_b.last_event_timestamp(1414505857975);

    const groups = [group_a, group_b];
    const ordered_groups = groups.sort(z.util.sort_groups_by_last_event);

    expect(ordered_groups[0].name()).toEqual(group_b.name());
    expect(ordered_groups[1].name()).toEqual(group_a.name());
  });

  it('finds out if two groups are equally recent', function() {
    const group_a = new z.entity.Conversation();
    group_a.name('Latest');
    group_a.last_event_timestamp(1414505857975);

    const group_b = new z.entity.Conversation();
    group_b.name('Latest');
    group_b.last_event_timestamp(1414505857975);

    const actual = z.util.sort_groups_by_last_event(group_a, group_b);
    const expected = 0;

    expect(actual).toEqual(expected);
  });
});


describe('z.util.strip_url_wrapper', function() {
  it('return the string without url wrapper (single quotes)', function() {
    expect(z.util.strip_url_wrapper('url("/path/to/image/image.png")')).toBe('/path/to/image/image.png');
  });

  it('return the string without url wrapper (quotes)', function() {
    expect(z.util.strip_url_wrapper('url("/path/to/image/image.png")')).toBe('/path/to/image/image.png');
  });

  it('return the string without url wrapper (without quotes)', function() {
    expect(z.util.strip_url_wrapper('url(/path/to/image/image.png)')).toBe('/path/to/image/image.png');
  });
});


describe('z.util.naked_url', function() {
  it('returns naked urls', function() {
    const expected_url = 'wire.com';
    const urls = [
      'HTTPS://WWW.WIRE.COM/',
      'https://www.wire.com/',
      'http://www.wire.com/',
      'https://www.wire.com',
      'http://www.wire.com',
      'https://wire.com/',
      'http://wire.com/',
      'https://wire.com',
      'http://wire.com',
      'www.wire.com/',
      'www.wire.com',
      'wire.com/',
    ];

    const all_urls_naked = urls
      .map((url) => z.util.naked_url(url))
      .every((url) => url === expected_url);

    expect(all_urls_naked).toBeTruthy();
  });

  it('returns empty string if url is not set', function() {
    expect(z.util.naked_url()).toBe('');
  });
});


describe('z.util.append_url_parameter', function() {
  it('append param with & when url contains param', function() {
    expect(z.util.append_url_parameter('foo.com?bar=true', 'fum=true')).toBe('foo.com?bar=true&fum=true');
  });

  it('append param with ? when url contains param', function() {
    expect(z.util.append_url_parameter('foo.com', 'fum=true')).toBe('foo.com?fum=true');
  });
});


describe('z.util.get_url_parameter', function() {
  it('get param with no arguments', function() {
    expect(z.util.get_url_parameter('foo')).toBe(null);
  });
});


describe('z.util.forward_url_parameter', function() {
  it('forwards existing URL parameters', function() {
    z.util.get_url_parameter = function(parameter_value) {
      if (parameter_value === z.auth.URLParameter.LOCALYTICS) {
        return true;
      }
    };
    expect(z.util.forward_url_parameter('foo.com', z.auth.URLParameter.LOCALYTICS)).toBe('foo.com?localytics=true');

    z.util.get_url_parameter = function(parameter_value) {
      if (parameter_value === z.auth.URLParameter.LOCALYTICS) {
        return false;
      }
    };
    expect(z.util.forward_url_parameter('foo.com', z.auth.URLParameter.LOCALYTICS)).toBe('foo.com?localytics=false');

    z.util.get_url_parameter = function(parameter_value) {
      if (parameter_value === z.auth.URLParameter.LOCALYTICS) {
        return 'bar';
      }
    };
    expect(z.util.forward_url_parameter('foo.com', z.auth.URLParameter.LOCALYTICS)).toBe('foo.com?localytics=bar');

    z.util.get_url_parameter = function(parameter_value) {
      if (parameter_value === z.auth.URLParameter.LOCALYTICS) {
        return null;
      }
    };
    expect(z.util.forward_url_parameter('foo.com', z.auth.URLParameter.LOCALYTICS)).toBe('foo.com');
  });
});


describe('Markdown for bold text', function() {
  it('renders bold text', function() {
    expect(z.util.render_message('**bold text (not italic)**')).toBe('<strong>bold text (not italic)</strong>');
  });

  it('renders a bold word within a sentence', function() {
    expect(z.util.render_message('Markdown **just** rocks!')).toEqual('Markdown <strong>just</strong> rocks!');
  });

  it('renders bold text with italic words', function() {
    expect(z.util.render_message('**bold text with *italic* !!**')).toBe('<strong>bold text with <em>italic</em> !!</strong>');
  });

  it('renders text which is partly bold and partly italic', function() {
    expect(z.util.render_message('**part bold,** *part italic*')).toBe('<strong>part bold,</strong> <em>part italic</em>');
  });

  it('renders mixed text with bold and italic words', function() {
    expect(z.util.render_message('*italic* **bold** *italic* **bold**')).toBe('<em>italic</em> <strong>bold</strong> <em>italic</em> <strong>bold</strong>');
  });

  it('renders words which are just bold', function() {
    expect(z.util.render_message('**A**')).toBe('<strong>A</strong>');
  });
});


describe('Markdown for italic text', function() {
  it('renders italic text', function() {
    expect(z.util.render_message('*This text is italic.*')).toBe('<em>This text is italic.</em>');
  });

  it('renders partially italic text', function() {
    expect(z.util.render_message('This text is *partially* italic')).toBe('This text is <em>partially</em> italic');
  });

  it('renders text with multiple italic words', function() {
    expect(z.util.render_message('This text has *two* *italic* bits')).toBe('This text has <em>two</em> <em>italic</em> bits');
  });

  it('renders italic text with bold words', function() {
    expect(z.util.render_message('*italic text **with bold** *')).toBe('<em>italic text <strong>with bold</strong> </em>');
  });

  it('renders words which are bold-italic', function() {
    expect(z.util.render_message('***A***')).toBe('<strong><em>A</em></strong>');
  });
});


describe('Markdown for code snippets', function() {
  it('renders code blocks', function() {
    expect(z.util.render_message("```console.log('A')```")).toEqual('<code>console.log(&#x27;A&#x27;)</code>');
  });

  it('can escape HTML in rendered code blocks', function() {
    expect(z.util.render_message('```<b>Hello</b>```')).toEqual('<code>&lt;b&gt;Hello&lt;/b&gt;</code>');
  });

  it('renders code within code spans', function() {
    expect(z.util.render_message('This is `code`.')).toEqual('This is <code>code</code>.');
  });

  it('renders code within code blocks', function() {
    expect(z.util.render_message('This is ```code```.')).toEqual('This is <code>code</code>.');
  });

  it('doesn’t render code within a code span', function() {
    expect(z.util.render_message('`com.ibm.icu`')).toEqual('<code>com.ibm.icu</code>');
  });

  it('doesn’t render links within code blocks', function() {
    const expected = '<pre><code class=\"lang-xml\"><span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">dependency</span>&gt;</span><br />  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">groupId</span>&gt;</span>com.ibm.icu<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">groupId</span>&gt;</span><br />  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">artifactId</span>&gt;</span>icu4j<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">artifactId</span>&gt;</span><br />  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">version</span>&gt;</span>53.1<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">version</span>&gt;</span><br /><span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">dependency</span>&gt;</span><br /></code></pre>';
    expect(z.util.render_message('```xml\n<dependency>\n  <groupId>com.ibm.icu</groupId>\n  <artifactId>icu4j</artifactId>\n  <version>53.1</version>\n</dependency>\n```')).toEqual(expected);
  });

  it('renders escaped Ruby code blocks', function() {
    const expected = "<pre><code class=\"lang-ruby\"><span class=\"hljs-built_in\">require</span> <span class=\"hljs-string\">'redcarpet'</span><br />markdown = Redcarpet.<span class=\"hljs-keyword\">new</span>(<span class=\"hljs-string\">\"Hello World!\"</span>)<br />puts markdown.to_html<br /></code></pre>";
    expect(z.util.render_message("```ruby\nrequire 'redcarpet'\nmarkdown = Redcarpet.new(\"Hello World!\")\nputs markdown.to_html\n```")).toEqual(expected);
  });

  it('renders escaped JavaScript code blocks', function() {
    const expected = "<pre><code class=\"lang-js\">$(<span class=\"hljs-built_in\">document</span>).ready(<span class=\"hljs-function\"><span class=\"hljs-keyword\">function</span>(<span class=\"hljs-params\"></span>) </span>{<br />  $(<span class=\"hljs-string\">'pre code'</span>).each(<span class=\"hljs-function\"><span class=\"hljs-keyword\">function</span>(<span class=\"hljs-params\">i, block</span>) </span>{<br />    hljs.highlightBlock(block);<br />  });<br />});<br /></code></pre>";
    expect(z.util.render_message("```js\n$(document).ready(function() {\n  $('pre code').each(function(i, block) {\n    hljs.highlightBlock(block);\n  });\n});```")).toEqual(expected);
  });

  it('renders escaped CoffeeScript code blocks', function() {
    const expected = "<pre><code class=\"lang-coffeescript\"><span class=\"hljs-comment\"># <span class=\"hljs-doctag\">TODO:</span> This is not a general utility:</span><br /><span class=\"hljs-comment\"># It should be part of a view model as it's UI related.</span><br />  z.util.convert_timestamps = <span class=\"hljs-function\">-&gt;</span><br />    <span class=\"hljs-keyword\">if</span> $(<span class=\"hljs-string\">'time'</span>).length &gt; <span class=\"hljs-number\">0</span><br /><span class=\"hljs-function\">      <span class=\"hljs-title\">recalculate</span> = -&gt;</span><br /></code></pre>";
    expect(z.util.render_message("```coffeescript\n# TODO: This is not a general utility:\n# It should be part of a view model as it's UI related.\n  z.util.convert_timestamps = ->\n    if $('time').length > 0\n      recalculate = ->```")).toEqual(expected);
  });

  it('renders escaped HTML code blocks', function() {
    const expected = '<pre><code class=\"lang-html\">&lt;<span class=\"hljs-selector-tag\">a</span> href=<span class=\"hljs-string\">\"javascript:wire.app.logout()\"</span>&gt;This is <span class=\"hljs-selector-tag\">a</span> trick&lt;/a&gt;<br /></code></pre>';
    expect(z.util.render_message('```html\n<a href=\"javascript:wire.app.logout()\">This is a trick</a>\n```')).toEqual(expected);
  });

  it('renders escaped HTML code spans', function() {
    const expected = '<code>&lt;a href=&quot;javascript:wire.app.logout()&quot;&gt;This is a trick&lt;/a&gt;</code>';
    expect(z.util.render_message('`<a href=\"javascript:wire.app.logout()\">This is a trick</a>`')).toEqual(expected);
  });
});


describe('Markdown with mixed markups', function() {
  it('renders font weights together with links', function() {
    const link_1 = '<a href="http://www.link.com" target="_blank" rel="nofollow noopener noreferrer">www.link.com</a>';
    const link_2 = '<a href="http://www.anotherlink.net" target="_blank" rel="nofollow noopener noreferrer">www.anotherlink.net</a>';
    const expected = `This is <em>italic</em> and <strong>bold</strong> and <strong><em>bold-italic</em></strong> with a ${link_1} and ${link_2}.`;

    expect(z.util.render_message('This is *italic* and **bold** and ***bold-italic*** with a www.link.com and www.anotherlink.net.')).toEqual(expected);
  });
});


describe('Ignored Markdown syntax', function() {
  it('only renders correct Markdown syntax', function() {
    expect(z.util.render_message('This text is not italic.')).toBe('This text is not italic.');
  });

  it('does not render bold text when there is only a single asterisk', function() {
    expect(z.util.render_message('random *asterisk')).toBe('random *asterisk');
  });

  it('does not render horizontal lines', function() {
    expect(z.util.render_message('***\nNo horizontal lines\n***')).toBe('<strong><em><br />No horizontal lines<br /></em></strong>');
  });
});


// The exceptions are not fixed yet, that's why we collect and exclude them here
describe('Markdown exceptions', function() {
  it('handles the URLs that start with : after the protocol', function() {
    const text = 'http://:';
    expect(z.util.render_message(text)).toBe(text);
  });

  xit('does not render underscores to italic when they are within a sentence', function() {
    const text = 'calling__voice_channel__fulltitle';
    expect(z.util.render_message(text)).toBe(text);
  });
});


describe('z.util.print_devices_id', function() {
  it('can print device id', function() {
    expect(z.util.print_devices_id('66e66c79e8d1dea4')).toBe("<span class='device-id-part'>66</span><span class='device-id-part'>e6</span><span class='device-id-part'>6c</span><span class='device-id-part'>79</span><span class='device-id-part'>e8</span><span class='device-id-part'>d1</span><span class='device-id-part'>de</span><span class='device-id-part'>a4</span>");
  });

  it('can print device id and apply padding', function() {
    expect(z.util.print_devices_id('6e66c79e8d1dea4')).toBe("<span class='device-id-part'>06</span><span class='device-id-part'>e6</span><span class='device-id-part'>6c</span><span class='device-id-part'>79</span><span class='device-id-part'>e8</span><span class='device-id-part'>d1</span><span class='device-id-part'>de</span><span class='device-id-part'>a4</span>");
  });
});


describe('z.util.zero_padding', function() {
  it('should add zero padding when string length is smaller then max', function() {
    expect(z.util.zero_padding('1', 10)).toBe('0000000001');
  });

  it('returns string if max is smaller then string length', function() {
    expect(z.util.zero_padding('1000000000', 8)).toBe('1000000000');
  });

  it('returns string if max is equal string length', function() {
    expect(z.util.zero_padding('1000000000', 10)).toBe('1000000000');
  });

  it('should handle numbers', function() {
    expect(z.util.zero_padding(42, 10)).toBe('0000000042');
  });

  it('can add one zero to 6', function() {
    expect(z.util.zero_padding(6)).toEqual('06');
  });

  it('can add 13 zeros to 6', function() {
    expect(z.util.zero_padding(6, 14)).toEqual('00000000000006');
  });

  it('can transform 666 to a string', function() {
    expect(z.util.zero_padding(666)).toEqual('666');
  });
});


describe('z.util.format_seconds', function() {
  it('should format seconds', function() {
    expect(z.util.format_seconds(50)).toBe('00:50');
  });

  it('should format minutes and seconds', function() {
    expect(z.util.format_seconds(110)).toBe('01:50');
  });

  it('should format hours, minutes and seconds', function() {
    expect(z.util.format_seconds(3630)).toBe('1:00:30');
  });

  it('should format 0 seconds', function() {
    expect(z.util.format_seconds(0)).toBe('00:00');
  });

  it('should format undefined as 00:00', function() {
    expect(z.util.format_seconds()).toBe('00:00');
  });
});


describe('z.util.format_milliseconds_short', function() {
  it('should format duration under 1 minute', function() {
    expect(z.util.format_milliseconds_short(5000)).toEqual([5, 's']);
    expect(z.util.format_milliseconds_short(15000)).toEqual([15, 's']);
  });

  it('should format duration over 1 minute', function() {
    expect(z.util.format_milliseconds_short(60000)).toEqual([1, 'm']);
    expect(z.util.format_milliseconds_short(900000)).toEqual([15, 'm']);
  });

  it('should format duration over 1 hour', function() {
    expect(z.util.format_milliseconds_short(1000 * 60 * 60 * 3)).toEqual([3, 'h']);
  });

  it('should format duration over 1 day', function() {
    expect(z.util.format_milliseconds_short(1000 * 60 * 60 * 24 * 3)).toEqual([3, 'd']);
  });
});


describe('z.util.is_same_location', function() {
  it('returns false if page was accessed directly', function() {
    expect(z.util.is_same_location('', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if page was accessed from https://wire.com', function() {
    expect(z.util.is_same_location('https://wire.com', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if page was accessed from https://wire.com/download', function() {
    expect(z.util.is_same_location('https://wire.com/download', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if page was accessed from https://get.wire.com', function() {
    expect(z.util.is_same_location('https://get.wire.com', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if page was accessed from an external link', function() {
    expect(z.util.is_same_location('http://www.heise.de', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if redirected from auth', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth', 'https://app.wire.com')).toBeFalsy();
  });

  it('returns false if redirected from auth with parameter', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth/?env=staging', 'https://app.wire.com/?env=staging')).toBeFalsy();
  });

  it('returns false if redirected from auth with history hashtag', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth/#history', 'https://app.wire.com/?env=staging')).toBeFalsy();
  });

  it('returns false if redirected from auth with login hashtag', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth/?env=staging#login', 'https://app.wire.com/?env=staging')).toBeFalsy();
  });

  it('returns false if redirected from auth with registration hashtag', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth/?env=staging#register', 'https://app.wire.com/?env=staging')).toBeFalsy();
  });

  it('returns true if auth with login hashtag was reloaded', function() {
    expect(z.util.is_same_location('https://app.wire.com/auth/#register', 'https://app.wire.com/auth/')).toBeFalsy();
  });

  it('returns true if page was reloaded', function() {
    expect(z.util.is_same_location('https://app.wire.com', 'https://app.wire.com')).toBeTruthy();
  });

  it('returns true if page was reloaded with parameters', function() {
    expect(z.util.is_same_location('https://app.wire.com/?hl=de', 'https://app.wire.com/?hl=de')).toBeTruthy();
  });
});


describe('bucket_values', function() {
  it('returns correct value for zero', function() {
    expect(z.util.bucket_values(0, [0, 5, 10, 15, 20, 25])).toBe('0');
  });

  it('returns the correct bucket if value is inside the given limits', function() {
    expect(z.util.bucket_values(0.1, [0, 5, 10, 15, 20, 25])).toBe('0');
    expect(z.util.bucket_values(1, [0, 5, 10, 15, 20, 25])).toBe('1-5');
    expect(z.util.bucket_values(5.5, [0, 5, 10, 15, 20, 25])).toBe('1-5');
    expect(z.util.bucket_values(13, [0, 5, 10, 15, 20, 25])).toBe('11-15');
    expect(z.util.bucket_values(1023, [0, 100, 200, 500, 1000, 2000])).toBe('1001-2000');
  });

  it('returns the correct bucket if value is above the given limits', function() {
    expect(z.util.bucket_values(100, [0, 5, 10, 15, 20, 25])).toBe('26-');
    expect(z.util.bucket_values(10023, [0, 100, 200, 500, 1000, 2000])).toBe('2001-');
  });
});


describe('z.util.safe_window_open', function() {
  let new_window = undefined;
  afterEach(function() {
    if (new_window) {
      new_window.close();
    }
  });

  it('doesn\'t contain a reference to the opening tab', function() {
    new_window = z.util.safe_window_open('https://wire.com/');
    expect(new_window.opener).toBeNull();
  });
});


describe('z.util.add_http', function() {
  it('adds http if protocol is missing', function() {
    expect(z.util.add_http('wire.com/')).toBe('http://wire.com/');
  });

  it('does not add http if present', function() {
    expect(z.util.add_http('http://wire.com/')).toBe('http://wire.com/');
  });

  it('does not add https if present', function() {
    expect(z.util.add_http('https://wire.com/')).toBe('https://wire.com/');
  });
});
