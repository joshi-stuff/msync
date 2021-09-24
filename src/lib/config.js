const errno = require('errno');
const fs = require('fs');

const target_path = fs.normalize_path('.');
const msync_path = fs.join(target_path, '.msync');
const config_js_path = fs.join(msync_path, 'config.js');

/**
 * @exports config
 * @readonly
 */
const config = {
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

	config.source_path = cfg.source_path;
	config.transcode_flac = cfg.transcode_flac;

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
	configJs += "	source_path: '" + config.source_path + "',\n";
	configJs += '	transcode_flac: ' + config.transcode_flac + '\n';
	configJs += '};';

	fs.write_file(fs.join(msync_path, 'config.js'), configJs);
};

return config;
