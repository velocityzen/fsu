"use strict";
var fs = require("fs");
var inherits = require("util").inherits;
var WriteStream = fs.WriteStream;

var rx = /(.+)\{([^#\{\}]*)(#+)([^#\{\}]*)\}(.+)/;

var padNum = function(n, width, z) {
	z = z || "0";
	n = n + "";
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

var writeAll = function(fd, buffer, offset, length, position, cb) {
	fs.write(fd, buffer, offset, length, position, function(writeErr, written) {
		if (writeErr) {
			fs.close(fd, function() {
				cb(writeErr);
			});
		} else {
			if (written === length) {
				fs.close(fd, cb);
			} else {
				offset += written;
				length -= written;
				position += written;
				writeAll(fd, buffer, offset, length, position, cb);
			}
		}
	});
};

var openUniqueHandler = function(tryNum, head, padLeft, pad, padRight, tail, mode, cb) {
	var file = tryNum ? (head + padLeft + padNum(tryNum, pad) + padRight + tail) : (head + tail);

	fs.open(file, "wx", mode || 438, function(err, fd) {
		if(err && err.code === "EEXIST") {
			openUniqueHandler(++tryNum, head, padLeft, pad, padRight, tail, mode, cb);
		} else {
			cb(err, fd);
		}
	});
};

var openUnique = function(filename, mode, cb) {
	if(cb === undefined) {
		cb = mode;
		mode = 438;
	}

	filename = rx.exec(filename);
	if(!filename) {
		cb(new Error("Can't find a counter pattern in filename"));
	}

	openUniqueHandler(0, filename[1], filename[2], filename[3].length, filename[4], filename[5], mode, cb);
};

var writeFileUnique = function(filename, data, options, cb) {
	if(cb === undefined) {
		cb = options;
		options = { encoding: "utf8", mode: 438 /*=0666*/ };
	}

	openUnique(filename, options.mode, function(err, fd) {
		if(err) {
			cb(err);
		} else {
			var buffer = Buffer.isBuffer(data) ? data : new Buffer("" + data, options.encoding || "utf8");
			writeAll(fd, buffer, 0, buffer.length, 0, cb);
		}
	});
};

// stream
var WriteStreamUnique = function(path, options) {
	WriteStream.call(this, path, options);
};
inherits(WriteStreamUnique, WriteStream);

WriteStreamUnique.prototype.open = function() {
	openUnique(this.path, this.mode, function(err, fd) {
		if (err) {
			this.destroy();
			this.emit("error", err);
			return;
		}

		this.fd = fd;
		this.emit("open", fd);
	}.bind(this));
};

var createWriteStreamUnique = function(path, options) {
	return new WriteStreamUnique(path, options);
};

module.exports = {
	openUnique: openUnique,
	writeFileUnique: writeFileUnique,
	createWriteStreamUnique: createWriteStreamUnique
};
