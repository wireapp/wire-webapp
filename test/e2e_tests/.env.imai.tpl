//
// Wire
// Copyright (C) 2025 Wire Swiss GmbH
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

# Playwright settings
HEADLESS=true

# Test service
TEST_SERVICE_URL=http://192.168.2.18:8080

# Calling service
CALLING_SERVICE_URL=op://Test Automation/CALLINGSERVICE_BASIC_AUTH/website
CALLING_SERVICE_BASIC_AUTH=op://Test Automation/CALLINGSERVICE_BASIC_AUTH/basicAuth

ENV_NAME=imai
INBUCKET_USERNAME=op://Test Automation/BackendConnection imai/inbucketUsername
INBUCKET_PASSWORD="{{ op://Test Automation/BackendConnection imai/inbucketPassword }}"
INBUCKET_URL=op://Test Automation/BackendConnection imai/inbucketUrl
BACKEND_URL=op://Test Automation/BackendConnection imai/backendUrl
WEBAPP_URL=op://Test Automation/BackendConnection imai/webappUrl
TEAM_MANAGEMENT_URL=op://Test Automation/BackendConnection imai/teamManagementUrl
DOMAIN=op://Test Automation/BackendConnection imai/domain
BASIC_AUTH=op://Test Automation/BackendConnection imai/basicAuth