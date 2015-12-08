## TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = -G --timeout 10000
TESTS = test/*.test.js

.PHONY: test
test:
	$(TESTER) $(OPTS) $(TESTS)

.PHONY: test-verbose
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)

.PHONY: testing
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)

