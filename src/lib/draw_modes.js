const tui = require('tui');

/**
 *
 * @returns {DrawModes}
 */
function init_draw_modes() {
	const color = {
		BG: 0,

		RED: 1,
		GREEN: 2,
		YELLOW: 3,
		BLUE: 4,
		PURPLE: 5,
		AQUA: 6,
		ORANGE: 3,

		GRAY: 8,
		LIGHT_GRAY: 7,

		LIGHT_RED: 9,
		LIGHT_GREEN: 10,
		LIGHT_YELLOW: 11,
		LIGHT_BLUE: 12,
		LIGHT_PURPLE: 13,
		LIGHT_AQUA: 14,
		LIGHT_ORANGE: 11,

		FG: 15,

		BG0_H: 0xec,
		BG0: 0xed,
		BG0_S: 0xee,
		BG1: 0xef,
		BG2: 0xf0,
		BG3: 0xf1,
		BG4: 0xf2,

		FG4: 0xf8,
		FG3: 0xf9,
		FG2: 0xfa,
		FG1: 0xfb,
		FG0: 0xfc,
	};

	/**
	 * @typedef {object} DrawModes
	 * @property {DrawMode} DEFAULT
	 * @property {DrawMode} HEADER_DONE
	 * @property {DrawMode} STATUS_LINE
	 */
	return tui.add_draw_modes({
		DEFAULT: [tui.A_NORMAL, color.LIGHT_GRAY, color.BG],
		HEADER_DONE: [tui.A_BOLD, color.PURPLE, color.BG],
		HEADER_IN_PROGRESS: [tui.A_BOLD, color.AQUA, color.BG],
		STATUS_LINE: [tui.A_BOLD, color.ORANGE, color.BG],
	});
}

return init_draw_modes;
