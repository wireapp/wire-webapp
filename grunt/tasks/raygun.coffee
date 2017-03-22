#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

###############################################################################
# Raygun Source Map Upload
###############################################################################

fs = require 'fs'
request = require 'request'

module.exports = (grunt) ->
  grunt.registerTask 'raygun', (env = 'staging') ->
    done = @async()

    options =
      auth:
        username: process.env.RAYGUN_USERNAME
        password: process.env.RAYGUN_PASSWORD
      uri: 'https://app.raygun.io/upload/jssymbols/cmhb9p'

    if env is 'prod'
      options.uri = 'https://app.raygun.io/upload/jssymbols/8785p7'

    files = []
    for min_script in fs.readdirSync 'deploy/min'
      grunt.log.writeln "File deploy/min/#{min_script['cyan']} will be uploaded."
      files.push "deploy/min/#{min_script}"

    pending_upload_count = files.length
    failed_upload_count = 0

    for file, index in files
      grunt.log.writeln "Adding file ##{index + 1} #{files[index].toString()['cyan']} to the upload queue."

      options.headers =
        'WireFilename': file
        'WireRequest': index

      req = request.post options, (error, response) =>
        if error
          grunt.log.error error.message
          throw new Error 'Upload to Raygun failed. Are the Raygun credentials correct?'

        if response.statusCode is 200
          file = response.request.headers.WireFilename
          number = response.request.headers.WireRequest

          grunt.log.write "File ##{number} #{file['cyan']} successfully uploaded"
        else
          file = response.request.headers.WireFilename
          number = response.request.headers.WireRequest

          grunt.log.error "Upload of file ##{number} #{file['cyan']} failed with code #{response.statusCode.toString()['cyan']}"
          failed_upload_count++

        pending_upload_count--
        if pending_upload_count is 0
          number_of_files = (files.length - failed_upload_count).toString()
          file_string = grunt.util.pluralize files.length, 'file/files'
          grunt.log.writeln ''
          grunt.log.ok "#{number_of_files['cyan']} #{file_string} uploaded to Raygun."
          done()
        else
          grunt.log.writeln ", #{pending_upload_count} files remaining"

      form = req.form()
      if file.indexOf('min/') > -1 and file.indexOf('map') is -1
        form.append 'url', "https://app.wire.com#{file.substr file.indexOf '/'}?#{grunt.option 'version'}"
      else
        form.append 'url', "https://app.wire.com#{file.substr file.indexOf '/'}"
      form.append 'file', fs.createReadStream "#{file}"
