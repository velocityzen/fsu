'use strict';
const fs = require('fs');
const path = require('path');
const inherits = require('util').inherits;
const WriteStream = fs.WriteStream;

const rxFileParts = /(.*)\{([^#{}]*)(#+)([^#{}]*)\}(.*)/;

const defaultDirMode = 0o777 & (~process.umask());
const defaultFileMode = 0o666 & (~process.umask());

const padNum = function(n, width, z) {
  z = z || '0';
  n = String(n);
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

function writeAll(fd, buffer, offset, length, position, cb) {
  fs.write(fd, buffer, offset, length, position, (writeErr, written) => {
    if (writeErr) {
      fs.close(fd, () => cb(writeErr));
    } else if (written === length) {
      fs.close(fd, cb);
    } else {
      offset += written;
      length -= written;
      position += written;
      writeAll(fd, buffer, offset, length, position, cb);
    }
  });
}

function writeAllAsync(fd, buffer, offset, length, position) {
  return new Promise((resolve, reject) => {
    writeAll(fd, buffer, offset, length, position, err => {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  })
}

async function openUniqueHandler(tryNum, fileParts, options) {
  const file = options.simple ? fileParts.tail : tryNum ? (fileParts.head + fileParts.padLeft + padNum(tryNum, fileParts.pad) + fileParts.padRight + fileParts.tail) : (fileParts.head + fileParts.tail);
  const newPath = path.join(fileParts.path, file);

  try {
    const fd = await fs.promises.open(newPath, options.flags || 'w', options.mode || defaultFileMode);
    return {
      fd: fd.fd,
      path: newPath
    };
  } catch (err) {
    if (err.code === 'EEXIST' && !options.simple) {
      return openUniqueHandler(++tryNum, fileParts, options);
    } else if (err.code === 'ENOENT' && options.force) {
      await fs.promises.mkdir(fileParts.path, {
        mode: defaultDirMode,
        recursive: true
      });

      return openUniqueHandler(tryNum, fileParts, options);
    }

    throw err;
  }
}

function openUnique(file, options) {
  file = path.resolve(file);
  const filePath = path.dirname(file);
  const fileName = path.basename(file);

  const fileParts = rxFileParts.exec(fileName);

  if (!fileParts) {
    options.simple = true;
    return openUniqueHandler(0, {
      path: filePath,
      tail: fileName
    }, options);
  }

  options.simple = false;
  options.flags = 'wx';
  return openUniqueHandler(0, {
    path: filePath,
    head: fileParts[1] || '',
    padLeft: fileParts[2],
    pad: fileParts[3].length,
    padRight: fileParts[4],
    tail: fileParts[5] || ''
  }, options);
}

async function writeFileUnique(filename, data, options = { encoding: 'utf8', mode: defaultFileMode, flags: 'w' }) {
  const { fd, path } = await openUnique(filename, options);
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), options.encoding || 'utf8');
  await writeAllAsync(fd, buffer, 0, buffer.length, 0);
  return path;
}

// stream
function WriteStreamUnique(file, options = {}) {
  this.force = options.force;
  WriteStream.call(this, file, options);
}
inherits(WriteStreamUnique, WriteStream);

WriteStreamUnique.prototype.open = function() {
  openUnique(this.path, {
    flags: this.flags,
    mode: this.mode,
    force: this.force
  }).then(({ fd, path }) => {
    this.path = path;
    this.fd = fd;
    this.emit('open', this.fd);
    this.emit('ready');
  }).catch(e => {
    if (this.autoClose) {
      this.destroy();
    }
    this.emit('error', e);
  })
}

const createWriteStreamUnique = (file, options) => new WriteStreamUnique(file, options);

module.exports = {
  openUnique,
  writeFileUnique,
  WriteStreamUnique,
  createWriteStreamUnique
};
