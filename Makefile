# Target dir for make install
PREFIX ?= /usr/local

# Dependency versions
DOCDASH_VERSION = 1.2.0

# Shorthand variables
CP = cp -a --no-preserve=ownership 
MSYNC = src/bin/msync
JSDOC = .docdash/node_modules/.bin/jsdoc

# Main artifacts
DOCS = build/jsdoc


#
# External targets
#
docs: $(DOCS)

format: 
	npx prettier --write 'src/**/*.js'

lint:
	npx prettier --check 'src/**/*.js'

ci: clean lint 

clean: 
	@rm -rf build

install: 
	mkdir -p "$(PREFIX)/bin"
	$(CP) $(MSYNC) "$(PREFIX)/bin"

	mkdir -p "$(PREFIX)/lib/msync"
	$(CP) -R src/lib/* "$(PREFIX)/lib/msync"

	mkdir -p "$(PREFIX)/share/doc/msync"
	$(CP) -R $(DOCS)/* "$(PREFIX)/share/doc/msync"

uninstall:
	rm "$(PREFIX)/bin/msync"
	rm -rf "$(PREFIX)/lib/msync"
	rm -rf "$(PREFIX)/share/doc/msync"


#
# Internal targets
#
$(DOCS): .docdash
	@rm -rf $(DOCS)
	$(JSDOC) -c jsdoc.json


#
# Docdash stuff
#
docdash: .docdash

.docdash:
	@mkdir -p .docdash
	curl https://codeload.github.com/clenemt/docdash/tar.gz/$(DOCDASH_VERSION) -o .docdash/docdash.tar.gz
	cd .docdash && tar xvf docdash.tar.gz
	mv .docdash/docdash-$(DOCDASH_VERSION)/* .docdash
	rm -rf .docdash/docdash-$(DOCDASH_VERSION)
	cd .docdash && npm install
	cd .docdash && npm install jsdoc
