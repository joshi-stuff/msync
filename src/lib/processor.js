const fs = require('fs');
const io = require('io');
const proc = require('proc');
const $ = require('shell');
const term = require('term');

const mover = require('./mover.js');

const log_dir = '/tmp/msync.log';
const println2 = term.println2;

/**
 * @exports processor
 * @readonly
 */
const processor = {};

/**
 *
 * @param {number} cpu_count
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
	cpu_count,
	source_path,
	target_path,
	comparison,
	options,
	callback
) {
	// Empty log directory
	fs.rmdir(log_dir, true);
	fs.mkdirp(log_dir);

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
				fs.join(source_path, file_name),
				fs.join(target_path, file_name),
				options
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
						'Process of file failed: ' +
							finished_file_name +
							' (see logs at ' +
							log_dir +
							')'
					);
				}

				callback.copied(finished_file_name);

				delete children[pid];
			}

			// Queue a new child
			const file_name = modification[0];

			const source_file = fs.join(source_path, file_name);
			const target_file = fs.join(target_path, file_name);

			const pid = proc.fork(function () {
				copy_file(file_name, source_file, target_file, options);
			});

			children[pid] = file_name;
			callback.queue_updated(children);
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
		callback.queue_updated(children);
	});
};

/**
 *
 * @param {string} file_name
 * @param {string} source_file
 * @param {string} target_file
 * @param {ProcessOptions} options
 *
 * @returns {void}
 * @throws {Error}
 */
function copy_file(file_name, source_file, target_file, options) {
	const log_file = fs.join(log_dir, file_name + '.log');
	fs.mkdirp(fs.dirname(log_file));
	const fd = io.create(log_file);

	io.dup2(fd, 1);
	io.dup2(fd, 2);

	try {
		target_file = rewrite_path(target_file);

		if (source_file.endsWith('.flac') && options.transcode_flac === true) {
			target_file = target_file.replace(/flac$/, 'mp3');
		}

		const tmp_file =
			'/tmp/msync.' + proc.getpid() + get_extension(target_file);

		// Copy or transcode file
		if (options.transcode_flac && source_file.endsWith('.flac')) {
			switch (options.transcode_flac) {
				case 'upsample': {
					switch (get_sample_rate(source_file)) {
						case 44100:
							resample('88.2k', source_file, tmp_file);
							break;

						case 48000:
							resample('192k', source_file, tmp_file);
							break;

						default:
							fs.copy_file(source_file, tmp_file);
							break;
					}
					break;
				}

				default:
					transcode(source_file, tmp_file);
					break;
			}
		} else {
			fs.copy_file(source_file, tmp_file);
		}

		// Unify artist if needed
		if (options.unify_artist) {
			const album_artist = get_album_artist(source_file);

			if (album_artist) {
				set_unified_artist(tmp_file, album_artist);
			}
		}

		// Move to final destination
		mover.move(tmp_file, target_file);
	} catch (err) {
		println2('===========================================================');
		println2(err.stack);
		proc.exit(1);
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
 * @param {string} file
 * @returns {string}
 */
function get_album_artist(file) {
	const x = {};

	$('kid3-cli', file, '-c', 'get albumartist').pipe(x).do();

	return x.out.trim();
}

/**
 * @param {string} file
 * @returns {string}
 */
function get_extension(file) {
	const i = file.lastIndexOf('.');

	return file.substring(i);
}

/**
 * @param {string} file
 * @returns {number} sample rate in Hz
 */
function get_sample_rate(file) {
	const x = {};

	$('metaflac', '--show-sample-rate', file).pipe(x).do();

	return Number(x.out.trim());
}

/**
 * @param {number} sample_rate
 * @param {string} source_file
 * @param {string} target_file
 * @returns {void}
 */
function resample(sample_rate, source_file, target_file) {
	$(
		'sox',
		'-V',
		source_file,
		'-r',
		sample_rate,
		'-b',
		'16',
		target_file
	).do();
}

/**
 *
 * @param {string} abs_file_path
 *
 * @returns {string}
 */
function rewrite_path(abs_file_path) {
	// Convert case
	const dirs = abs_file_path.split('/');

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
				break;
			}
		}

		parent_dir = fs.join(parent_dir, dirs[i]);
	}

	var return_path = '/';

	for (var i = 0; i < dirs.length; i++) {
		return_path = fs.join(return_path, dirs[i]);
	}

	// Replace chars
	return_path = return_path.replace(/"/g, "'");

	return return_path;
}

/**
 * @param {string} file
 * @param {string} artist
 */
function set_unified_artist(file, artist) {
	$(
		'kid3-cli',
		file,
		'-c',
		'set artist "' + artist + '"',
		'-c',
		'set albumartist ""'
	).do();
}

/**
 * @param {string} source_file
 * @param {string} target_file
 * @returns {void}
 */
function transcode(source_file, target_file) {
	$(
		'ffmpeg',
		'-i',
		source_file,
		'-qscale:a',
		'0', // see https://trac.ffmpeg.org/wiki/Encode/MP3
		'-y',
		target_file
	).do();
}

return processor;
