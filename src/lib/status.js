const crypto = require('crypto');
const fs = require('fs');
const io = require('io');
const term = require('term');

const config = require('./config.js');

const last_status_json_path = fs.join(
	config.target_path,
	'.msync',
	'last-status.json'
);

/**
 * @exports status
 * @readonly
 */
const status = {
	/**
	 * Target mirror status
	 *
	 * @type {Status}
	 */
	last: {},
};

// Load last status from disk if it exists
if (fs.exists(last_status_json_path)) {
	status.last = JSON.parse(fs.read_file(last_status_json_path));
}

/**
 *
 * @returns {Comparison}
 * @throws {Error}
 */
status.diff = function () {
	if (!config.source_path) {
		throw new Error('No source path has been configured: run msync init');
	}

	const comparison = {};

	const from = status.last;
	const to = get_tree_status('.', config.source_path);

	// New files
	Object.entries(to).forEach(function (entry) {
		const filePath = entry[0];
		const toFileInfo = entry[1];
		const fromFileInfo = from[filePath];

		if (!fromFileInfo) {
			comparison[filePath] = {
				status: '+',
				from: undefined,
				to: toFileInfo,
			};
		}
	});

	// Deleted or modified files
	Object.entries(from).forEach(function (entry) {
		const filePath = entry[0];
		const fromFileInfo = entry[1];
		const toFileInfo = to[filePath];

		if (!toFileInfo) {
			comparison[filePath] = {
				status: '-',
				from: fromFileInfo,
				to: undefined,
			};
		} else if (
			toFileInfo.ctime !== fromFileInfo.ctime ||
			toFileInfo.mtime !== fromFileInfo.mtime ||
			toFileInfo.size !== fromFileInfo.size ||
			toFileInfo.header.hash !== fromFileInfo.header.hash
		) {
			comparison[filePath] = {
				status: 'M',
				from: fromFileInfo,
				to: toFileInfo,
			};
		}
	});

	return comparison;
};

/**
 *
 * @returns {void}
 * @throws {Error}
 */
status.save = function () {
	fs.write_file(last_status_json_path, JSON.stringify(status.last, null, 2));
};

/**
 *
 * @returns {void}
 * @throws {Error}
 */
status.touch = function () {
	status.last = get_tree_status('.', config.source_path);

	status.save();
};

/**
 *
 * @param {string} rel_dir_path
 * @param {string} root_dir_path
 *
 * @returns {Status}
 * @throws {Error}
 */
function get_tree_status(rel_dir_path, root_dir_path) {
	const tree_status = {};

	const items = fs.list_dir(fs.join(root_dir_path, rel_dir_path));

	for (var i = 0; i < items.length; i++) {
		const rel_item_path = rel_dir_path + '/' + items[i];
		const abs_item_path = fs.join(root_dir_path, rel_item_path);

		if (fs.is_file(abs_item_path)) {
			tree_status[rel_item_path.substring(2)] =
				get_file_info(abs_item_path);
		} else if (fs.is_directory(abs_item_path)) {
			tree_status = Object.assign(
				tree_status,
				get_tree_status(rel_item_path, root_dir_path)
			);
		}
	}

	return tree_status;
}

/**
 *
 * @param {string} file_path
 *
 * @returns {FileInfo}
 * @throws {Error}
 */
function get_file_info(file_path) {
	const statbuf = fs.stat(file_path);

	const header = get_file_header(file_path, statbuf);

	const hash = crypto.sha256(header);

	const header_hash = '';

	for (var i = 0; i < hash.length; i++) {
		const n = hash[i].toString(16);

		if (n.length < 2) {
			n = '0' + n;
		}

		header_hash += n;
	}

	return {
		ctime: statbuf.time.change,
		mtime: statbuf.time.modification,
		size: statbuf.size,
		header: {
			hash: header_hash,
		},
	};
}

/**
 *
 * @param {string} file_path
 * @param {StatBuf} statbuf
 *
 * @returns {Uint8Array}
 * @throws {Error}
 */
function get_file_header(file_path, statbuf) {
	const count = Math.min(16384, statbuf.size);
	const header = new Uint8Array(count);

	// Extract MP3 and FLAC data getting the first 16KB of the file (8KB may be
	// enough, but to make sure)
	const fd = io.open(file_path, 'r');

	try {
		io.read(fd, header, count);
	} finally {
		io.close(fd);
	}

	return header;
}

return status;
