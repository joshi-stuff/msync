const fs = require('fs');
const proc = require('proc');
const term = require('term');
const tui = require('tui');
const wui = require('wui');

const ListBox = require('wui/ListBox.js');
const TextViewer = require('wui/TextViewer.js');

const config = require('./config.js');
const init_draw_modes = require('./draw_modes.js');
const processor = require('./processor.js');
const status = require('./status.js');

const cpu_count = get_cpu_count();
var finished = false;

/**
 *
 *
 * @returns {void}
 */
function sync() {
	wui.init();

	var error;

	try {
		init_screen();

		draw_modes = init_draw_modes();
		tui.set_default_draw_mode(draw_modes.DEFAULT);

		const cpu_list = init_cpu_list(draw_modes);
		const done_list = init_done_list(draw_modes);

		do_sync(cpu_list, done_list);
	} catch (err) {
		error = err;
	} finally {
		tui.end();
		term.clear();
	}

	if (error) {
		term.println2(error.stack);
		proc.exit(1);
	}
}

/**
 *
 * @param {TextViewer} cpu_list
 * @param {ListBox} done_list
 *
 * @returns {void}
 */
function do_sync(cpu_list, done_list) {
	cpu_list.set_header('👀 FINDING DIFFERENCES...');
	wui.redraw();

	const comparison = status.diff();
	const item_count = Object.keys(comparison).length;

	const write_period_ms = 15000;
	var last_write_ms = Date.now();

	function maybe_save_status() {
		if (Date.now() - last_write_ms > write_period_ms) {
			status.save();
			last_write_ms = Date.now();
		}
	}

	cpu_list.set_header('🚀 SYNCHRONIZING...');
	done_list.set_header('SYNCHRONIZED ITEMS (0 / ' + item_count + ')');
	wui.redraw();

	function update_done_list_header() {
		done_list.set_header(
			'SYNCHRONIZED ITEMS (' +
				done_list.get_items().length +
				' / ' +
				item_count +
				')'
		);
	}

	processor.process(
		cpu_count,
		config.source_path,
		config.target_path,
		comparison,
		{
			transcode_flac: config.transcode_flac,
			unify_artist: config.unify_artist,
		},
		{
			copied: function (file_name) {
				done_list.get_items().push('✅ ' + file_name);
				done_list.go_end();
				update_done_list_header();
				wui.redraw();

				status.last[file_name] = comparison[file_name].to;
				maybe_save_status();
			},

			deleted: function (file_name) {
				done_list.get_items().push('🛑 ' + file_name);
				done_list.go_end();
				update_done_list_header();
				wui.redraw();

				delete status.last[file_name];
				maybe_save_status();
			},

			queue_updated: function (children) {
				cpu_list.set_lines(Object.values(children));
				wui.redraw();
			},
		}
	);

	status.save();

	finished = true;
	cpu_list.set_header('🏁 FINISHED (Press ESC to exit)');
	done_list.get_items().sort();
	done_list.go_home();
	done_list.set_header('SYNCHRONIZED ITEMS (' + item_count + ')');
	wui.relayout();

	wui.run(function (key) {
		done_list.send_key(key);

		return key !== tui.KEY_ESC;
	});
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
 * @param {DrawModes} draw_modes
 *
 * @returns {TextViewer}
 */
function init_cpu_list(draw_modes) {
	return wui.connect(
		'cpus',
		new TextViewer({
			header_draw_mode: draw_modes.HEADER_IN_PROGRESS,
		})
	);
}

/**
 *
 * @param {DrawModes} draw_modes
 *
 * @returns {TextViewer}
 */
function init_done_list(draw_modes) {
	return wui.connect(
		'done',
		new ListBox({
			header_draw_mode: draw_modes.HEADER_DONE,
		})
	);
}

/**
 * @returns {void}
 */
function init_screen() {
	function get_cpus_rows() {
		return finished ? 3 : cpu_count + 4;
	}

	wui.add_win('cpus', function (size) {
		const cpus_rows = get_cpus_rows();

		return tui.win_new(1, 1, cpus_rows, size.cols, true);
	});

	wui.add_win('done', function (size) {
		const cpus_rows = get_cpus_rows();

		return tui.win_new(
			1 + cpus_rows,
			1,
			size.rows - cpus_rows,
			size.cols,
			true
		);
	});
}

return sync;
