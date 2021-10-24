const fs = require('fs');
const io = require('io');
const proc = require('proc');
const stream = require('stream');

const fdreq = io.pipe();
const fdrep = io.pipe();

proc.fork(function () {
	io.close(fdreq[1]);
	io.close(fdrep[0]);

	const sdreq = stream.create(fdreq[0]);

	var request;

	while ((request = stream.read_line(sdreq))) {
		try {
			const files = request.split('|');

			fs.mkdirp(fs.dirname(files[1]));
			fs.copy_file(files[0], files[1]);
			fs.unlink(files[0]);

			io.write_string(fdrep[1], '\n');
		} catch (err) {
			io.write_string(fdrep[1], err.toString().trim() + '\n');
		}
	}
});

io.close(fdreq[0]);
io.close(fdrep[1]);

const sdrep = stream.create(fdrep[0]);

/**
 * @exports mover
 * @readonly
 */
const mover = {};

mover.move = function (source_file, target_file) {
	io.write_string(fdreq[1], source_file + '|' + target_file + '\n');

	const reply = stream.read_line(sdrep);

	if (reply) {
		throw new Error(reply);
	}
};

return mover;
