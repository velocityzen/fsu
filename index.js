"use strict";
var fs = require("fs");
var path = require("path");
var inherits = require("util").inherits;
var WriteStream = fs.WriteStream;

var rx = /(.*)\{([^#\{\}]*)(#+)([^#\{\}]*)\}(.*)/;

var defaultDirMode = parseInt("0777", 8) & (~process.umask());
var defaultFileMode = parseInt("0666", 8) & (~process.umask());

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

var mkdirp = function(p, mode, cb) {
	fs.mkdir(p, mode, function (err) {
		if(!err) {
			cb();
		} else if(err.code === "ENOENT") {
			mkdirp(path.dirname(p), mode, function(er) {
				if(er) {
					cb(er);
				} else {
					mkdirp(p, mode, cb);
				}
			});
		} else {
			cb(err);
		}
	});
};

var openUniqueHandler = function(tryNum, fileParts, options, cb) {
	var file = options.simple ? fileParts.tail : tryNum ? (fileParts.head + fileParts.padLeft + padNum(tryNum, fileParts.pad) + fileParts.padRight + fileParts.tail) : (fileParts.head + fileParts.tail);

	fs.open(path.join(fileParts.path, file), options.flags || "w", options.mode || defaultFileMode, function(err, fd) {
		if(err && err.code === "EEXIST" && !options.simple) {
			openUniqueHandler(++tryNum, fileParts, options, cb);
		} else if(err && err.code === "ENOENT" && options.force) {
			mkdirp(fileParts.path, defaultDirMode, function(er) {
				if(er) {
					cb(er);
				} else {
					openUniqueHandler(tryNum, fileParts, options, cb);
				}
			});
		} else {
			cb(err, fd);
		}
	});
};

var openUnique = function(file, options, cb) {
	file = path.resolve(file);
	var filePath = path.dirname(file),
		fileName = path.basename(file);

	var fileParts = rx.exec(fileName);

	if(!fileParts) {
		options.simple = true;
		openUniqueHandler(0, {
			path: filePath,
			tail: fileName
		}, options, cb);
	} else {
		options.simple = false;
		options.flags = "wx";
		openUniqueHandler(0, {
			path: filePath,
			head: fileParts[1] || "",
			padLeft: fileParts[2],
			pad: fileParts[3].length,
			padRight: fileParts[4],
			tail: fileParts[5] || ""
		}, options, cb);
	}
};

var writeFileUnique = function(filename, data, options, cb) {
	if(cb === undefined) {
		cb = options;
		options = { encoding: "utf8", mode: defaultFileMode, flags: "w" };
	}

	openUnique(filename, options, function(err, fd) {
		if(err) {
			cb(err);
		} else {
			var buffer = Buffer.isBuffer(data) ? data : new Buffer("" + data, options.encoding || "utf8");
			writeAll(fd, buffer, 0, buffer.length, 0, cb);
		}
	});
};

// stream
var WriteStreamUnique = function(file, options) {
	if(options && options.force) {
		this.force = options.force;
		delete options.force;
	}
	WriteStream.call(this, file, options);
};
inherits(WriteStreamUnique, WriteStream);

WriteStreamUnique.prototype.open = function() {
	var self = this;

	openUnique(this.path, {
		flags: this.flags,
		mode: this.mode,
		force: this.force
	}, function(err, fd) {
		if (err) {
			self.destroy();
			self.emit("error", err);
			return;
		}

		self.fd = fd;
		self.emit("open", fd);
	});
};

var createWriteStreamUnique = function(file, options) {
	return new WriteStreamUnique(file, options);
};

module.exports = {
	openUnique: openUnique,
	writeFileUnique: writeFileUnique,
	createWriteStreamUnique: createWriteStreamUnique
};
