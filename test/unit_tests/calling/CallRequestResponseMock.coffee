#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
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

window.z ?= {}
window.z.test ?= {}
z.test.calling ?= {}

class z.test.calling.CallRequestResponseMock
  ###
  @param requests [jasmine.Ajax.requests] Instance of requests captured by "jasmine-ajax"
  @param responses [Object] Complex object with pre-defined responses to create faked server responses
  ###
  constructor: (@AjaxRequestTracker, @responses) ->
    @logger = new z.util.Logger 'z.test.calling.CallRequestResponseMock'

  ###
  Method to find a specific request inside all captured requests of the Mock.

  @param url_to_match [String] URL of the request that needs to be found
  @param method [String] HTTP method ('POST', 'GET', ...) of the request you are looking for
  @param data [String] Stringified version of request data (if none, then it is '{}')

  @return [Integer] Index of the matched request inside the internal requests collection
  ###
  _find_request: (url_to_match, method, data) ->
    index_in_array = undefined

    for i in [0...@AjaxRequestTracker.count()]
      request = @AjaxRequestTracker.at i
      if request.url is url_to_match and request.method is method and JSON.stringify(request.data()) is data
        index_in_array = i
        break

    return index_in_array

  ###
  @param index [Integer] Index of a specific requests in the internal requests collection
  @return [Boolean] Whether the operation was successful
  ###
  _apply_response_to_request: (index) ->
    applied_response = false

    if _.isNumber index
      request = @AjaxRequestTracker.at index
      # Find response for request
      response_candidates = @responses[request.url][request.method]
      for response_candidate in response_candidates
        request_data = JSON.stringify request.data()
        expected_request = JSON.stringify response_candidate.request
        if request_data is expected_request
          # Find the index of the response in our mocked data
          response_index = response_candidates.indexOf response_candidate
          # Send the response
          request.respondWith response_candidate.response
          # Remove the response from our mocked data
          response_candidates.splice response_index, 1
          if Object.keys(@responses[request.url][request.method]).length is 0
            delete @responses[request.url][request.method]
          # Remove request from list
          @AjaxRequestTracker.remove index
          applied_response = true
          # End the loop
          break

    return applied_response

  ###
  Makes a lookup for a captured request and responds with a faked server response.

  @param url_to_match [String] URL of the request that needs to be found
  @param method [String] HTTP method ('POST', 'GET', ...) of the request you are looking for
  @param data [Object] Additional request data (optional)

  @return [Boolean] Whether a response was found and applied for the matched request
  ###
  process_request: (url_to_match, method, data) =>
    is_processed = false

    data = {} if not data

    request_index = @_find_request url_to_match, method, JSON.stringify data
    @logger.log @logger.levels.OFF, "Found captured request for '#{url_to_match}' (#{method}) with '#{JSON.stringify(data)}' at position '#{request_index}'."

    is_processed = @_apply_response_to_request request_index if request_index isnt undefined
    @logger.log @logger.levels.OFF, "Found mocked response matching the captured request: #{is_processed}"

    return is_processed
