# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [14.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@14.0.2...@wireapp/bot-api@14.0.3) (2022-08-30)

**Note:** Version bump only for package @wireapp/bot-api





## [14.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@14.0.1...@wireapp/bot-api@14.0.2) (2022-08-30)

**Note:** Version bump only for package @wireapp/bot-api





## [14.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@14.0.0...@wireapp/bot-api@14.0.1) (2022-08-29)

**Note:** Version bump only for package @wireapp/bot-api





# [14.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.13...@wireapp/bot-api@14.0.0) (2022-08-25)


### Features

* remove user from MLS conversation (#FS-561) ([#4366](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4366)) ([89da444](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/89da4449fa3caa0cbe41fbd595326f157e7e4011)), closes [#FS-561](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/FS-561) [#4367](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4367)


### BREAKING CHANGES

* renamed removeUser function to removeUserFromProteusConversation in @wireapp/core and
changed the types of conversation and user ids in @wireapp/bot-api MessageHandler from string to QualifiedId.

* chore: initial work on remove user from mls convo

* fix: use FQCI ids for client ids

* fix: use FQCI ids for client ids

* runfix: encode client id straight to byte array

* runfix: encode client id straight to byte array

* feat: send client-removal commit messages

* runfix: remove event from remove user from proteus convo func

* refactor: rename proteus remove func

* test: add test for fully qualified ids mapping function

* refactor: more precise name for remove from proteus convo

* refactor: apply CR suggestions

* runfix: don't convert messages twice to uint8arr

* runfix: wrapp commits into uint8arr





## [13.1.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.12...@wireapp/bot-api@13.1.13) (2022-08-25)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.11...@wireapp/bot-api@13.1.12) (2022-08-23)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.10...@wireapp/bot-api@13.1.11) (2022-08-23)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.9...@wireapp/bot-api@13.1.10) (2022-08-17)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.8...@wireapp/bot-api@13.1.9) (2022-08-17)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.7...@wireapp/bot-api@13.1.8) (2022-08-16)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.6...@wireapp/bot-api@13.1.7) (2022-08-11)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.5...@wireapp/bot-api@13.1.6) (2022-08-11)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.4...@wireapp/bot-api@13.1.5) (2022-08-10)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.3...@wireapp/bot-api@13.1.4) (2022-08-10)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.2...@wireapp/bot-api@13.1.3) (2022-08-09)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.1...@wireapp/bot-api@13.1.2) (2022-08-04)

**Note:** Version bump only for package @wireapp/bot-api





## [13.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.1.0...@wireapp/bot-api@13.1.1) (2022-07-28)

**Note:** Version bump only for package @wireapp/bot-api





# [13.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.6...@wireapp/bot-api@13.1.0) (2022-07-28)


### Features

* add users to mls conversation (FS-851) ([#4340](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4340)) ([2889385](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/28893855ec9c42d59e1394142e8cf31252f2503a))





## [13.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.5...@wireapp/bot-api@13.0.6) (2022-07-27)

**Note:** Version bump only for package @wireapp/bot-api





## [13.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.4...@wireapp/bot-api@13.0.5) (2022-07-27)

**Note:** Version bump only for package @wireapp/bot-api





## [13.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.3...@wireapp/bot-api@13.0.4) (2022-07-26)

**Note:** Version bump only for package @wireapp/bot-api





## [13.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.2...@wireapp/bot-api@13.0.3) (2022-07-26)

**Note:** Version bump only for package @wireapp/bot-api





## [13.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.1...@wireapp/bot-api@13.0.2) (2022-07-25)

**Note:** Version bump only for package @wireapp/bot-api





## [13.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@13.0.0...@wireapp/bot-api@13.0.1) (2022-07-25)

**Note:** Version bump only for package @wireapp/bot-api





# [13.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.16...@wireapp/bot-api@13.0.0) (2022-07-22)


### Features

* **core:** prepare conversationService addUsers() for MLS and Proteus Versions, clean up code, fix scripts (FS-815) ([#4339](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4339)) ([8f1aeec](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/8f1aeecf3391052ca741419577e1e11a393eab39))


### BREAKING CHANGES

* **core:** * The addUser() function in ConversationService.ts has been renamed to addUsers(), and its API changed in preparation for the MLS and Proteus split.





## [12.2.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.15...@wireapp/bot-api@12.2.16) (2022-07-20)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.14...@wireapp/bot-api@12.2.15) (2022-07-20)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.13...@wireapp/bot-api@12.2.14) (2022-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.12...@wireapp/bot-api@12.2.13) (2022-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.11...@wireapp/bot-api@12.2.12) (2022-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.10...@wireapp/bot-api@12.2.11) (2022-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.9...@wireapp/bot-api@12.2.10) (2022-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.8...@wireapp/bot-api@12.2.9) (2022-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.7...@wireapp/bot-api@12.2.8) (2022-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.6...@wireapp/bot-api@12.2.7) (2022-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.5...@wireapp/bot-api@12.2.6) (2022-07-14)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.4...@wireapp/bot-api@12.2.5) (2022-07-11)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.3...@wireapp/bot-api@12.2.4) (2022-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.2...@wireapp/bot-api@12.2.3) (2022-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.1...@wireapp/bot-api@12.2.2) (2022-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.2.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.2.0...@wireapp/bot-api@12.2.1) (2022-07-08)

**Note:** Version bump only for package @wireapp/bot-api





# [12.2.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.6...@wireapp/bot-api@12.2.0) (2022-07-08)


### Features

* **core:** Send MLS messages (FS-560) ([#4314](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4314)) ([2f29052](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/2f2905233b29c31294ec64e97c1e84998e28821f))





## [12.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.5...@wireapp/bot-api@12.1.6) (2022-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.4...@wireapp/bot-api@12.1.5) (2022-07-07)

**Note:** Version bump only for package @wireapp/bot-api





## [12.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.3...@wireapp/bot-api@12.1.4) (2022-07-07)

**Note:** Version bump only for package @wireapp/bot-api





## [12.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.2...@wireapp/bot-api@12.1.3) (2022-07-06)

**Note:** Version bump only for package @wireapp/bot-api





## [12.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.1...@wireapp/bot-api@12.1.2) (2022-07-06)

**Note:** Version bump only for package @wireapp/bot-api





## [12.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.1.0...@wireapp/bot-api@12.1.1) (2022-07-06)

**Note:** Version bump only for package @wireapp/bot-api





# [12.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.40...@wireapp/bot-api@12.1.0) (2022-07-05)


### Features

* Upgrade conversation member endpoint to v2 ([#4312](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4312)) ([f68e812](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/f68e812e6c4d7601d4d4c194e4f853a76bff39e5))





## [12.0.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.39...@wireapp/bot-api@12.0.40) (2022-07-05)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.38...@wireapp/bot-api@12.0.39) (2022-07-04)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.37...@wireapp/bot-api@12.0.38) (2022-07-04)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.36...@wireapp/bot-api@12.0.37) (2022-07-04)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.35...@wireapp/bot-api@12.0.36) (2022-07-04)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.34...@wireapp/bot-api@12.0.35) (2022-07-01)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.33...@wireapp/bot-api@12.0.34) (2022-06-30)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.32...@wireapp/bot-api@12.0.33) (2022-06-30)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.31...@wireapp/bot-api@12.0.32) (2022-06-27)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.30...@wireapp/bot-api@12.0.31) (2022-06-21)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.29...@wireapp/bot-api@12.0.30) (2022-06-17)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.28...@wireapp/bot-api@12.0.29) (2022-06-15)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.27...@wireapp/bot-api@12.0.28) (2022-06-15)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.26...@wireapp/bot-api@12.0.27) (2022-06-14)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.25...@wireapp/bot-api@12.0.26) (2022-06-10)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.24...@wireapp/bot-api@12.0.25) (2022-06-09)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.23...@wireapp/bot-api@12.0.24) (2022-06-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.22...@wireapp/bot-api@12.0.23) (2022-06-08)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.21...@wireapp/bot-api@12.0.22) (2022-06-07)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.20...@wireapp/bot-api@12.0.21) (2022-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.19...@wireapp/bot-api@12.0.20) (2022-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.18...@wireapp/bot-api@12.0.19) (2022-06-01)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.17...@wireapp/bot-api@12.0.18) (2022-05-31)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.16...@wireapp/bot-api@12.0.17) (2022-05-31)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.15...@wireapp/bot-api@12.0.16) (2022-05-31)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.14...@wireapp/bot-api@12.0.15) (2022-05-30)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.13...@wireapp/bot-api@12.0.14) (2022-05-30)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.12...@wireapp/bot-api@12.0.13) (2022-05-30)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.11...@wireapp/bot-api@12.0.12) (2022-05-27)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.10...@wireapp/bot-api@12.0.11) (2022-05-24)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.9...@wireapp/bot-api@12.0.10) (2022-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.8...@wireapp/bot-api@12.0.9) (2022-05-18)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.7...@wireapp/bot-api@12.0.8) (2022-05-17)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.6...@wireapp/bot-api@12.0.7) (2022-05-16)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.5...@wireapp/bot-api@12.0.6) (2022-05-16)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.4...@wireapp/bot-api@12.0.5) (2022-05-16)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.3...@wireapp/bot-api@12.0.4) (2022-05-16)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.2...@wireapp/bot-api@12.0.3) (2022-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.1...@wireapp/bot-api@12.0.2) (2022-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [12.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@12.0.0...@wireapp/bot-api@12.0.1) (2022-05-04)

**Note:** Version bump only for package @wireapp/bot-api





# [12.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.21...@wireapp/bot-api@12.0.0) (2022-05-02)


### Code Refactoring

* Cleanup storage initialization ([#4257](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4257)) ([cf952c5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/cf952c5522ccebe2c4e97d7dbb27de447a532032))


### BREAKING CHANGES

* The way custom database are given to the `Account` has changed.
- The constructor signature now changes.
If you were doing

```js
const account = new Account(apiClient, createStoreEngine);
```

Now you need to do 

```js
const account = new Account(apiClient, {createStore: createStoreEngine});
```

- The `login` and `init` function do not take a storage engine parameter anymore. You now need to give a `createStore` function to the constructor in order to give a custom storage engine to the core. 

BEFORE

```js
const account = new Accoun(apiClient);

account.login(data, initClient, clientInfo, database);
```

AFTER

```js
const account = new Accoun(apiClient, {createStore: () => database});

account.login(data, initClient, clientInfo);
```





## [11.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.20...@wireapp/bot-api@11.0.21) (2022-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.19...@wireapp/bot-api@11.0.20) (2022-04-20)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.18...@wireapp/bot-api@11.0.19) (2022-04-06)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.17...@wireapp/bot-api@11.0.18) (2022-03-30)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.16...@wireapp/bot-api@11.0.17) (2022-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.15...@wireapp/bot-api@11.0.16) (2022-03-22)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.14...@wireapp/bot-api@11.0.15) (2022-03-22)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.13...@wireapp/bot-api@11.0.14) (2022-03-21)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.12...@wireapp/bot-api@11.0.13) (2022-03-21)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.11...@wireapp/bot-api@11.0.12) (2022-03-18)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.10...@wireapp/bot-api@11.0.11) (2022-03-17)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.9...@wireapp/bot-api@11.0.10) (2022-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.8...@wireapp/bot-api@11.0.9) (2022-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.7...@wireapp/bot-api@11.0.8) (2022-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.6...@wireapp/bot-api@11.0.7) (2022-03-10)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.5...@wireapp/bot-api@11.0.6) (2022-03-07)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.4...@wireapp/bot-api@11.0.5) (2022-03-01)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.3...@wireapp/bot-api@11.0.4) (2022-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.2...@wireapp/bot-api@11.0.3) (2022-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.1...@wireapp/bot-api@11.0.2) (2022-02-24)

**Note:** Version bump only for package @wireapp/bot-api





## [11.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@11.0.0...@wireapp/bot-api@11.0.1) (2022-02-24)

**Note:** Version bump only for package @wireapp/bot-api





# [11.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.28...@wireapp/bot-api@11.0.0) (2022-02-22)


### Features

* **api-client:** Allow setting a backend version ([#4226](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4226)) ([7cda792](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/7cda792e98ebcf4317dc165d9e027654fb11b78f))


### BREAKING CHANGES

* **api-client:** All the methods that were using useFederation do not need this parameter anymore (since the federation state is guessed from the api version number)





## [10.0.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.27...@wireapp/bot-api@10.0.28) (2022-02-21)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.26...@wireapp/bot-api@10.0.27) (2022-02-17)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.25...@wireapp/bot-api@10.0.26) (2022-02-01)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.24...@wireapp/bot-api@10.0.25) (2022-02-01)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.23...@wireapp/bot-api@10.0.24) (2022-02-01)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.22...@wireapp/bot-api@10.0.23) (2022-01-31)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.21...@wireapp/bot-api@10.0.22) (2022-01-19)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.20...@wireapp/bot-api@10.0.21) (2022-01-18)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.19...@wireapp/bot-api@10.0.20) (2022-01-18)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.18...@wireapp/bot-api@10.0.19) (2022-01-12)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.17...@wireapp/bot-api@10.0.18) (2022-01-12)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.16...@wireapp/bot-api@10.0.17) (2022-01-12)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.15...@wireapp/bot-api@10.0.16) (2022-01-11)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.14...@wireapp/bot-api@10.0.15) (2022-01-10)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.13...@wireapp/bot-api@10.0.14) (2022-01-10)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.12...@wireapp/bot-api@10.0.13) (2022-01-10)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.11...@wireapp/bot-api@10.0.12) (2022-01-10)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.10...@wireapp/bot-api@10.0.11) (2022-01-10)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.9...@wireapp/bot-api@10.0.10) (2022-01-06)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.8...@wireapp/bot-api@10.0.9) (2021-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.7...@wireapp/bot-api@10.0.8) (2021-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.6...@wireapp/bot-api@10.0.7) (2021-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.5...@wireapp/bot-api@10.0.6) (2021-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.4...@wireapp/bot-api@10.0.5) (2021-12-15)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.3...@wireapp/bot-api@10.0.4) (2021-12-14)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.2...@wireapp/bot-api@10.0.3) (2021-12-14)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.1...@wireapp/bot-api@10.0.2) (2021-12-09)

**Note:** Version bump only for package @wireapp/bot-api





## [10.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@10.0.0...@wireapp/bot-api@10.0.1) (2021-12-09)

**Note:** Version bump only for package @wireapp/bot-api





# [10.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@9.0.0...@wireapp/bot-api@10.0.0) (2021-12-08)


### Code Refactoring

* **core:** Harmonize asset param name ([#4199](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4199)) ([f29c825](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/f29c825df427e9fccae164a728f0071fdf1bc3af))


### BREAKING CHANGES

* **core:** The `imageAsset` property given to the `MessageBuilder.createImage` function has been renamed `asset` to be coherent with sending files.
Replace `MessageBuilder.createImage({..., imageAsset: asset})` with `MessageBuilder.createImage({..., asset})`





# [9.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@8.0.0...@wireapp/bot-api@9.0.0) (2021-12-08)


### Features

* **core:** Ability to cancel asset uploading ([#4198](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4198)) ([e111f46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/e111f46d06bf2ec22f2002c9a2954cdf0c9e8d09))


### BREAKING CHANGES

* **core:** Uploading an asset now return a structure that allow cancelling the upload. Thus instances of `await account.service.asset.uploadAsset(...)` must be replaced by 
```
const {cancel, response} = await account.service.asset.uploadAsset(...);
cancel() // This is how you cancel the upload
await response// This will contain the uploaded asset once the upload is done
```





# [8.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.68...@wireapp/bot-api@8.0.0) (2021-12-08)


### Features

* **core:** Make message builder stateless ([#4197](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4197)) ([95a51a6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/95a51a614b20730767916885182eb185b46c4c38))


### BREAKING CHANGES

* **core:** - `MessageBuilder` has been moved from `account.services.conversation.messageBuilder` to an own stateless class.
- All method of the `MessageBuilder` now take a required `from` parameter
- `MessageBuilder` is not uploading files under the hood. Upload must be done in a separate function call

Replace

```
const textPayload = account.service.conversation.messageBuilder.createText(...);
```

With

```
import {MessageBuilder} from '@wireapp/core/src/main/conversation/message/MessageBuilder';
//...
const textPayload = MessageBuilder.createText(...);
```

Replace

```
const linkPreview = await account.service.conversation.messageBuilder.createLinkPreview(...);
cons textPayload = account.service.conversation.messageBuilder.createText(...).withLinkPreview([linkPreview]);
```

With

```
cons textPayload = account.service.conversation.messageBuilder
    .createText(...)
    .withLinkPreview([await this.account.service.linkPreview.uploadLinkPreviewImage(newLinkPreview)]);
```





## [7.17.68](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.67...@wireapp/bot-api@7.17.68) (2021-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.67](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.66...@wireapp/bot-api@7.17.67) (2021-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.66](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.65...@wireapp/bot-api@7.17.66) (2021-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.65](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.64...@wireapp/bot-api@7.17.65) (2021-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.64](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.63...@wireapp/bot-api@7.17.64) (2021-12-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.62...@wireapp/bot-api@7.17.63) (2021-12-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.62](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.61...@wireapp/bot-api@7.17.62) (2021-12-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.61](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.60...@wireapp/bot-api@7.17.61) (2021-12-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.60](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.59...@wireapp/bot-api@7.17.60) (2021-12-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.59](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.58...@wireapp/bot-api@7.17.59) (2021-12-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.58](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.57...@wireapp/bot-api@7.17.58) (2021-11-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.57](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.56...@wireapp/bot-api@7.17.57) (2021-11-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.56](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.55...@wireapp/bot-api@7.17.56) (2021-11-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.55](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.54...@wireapp/bot-api@7.17.55) (2021-11-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.54](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.53...@wireapp/bot-api@7.17.54) (2021-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.53](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.52...@wireapp/bot-api@7.17.53) (2021-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.52](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.51...@wireapp/bot-api@7.17.52) (2021-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.51](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.50...@wireapp/bot-api@7.17.51) (2021-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.50](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.49...@wireapp/bot-api@7.17.50) (2021-11-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.49](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.48...@wireapp/bot-api@7.17.49) (2021-11-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.48](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.47...@wireapp/bot-api@7.17.48) (2021-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.46...@wireapp/bot-api@7.17.47) (2021-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.45...@wireapp/bot-api@7.17.46) (2021-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.44...@wireapp/bot-api@7.17.45) (2021-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.43...@wireapp/bot-api@7.17.44) (2021-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.42...@wireapp/bot-api@7.17.43) (2021-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.41...@wireapp/bot-api@7.17.42) (2021-11-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.40...@wireapp/bot-api@7.17.41) (2021-11-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.39...@wireapp/bot-api@7.17.40) (2021-11-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.38...@wireapp/bot-api@7.17.39) (2021-11-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.37...@wireapp/bot-api@7.17.38) (2021-11-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.36...@wireapp/bot-api@7.17.37) (2021-10-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.35...@wireapp/bot-api@7.17.36) (2021-10-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.34...@wireapp/bot-api@7.17.35) (2021-10-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.33...@wireapp/bot-api@7.17.34) (2021-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.32...@wireapp/bot-api@7.17.33) (2021-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.31...@wireapp/bot-api@7.17.32) (2021-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.30...@wireapp/bot-api@7.17.31) (2021-10-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.29...@wireapp/bot-api@7.17.30) (2021-10-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.28...@wireapp/bot-api@7.17.29) (2021-10-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.27...@wireapp/bot-api@7.17.28) (2021-10-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.26...@wireapp/bot-api@7.17.27) (2021-10-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.25...@wireapp/bot-api@7.17.26) (2021-10-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.24...@wireapp/bot-api@7.17.25) (2021-10-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.23...@wireapp/bot-api@7.17.24) (2021-10-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.22...@wireapp/bot-api@7.17.23) (2021-10-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.21...@wireapp/bot-api@7.17.22) (2021-10-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.20...@wireapp/bot-api@7.17.21) (2021-10-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.19...@wireapp/bot-api@7.17.20) (2021-10-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.18...@wireapp/bot-api@7.17.19) (2021-09-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.17...@wireapp/bot-api@7.17.18) (2021-09-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.16...@wireapp/bot-api@7.17.17) (2021-09-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.15...@wireapp/bot-api@7.17.16) (2021-09-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.14...@wireapp/bot-api@7.17.15) (2021-09-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.13...@wireapp/bot-api@7.17.14) (2021-09-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.12...@wireapp/bot-api@7.17.13) (2021-09-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.11...@wireapp/bot-api@7.17.12) (2021-09-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.10...@wireapp/bot-api@7.17.11) (2021-09-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.9...@wireapp/bot-api@7.17.10) (2021-09-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.8...@wireapp/bot-api@7.17.9) (2021-09-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.7...@wireapp/bot-api@7.17.8) (2021-09-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.6...@wireapp/bot-api@7.17.7) (2021-09-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.5...@wireapp/bot-api@7.17.6) (2021-09-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.4...@wireapp/bot-api@7.17.5) (2021-09-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.3...@wireapp/bot-api@7.17.4) (2021-09-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.2...@wireapp/bot-api@7.17.3) (2021-09-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.1...@wireapp/bot-api@7.17.2) (2021-09-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.17.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.17.0...@wireapp/bot-api@7.17.1) (2021-09-07)

**Note:** Version bump only for package @wireapp/bot-api





# [7.17.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.26...@wireapp/bot-api@7.17.0) (2021-08-30)


### Features

* **api-client:** Get self domain when creating context ([#4121](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/4121)) ([16d0a8c](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/16d0a8c75c6cefd03ba520542dd7da18d6541540))





## [7.16.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.25...@wireapp/bot-api@7.16.26) (2021-08-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.24...@wireapp/bot-api@7.16.25) (2021-08-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.23...@wireapp/bot-api@7.16.24) (2021-08-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.22...@wireapp/bot-api@7.16.23) (2021-08-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.21...@wireapp/bot-api@7.16.22) (2021-08-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.20...@wireapp/bot-api@7.16.21) (2021-08-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.19...@wireapp/bot-api@7.16.20) (2021-08-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.18...@wireapp/bot-api@7.16.19) (2021-08-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.17...@wireapp/bot-api@7.16.18) (2021-08-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.16...@wireapp/bot-api@7.16.17) (2021-08-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.15...@wireapp/bot-api@7.16.16) (2021-08-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.14...@wireapp/bot-api@7.16.15) (2021-07-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.13...@wireapp/bot-api@7.16.14) (2021-07-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.12...@wireapp/bot-api@7.16.13) (2021-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.11...@wireapp/bot-api@7.16.12) (2021-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.10...@wireapp/bot-api@7.16.11) (2021-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.9...@wireapp/bot-api@7.16.10) (2021-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.8...@wireapp/bot-api@7.16.9) (2021-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.7...@wireapp/bot-api@7.16.8) (2021-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.6...@wireapp/bot-api@7.16.7) (2021-07-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.5...@wireapp/bot-api@7.16.6) (2021-07-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.4...@wireapp/bot-api@7.16.5) (2021-07-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.3...@wireapp/bot-api@7.16.4) (2021-07-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.2...@wireapp/bot-api@7.16.3) (2021-07-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.1...@wireapp/bot-api@7.16.2) (2021-07-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.16.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.16.0...@wireapp/bot-api@7.16.1) (2021-07-12)

**Note:** Version bump only for package @wireapp/bot-api





# [7.16.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.26...@wireapp/bot-api@7.16.0) (2021-07-12)


### Features

* **api-client,core:** Send OTR messages to federated users (SQCORE-789) ([#3979](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3979)) ([2915e87](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/2915e8718657054b5d619d3d2300eccb0202c05d))





## [7.15.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.25...@wireapp/bot-api@7.15.26) (2021-07-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.24...@wireapp/bot-api@7.15.25) (2021-06-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.23...@wireapp/bot-api@7.15.24) (2021-06-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.22...@wireapp/bot-api@7.15.23) (2021-06-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.21...@wireapp/bot-api@7.15.22) (2021-06-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.20...@wireapp/bot-api@7.15.21) (2021-06-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.19...@wireapp/bot-api@7.15.20) (2021-06-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.18...@wireapp/bot-api@7.15.19) (2021-05-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.17...@wireapp/bot-api@7.15.18) (2021-05-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.16...@wireapp/bot-api@7.15.17) (2021-05-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.15...@wireapp/bot-api@7.15.16) (2021-05-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.14...@wireapp/bot-api@7.15.15) (2021-05-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.13...@wireapp/bot-api@7.15.14) (2021-05-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.12...@wireapp/bot-api@7.15.13) (2021-05-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.11...@wireapp/bot-api@7.15.12) (2021-05-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.10...@wireapp/bot-api@7.15.11) (2021-05-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.9...@wireapp/bot-api@7.15.10) (2021-05-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.8...@wireapp/bot-api@7.15.9) (2021-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.7...@wireapp/bot-api@7.15.8) (2021-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.6...@wireapp/bot-api@7.15.7) (2021-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.5...@wireapp/bot-api@7.15.6) (2021-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.4...@wireapp/bot-api@7.15.5) (2021-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.3...@wireapp/bot-api@7.15.4) (2021-05-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.2...@wireapp/bot-api@7.15.3) (2021-05-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.1...@wireapp/bot-api@7.15.2) (2021-05-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.15.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.15.0...@wireapp/bot-api@7.15.1) (2021-05-14)

**Note:** Version bump only for package @wireapp/bot-api





# [7.15.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.14.0...@wireapp/bot-api@7.15.0) (2021-05-14)


### Features

* **bot-api:** Send file from path ([#3853](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3853)) ([dccb005](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/dccb0059deefea67d00748baf609e074f1c49c0a))





# [7.14.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.13.0...@wireapp/bot-api@7.14.0) (2021-05-14)


### Features

* **bot-api:** Expose sending pings ([#3852](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3852)) ([03451db](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/03451dbbdedc6a3627bca303562f9e429557c74e))





# [7.13.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.142...@wireapp/bot-api@7.13.0) (2021-05-12)


### Features

* **api-client:** Bump @types/jasmine from 3.6.10 to 3.7.2 ([#3835](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3835)) ([308ab5d](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/308ab5d359824ef3b6e4c032e918ff8f8f324b99))
* **core:** Add cipher options for encrypting assets and use named parameters (SQCORE-644) ([#3842](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3842)) ([580d5cd](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/580d5cd3249ff08a2a4e328ac557ec3afd6d395f))





## [7.11.142](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.141...@wireapp/bot-api@7.11.142) (2021-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.141](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.140...@wireapp/bot-api@7.11.141) (2021-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.140](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.139...@wireapp/bot-api@7.11.140) (2021-05-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.139](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.138...@wireapp/bot-api@7.11.139) (2021-05-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.138](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.137...@wireapp/bot-api@7.11.138) (2021-05-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.137](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.136...@wireapp/bot-api@7.11.137) (2021-05-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.136](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.135...@wireapp/bot-api@7.11.136) (2021-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.135](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.134...@wireapp/bot-api@7.11.135) (2021-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.134](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.133...@wireapp/bot-api@7.11.134) (2021-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.133](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.132...@wireapp/bot-api@7.11.133) (2021-05-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.132](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.131...@wireapp/bot-api@7.11.132) (2021-05-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.131](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.130...@wireapp/bot-api@7.11.131) (2021-04-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.130](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.129...@wireapp/bot-api@7.11.130) (2021-04-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.129](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.128...@wireapp/bot-api@7.11.129) (2021-04-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.128](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.127...@wireapp/bot-api@7.11.128) (2021-04-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.127](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.126...@wireapp/bot-api@7.11.127) (2021-04-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.126](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.125...@wireapp/bot-api@7.11.126) (2021-04-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.125](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.124...@wireapp/bot-api@7.11.125) (2021-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.124](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.123...@wireapp/bot-api@7.11.124) (2021-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.123](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.122...@wireapp/bot-api@7.11.123) (2021-04-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.122](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.121...@wireapp/bot-api@7.11.122) (2021-04-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.121](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.120...@wireapp/bot-api@7.11.121) (2021-04-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.120](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.119...@wireapp/bot-api@7.11.120) (2021-04-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.119](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.118...@wireapp/bot-api@7.11.119) (2021-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.118](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.117...@wireapp/bot-api@7.11.118) (2021-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.117](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.116...@wireapp/bot-api@7.11.117) (2021-04-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.116](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.115...@wireapp/bot-api@7.11.116) (2021-04-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.115](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.114...@wireapp/bot-api@7.11.115) (2021-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.114](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.113...@wireapp/bot-api@7.11.114) (2021-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.113](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.112...@wireapp/bot-api@7.11.113) (2021-03-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.112](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.111...@wireapp/bot-api@7.11.112) (2021-03-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.111](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.110...@wireapp/bot-api@7.11.111) (2021-03-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.110](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.109...@wireapp/bot-api@7.11.110) (2021-03-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.109](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.108...@wireapp/bot-api@7.11.109) (2021-03-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.108](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.107...@wireapp/bot-api@7.11.108) (2021-03-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.107](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.106...@wireapp/bot-api@7.11.107) (2021-03-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.106](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.105...@wireapp/bot-api@7.11.106) (2021-02-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.105](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.104...@wireapp/bot-api@7.11.105) (2021-02-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.104](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.103...@wireapp/bot-api@7.11.104) (2021-02-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.103](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.102...@wireapp/bot-api@7.11.103) (2021-02-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.102](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.101...@wireapp/bot-api@7.11.102) (2021-02-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.101](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.100...@wireapp/bot-api@7.11.101) (2021-02-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.100](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.99...@wireapp/bot-api@7.11.100) (2021-02-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.99](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.98...@wireapp/bot-api@7.11.99) (2021-02-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.98](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.97...@wireapp/bot-api@7.11.98) (2021-02-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.97](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.96...@wireapp/bot-api@7.11.97) (2021-02-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.96](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.95...@wireapp/bot-api@7.11.96) (2021-02-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.95](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.94...@wireapp/bot-api@7.11.95) (2021-02-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.94](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.93...@wireapp/bot-api@7.11.94) (2021-02-05)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.93](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.92...@wireapp/bot-api@7.11.93) (2021-02-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.92](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.91...@wireapp/bot-api@7.11.92) (2021-02-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.91](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.90...@wireapp/bot-api@7.11.91) (2021-02-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.90](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.89...@wireapp/bot-api@7.11.90) (2021-01-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.89](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.88...@wireapp/bot-api@7.11.89) (2021-01-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.88](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.87...@wireapp/bot-api@7.11.88) (2021-01-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.87](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.86...@wireapp/bot-api@7.11.87) (2021-01-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.86](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.85...@wireapp/bot-api@7.11.86) (2021-01-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.85](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.84...@wireapp/bot-api@7.11.85) (2021-01-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.84](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.83...@wireapp/bot-api@7.11.84) (2021-01-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.83](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.82...@wireapp/bot-api@7.11.83) (2021-01-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.82](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.81...@wireapp/bot-api@7.11.82) (2021-01-12)


### Bug Fixes

* **priority-queue:** Run tests with Jasmine 3.6 ([#3441](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3441)) ([cd92afe](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/cd92afe589816a78005cf81d90722a83fc1c52ac))





## [7.11.81](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.80...@wireapp/bot-api@7.11.81) (2021-01-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.80](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.79...@wireapp/bot-api@7.11.80) (2021-01-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.79](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.78...@wireapp/bot-api@7.11.79) (2020-12-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.78](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.77...@wireapp/bot-api@7.11.78) (2020-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.77](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.76...@wireapp/bot-api@7.11.77) (2020-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.76](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.75...@wireapp/bot-api@7.11.76) (2020-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.75](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.74...@wireapp/bot-api@7.11.75) (2020-11-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.74](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.73...@wireapp/bot-api@7.11.74) (2020-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.73](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.72...@wireapp/bot-api@7.11.73) (2020-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.72](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.71...@wireapp/bot-api@7.11.72) (2020-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.71](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.70...@wireapp/bot-api@7.11.71) (2020-11-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.70](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.69...@wireapp/bot-api@7.11.70) (2020-11-25)


### Bug Fixes

* **bot-api:** Keep compiled code from test run for release ([#3346](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3346)) ([4bd63d5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/4bd63d5ef8d85a23542d0bafa926ba544ec04e08))





## [7.11.69](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.68...@wireapp/bot-api@7.11.69) (2020-11-25)


### Bug Fixes

* **bot-api:** Migrate tests to TypeScript ([#3345](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3345)) ([39f757f](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/39f757fb95898b081e39cb681885143283604c3b))





## [7.11.68](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.67...@wireapp/bot-api@7.11.68) (2020-11-25)


### Bug Fixes

* **bot-api:** Publish source files on npm ([#3343](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3343)) ([4aba0ee](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/4aba0eec2d70e7ecafe6937f88d40f0e94a02c93))





## [7.11.67](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.66...@wireapp/bot-api@7.11.67) (2020-11-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.66](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.65...@wireapp/bot-api@7.11.66) (2020-11-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.65](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.64...@wireapp/bot-api@7.11.65) (2020-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.64](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.63...@wireapp/bot-api@7.11.64) (2020-11-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.62...@wireapp/bot-api@7.11.63) (2020-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.62](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.61...@wireapp/bot-api@7.11.62) (2020-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.61](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.60...@wireapp/bot-api@7.11.61) (2020-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.60](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.59...@wireapp/bot-api@7.11.60) (2020-11-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.59](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.58...@wireapp/bot-api@7.11.59) (2020-11-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.58](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.57...@wireapp/bot-api@7.11.58) (2020-11-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.57](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.56...@wireapp/bot-api@7.11.57) (2020-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.56](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.55...@wireapp/bot-api@7.11.56) (2020-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.55](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.54...@wireapp/bot-api@7.11.55) (2020-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.54](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.53...@wireapp/bot-api@7.11.54) (2020-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.53](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.52...@wireapp/bot-api@7.11.53) (2020-11-10)


### Bug Fixes

* Don't publish test files ([#3320](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3320)) ([8248b19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/8248b194033242123f023355d67230afcfe6ede8))





## [7.11.52](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.51...@wireapp/bot-api@7.11.52) (2020-11-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.51](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.50...@wireapp/bot-api@7.11.51) (2020-11-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.50](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.49...@wireapp/bot-api@7.11.50) (2020-10-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.49](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.48...@wireapp/bot-api@7.11.49) (2020-10-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.48](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.47...@wireapp/bot-api@7.11.48) (2020-10-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.46...@wireapp/bot-api@7.11.47) (2020-10-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.45...@wireapp/bot-api@7.11.46) (2020-10-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.44...@wireapp/bot-api@7.11.45) (2020-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.43...@wireapp/bot-api@7.11.44) (2020-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.42...@wireapp/bot-api@7.11.43) (2020-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.41...@wireapp/bot-api@7.11.42) (2020-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.40...@wireapp/bot-api@7.11.41) (2020-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.39...@wireapp/bot-api@7.11.40) (2020-10-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.38...@wireapp/bot-api@7.11.39) (2020-10-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.37...@wireapp/bot-api@7.11.38) (2020-10-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.36...@wireapp/bot-api@7.11.37) (2020-10-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.35...@wireapp/bot-api@7.11.36) (2020-10-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.34...@wireapp/bot-api@7.11.35) (2020-10-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.33...@wireapp/bot-api@7.11.34) (2020-10-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.32...@wireapp/bot-api@7.11.33) (2020-10-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.31...@wireapp/bot-api@7.11.32) (2020-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.30...@wireapp/bot-api@7.11.31) (2020-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.29...@wireapp/bot-api@7.11.30) (2020-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.28...@wireapp/bot-api@7.11.29) (2020-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.27...@wireapp/bot-api@7.11.28) (2020-10-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.26...@wireapp/bot-api@7.11.27) (2020-10-13)


### Bug Fixes

* **bot-api,bot-handler-avs,bot-handler-debug,bot-handler-uptime,bot-handler-wizard,cbor,cli-client:** Upload type definitions to npm ([#3266](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3266)) ([1338830](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/1338830008164267f084ee1508b6a6c0e679640a))





## [7.11.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.25...@wireapp/bot-api@7.11.26) (2020-10-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.24...@wireapp/bot-api@7.11.25) (2020-10-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.23...@wireapp/bot-api@7.11.24) (2020-10-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.22...@wireapp/bot-api@7.11.23) (2020-10-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.21...@wireapp/bot-api@7.11.22) (2020-10-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.20...@wireapp/bot-api@7.11.21) (2020-10-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.19...@wireapp/bot-api@7.11.20) (2020-10-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.18...@wireapp/bot-api@7.11.19) (2020-10-05)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.17...@wireapp/bot-api@7.11.18) (2020-09-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.16...@wireapp/bot-api@7.11.17) (2020-09-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.15...@wireapp/bot-api@7.11.16) (2020-09-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.14...@wireapp/bot-api@7.11.15) (2020-09-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.13...@wireapp/bot-api@7.11.14) (2020-09-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.12...@wireapp/bot-api@7.11.13) (2020-09-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.11...@wireapp/bot-api@7.11.12) (2020-09-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.10...@wireapp/bot-api@7.11.11) (2020-09-01)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.9...@wireapp/bot-api@7.11.10) (2020-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.8...@wireapp/bot-api@7.11.9) (2020-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.7...@wireapp/bot-api@7.11.8) (2020-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.6...@wireapp/bot-api@7.11.7) (2020-08-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.5...@wireapp/bot-api@7.11.6) (2020-08-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.4...@wireapp/bot-api@7.11.5) (2020-08-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.3...@wireapp/bot-api@7.11.4) (2020-08-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.2...@wireapp/bot-api@7.11.3) (2020-08-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.1...@wireapp/bot-api@7.11.2) (2020-08-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.11.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.11.0...@wireapp/bot-api@7.11.1) (2020-08-12)

**Note:** Version bump only for package @wireapp/bot-api





# [7.11.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.32...@wireapp/bot-api@7.11.0) (2020-08-12)


### Features

* **api-client,bot-api,core:** Send messages to specific clients only ([#3175](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3175)) ([4ef1edd](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/4ef1eddb1bc906552486a3680107ee00a8c8715e))





## [7.10.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.31...@wireapp/bot-api@7.10.32) (2020-08-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.30...@wireapp/bot-api@7.10.31) (2020-08-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.29...@wireapp/bot-api@7.10.30) (2020-08-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.28...@wireapp/bot-api@7.10.29) (2020-08-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.27...@wireapp/bot-api@7.10.28) (2020-08-07)


### Bug Fixes

* **bot-api,core:** Don't re-init an initialized store engine ([#3163](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3163)) ([59121d2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/59121d2e45ec371f219f7f65241bd2c6224d7577))





## [7.10.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.26...@wireapp/bot-api@7.10.27) (2020-08-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.25...@wireapp/bot-api@7.10.26) (2020-08-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.24...@wireapp/bot-api@7.10.25) (2020-08-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.23...@wireapp/bot-api@7.10.24) (2020-07-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.22...@wireapp/bot-api@7.10.23) (2020-07-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.21...@wireapp/bot-api@7.10.22) (2020-07-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.20...@wireapp/bot-api@7.10.21) (2020-07-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.19...@wireapp/bot-api@7.10.20) (2020-07-20)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.18...@wireapp/bot-api@7.10.19) (2020-07-17)


### Bug Fixes

* **bot-api:** Use Account api instead of api-client ([#3122](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3122)) ([42fff6c](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/42fff6c9be5c614c974335a44746f9ae10c97bfa))





## [7.10.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.17...@wireapp/bot-api@7.10.18) (2020-07-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.16...@wireapp/bot-api@7.10.17) (2020-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.15...@wireapp/bot-api@7.10.16) (2020-07-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.14...@wireapp/bot-api@7.10.15) (2020-07-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.13...@wireapp/bot-api@7.10.14) (2020-07-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.12...@wireapp/bot-api@7.10.13) (2020-07-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.11...@wireapp/bot-api@7.10.12) (2020-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.10...@wireapp/bot-api@7.10.11) (2020-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.9...@wireapp/bot-api@7.10.10) (2020-07-06)


### Bug Fixes

* **core, bot-api:** Move access token refresh handler to bot-api ([#3099](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3099)) ([da102cc](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/da102cc89ca34799c59ccd2435d6d4919d7e9c3b))





## [7.10.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.8...@wireapp/bot-api@7.10.9) (2020-07-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.7...@wireapp/bot-api@7.10.8) (2020-06-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.6...@wireapp/bot-api@7.10.7) (2020-06-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.5...@wireapp/bot-api@7.10.6) (2020-06-30)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.4...@wireapp/bot-api@7.10.5) (2020-06-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.3...@wireapp/bot-api@7.10.4) (2020-06-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.2...@wireapp/bot-api@7.10.3) (2020-06-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.1...@wireapp/bot-api@7.10.2) (2020-06-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.10.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.10.0...@wireapp/bot-api@7.10.1) (2020-06-10)

**Note:** Version bump only for package @wireapp/bot-api





# [7.10.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.47...@wireapp/bot-api@7.10.0) (2020-06-05)


### Features

* **bot-api:** Reuse cookie to login ([#3061](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/3061)) ([0ec66a1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/0ec66a1505719d36e19991a1d12076041c224dc6))





## [7.9.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.46...@wireapp/bot-api@7.9.47) (2020-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.45...@wireapp/bot-api@7.9.46) (2020-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.44...@wireapp/bot-api@7.9.45) (2020-06-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.43...@wireapp/bot-api@7.9.44) (2020-05-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.42...@wireapp/bot-api@7.9.43) (2020-05-26)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.41...@wireapp/bot-api@7.9.42) (2020-05-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.40...@wireapp/bot-api@7.9.41) (2020-05-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.39...@wireapp/bot-api@7.9.40) (2020-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.38...@wireapp/bot-api@7.9.39) (2020-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.37...@wireapp/bot-api@7.9.38) (2020-05-19)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.36...@wireapp/bot-api@7.9.37) (2020-05-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.35...@wireapp/bot-api@7.9.36) (2020-05-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.34...@wireapp/bot-api@7.9.35) (2020-05-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.33...@wireapp/bot-api@7.9.34) (2020-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.32...@wireapp/bot-api@7.9.33) (2020-05-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.31...@wireapp/bot-api@7.9.32) (2020-05-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.30...@wireapp/bot-api@7.9.31) (2020-05-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.29...@wireapp/bot-api@7.9.30) (2020-05-07)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.28...@wireapp/bot-api@7.9.29) (2020-05-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.27...@wireapp/bot-api@7.9.28) (2020-05-05)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.26...@wireapp/bot-api@7.9.27) (2020-05-05)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.25...@wireapp/bot-api@7.9.26) (2020-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.24...@wireapp/bot-api@7.9.25) (2020-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.23...@wireapp/bot-api@7.9.24) (2020-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.22...@wireapp/bot-api@7.9.23) (2020-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.21...@wireapp/bot-api@7.9.22) (2020-05-04)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.20...@wireapp/bot-api@7.9.21) (2020-04-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.19...@wireapp/bot-api@7.9.20) (2020-04-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.18...@wireapp/bot-api@7.9.19) (2020-04-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.17...@wireapp/bot-api@7.9.18) (2020-04-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.16...@wireapp/bot-api@7.9.17) (2020-04-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.15...@wireapp/bot-api@7.9.16) (2020-04-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.14...@wireapp/bot-api@7.9.15) (2020-04-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.13...@wireapp/bot-api@7.9.14) (2020-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.12...@wireapp/bot-api@7.9.13) (2020-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.11...@wireapp/bot-api@7.9.12) (2020-04-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.10...@wireapp/bot-api@7.9.11) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.9...@wireapp/bot-api@7.9.10) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.8...@wireapp/bot-api@7.9.9) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.7...@wireapp/bot-api@7.9.8) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.6...@wireapp/bot-api@7.9.7) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.5...@wireapp/bot-api@7.9.6) (2020-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.4...@wireapp/bot-api@7.9.5) (2020-04-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.3...@wireapp/bot-api@7.9.4) (2020-04-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.2...@wireapp/bot-api@7.9.3) (2020-04-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.1...@wireapp/bot-api@7.9.2) (2020-04-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.9.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.9.0...@wireapp/bot-api@7.9.1) (2020-04-15)

**Note:** Version bump only for package @wireapp/bot-api





# [7.9.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.8.3...@wireapp/bot-api@7.9.0) (2020-04-15)


### Features

* **bot-api:** Return API client on start ([#2953](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2953)) ([f45c666](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/f45c666eddd57116c7657bf27a3489c8e8579f04))





## [7.8.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.8.2...@wireapp/bot-api@7.8.3) (2020-04-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.8.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.8.1...@wireapp/bot-api@7.8.2) (2020-04-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.8.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.8.0...@wireapp/bot-api@7.8.1) (2020-04-14)

**Note:** Version bump only for package @wireapp/bot-api





# [7.8.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.15...@wireapp/bot-api@7.8.0) (2020-04-14)


### Features

* **core,bot-api:** Add CompositeContentBuilder ([#2948](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2948)) ([d838a9b](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/d838a9b4d111804c0bdc8f915c48719c6ce2c75e))





## [7.7.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.14...@wireapp/bot-api@7.7.15) (2020-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.13...@wireapp/bot-api@7.7.14) (2020-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.12...@wireapp/bot-api@7.7.13) (2020-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.11...@wireapp/bot-api@7.7.12) (2020-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.10...@wireapp/bot-api@7.7.11) (2020-04-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.9...@wireapp/bot-api@7.7.10) (2020-04-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.8...@wireapp/bot-api@7.7.9) (2020-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.7...@wireapp/bot-api@7.7.8) (2020-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.6...@wireapp/bot-api@7.7.7) (2020-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.5...@wireapp/bot-api@7.7.6) (2020-04-02)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.4...@wireapp/bot-api@7.7.5) (2020-03-31)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.3...@wireapp/bot-api@7.7.4) (2020-03-31)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.2...@wireapp/bot-api@7.7.3) (2020-03-31)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.1...@wireapp/bot-api@7.7.2) (2020-03-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.7.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.7.0...@wireapp/bot-api@7.7.1) (2020-03-26)

**Note:** Version bump only for package @wireapp/bot-api





# [7.7.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.5...@wireapp/bot-api@7.7.0) (2020-03-25)


### Features

* **bot-api:** Add poll support ([#2899](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2899)) ([f2cce16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/f2cce16fa3c3ad0cb394d6b75c97d34d2ae27272))





## [7.6.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.4...@wireapp/bot-api@7.6.5) (2020-03-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.6.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.3...@wireapp/bot-api@7.6.4) (2020-03-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.6.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.2...@wireapp/bot-api@7.6.3) (2020-03-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.6.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.1...@wireapp/bot-api@7.6.2) (2020-03-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.6.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.6.0...@wireapp/bot-api@7.6.1) (2020-03-13)

**Note:** Version bump only for package @wireapp/bot-api





# [7.6.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.5.0...@wireapp/bot-api@7.6.0) (2020-03-13)


### Features

* **bot-api:** Add admin permission demo script ([#2875](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2875)) ([9870e87](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/9870e8720a6105bed65b91cacbbae031705d7fb0))





# [7.5.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.17...@wireapp/bot-api@7.5.0) (2020-03-11)


### Features

* **bot-api:** Manage conversation permissions ([#2874](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2874)) ([b05679f](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/b05679fb372562cdb990cae65f9acb3ae47bf4b8))





## [7.4.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.16...@wireapp/bot-api@7.4.17) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.15...@wireapp/bot-api@7.4.16) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.14...@wireapp/bot-api@7.4.15) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.13...@wireapp/bot-api@7.4.14) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.12...@wireapp/bot-api@7.4.13) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.11...@wireapp/bot-api@7.4.12) (2020-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.10...@wireapp/bot-api@7.4.11) (2020-03-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.9...@wireapp/bot-api@7.4.10) (2020-03-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.8...@wireapp/bot-api@7.4.9) (2020-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.7...@wireapp/bot-api@7.4.8) (2020-02-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.6...@wireapp/bot-api@7.4.7) (2020-02-18)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.5...@wireapp/bot-api@7.4.6) (2020-02-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.4...@wireapp/bot-api@7.4.5) (2020-02-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.3...@wireapp/bot-api@7.4.4) (2020-01-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.2...@wireapp/bot-api@7.4.3) (2020-01-24)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.1...@wireapp/bot-api@7.4.2) (2020-01-23)

**Note:** Version bump only for package @wireapp/bot-api





## [7.4.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.4.0...@wireapp/bot-api@7.4.1) (2020-01-23)

**Note:** Version bump only for package @wireapp/bot-api





# [7.4.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.3.2...@wireapp/bot-api@7.4.0) (2020-01-17)


### Features

* **bot-api:** Add get conversation endpoints ([#2766](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2766)) ([b99632a](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/b99632a877320753aba38724c6d1b50533c1972c))





## [7.3.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.3.1...@wireapp/bot-api@7.3.2) (2020-01-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.3.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.3.0...@wireapp/bot-api@7.3.1) (2020-01-16)

**Note:** Version bump only for package @wireapp/bot-api





# [7.3.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.2.0...@wireapp/bot-api@7.3.0) (2020-01-16)


### Features

* **bot-api:** Use message to send a quote ([#2762](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2762)) ([d794eaf](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/d794eaff776d85e6c00c99379436d94fad77cdb2))





# [7.2.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.38...@wireapp/bot-api@7.2.0) (2020-01-16)


### Features

* **bot-api:** Add quote sending ([#2761](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2761)) ([fd59573](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/fd595732016774f03a03da86db75babb4f346fb8))





## [7.1.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.37...@wireapp/bot-api@7.1.38) (2020-01-15)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.36...@wireapp/bot-api@7.1.37) (2020-01-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.35...@wireapp/bot-api@7.1.36) (2020-01-14)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.34...@wireapp/bot-api@7.1.35) (2020-01-13)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.33...@wireapp/bot-api@7.1.34) (2020-01-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.32...@wireapp/bot-api@7.1.33) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.31...@wireapp/bot-api@7.1.32) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.30...@wireapp/bot-api@7.1.31) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.29...@wireapp/bot-api@7.1.30) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.28...@wireapp/bot-api@7.1.29) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.27...@wireapp/bot-api@7.1.28) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.26...@wireapp/bot-api@7.1.27) (2020-01-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.25...@wireapp/bot-api@7.1.26) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.24...@wireapp/bot-api@7.1.25) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.23...@wireapp/bot-api@7.1.24) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.22...@wireapp/bot-api@7.1.23) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.21...@wireapp/bot-api@7.1.22) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.20...@wireapp/bot-api@7.1.21) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.19...@wireapp/bot-api@7.1.20) (2020-01-08)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.18...@wireapp/bot-api@7.1.19) (2020-01-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.17...@wireapp/bot-api@7.1.18) (2019-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.16...@wireapp/bot-api@7.1.17) (2019-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.15...@wireapp/bot-api@7.1.16) (2019-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.14...@wireapp/bot-api@7.1.15) (2019-12-16)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.13...@wireapp/bot-api@7.1.14) (2019-12-12)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.12...@wireapp/bot-api@7.1.13) (2019-12-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.11...@wireapp/bot-api@7.1.12) (2019-12-11)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.10...@wireapp/bot-api@7.1.11) (2019-12-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.9...@wireapp/bot-api@7.1.10) (2019-12-10)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.8...@wireapp/bot-api@7.1.9) (2019-12-09)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.7...@wireapp/bot-api@7.1.8) (2019-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.6...@wireapp/bot-api@7.1.7) (2019-12-03)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.5...@wireapp/bot-api@7.1.6) (2019-11-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.4...@wireapp/bot-api@7.1.5) (2019-11-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.3...@wireapp/bot-api@7.1.4) (2019-11-29)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.2...@wireapp/bot-api@7.1.3) (2019-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.1...@wireapp/bot-api@7.1.2) (2019-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [7.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.1.0...@wireapp/bot-api@7.1.1) (2019-11-26)

**Note:** Version bump only for package @wireapp/bot-api





# [7.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.9...@wireapp/bot-api@7.1.0) (2019-11-26)


### Features

* **core:** Expose "init" and "register" calls from API client ([#2590](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2590)) ([d1ff7ec](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/d1ff7ec4b56708fb7f398e988ea0b93eeade1a70))





## [7.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.8...@wireapp/bot-api@7.0.9) (2019-11-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.7...@wireapp/bot-api@7.0.8) (2019-11-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.6...@wireapp/bot-api@7.0.7) (2019-11-25)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.5...@wireapp/bot-api@7.0.6) (2019-11-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.4...@wireapp/bot-api@7.0.5) (2019-11-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.3...@wireapp/bot-api@7.0.4) (2019-11-22)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.2...@wireapp/bot-api@7.0.3) (2019-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.1...@wireapp/bot-api@7.0.2) (2019-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [7.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@7.0.0...@wireapp/bot-api@7.0.1) (2019-11-21)

**Note:** Version bump only for package @wireapp/bot-api





# [7.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.16...@wireapp/bot-api@7.0.0) (2019-11-21)


### Code Refactoring

* **api-client,bot-api,changelog-bot,cli-client,commons,core,store-engine-bro-fs,store-engine-dexie,store-engine-fs,store-engine-sqleet,store-engine-web-storage,travis-bot:** Remove store engine from API client ([#2558](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2558)) ([6b8ba89](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/6b8ba892c85ca43cd498a7b3d56a20a31f8578a4))


### BREAKING CHANGES

* **api-client,bot-api,changelog-bot,cli-client,commons,core,store-engine-bro-fs,store-engine-dexie,store-engine-fs,store-engine-sqleet,store-engine-web-storage,travis-bot:** Store engine has been removed from "api-client" and needs to be initialized with a provider function within the "core" construction.





## [6.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.15...@wireapp/bot-api@6.0.16) (2019-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.14...@wireapp/bot-api@6.0.15) (2019-11-20)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.13...@wireapp/bot-api@6.0.14) (2019-11-19)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.12...@wireapp/bot-api@6.0.13) (2019-11-12)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.11...@wireapp/bot-api@6.0.12) (2019-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.10...@wireapp/bot-api@6.0.11) (2019-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.9...@wireapp/bot-api@6.0.10) (2019-11-11)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.8...@wireapp/bot-api@6.0.9) (2019-11-06)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.7...@wireapp/bot-api@6.0.8) (2019-10-30)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.6...@wireapp/bot-api@6.0.7) (2019-10-30)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.5...@wireapp/bot-api@6.0.6) (2019-10-30)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.4...@wireapp/bot-api@6.0.5) (2019-10-30)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.3...@wireapp/bot-api@6.0.4) (2019-10-30)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.2...@wireapp/bot-api@6.0.3) (2019-10-29)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.1...@wireapp/bot-api@6.0.2) (2019-10-28)

**Note:** Version bump only for package @wireapp/bot-api





## [6.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@6.0.0...@wireapp/bot-api@6.0.1) (2019-10-28)

**Note:** Version bump only for package @wireapp/bot-api





# [6.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.1.2...@wireapp/bot-api@6.0.0) (2019-10-25)


### Features

* **api-client,bot-api,core,cryptobox,store-engine:** Declare emitted events (BREAKING) ([#2479](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2479)) ([6febfe7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/6febfe75b6196c31a465116bd182c8ca5de8bc07))


### BREAKING CHANGES

* **api-client,bot-api,core,cryptobox,store-engine:** Topics are not exported directly anymore.





## [5.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.1.1...@wireapp/bot-api@5.1.2) (2019-10-25)

**Note:** Version bump only for package @wireapp/bot-api





## [5.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.1.0...@wireapp/bot-api@5.1.1) (2019-10-24)


### Bug Fixes

* **core:** Return single user info ([#2472](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2472)) ([e636cdd](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/e636cddd41bd66d8cb12ee8e1a33d1a2bd665c7f))





# [5.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.24...@wireapp/bot-api@5.1.0) (2019-10-23)


### Features

* **bot-api:** Query user info ([#2458](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2458)) ([8b38edd](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/8b38edd85d2140c6bdb04b22e0e71d61563355f7))





## [5.0.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.23...@wireapp/bot-api@5.0.24) (2019-10-21)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.22...@wireapp/bot-api@5.0.23) (2019-10-18)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.21...@wireapp/bot-api@5.0.22) (2019-10-17)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.20...@wireapp/bot-api@5.0.21) (2019-10-16)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.19...@wireapp/bot-api@5.0.20) (2019-10-16)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.18...@wireapp/bot-api@5.0.19) (2019-10-16)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.17...@wireapp/bot-api@5.0.18) (2019-10-16)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.16...@wireapp/bot-api@5.0.17) (2019-10-16)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.15...@wireapp/bot-api@5.0.16) (2019-10-15)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.14...@wireapp/bot-api@5.0.15) (2019-10-14)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.13...@wireapp/bot-api@5.0.14) (2019-10-14)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.12...@wireapp/bot-api@5.0.13) (2019-10-10)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.11...@wireapp/bot-api@5.0.12) (2019-10-09)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.10...@wireapp/bot-api@5.0.11) (2019-10-09)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.9...@wireapp/bot-api@5.0.10) (2019-10-08)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.8...@wireapp/bot-api@5.0.9) (2019-10-07)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.7...@wireapp/bot-api@5.0.8) (2019-10-07)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.6...@wireapp/bot-api@5.0.7) (2019-10-02)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.5...@wireapp/bot-api@5.0.6) (2019-10-02)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.4...@wireapp/bot-api@5.0.5) (2019-10-01)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.3...@wireapp/bot-api@5.0.4) (2019-10-01)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.2...@wireapp/bot-api@5.0.3) (2019-10-01)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.1...@wireapp/bot-api@5.0.2) (2019-10-01)

**Note:** Version bump only for package @wireapp/bot-api





## [5.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@5.0.0...@wireapp/bot-api@5.0.1) (2019-09-30)

**Note:** Version bump only for package @wireapp/bot-api





# [5.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.32...@wireapp/bot-api@5.0.0) (2019-09-30)


### Features

* **api-client,core:** Process notification stream (BREAKING CHANGE) ([#2337](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2337)) ([9d315ee](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/9d315ee))


### BREAKING CHANGES

* **api-client,core:** - Moved AudioPreference & NotificationPreference types next to UserPropertiesSetData type
- Moved all ConversationEvent data types from /conversation to /conversation/data
- Renamed type AccessUpdate to ConversationAccessUpdateData
- Renamed type CodeUpdate to ConversationCodeUpdateData
- Renamed type MemberJoin to ConversationMemberJoinData
- Renamed type MemberUpdate to Conversation MemberUpdateData
- Renamed type ConversationMessageTimerUpdate to Conversation - ConversationMessageTimerUpdateData
- Renamed type OtrMessageAdd to Conversation ConversationOtrMessageAddData
- Renamed type Rename to Conversation ConversationRenameData
- Renamed type Typing to Conversation ConversationTypingData
- Renamed type ConnectRequest to Conversation ConversationConnectRequestData
- Removed BackendEvent
- Renamed IncomingEvent to BackendEvent
- Removed NotificationPayload and replaced it with BackendEvent
- Removed IncomingNotification and replaced it with Notification





## [4.6.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.31...@wireapp/bot-api@4.6.32) (2019-09-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.30...@wireapp/bot-api@4.6.31) (2019-09-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.29...@wireapp/bot-api@4.6.30) (2019-09-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.28...@wireapp/bot-api@4.6.29) (2019-09-23)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.27...@wireapp/bot-api@4.6.28) (2019-09-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.26...@wireapp/bot-api@4.6.27) (2019-09-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.25...@wireapp/bot-api@4.6.26) (2019-09-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.24...@wireapp/bot-api@4.6.25) (2019-09-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.23...@wireapp/bot-api@4.6.24) (2019-09-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.22...@wireapp/bot-api@4.6.23) (2019-09-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.21...@wireapp/bot-api@4.6.22) (2019-09-17)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.20...@wireapp/bot-api@4.6.21) (2019-09-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.19...@wireapp/bot-api@4.6.20) (2019-09-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.18...@wireapp/bot-api@4.6.19) (2019-09-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.17...@wireapp/bot-api@4.6.18) (2019-09-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.16...@wireapp/bot-api@4.6.17) (2019-09-10)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.15...@wireapp/bot-api@4.6.16) (2019-09-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.14...@wireapp/bot-api@4.6.15) (2019-09-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.13...@wireapp/bot-api@4.6.14) (2019-09-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.12...@wireapp/bot-api@4.6.13) (2019-09-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.11...@wireapp/bot-api@4.6.12) (2019-09-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.10...@wireapp/bot-api@4.6.11) (2019-09-05)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.9...@wireapp/bot-api@4.6.10) (2019-09-04)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.8...@wireapp/bot-api@4.6.9) (2019-08-30)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.7...@wireapp/bot-api@4.6.8) (2019-08-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.6...@wireapp/bot-api@4.6.7) (2019-08-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.5...@wireapp/bot-api@4.6.6) (2019-08-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.4...@wireapp/bot-api@4.6.5) (2019-08-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.3...@wireapp/bot-api@4.6.4) (2019-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.2...@wireapp/bot-api@4.6.3) (2019-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.1...@wireapp/bot-api@4.6.2) (2019-08-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.6.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.6.0...@wireapp/bot-api@4.6.1) (2019-08-26)

**Note:** Version bump only for package @wireapp/bot-api





# [4.6.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.51...@wireapp/bot-api@4.6.0) (2019-08-21)


### Features

* **bot-api:** Allow custom store engines ([#2215](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2215)) ([a1b0d63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/a1b0d63))





## [4.5.51](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.50...@wireapp/bot-api@4.5.51) (2019-08-21)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.50](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.49...@wireapp/bot-api@4.5.50) (2019-08-21)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.49](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.48...@wireapp/bot-api@4.5.49) (2019-08-21)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.48](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.47...@wireapp/bot-api@4.5.48) (2019-08-21)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.46...@wireapp/bot-api@4.5.47) (2019-08-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.45...@wireapp/bot-api@4.5.46) (2019-08-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.44...@wireapp/bot-api@4.5.45) (2019-08-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.43...@wireapp/bot-api@4.5.44) (2019-08-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.42...@wireapp/bot-api@4.5.43) (2019-08-07)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.41...@wireapp/bot-api@4.5.42) (2019-08-07)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.40...@wireapp/bot-api@4.5.41) (2019-08-07)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.39...@wireapp/bot-api@4.5.40) (2019-08-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.38...@wireapp/bot-api@4.5.39) (2019-08-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.37...@wireapp/bot-api@4.5.38) (2019-08-05)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.36...@wireapp/bot-api@4.5.37) (2019-08-02)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.35...@wireapp/bot-api@4.5.36) (2019-08-01)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.34...@wireapp/bot-api@4.5.35) (2019-08-01)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.33...@wireapp/bot-api@4.5.34) (2019-07-31)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.32...@wireapp/bot-api@4.5.33) (2019-07-31)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.31...@wireapp/bot-api@4.5.32) (2019-07-30)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.30...@wireapp/bot-api@4.5.31) (2019-07-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.29...@wireapp/bot-api@4.5.30) (2019-07-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.28...@wireapp/bot-api@4.5.29) (2019-07-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.27...@wireapp/bot-api@4.5.28) (2019-07-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.26...@wireapp/bot-api@4.5.27) (2019-07-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.25...@wireapp/bot-api@4.5.26) (2019-07-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.24...@wireapp/bot-api@4.5.25) (2019-07-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.23...@wireapp/bot-api@4.5.24) (2019-07-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.22...@wireapp/bot-api@4.5.23) (2019-07-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.21...@wireapp/bot-api@4.5.22) (2019-07-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.20...@wireapp/bot-api@4.5.21) (2019-07-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.19...@wireapp/bot-api@4.5.20) (2019-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.18...@wireapp/bot-api@4.5.19) (2019-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.17...@wireapp/bot-api@4.5.18) (2019-07-23)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.16...@wireapp/bot-api@4.5.17) (2019-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.15...@wireapp/bot-api@4.5.16) (2019-07-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.14...@wireapp/bot-api@4.5.15) (2019-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.13...@wireapp/bot-api@4.5.14) (2019-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.12...@wireapp/bot-api@4.5.13) (2019-07-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.11...@wireapp/bot-api@4.5.12) (2019-07-16)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.10...@wireapp/bot-api@4.5.11) (2019-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.9...@wireapp/bot-api@4.5.10) (2019-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.8...@wireapp/bot-api@4.5.9) (2019-07-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.7...@wireapp/bot-api@4.5.8) (2019-07-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.6...@wireapp/bot-api@4.5.7) (2019-07-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.5...@wireapp/bot-api@4.5.6) (2019-07-10)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.4...@wireapp/bot-api@4.5.5) (2019-07-10)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.3...@wireapp/bot-api@4.5.4) (2019-07-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.2...@wireapp/bot-api@4.5.3) (2019-07-05)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.1...@wireapp/bot-api@4.5.2) (2019-07-04)

**Note:** Version bump only for package @wireapp/bot-api





## [4.5.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.5.0...@wireapp/bot-api@4.5.1) (2019-07-04)

**Note:** Version bump only for package @wireapp/bot-api





# [4.5.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.4.0...@wireapp/bot-api@4.5.0) (2019-07-03)


### Features

* **tslint-config:** Change ordering ([#2026](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2026)) ([11ed87a](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/11ed87a))





# [4.4.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.3.4...@wireapp/bot-api@4.4.0) (2019-07-02)


### Features

* **tslint-config:** Add member ordering ([#1972](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1972)) ([5a19864](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/5a19864))





## [4.3.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.3.3...@wireapp/bot-api@4.3.4) (2019-07-02)

**Note:** Version bump only for package @wireapp/bot-api





## [4.3.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.3.2...@wireapp/bot-api@4.3.3) (2019-06-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.3.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.3.1...@wireapp/bot-api@4.3.2) (2019-06-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.3.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.3.0...@wireapp/bot-api@4.3.1) (2019-06-28)

**Note:** Version bump only for package @wireapp/bot-api





# [4.3.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.2.2...@wireapp/bot-api@4.3.0) (2019-06-28)


### Features

* **core:** Expose User ID & Client ID ([#2007](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/2007)) ([e41e0bb](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/e41e0bb))





## [4.2.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.2.1...@wireapp/bot-api@4.2.2) (2019-06-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.2.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.2.0...@wireapp/bot-api@4.2.1) (2019-06-28)

**Note:** Version bump only for package @wireapp/bot-api





# [4.2.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.9...@wireapp/bot-api@4.2.0) (2019-06-27)


### Features

* **bot-api,core:** Expose call signaling ([#1998](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1998)) ([ecced28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/ecced28))





## [4.1.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.8...@wireapp/bot-api@4.1.9) (2019-06-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.7...@wireapp/bot-api@4.1.8) (2019-06-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.6...@wireapp/bot-api@4.1.7) (2019-06-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.5...@wireapp/bot-api@4.1.6) (2019-06-26)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.4...@wireapp/bot-api@4.1.5) (2019-06-26)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.3...@wireapp/bot-api@4.1.4) (2019-06-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.2...@wireapp/bot-api@4.1.3) (2019-06-25)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.1...@wireapp/bot-api@4.1.2) (2019-06-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.1.0...@wireapp/bot-api@4.1.1) (2019-06-24)

**Note:** Version bump only for package @wireapp/bot-api





# [4.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.78...@wireapp/bot-api@4.1.0) (2019-06-21)


### Features

* **prettier-config:** trailingComma to all and added missing options ([#1897](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1897)) ([55b1c76](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/55b1c76))





## [4.0.78](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.77...@wireapp/bot-api@4.0.78) (2019-06-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.77](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.76...@wireapp/bot-api@4.0.77) (2019-06-20)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.76](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.75...@wireapp/bot-api@4.0.76) (2019-06-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.75](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.74...@wireapp/bot-api@4.0.75) (2019-06-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.74](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.73...@wireapp/bot-api@4.0.74) (2019-06-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.73](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.72...@wireapp/bot-api@4.0.73) (2019-06-19)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.72](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.71...@wireapp/bot-api@4.0.72) (2019-06-18)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.71](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.70...@wireapp/bot-api@4.0.71) (2019-06-17)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.70](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.69...@wireapp/bot-api@4.0.70) (2019-06-14)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.69](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.68...@wireapp/bot-api@4.0.69) (2019-06-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.68](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.67...@wireapp/bot-api@4.0.68) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.67](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.66...@wireapp/bot-api@4.0.67) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.66](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.65...@wireapp/bot-api@4.0.66) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.65](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.64...@wireapp/bot-api@4.0.65) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.64](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.63...@wireapp/bot-api@4.0.64) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.62...@wireapp/bot-api@4.0.63) (2019-06-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.62](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.61...@wireapp/bot-api@4.0.62) (2019-06-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.61](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.60...@wireapp/bot-api@4.0.61) (2019-06-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.60](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.59...@wireapp/bot-api@4.0.60) (2019-06-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.59](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.58...@wireapp/bot-api@4.0.59) (2019-06-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.58](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.57...@wireapp/bot-api@4.0.58) (2019-06-07)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.57](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.56...@wireapp/bot-api@4.0.57) (2019-06-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.56](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.55...@wireapp/bot-api@4.0.56) (2019-06-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.55](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.54...@wireapp/bot-api@4.0.55) (2019-06-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.54](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.53...@wireapp/bot-api@4.0.54) (2019-06-06)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.53](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.52...@wireapp/bot-api@4.0.53) (2019-06-04)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.52](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.51...@wireapp/bot-api@4.0.52) (2019-06-04)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.51](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.50...@wireapp/bot-api@4.0.51) (2019-06-04)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.50](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.49...@wireapp/bot-api@4.0.50) (2019-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.49](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.48...@wireapp/bot-api@4.0.49) (2019-06-03)


### Bug Fixes

* **core:** Add Legal Hold flag to Reaction ([#1888](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1888)) ([1b5f505](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/1b5f505))





## [4.0.48](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.47...@wireapp/bot-api@4.0.48) (2019-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.46...@wireapp/bot-api@4.0.47) (2019-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.45...@wireapp/bot-api@4.0.46) (2019-06-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.44...@wireapp/bot-api@4.0.45) (2019-05-31)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.43...@wireapp/bot-api@4.0.44) (2019-05-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.42...@wireapp/bot-api@4.0.43) (2019-05-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.41...@wireapp/bot-api@4.0.42) (2019-05-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.40...@wireapp/bot-api@4.0.41) (2019-05-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.39...@wireapp/bot-api@4.0.40) (2019-05-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.38...@wireapp/bot-api@4.0.39) (2019-05-22)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.37...@wireapp/bot-api@4.0.38) (2019-05-16)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.36...@wireapp/bot-api@4.0.37) (2019-05-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.35...@wireapp/bot-api@4.0.36) (2019-05-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.34...@wireapp/bot-api@4.0.35) (2019-05-14)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.33...@wireapp/bot-api@4.0.34) (2019-05-14)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.32...@wireapp/bot-api@4.0.33) (2019-05-14)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.31...@wireapp/bot-api@4.0.32) (2019-05-14)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.30...@wireapp/bot-api@4.0.31) (2019-05-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.29...@wireapp/bot-api@4.0.30) (2019-05-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.28...@wireapp/bot-api@4.0.29) (2019-05-13)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.27...@wireapp/bot-api@4.0.28) (2019-05-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.26...@wireapp/bot-api@4.0.27) (2019-05-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.25...@wireapp/bot-api@4.0.26) (2019-05-07)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.24...@wireapp/bot-api@4.0.25) (2019-04-26)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.23...@wireapp/bot-api@4.0.24) (2019-04-24)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.22...@wireapp/bot-api@4.0.23) (2019-04-23)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.21...@wireapp/bot-api@4.0.22) (2019-04-17)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.20...@wireapp/bot-api@4.0.21) (2019-04-16)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.19...@wireapp/bot-api@4.0.20) (2019-04-15)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.18...@wireapp/bot-api@4.0.19) (2019-04-12)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.17...@wireapp/bot-api@4.0.18) (2019-04-11)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.16...@wireapp/bot-api@4.0.17) (2019-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.15...@wireapp/bot-api@4.0.16) (2019-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.14...@wireapp/bot-api@4.0.15) (2019-04-09)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.13...@wireapp/bot-api@4.0.14) (2019-04-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.12...@wireapp/bot-api@4.0.13) (2019-04-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.11...@wireapp/bot-api@4.0.12) (2019-04-08)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.10...@wireapp/bot-api@4.0.11) (2019-04-05)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.9...@wireapp/bot-api@4.0.10) (2019-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.8...@wireapp/bot-api@4.0.9) (2019-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.7...@wireapp/bot-api@4.0.8) (2019-04-03)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.6...@wireapp/bot-api@4.0.7) (2019-04-02)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.5...@wireapp/bot-api@4.0.6) (2019-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.4...@wireapp/bot-api@4.0.5) (2019-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.3...@wireapp/bot-api@4.0.4) (2019-03-29)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.2...@wireapp/bot-api@4.0.3) (2019-03-28)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.1...@wireapp/bot-api@4.0.2) (2019-03-27)

**Note:** Version bump only for package @wireapp/bot-api





## [4.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@4.0.0...@wireapp/bot-api@4.0.1) (2019-03-27)

**Note:** Version bump only for package @wireapp/bot-api





# [4.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.3.3...@wireapp/bot-api@4.0.0) (2019-03-27)


### Code Refactoring

* **core:** Expect conversation ID when creating messages & Message types [BREAKING] ([#1686](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1686)) ([2a4a0b9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/2a4a0b9))


### BREAKING CHANGES

* **core:**  - Removed PayloadBundle sub types
 - Extracted message create functions from ConversationService
 - Moved conversationId params from message send functions to message create functions

Old API:
```ts
const textPayload = await account.service.conversation.createText(this.message).build();
await account.service.conversation.send(conversationId, textPayload);
```

New API:
```ts
const textPayload = await account.service.conversation.messageBuilder.createText(conversationId, this.message).build();
await account.service.conversation.send(textPayload);
```





## [3.3.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.3.2...@wireapp/bot-api@3.3.3) (2019-03-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.3.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.3.1...@wireapp/bot-api@3.3.2) (2019-03-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.3.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.3.0...@wireapp/bot-api@3.3.1) (2019-03-25)

**Note:** Version bump only for package @wireapp/bot-api





# [3.3.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.2.4...@wireapp/bot-api@3.3.0) (2019-03-21)


### Features

* **bot-api:** Expose send text method ([#1670](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1670)) ([0eea3b3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/0eea3b3))





## [3.2.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.2.3...@wireapp/bot-api@3.2.4) (2019-03-21)

**Note:** Version bump only for package @wireapp/bot-api





## [3.2.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.2.2...@wireapp/bot-api@3.2.3) (2019-03-20)

**Note:** Version bump only for package @wireapp/bot-api





## [3.2.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.2.1...@wireapp/bot-api@3.2.2) (2019-03-20)

**Note:** Version bump only for package @wireapp/bot-api





## [3.2.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.2.0...@wireapp/bot-api@3.2.1) (2019-03-19)

**Note:** Version bump only for package @wireapp/bot-api





# [3.2.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.64...@wireapp/bot-api@3.2.0) (2019-03-19)


### Features

* **bot-api:** Add backend selection ([#1657](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1657)) ([0cafa70](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/0cafa70))





## [3.1.64](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.63...@wireapp/bot-api@3.1.64) (2019-03-18)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.62...@wireapp/bot-api@3.1.63) (2019-03-15)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.62](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.61...@wireapp/bot-api@3.1.62) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.61](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.60...@wireapp/bot-api@3.1.61) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.60](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.59...@wireapp/bot-api@3.1.60) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.59](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.58...@wireapp/bot-api@3.1.59) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.58](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.57...@wireapp/bot-api@3.1.58) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.57](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.56...@wireapp/bot-api@3.1.57) (2019-03-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.56](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.55...@wireapp/bot-api@3.1.56) (2019-03-13)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.55](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.54...@wireapp/bot-api@3.1.55) (2019-03-12)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.54](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.53...@wireapp/bot-api@3.1.54) (2019-03-12)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.53](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.52...@wireapp/bot-api@3.1.53) (2019-03-12)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.52](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.51...@wireapp/bot-api@3.1.52) (2019-03-12)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.51](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.50...@wireapp/bot-api@3.1.51) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.50](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.49...@wireapp/bot-api@3.1.50) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.49](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.48...@wireapp/bot-api@3.1.49) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.48](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.47...@wireapp/bot-api@3.1.48) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.47](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.46...@wireapp/bot-api@3.1.47) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.46](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.45...@wireapp/bot-api@3.1.46) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.45](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.44...@wireapp/bot-api@3.1.45) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.44](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.43...@wireapp/bot-api@3.1.44) (2019-03-11)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.42...@wireapp/bot-api@3.1.43) (2019-03-07)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.41...@wireapp/bot-api@3.1.42) (2019-03-07)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.40...@wireapp/bot-api@3.1.41) (2019-03-07)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.39...@wireapp/bot-api@3.1.40) (2019-03-07)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.38...@wireapp/bot-api@3.1.39) (2019-03-06)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.37...@wireapp/bot-api@3.1.38) (2019-03-06)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.36...@wireapp/bot-api@3.1.37) (2019-03-06)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.35...@wireapp/bot-api@3.1.36) (2019-03-04)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.34...@wireapp/bot-api@3.1.35) (2019-03-04)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.33...@wireapp/bot-api@3.1.34) (2019-03-01)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.32...@wireapp/bot-api@3.1.33) (2019-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.31...@wireapp/bot-api@3.1.32) (2019-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.30...@wireapp/bot-api@3.1.31) (2019-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.29...@wireapp/bot-api@3.1.30) (2019-02-28)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.28...@wireapp/bot-api@3.1.29) (2019-02-27)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.27...@wireapp/bot-api@3.1.28) (2019-02-27)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.26...@wireapp/bot-api@3.1.27) (2019-02-27)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.25...@wireapp/bot-api@3.1.26) (2019-02-26)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.24...@wireapp/bot-api@3.1.25) (2019-02-26)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.23...@wireapp/bot-api@3.1.24) (2019-02-26)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.22...@wireapp/bot-api@3.1.23) (2019-02-26)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.21...@wireapp/bot-api@3.1.22) (2019-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.20...@wireapp/bot-api@3.1.21) (2019-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.19...@wireapp/bot-api@3.1.20) (2019-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.18...@wireapp/bot-api@3.1.19) (2019-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.17...@wireapp/bot-api@3.1.18) (2019-02-25)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.16...@wireapp/bot-api@3.1.17) (2019-02-21)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.15...@wireapp/bot-api@3.1.16) (2019-02-19)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.14...@wireapp/bot-api@3.1.15) (2019-02-14)


### Bug Fixes

* **react-ui-kit:** Update style-components types ([#1523](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1523)) ([4c82a79](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/4c82a79))





## [3.1.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.13...@wireapp/bot-api@3.1.14) (2019-02-14)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.12...@wireapp/bot-api@3.1.13) (2019-02-05)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.11...@wireapp/bot-api@3.1.12) (2019-01-29)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.10...@wireapp/bot-api@3.1.11) (2019-01-24)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.9...@wireapp/bot-api@3.1.10) (2019-01-17)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.8...@wireapp/bot-api@3.1.9) (2019-01-03)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.7...@wireapp/bot-api@3.1.8) (2019-01-03)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.6...@wireapp/bot-api@3.1.7) (2019-01-02)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.5...@wireapp/bot-api@3.1.6) (2018-12-21)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.4...@wireapp/bot-api@3.1.5) (2018-12-20)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.3...@wireapp/bot-api@3.1.4) (2018-12-17)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.2...@wireapp/bot-api@3.1.3) (2018-12-10)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.1...@wireapp/bot-api@3.1.2) (2018-12-10)

**Note:** Version bump only for package @wireapp/bot-api





## [3.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.1.0...@wireapp/bot-api@3.1.1) (2018-12-10)

**Note:** Version bump only for package @wireapp/bot-api





# [3.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.6...@wireapp/bot-api@3.1.0) (2018-12-07)


### Features

* **core:** Add error emit ([#1371](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1371)) ([5e8c159](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/5e8c159))





## [3.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.5...@wireapp/bot-api@3.0.6) (2018-12-06)

**Note:** Version bump only for package @wireapp/bot-api





## [3.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.4...@wireapp/bot-api@3.0.5) (2018-12-03)

**Note:** Version bump only for package @wireapp/bot-api





## [3.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.3...@wireapp/bot-api@3.0.4) (2018-11-30)

**Note:** Version bump only for package @wireapp/bot-api





## [3.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.2...@wireapp/bot-api@3.0.3) (2018-11-30)

**Note:** Version bump only for package @wireapp/bot-api





## [3.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.1...@wireapp/bot-api@3.0.2) (2018-11-29)

**Note:** Version bump only for package @wireapp/bot-api





## [3.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@3.0.0...@wireapp/bot-api@3.0.1) (2018-11-29)

**Note:** Version bump only for package @wireapp/bot-api





# [3.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.43...@wireapp/bot-api@3.0.0) (2018-11-29)


* [ci skip] feat(core): Read receipts [BREAKING] (WEBFOUND-56) (#1336) ([f7501b3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/f7501b3)), closes [#1336](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1336)


### BREAKING CHANGES

* removed createConfirmation(), removed ConfirmationType, changed the method signature of createPing()





## [2.1.43](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.42...@wireapp/bot-api@2.1.43) (2018-11-27)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.42](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.41...@wireapp/bot-api@2.1.42) (2018-11-26)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.41](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.40...@wireapp/bot-api@2.1.41) (2018-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.40](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.39...@wireapp/bot-api@2.1.40) (2018-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.39](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.38...@wireapp/bot-api@2.1.39) (2018-11-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.38](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.37...@wireapp/bot-api@2.1.38) (2018-11-22)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.37](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.36...@wireapp/bot-api@2.1.37) (2018-11-22)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.36](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.35...@wireapp/bot-api@2.1.36) (2018-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.34...@wireapp/bot-api@2.1.35) (2018-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.33...@wireapp/bot-api@2.1.34) (2018-11-21)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.32...@wireapp/bot-api@2.1.33) (2018-11-20)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.31...@wireapp/bot-api@2.1.32) (2018-11-20)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.30...@wireapp/bot-api@2.1.31) (2018-11-20)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.29...@wireapp/bot-api@2.1.30) (2018-11-19)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.28...@wireapp/bot-api@2.1.29) (2018-11-19)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.27...@wireapp/bot-api@2.1.28) (2018-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.26...@wireapp/bot-api@2.1.27) (2018-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.25...@wireapp/bot-api@2.1.26) (2018-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.24...@wireapp/bot-api@2.1.25) (2018-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.23...@wireapp/bot-api@2.1.24) (2018-11-16)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.22...@wireapp/bot-api@2.1.23) (2018-11-15)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.21...@wireapp/bot-api@2.1.22) (2018-11-15)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.20...@wireapp/bot-api@2.1.21) (2018-11-14)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.19...@wireapp/bot-api@2.1.20) (2018-11-12)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.18...@wireapp/bot-api@2.1.19) (2018-11-09)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.17...@wireapp/bot-api@2.1.18) (2018-11-08)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.16...@wireapp/bot-api@2.1.17) (2018-11-07)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.15...@wireapp/bot-api@2.1.16) (2018-11-05)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.14...@wireapp/bot-api@2.1.15) (2018-11-01)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.13...@wireapp/bot-api@2.1.14) (2018-10-31)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.12...@wireapp/bot-api@2.1.13) (2018-10-26)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.11...@wireapp/bot-api@2.1.12) (2018-10-25)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.10...@wireapp/bot-api@2.1.11) (2018-10-24)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.9...@wireapp/bot-api@2.1.10) (2018-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.8...@wireapp/bot-api@2.1.9) (2018-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.7...@wireapp/bot-api@2.1.8) (2018-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.6...@wireapp/bot-api@2.1.7) (2018-10-23)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.5...@wireapp/bot-api@2.1.6) (2018-10-19)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.4...@wireapp/bot-api@2.1.5) (2018-10-17)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.3...@wireapp/bot-api@2.1.4) (2018-10-17)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.2...@wireapp/bot-api@2.1.3) (2018-10-17)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.1...@wireapp/bot-api@2.1.2) (2018-10-17)

**Note:** Version bump only for package @wireapp/bot-api





## [2.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.1.0...@wireapp/bot-api@2.1.1) (2018-10-15)

**Note:** Version bump only for package @wireapp/bot-api





# [2.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.0.1...@wireapp/bot-api@2.1.0) (2018-10-15)


### Features

* **bot-api:** Expose `userId` parameter when sending messages ([#1226](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1226)) ([b7c1a98](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/b7c1a98))





## [2.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@2.0.0...@wireapp/bot-api@2.0.1) (2018-10-12)

**Note:** Version bump only for package @wireapp/bot-api





# [2.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.2.2...@wireapp/bot-api@2.0.0) (2018-10-12)


### Code Refactoring

* **api-client,core,cryptobox,proteus:** Rename root to index ([#1200](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1200)) ([6b937ac](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/6b937ac))


### BREAKING CHANGES

* **api-client,core,cryptobox,proteus:** Some modules can't be imported with `/root` anymore - use `/index` instead.





## [1.2.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.2.1...@wireapp/bot-api@1.2.2) (2018-10-11)

**Note:** Version bump only for package @wireapp/bot-api





## [1.2.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.2.0...@wireapp/bot-api@1.2.1) (2018-10-09)

**Note:** Version bump only for package @wireapp/bot-api





# [1.2.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.1.1...@wireapp/bot-api@1.2.0) (2018-10-08)


### Features

* **bot-api:** Add message handlers for clearConversation, sendEditedText, sendFile, sendImage, sendLocation, sendPing and sendTyping ([#1152](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1152)) ([4be69f4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/4be69f4))





## [1.1.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.1.0...@wireapp/bot-api@1.1.1) (2018-10-05)

**Note:** Version bump only for package @wireapp/bot-api





# [1.1.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.32...@wireapp/bot-api@1.1.0) (2018-10-05)


### Features

* **bot-api:** Allow client type option, cleanup ([#1202](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1202)) ([d37044d](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/d37044d))





## [1.0.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.31...@wireapp/bot-api@1.0.32) (2018-10-04)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.31"></a>
## [1.0.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.30...@wireapp/bot-api@1.0.31) (2018-10-04)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.30"></a>
## [1.0.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.29...@wireapp/bot-api@1.0.30) (2018-10-02)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.29"></a>
## [1.0.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.28...@wireapp/bot-api@1.0.29) (2018-10-02)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.28"></a>
## [1.0.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.27...@wireapp/bot-api@1.0.28) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.27"></a>
## [1.0.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.26...@wireapp/bot-api@1.0.27) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.26"></a>
## [1.0.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.25...@wireapp/bot-api@1.0.26) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.25"></a>
## [1.0.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.24...@wireapp/bot-api@1.0.25) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.24"></a>
## [1.0.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.23...@wireapp/bot-api@1.0.24) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.23"></a>
## [1.0.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.22...@wireapp/bot-api@1.0.23) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.22"></a>
## [1.0.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.21...@wireapp/bot-api@1.0.22) (2018-10-01)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.21"></a>
## [1.0.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.20...@wireapp/bot-api@1.0.21) (2018-09-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.20"></a>
## [1.0.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.19...@wireapp/bot-api@1.0.20) (2018-09-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.19"></a>
## [1.0.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.18...@wireapp/bot-api@1.0.19) (2018-09-25)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.18"></a>
## [1.0.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.17...@wireapp/bot-api@1.0.18) (2018-09-24)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.17"></a>
## [1.0.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.16...@wireapp/bot-api@1.0.17) (2018-09-24)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.16"></a>
## [1.0.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.15...@wireapp/bot-api@1.0.16) (2018-09-20)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.15"></a>
## [1.0.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.14...@wireapp/bot-api@1.0.15) (2018-09-20)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.14"></a>
## [1.0.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.13...@wireapp/bot-api@1.0.14) (2018-09-19)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.13"></a>
## [1.0.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.12...@wireapp/bot-api@1.0.13) (2018-09-19)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.12"></a>
## [1.0.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.11...@wireapp/bot-api@1.0.12) (2018-09-19)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.11"></a>
## [1.0.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.10...@wireapp/bot-api@1.0.11) (2018-09-19)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.10"></a>
## [1.0.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.9...@wireapp/bot-api@1.0.10) (2018-09-19)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.9"></a>
## [1.0.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.8...@wireapp/bot-api@1.0.9) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.8"></a>
## [1.0.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.7...@wireapp/bot-api@1.0.8) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.7"></a>
## [1.0.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.6...@wireapp/bot-api@1.0.7) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.6"></a>
## [1.0.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.5...@wireapp/bot-api@1.0.6) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.5"></a>
## [1.0.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.4...@wireapp/bot-api@1.0.5) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.4"></a>
## [1.0.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.3...@wireapp/bot-api@1.0.4) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.3"></a>
## [1.0.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.2...@wireapp/bot-api@1.0.3) (2018-09-18)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.2"></a>
## [1.0.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.1...@wireapp/bot-api@1.0.2) (2018-09-17)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.1"></a>
## [1.0.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@1.0.0...@wireapp/bot-api@1.0.1) (2018-09-13)

**Note:** Version bump only for package @wireapp/bot-api





<a name="1.0.0"></a>
# [1.0.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.27...@wireapp/bot-api@1.0.0) (2018-09-12)


### Code Refactoring

* **core:** Add TextContentBuilder ([#1099](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1099)) ([18848bd](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/18848bd))


### BREAKING CHANGES

* **core:** createText() now returns a TextContentBuilder. 





<a name="0.3.27"></a>
## [0.3.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.26...@wireapp/bot-api@0.3.27) (2018-09-12)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.26"></a>
## [0.3.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.25...@wireapp/bot-api@0.3.26) (2018-09-07)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.25"></a>
## [0.3.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.24...@wireapp/bot-api@0.3.25) (2018-09-07)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.24"></a>
## [0.3.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.23...@wireapp/bot-api@0.3.24) (2018-09-07)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.23"></a>
## [0.3.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.22...@wireapp/bot-api@0.3.23) (2018-09-06)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.22"></a>
## [0.3.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.21...@wireapp/bot-api@0.3.22) (2018-09-06)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.21"></a>
## [0.3.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.20...@wireapp/bot-api@0.3.21) (2018-09-05)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.20"></a>
## [0.3.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.19...@wireapp/bot-api@0.3.20) (2018-09-05)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.19"></a>
## [0.3.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.18...@wireapp/bot-api@0.3.19) (2018-09-03)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.18"></a>
## [0.3.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.17...@wireapp/bot-api@0.3.18) (2018-08-31)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.17"></a>
## [0.3.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.16...@wireapp/bot-api@0.3.17) (2018-08-29)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.16"></a>
## [0.3.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.15...@wireapp/bot-api@0.3.16) (2018-08-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.15"></a>
## [0.3.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.14...@wireapp/bot-api@0.3.15) (2018-08-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.14"></a>
## [0.3.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.13...@wireapp/bot-api@0.3.14) (2018-08-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.13"></a>
## [0.3.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.12...@wireapp/bot-api@0.3.13) (2018-08-28)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.12"></a>
## [0.3.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.11...@wireapp/bot-api@0.3.12) (2018-08-27)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.11"></a>
## [0.3.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.10...@wireapp/bot-api@0.3.11) (2018-08-24)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.10"></a>
## [0.3.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.9...@wireapp/bot-api@0.3.10) (2018-08-23)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.9"></a>
## [0.3.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.8...@wireapp/bot-api@0.3.9) (2018-08-23)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.8"></a>
## [0.3.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.7...@wireapp/bot-api@0.3.8) (2018-08-23)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.7"></a>
## [0.3.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.6...@wireapp/bot-api@0.3.7) (2018-08-23)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.6"></a>
## [0.3.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.5...@wireapp/bot-api@0.3.6) (2018-08-22)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.5"></a>
## [0.3.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.4...@wireapp/bot-api@0.3.5) (2018-08-21)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.4"></a>
## [0.3.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.3...@wireapp/bot-api@0.3.4) (2018-08-21)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.3"></a>
## [0.3.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.2...@wireapp/bot-api@0.3.3) (2018-08-21)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.2"></a>
## [0.3.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.1...@wireapp/bot-api@0.3.2) (2018-08-20)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.1"></a>
## [0.3.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.3.0...@wireapp/bot-api@0.3.1) (2018-08-20)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.3.0"></a>
# [0.3.0](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.35...@wireapp/bot-api@0.3.0) (2018-08-17)


### Features

* **bot-api:** Send image ([#1020](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/1020)) ([0a20a93](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/0a20a93))





<a name="0.2.35"></a>
## [0.2.35](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.34...@wireapp/bot-api@0.2.35) (2018-08-17)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.34"></a>
## [0.2.34](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.33...@wireapp/bot-api@0.2.34) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.33"></a>
## [0.2.33](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.32...@wireapp/bot-api@0.2.33) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.32"></a>
## [0.2.32](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.31...@wireapp/bot-api@0.2.32) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.31"></a>
## [0.2.31](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.30...@wireapp/bot-api@0.2.31) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.30"></a>
## [0.2.30](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.29...@wireapp/bot-api@0.2.30) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.29"></a>
## [0.2.29](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.28...@wireapp/bot-api@0.2.29) (2018-08-16)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.28"></a>
## [0.2.28](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.27...@wireapp/bot-api@0.2.28) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.27"></a>
## [0.2.27](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.26...@wireapp/bot-api@0.2.27) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.26"></a>
## [0.2.26](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.25...@wireapp/bot-api@0.2.26) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.25"></a>
## [0.2.25](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.24...@wireapp/bot-api@0.2.25) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.24"></a>
## [0.2.24](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.23...@wireapp/bot-api@0.2.24) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.23"></a>
## [0.2.23](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.22...@wireapp/bot-api@0.2.23) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.22"></a>
## [0.2.22](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.21...@wireapp/bot-api@0.2.22) (2018-08-15)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.21"></a>
## [0.2.21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.20...@wireapp/bot-api@0.2.21) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.20"></a>
## [0.2.20](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.19...@wireapp/bot-api@0.2.20) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.19"></a>
## [0.2.19](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.18...@wireapp/bot-api@0.2.19) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.18"></a>
## [0.2.18](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.17...@wireapp/bot-api@0.2.18) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.17"></a>
## [0.2.17](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.16...@wireapp/bot-api@0.2.17) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.16"></a>
## [0.2.16](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.15...@wireapp/bot-api@0.2.16) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.15"></a>
## [0.2.15](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.14...@wireapp/bot-api@0.2.15) (2018-08-14)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.14"></a>
## [0.2.14](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.13...@wireapp/bot-api@0.2.14) (2018-08-13)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.13"></a>
## [0.2.13](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.12...@wireapp/bot-api@0.2.13) (2018-08-13)


### Bug Fixes

* **core,bot-api:** Handle missing payload bundle types ([#990](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/990)) ([09f6f63](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/09f6f63))





<a name="0.2.12"></a>
## [0.2.12](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.11...@wireapp/bot-api@0.2.12) (2018-08-10)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.11"></a>
## [0.2.11](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.10...@wireapp/bot-api@0.2.11) (2018-08-10)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.10"></a>
## [0.2.10](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.9...@wireapp/bot-api@0.2.10) (2018-08-10)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.9"></a>
## [0.2.9](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.8...@wireapp/bot-api@0.2.9) (2018-08-10)

**Note:** Version bump only for package @wireapp/bot-api





<a name="0.2.8"></a>
## [0.2.8](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.7...@wireapp/bot-api@0.2.8) (2018-08-10)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.7"></a>
## [0.2.7](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.6...@wireapp/bot-api@0.2.7) (2018-08-10)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.6"></a>
## [0.2.6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.5...@wireapp/bot-api@0.2.6) (2018-08-09)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.5"></a>
## [0.2.5](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.4...@wireapp/bot-api@0.2.5) (2018-08-09)


### Bug Fixes

* **bot-api:** Specify handler context ([#974](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/974)) ([8137c21](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/8137c21))




<a name="0.2.4"></a>
## [0.2.4](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.3...@wireapp/bot-api@0.2.4) (2018-08-09)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.3"></a>
## [0.2.3](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.2...@wireapp/bot-api@0.2.3) (2018-08-09)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.2"></a>
## [0.2.2](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.1...@wireapp/bot-api@0.2.2) (2018-08-09)




**Note:** Version bump only for package @wireapp/bot-api

<a name="0.2.1"></a>
## [0.2.1](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/compare/@wireapp/bot-api@0.2.0...@wireapp/bot-api@0.2.1) (2018-08-09)


### Bug Fixes

* **bot-api:** Upgrade dependencies ([#971](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/971)) ([e81d7d6](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/e81d7d6))




<a name="0.2.0"></a>
# 0.2.0 (2018-08-09)


### Features

* **bot-api:** Add Bot API (WEBFOUND-13) ([#814](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/issues/814)) ([01394ee](https://github.com/wireapp/wire-web-packages/tree/main/packages/bot-api/commit/01394ee))
