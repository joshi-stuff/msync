const fs = require('fs');
const proc = require('proc');
const term = require('term');
const tui = require('tui');
const wui = require('wui');

const ListBox = require('wui/ListBox.js');

const config = require('./config.js');
const init_draw_modes = require('./draw_modes.js');

/**
 * @returns {void}
 */
function filter() {
	wui.init();

	var error;

	try {
		init_screen();

		draw_modes = init_draw_modes();
		tui.set_default_draw_mode(draw_modes.DEFAULT);

		const list = init_list(draw_modes);

		do_filter(list);
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
 * @param {ListBox} list
 * @returns {void}
 */
function do_filter(list) {
	update_header(list);
	get_directories(list, config.source_path);
	select_directories(list, config.filter.directories);

	wui.run(function (key) {
		list.send_key(key);

		switch (key) {
			case 32:
				toggle_select(list);
				break;

			case tui.KEY_ENTER:
				config.save();
				break;

			case tui.KEY_F2:
				toggle_mode(list);
				break;
		}

		return ![tui.KEY_ESC, tui.KEY_ENTER].includes(key);
	});
}

/**
 * @param {ListBox} list
 * @param {string} source_path
 * @returns {void}
 */
function get_directories(list, source_path) {
	const prefix_len = fs.normalize_path(source_path).length;

	list.set_items(
		visit_directories(source_path)
			.sort()
			.map(function (dir) {
				return '  ' + dir.substring(prefix_len);
			})
	);
}

/**
 * @param {DrawModes} draw_modes
 * @returns {ListBox}
 */
function init_list(draw_modes) {
	return wui.connect(
		'list',
		new ListBox({
			header_draw_mode: draw_modes.HEADER_DONE,
		})
	);
}

/**
 * @returns {void}
 */
function init_screen() {
	wui.add_win('list', function (size) {
		return tui.win_new(1, 1, size.rows, size.cols, true);
	});
}

/**
 * @param {ListBox} list
 * @param {string[]} directories
 * @returns {void}
 */
function select_directories(list, directories) {
	const items = list.get_items();

	items.forEach(function (item, i) {
		const item_path = item.substring(2);

		items[i] = (directories.includes(item_path) ? '* ' : '  ') + item_path;
	});

	list.invalidate();
}

/**
 * @param {ListBox} list
 * @returns {void}
 */
function toggle_mode(list) {
	config.filter.mode =
		config.filter.mode === 'include' ? 'exclude' : 'include';

	update_header(list);
}

/**
 * @param {ListBox} list
 * @returns {void}
 */
function toggle_select(list) {
	const items = list.get_items();
	const item = items[list.get_selected_index()];
	const item_path = item.substring(2);

	const i = config.filter.directories.indexOf(item_path);

	if (i === -1) {
		config.filter.directories.push(item_path);
	} else {
		config.filter.directories.splice(i, 1);
	}

	select_directories(list, config.filter.directories);
}

/**
 * @param {ListBox} list
 * @returns {void}
 */
function update_header(list) {
	const includes = config.filter.mode === 'include';
	const l1 = includes ? 'INCLUDE' : 'EXCLUDE';
	const l2 = includes ? 'excludes' : 'includes';

	list.set_header(
		'✅ SELECT DIRECTORIES TO ' + l1 + ' (F2 ' + l2 + ', ENTER confirms)'
	);
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function visit_directories(dir) {
	const dirs = {};

	fs.list_dir(dir).forEach(function (name) {
		const file = fs.join(dir, name);

		if (fs.is_directory(file)) {
			dirs[file] = true;

			visit_directories(file).forEach(function (subdir) {
				dirs[subdir] = true;
			});
		}
	});

	return Object.keys(dirs);
}

return filter;
