const fs = require('fs');
const io = require('io');
const proc = require('proc');

/**
 * @exports processor
 * @readonly
 */
const processor = {};

/**
 *
 * @param {string} source_path
 * @param {string} target_path
 * @param {Comparison} comparison
 * @param {ProcessOptions} options
 * @param {ProcessorCallback} callback
 *
 * @returns {void}
 * @throws {Error}
 */
processor.process = function (
	source_path,
	target_path,
	comparison,
	options,
	callback
) {
	const cpu_count = get_cpu_count();

	callback.detected_cpus(cpu_count);

	// First delete to avoid removing files after they have been added (for
	// example, if we change from mp3 to flac in the source.)
	Object.entries(comparison)
		.filter(function (modification) {
			return modification[1].status === '-';
		})
		.map(function (modification) {
			return modification[0];
		})
		.sort()
		.forEach(function (file_name) {
			delete_file(
				fs.join(
					fs.join(source_path, file_name),
					fs.join(target_path, file_name),
					options
				)
			);
			callback.deleted(file_name);
		});

	const children = {};

	// Then add and modify in parallel
	Object.entries(comparison)
		.filter(function (modification) {
			return (
				modification[1].status === '+' || modification[1].status === 'M'
			);
		})
		.sort(function (l, r) {
			return l[0].localeCompare(r[0]);
		})
		.forEach(function (modification) {
			// Wait for one child to finish if all CPUs are in use
			if (Object.keys(children).length >= cpu_count) {
				const result = proc.waitpid(-1, 0);
				const pid = result.value;
				const finished_file_name = children[pid];

				if (result.exit_status !== 0) {
					throw new Error(
						'Process of file failed: ' + finished_file_name
					);
				}

				callback.copied(finished_file_name);

				delete children[pid];
			}

			// Queue a new child
			const file_name = modification[0];

			const pid = proc.fork(function () {
				copy_file(
					fs.join(source_path, file_name),
					fs.join(target_path, file_name),
					options
				);
			});

			children[pid] = file_name;
		});

	// Wait for remaining children
	Object.keys(children).forEach(function (child_pid) {
		const result = proc.waitpid(child_pid);
		const pid = result.value;
		const finished_file_name = children[pid];

		if (result.exit_status !== 0) {
			throw new Error('Process of file failed: ' + finished_file_name);
		}

		callback.copied(finished_file_name);

		delete children[pid];
	});
};

/**
 *
 * @param {string} source_file
 * @param {string} target_file
 * @param {ProcessOptions} options
 *
 * @returns {void}
 * @throws {Error}
 */
function copy_file(source_file, target_file, options) {
	const target_dir = fs.dirname(target_file);
	const rewrite_target_dir = rewrite_path_case(target_dir);

	try {
		fs.mkdirp(rewrite_target_dir);
	} catch (err) {
		// Ignore
	}

	if (source_file.endsWith('.flac') && options.transcode_flac) {
		io.dup2(io.open('/dev/null'), 1);
		io.dup2(io.open('/dev/null'), 2);

		proc.exec('ffmpeg', [
			'-i',
			source_file,
			'-qscale:a',
			'0', // see https://trac.ffmpeg.org/wiki/Encode/MP3
			'-y',
			rewrite_path_case(target_file.replace(/flac$/, 'mp3')),
		]);
	} else {
		fs.copy_file(source_file, rewrite_path_case(target_file));
	}
}

/**
 *
 * @param {string} source_file
 * @param {string} target_file
 * @param {ProcessOptions} options
 *
 * @returns {void}
 * @throws {Error}
 */
function delete_file(source_file, target_file, options) {
	if (source_file.endsWith('.flac') && options.transcode_flac) {
		fs.unlink(target_file.replace(/flac$/, 'mp3'));
	} else {
		fs.unlink(target_file);
	}
}

/**
 *
 * @returns {number}
 * @throws {Error}
 */
function get_cpu_count() {
	const cpuinfo = fs.read_file('/proc/cpuinfo');

	return cpuinfo.split('\n').filter(function (line) {
		return line.startsWith('processor');
	}).length;
}

/**
 *
 * @param {string} abs_file_path
 *
 * @returns {string}
 */
function rewrite_path_case(abs_file_path) {
	const dirs = abs_file_path.split('/');

	//let warn = false;
	var parent_dir = '/';

	for (var i = 0; i < dirs.length; i++) {
		if (!fs.exists(parent_dir) || !fs.is_directory(parent_dir)) {
			break;
		}

		const dir = dirs[i];
		const names = fs.list_dir(parent_dir);

		for (var j = 0; j < names.lenght; j++) {
			const name = names[j];

			if (name.toLowerCase() === dir.toLowerCase() && name !== dir) {
				dirs[i] = name;

				//warn = true;

				break;
			}
		}

		parent_dir = fs.join(parent_dir, dirs[i]);
	}

	var return_path = '/';

	for (var i = 0; i < dirs.length; i++) {
		return_path = fs.join(return_path, dirs[i]);
	}

	/*
	if (warn) {
		console.log(
			`Warning: path`,
			checkedPath,
			`has been changed to`,
			returnPath,
			`to avoid errors`
		);
	}
	*/

	return return_path;
}
return processor;
