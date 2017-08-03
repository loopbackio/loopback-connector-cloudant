2017-08-03, Version 1.2.5
=========================

 * Ensure _id can be set as id on a model (Taranveer Virk)


2017-06-13, Version 1.2.4
=========================

 * Backport: return back result count in updateAll (#146) (Sakib Hasan)

 * Backport docker ci (#147) (Sakib Hasan)


2017-05-11, Version 1.2.3
=========================

 * 1.x fix/upsert (#129) (Janny)

 * cloudant: allow passthrough of settings (#114) (Sakib Hasan)

 * Fix cloudant url for CI (Diana Lau)


2017-03-06, Version 1.2.2
=========================

 * Fix error message typo (jannyHou)


2017-03-02, Version 1.2.1
=========================

 * Catch undefined docs (jannyHou)


2017-03-02, Version 1.2.0
=========================

 * Revert loopback 2.x (siddhipai)

 * Revert dev-dependency on loopback to 2.x (Siddhi Pai)

 * Set publish tag to "lts" (Siddhi Pai)

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
