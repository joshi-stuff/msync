const proc = require('proc');
const term = require('term');
const tui = require('tui');
const wui = require('wui');

const ListBox = require('wui/ListBox.js');

const init_draw_modes = require('./draw_modes.js');
const status = require('./status.js');

/**
 *
 *
 * @returns {void}
 */
function refresh() {
	wui.init();

	var error;

	try {
		init_screen();

		draw_modes = init_draw_modes();
		tui.set_default_draw_mode(draw_modes.DEFAULT);

		const list = init_list(draw_modes);

		do_refresh(list);
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
 * @param {ListBox} list
 *
 * @returns {void}
 */
function do_refresh(list) {
	list.set_header(
		'✅ SELECT DIRECTORIES TO REFRESH (Press ENTER to confirm)'
	);
	list.set_items(get_directories());

	wui.run(function (key) {
		list.send_key(key);

		switch (key) {
			case 32:
				toggle_select(list);
				break;

			case tui.KEY_ENTER:
				refresh_status(list);
				break;
		}

		return ![tui.KEY_ESC, tui.KEY_ENTER].includes(key);
	});
}

function get_directories() {
	const hash = Object.keys(status.last).reduce(function (hash, dir) {
		const i = dir.lastIndexOf('/');

		dir = dir.substring(0, i);

		hash[dir] = true;

		return hash;
	}, {});

	return Object.keys(hash)
		.sort()
		.map(function (dir) {
			return '  ' + dir;
		});
}

/**
 *
 * @param {DrawModes} draw_modes
 *
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
 * @returns {void}
 */
function refresh_status(list) {
	const to_delete = [];

	list.get_items()
		.filter(function (item) {
			return item[0] === '*';
		})
		.map(function (item) {
			return item.substring(2);
		})
		.forEach(function (dir) {
			Object.keys(status.last).forEach(function (file) {
				if (file.startsWith(dir)) {
					to_delete.push(file);
				}
			});
		});

	to_delete.forEach(function (file) {
		delete status.last[file];
	});

	status.save();
}

/**
 * @returns {void}
 */
function toggle_select(list) {
	const items = list.get_items();
	const i = list.get_selected_index();
	const item = items[i];

	if (item[0] === ' ') {
		items[i] = '*' + item.substring(1);
	} else {
		items[i] = ' ' + item.substring(1);
	}

	list.invalidate();
}

return refresh;
