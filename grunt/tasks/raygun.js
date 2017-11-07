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

//##############################################################################
// Raygun Source Map Upload
//##############################################################################

const fs = require('fs');
const request = require('request');

module.exports = grunt => {
  grunt.registerTask('raygun', function(env = 'staging') {
    const done = this.async();

    const options = {
      auth: {
        password: process.env.RAYGUN_PASSWORD,
        username: process.env.RAYGUN_USERNAME,
      },
      uri: `https://app.raygun.io/upload/jssymbols/${env === 'prod' ? '8785p7' : 'cmhb9p'}`,
    };

    const files = fs.readdirSync('deploy/min').map(min_script => {
      grunt.log.writeln(`File deploy/min/${min_script.cyan} will be uploaded.`);
      return `deploy/min/${min_script}`;
    });

    let pending_upload_count = files.length;
    let failed_upload_count = 0;

    files.forEach((file, index) => {
      grunt.log.writeln(`Adding file #${index + 1} ${files[index].toString().cyan} to the upload queue.`);

      options.headers = {
        WireFilename: file,
        WireRequest: index,
      };

      const req = request.post(options, (error, response) => {
        let number;
        if (error) {
          grunt.log.error(error.message);
          throw new Error('Upload to Raygun failed. Are the Raygun credentials correct?');
        }

        if (response.statusCode === 200) {
          file = response.request.headers.WireFilename;
          number = response.request.headers.WireRequest;

          grunt.log.write(`File #${number} ${file.cyan} successfully uploaded`);
        } else {
          file = response.request.headers.WireFilename;
          number = response.request.headers.WireRequest;

          grunt.log.error(
            `Upload of file #${number} ${file.cyan} failed with code ${response.statusCode.toString().cyan}`
          );
          failed_upload_count++;
        }

        pending_upload_count--;

        if (pending_upload_count === 0) {
          const number_of_files = (files.length - failed_upload_count).toString();
          const file_string = grunt.util.pluralize(files.length, 'file/files');
          grunt.log.writeln('');
          grunt.log.ok(`${number_of_files.cyan} ${file_string} uploaded to Raygun.`);
          done();
        } else {
          grunt.log.writeln(`, ${pending_upload_count} files remaining`);
        }
      });

      const form = req.form();

      if (file.indexOf('min/') > -1 && file.indexOf('map') === -1) {
        form.append('url', `https://app.wire.com${file.substr(file.indexOf('/'))}?${grunt.option('version')}`);
      } else {
        form.append('url', `https://app.wire.com${file.substr(file.indexOf('/'))}`);
      }

      form.append('file', fs.createReadStream(`${file}`));
    });
  });
};
