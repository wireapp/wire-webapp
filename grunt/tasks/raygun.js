//
// Wire
// Copyright (C) 2016 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

//##############################################################################
// Raygun Source Map Upload
//##############################################################################

const fs = require('fs');
const request = require('request');

module.exports = grunt =>
  grunt.registerTask('raygun', (env = 'staging') => {
    const done = this.async();
    let form, req;

    let options = {
      auth: {
        username: process.env.RAYGUN_USERNAME,
        password: process.env.RAYGUN_PASSWORD
      },
      uri: 'https://app.raygun.io/upload/jssymbols/cmhb9p'
    };

    if (env === 'prod') {
      options.uri = 'https://app.raygun.io/upload/jssymbols/8785p7';
    }

    let files = [];
    for (const min_script of Array.from(fs.readdirSync('deploy/min'))) {
      grunt.log.writeln(`File deploy/min/${min_script['cyan']} will be uploaded.`);
      files.push(`deploy/min/${min_script}`);
    }

    let pending_upload_count = files.length;
    let failed_upload_count = 0;

    return Array.from(files).map((file, index) => {
      grunt.log.writeln(`Adding file #${index + 1} ${files[index].toString()['cyan']} to the upload queue.`);

      options.headers = {
        'WireFilename': file,
        'WireRequest': index
      };

      req = request.post(options, (error, response) => {
          let number;
          if (error) {
            grunt.log.error(error.message);
            throw new Error('Upload to Raygun failed. Are the Raygun credentials correct?');
          }

          if (response.statusCode === 200) {
            file = response.request.headers.WireFilename;
            number = response.request.headers.WireRequest;

            grunt.log.write(`File #${number} ${file['cyan']} successfully uploaded`);
          } else {
            file = response.request.headers.WireFilename;
            number = response.request.headers.WireRequest;

            grunt.log.error(`Upload of file #${number} ${file['cyan']} failed with code ${response.statusCode.toString()['cyan']}`);
            failed_upload_count++;
          }

          pending_upload_count--;
          if (pending_upload_count === 0) {
            const number_of_files = (files.length - failed_upload_count).toString();
            const file_string = grunt.util.pluralize(files.length, 'file/files');
            grunt.log.writeln('');
            grunt.log.ok(`${number_of_files['cyan']} ${file_string} uploaded to Raygun.`);
            done();
          } else {
            grunt.log.writeln(`, ${pending_upload_count} files remaining`);
          }
        }
      );

      form = req.form();

      if (file.indexOf('min/') > -1 && file.indexOf('map') === -1) {
        form.append('url', `https://app.wire.com${file.substr(file.indexOf('/'))}?${grunt.option('version')}`);
      } else {
        form.append('url', `https://app.wire.com${file.substr(file.indexOf('/'))}`)
      }

      form.append('file', fs.createReadStream(`${file}`));
    });
});
