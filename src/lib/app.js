const fs = require('fs');
const term = require('term');

const config = require('./config.js');
const processor = require('./processor.js');
const status = require('./status.js');

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
app.sync = function () {
	println('Comparing...');
	const comparison = status.diff();

	const write_period_ms = 15000;
	var last_write_ms = Date.now();

	function maybe_save_status() {
		if (Date.now() - last_write_ms > write_period_ms) {
			status.save();
			last_write_ms = Date.now();
		}
	}

	println('Synchronizing...');
	processor.process(
		config.source_path,
		config.target_path,
		comparison,
		{
			transcode_flac: config.transcode_flac,
		},
		{
			copied: function (file_name) {
				println('Copied: ' + file_name);

				status.last[file_name] = comparison[file_name].to;
				maybe_save_status();
			},

			deleted: function (file_name) {
				println('Deleted: ' + file_name);

				delete status.last[file_name];
				maybe_save_status();
			},

			detected_cpus: function (cpu_count) {
				println('Detected CPUs: ' + cpu_count);
			},
		}
	);

	status.save();

	println('Done');
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
