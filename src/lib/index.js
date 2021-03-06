const proc = require('proc');
const term = require('term');

const app = require('./app.js');

const println2 = term.println2;

const VERSION = '0.0.0';

// TODO: create a TUI app where F1 is help, F2 config, F3 sync, and so on
// TODO: if started in a directory with no config launch F2
// TODO: if started in a directory with config launch F3
// TODO: in F3, first diff, then confirm with ENTER or any other key

return function (argv) {
	const cmd = argv[2];

	if (cmd === '-v') {
		term.println2(VERSION);
		proc.exit(0);
	}

	if (app[cmd] === undefined) {
		showHelp();
		proc.exit(-1);
	}

	try {
		app[cmd](argv.slice(3));
	} catch (err) {
		println2(err.stack);
	}
};

function showHelp() {
	println2('');
	println2('');
	println2('Usage: msync <command> [...<options>]');
	println2('');
	println2('Available commands:');
	println2('');
	println2('  · init <source path> [-t]');
	println2('  · configure');
	println2('  · diff');
	println2('  · refresh');
	println2('  · sync [-y]');
	println2('  · touch');
	println2('');
	println2('Init command:');
	println2('');
	println2('  Initialize current folder as mirror target.');
	println2('  Options:');
	println2('    <source path>: path to mirror source');
	println2('    -t:            invoke touch after initialization');
	println2('');
	println2('Configure command:');
	println2('');
	println2('  Edit configuration (eg: filtering or transcoding).');
	println2('');
	println2('Diff command:');
	println2('');
	println2('  Compare mirror and source directories.');
	println2('');
	println2('Refresh command:');
	println2('');
	println2('  Mark directories to be synchronized on next sync.');
	println2('');
	println2('Sync command:');
	println2('');
	println2('  Synchronize current folder with mirror source.');
	println2('  Options:');
	println2('    -y: assume yes for all questions');
	println2('');
	println2('Touch command:');
	println2('');
	println2('  Mark current folder as synchronized.');
	println2('');
	println2('');
}
