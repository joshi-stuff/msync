const term = require('term');

const config = require('./config.js');
const filter = require('./filter.js');
const refresh = require('./refresh.js');
const status = require('./status.js');
const sync = require('./sync.js');

const println = term.println;

/**
 * @exports app
 * @readonly
 */
const app = {};

/**
 *
 * @param {string[]} args one arg defining the source path
 *
 * @returns {void}
 * @throws {Error}
 */
app.init = function (args) {
	const source_path = args[0];
	const touch = args[1] === '-t';

	if (source_path === undefined) {
		throw new Error('No source path provided');
	}

	config.init(source_path);

	if (touch) {
		app.touch();
	}
};

/**
 *
 *
 * @returns {void}
 */
app.diff = function () {
	println('Comparing...');
	const comparison = status.diff();

	println('New files:');
	Object.entries(comparison)
		.filter(function (modification) {
			return modification[1].status == '+';
		})
		.map(function (modification) {
			return modification[0];
		})
		.sort()
		.forEach(function (file_name) {
			println('    + ' + file_name);
		});

	println('Modified files:');
	Object.entries(comparison)
		.filter(function (modification) {
			return modification[1].status == 'M';
		})
		.map(function (modification) {
			return modification[0];
		})
		.sort()
		.forEach(function (file_name) {
			println('    M ' + file_name);
		});

	println('Deleted files:');
	Object.entries(comparison)
		.filter(function (modification) {
			return modification[1].status == '-';
		})
		.map(function (modification) {
			return modification[0];
		})
		.sort()
		.forEach(function (file_name) {
			println('    - ' + file_name);
		});

	println('Done');
};

/**
 *
 *
 * @returns {void}
 */
app.filter = function () {
	filter();
};

/**
 *
 *
 * @returns {void}
 */
app.refresh = function () {
	refresh();
};

/**
 *
 *
 * @returns {void}
 */
app.sync = function () {
	sync();
};

/**
 *
 *
 * @returns {void}
 */
app.touch = function () {
	status.touch();

	println('Done');
};

return app;
