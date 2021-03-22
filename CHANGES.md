2021-03-22, Version 2.5.0
=========================

 * chore: enable DCO (Diana Lau)

 * update: docs (#245) (Janny)

 * chore: add Node.js 14 to travis (Diana Lau)

 * chore: update strong-globalize to 6.x (Diana Lau)

 * docs: iam auth (#242) (Janny)


2020-03-19, Version 2.4.2
=========================

 * Exclude 'deps' and '.github' from npm publish (Dominique Emond)


2020-03-11, Version 2.4.1
=========================

 * update couchdb container instance setup script (Agnes Lin)


2020-01-27, Version 2.4.0
=========================

 * chore: update copyright year (Agnes Lin)

 * replace couchdb3 docker img with a stable version (Agnes Lin)

 * docs: add partition document (#232) (Janny)

 * fixup!: fix the dependency version (#233) (Janny)

 * feat: query with partition field (#230) (Janny)

 * chore: improve issue and PR templates (Nora)

 * feat: add partitioned find (#229) (Janny)

 * add docker setup script (#227) (Janny)

 * feat: partitioned index (#225) (Janny)

 * fix CODEOWNERS file (Diana Lau)

 * update docker image (#224) (Janny)


2019-09-19, Version 2.3.2
=========================

 * chore: add node 12 to travis ci (Nora)

 * update dependencies (Nora)


2019-06-26, Version 2.3.1
=========================

 * chore: update CODEOWNERS (Diana Lau)

 * feat: run shared tests from v3 n v4 of juggler (Agnes Lin)

 * update eslint -v for shared juggler tests (Agnes Lin)

 * update node -v to skip CI test for older version (Agnes Lin)


2019-05-10, Version 2.3.0
=========================

 * fix: update lodash (jannyHou)

 * chore: update strong-globalize and other dep (Diana Lau)

 * chore: update copyrights years (Diana Lau)

 * Fix test setup of autoupgrade/autoupdate (Miroslav Bajtoš)


2018-09-21, Version 2.2.1
=========================



2018-07-16, Version 2.2.0
=========================

 * Geospatial README (Dan Jarvis)

 * [WebFM] cs/pl/ru translation (candytangnb)


2018-06-20, Version 2.1.0
=========================

 * Revert "2.1.0" (Taranveer Virk)

 * feat: cloudant geospatial (#191) (Danwakeem)

 * update node versions in CI (Diana Lau)


2018-03-22, Version 2.0.5
=========================

 * fix external link to Selector syntax (Petar Koretić)

 * Updated cloudant dependency (Dan Jarvis)

 * Add count test (#183) (Janny)

 * chore:update license (Diana Lau)


2017-10-27, Version 2.0.4
=========================

 * Update package.json to remove vulnerability (Michael Hibay)

 * add globalize string (Diana Lau)


2017-09-13, Version 2.0.3
=========================

 * Fix/ping (#177) (Janny)

 * Add advisory docs on forceId (ssh24)


2017-08-22, Version 2.0.2
=========================

 * Inherit couchdb functionalities (#163) (Sakib Hasan)

 * Add stalebot configuration (Kevin Delisle)

 * Recover & reuse couchdb2 tests (jannyHou)

 * Fix readme (ssh24)

 * Create Issue and PR Templates (#171) (Sakib Hasan)

 * Add CODEOWNER file (Diana Lau)

 * Recover manipulation.test.js (#159) (Janny)

 * Recover juggler tests (#158) (Janny)

 * Require init on mocha args (ssh24)

 * Do not strip _rev value on create (ssh24)

 * Fix docs on bulk replace op hooks (ssh24)

 * Fix update/updateAll function (ssh24)

 * Add cloudant specific bulkReplace function (ssh24)

 * Check error and result (#149) (Janny)

 * Fix updateAttributes function (ssh24)

 * Fix doc (#148) (Janny)

 * viewDocs (#133) (Janny)

 * Return back result count in updateAll (ssh24)

 * Fix database name typo on README (ssh24)

 * Add regexp doc (#143) (Janny)

 * Add proxy config test (#142) (Janny)

 * Allow users to spawn docker and run tests (ssh24)

 * test: use Cloudant 2.x based image for testing (Ryan Graham)

 * test: replace setup.sh with test.js (Ryan Graham)

 * Refactor functions in cloudant (ssh24)

 * Allow handling of ._rev on models (#123) (Kevin Delisle)

 * Allow travis to run against the latest code base (#138) (Sakib Hasan)

 * Add docker setup (#132) (Sakib Hasan)

 * Fix updateOrCreate (#136) (Sakib Hasan)

 * Fix typo (#135) (Janny)

 * cloudant.test: cleanup after test runs (Kevin Delisle)

 * Setup Travis with Docker Compose (Kevin Delisle)

 * Refactor doc (#116) (Janny)

 * reinstate bulk update (biniam)

 * add array prop update tests (biniam)

 * update docs with current revision (biniam)

 * Allow id property to be a number (#115) (Sakib Hasan)

 * autoupdate and automigrate fix (#109) (Janny)

 * update readme to doc async connect (biniam)

 * check cloudant db in config (biniam)

 * call driver asynchronously (biniam)

 * Fix sort query builder (#107) (Janny)

 * Recover maxrows.test.js (#91) (Janny)

 * Fix regexp.test.js (#103) (Janny)

 * Use define function in loopback-connector (jannyHou)

 * add url config example (biniam)

 * Update connector to 4.0.0 (ssh24)

 * Add doc for fitler and order (jannyHou)

 * Add advisory note regarding update (ssh24)

 * Add $elemMatch for array (jannyHou)

 * Revert "Build selector with array type data" (jannyHou)


2017-03-06, Version 2.0.1
=========================

 * Fix error message typo (jannyHou)


2017-03-02, Version 2.0.0
=========================

 * package: repair erroneous version change (Kevin Delisle)

 * Catch undefined docs (jannyHou)

 * Add More Info link (Kevin Delisle)

 * Add advanced queries document (Kevin Delisle)

 * Build selector with array type data (jannyHou)

 * Make equality operator as query basis (jannyHou)

 * Add nestedProperty to connectorCapabilities (jannyHou)

 * Set nested field default type as string (jannyHou)

 * Fix formatting in docs (crandmck)

 * update to lb3  datasource generator page (ivy ho)

 * Fix linting errors (gunjpan)

 * Fix updateAll for model instance as input (gunjpan)

 * cloudant: allow passthrough of settings (Kevin Delisle)

 * Update paid support URL (Siddhi Pai)

 * Explain uncaught url error in doc (jannyHou)

 * Start 3.x + drop support for Node v0.10/v0.12 (siddhipai)

 * Drop support for Node v0.10 and v0.12 (Siddhi Pai)

 * Start the development of the next major version (Siddhi Pai)

 * Update README doc links (Candy)

 * Add test for connection (jannyHou)

 * How to sign in (jannyHou)

 * How to setup cloudant and run testing (jannyHou)

 * Add replaceOrCreate (jannyHou)


2016-10-12, Version 1.1.0
=========================

 * Add connectorCapabilities global object (#39) (Nicholas Duffy)

 * Update translation files - round#2 (#36) (Candy)

 * Add translated files (gunjpan)

 * Update deps to loopback 3.0.0 RC (Miroslav Bajtoš)

 * Update new version (jannyHou)

 * Comment test cases (jannyHou)

 * fix conflict (jannyHou)

 * Remove makefile & update eslint infrastructure (#27) (Gunjan Pandya)

 * Fixed minor spelling error. (James Tanner)

 * Added case-insensitivity regexp test. (James Tanner)

 * Added check for ignoreCase flag on RegExp queries. (James Tanner)

 * Add globalization (Simon Ho)

 * Update URLs in CONTRIBUTING.md (#22) (Ryan Graham)

 * fix whitespace (Ryan Graham)


2016-05-07, Version 1.0.11
==========================

 * update copyright notices and license (Ryan Graham)


2016-05-04, Version 1.0.10
==========================

 * Lazy connect when booting from swagger generator (juehou)


2016-04-27, Version 1.0.9
=========================

 * Fix ,  and  operators to align with the CQ syntax. closes #12 (Anthony Ffrench)


2016-04-26, Version 1.0.8
=========================

 * Use the Cloudant Query selector syntax to associate models to existing data (Anthony Ffrench)

 * Sort by date field did not work. Error: Unspecified or ambiguous sort type. Try appending :number or :string to the sort field. checkdate Solution: add :string to sort expression (Helmut Tammen)


2016-03-08, Version 1.0.7
=========================

 * coerce id names before attempting to resolve includes (Anthony Ffrench)


2016-03-04, Version 1.0.6
=========================

 * rename CHANGES to work with slt-release (Anthony Ffrench)

 * Include related docs in chunks to avoid too many boolean clauses, closes #6 (Anthony Ffrench)


2016-03-03, Version 1.0.5
=========================

 * Use the bookmark field to grab beyond 200 documents, closes #3 (Anthony Ffrench)

 * Throw a better exception when url or username and password are undefined (Anthony Ffrench)


2016-01-22, Version 1.0.4
=========================

 * default to sorting by id, fix custom id naming, implement filter.include (Anthony Ffrench)


2016-01-06, Version 1.0.3
=========================

 * Updates to conform with StrongLoop eslint config (Anthony Ffrench)

 * Synchronize the configuration settings with the documentation. remove any hardcoded modelIndex (loopback__model__name) cases (Anthony Ffrench)

 * Add example usage (example/example.js) ... minor fixes (Anthony Ffrench)

 * README documentation and intro (Anthony Ffrench)

 * Implement save(), findByID(), find(), updateOrCreate(). Enhance the indexing (Lucene) and searching to be loopback model aware. Refactor document prep/unprep into toDB and fromDB methods, add support for Date type. Bug fixes, additional test cases. (Anthony Ffrench)

 * Always sort by _id. Execute deletes in parallel. (Anthony Ffrench)

 * Basic discovery for Models and Schemas (Anthony Ffrench)


2015-12-10, Version 1.0.1
=========================

 * Implement updataAll and updateAttributes. Auto formating. (Anthony Ffrench)

 * Support for per model db names. Support for order filters (using Cloudant Query). Additional test cases. (Anthony Ffrench)


2015-12-07, Version 1.0.0
=========================

 * First release!
