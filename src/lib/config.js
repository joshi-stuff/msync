const fs = require('fs');

const target_path = fs.normalize_path('.');
const msync_path = fs.join(target_path, '.msync');
const config_js_path = fs.join(msync_path, 'config.js');

/**
 * @exports config
 * @readonly
 */
const config = {
	filter: {
		/**
		 * List of filtered (included or excluded) directories
		 *
		 * @type {Array<string>}
		 */
		directories: [],

		/**
		 * Filtering mode: 'include' or 'exclude'
		 *
		 * @type {string}
		 */
		mode: 'exclude',
	},

	/**
	 * Absolute path of mirror origin
	 *
	 * @type {string}
	 */
	source_path: undefined,

	/**
	 * @type {string}
	 */
	target_path: target_path,

	/**
	 * Whether to transcode .flac into .mp3
	 * @type {boolean}
	 */
	transcode_flac: true,
};

// Load configuration from disk if it exists
if (fs.exists(config_js_path)) {
	const cfg = require(config_js_path);

	config.filter = cfg.filter || {};
	config.filter.directories = cfg.filter.directories;
	config.filter.mode = cfg.filter.mode;
	config.source_path = cfg.source_path;
	config.transcode_flac = cfg.transcode_flac;

	if (config.filter === undefined) {
		config.filter = {};
	}
	if (config.filter.directories === undefined) {
		config.filter.directories = [];
	}
	if (config.filter.mode === undefined) {
		config.filter.mode = 'exclude';
	}
	if (config.transcode_flac === undefined) {
		config.transcode_flac = true;
	}
}

/**
 *
 * @throws {Error}
 */
config.init = function (source_path) {
	if (fs.exists(msync_path)) {
		throw new Error(
			'Folder ' + target_path + ' already initialized for synchronization'
		);
	}

	config.source_path = source_path;

	config.save();
};

/**
 *
 * @throws {Error}
 */
config.save = function () {
	fs.mkdirp(msync_path);

	var configJs = '';

	configJs += 'return {\n';
	configJs += '  filter: {\n';
	configJs += '    directories: [\n';
	config.filter.directories.forEach(function (dir) {
		configJs += '      "' + dir + '",\n';
	});
	configJs += '    ],\n';
	configJs += "    mode: '" + config.filter.mode + "',\n";
	configJs += '  },\n';
	configJs += "  source_path: '" + config.source_path + "',\n";
	configJs += '  transcode_flac: ' + config.transcode_flac + '\n';
	configJs += '};';

	fs.write_file(fs.join(msync_path, 'config.js'), configJs);
};

return config;
