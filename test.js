'use strict';
const test = require('ava');
const del = require('del');
const path = require('path');

const fs = require('fs');
const fsu = require('./index.js');

test.after.always(() => del([ './test' ]));

test.serial('write unique file', async t => {
  const filePath = await fsu.writeFileUnique(path.join('test', 'test{_file###}.txt'), 'test', { force: true });
  t.true(filePath.endsWith('test.txt'));
});

test.serial('write file with a file name without pattern', async t => {
  const filePath = await fsu.writeFileUnique(path.join('test', 'test1.txt'), 'test', { force: true });
  t.true(filePath.endsWith('test1.txt'));
});

test.serial.cb('writes unique file with fs stream', t => {
  const stream = fsu.createWriteStreamUnique(path.join('test', 'test{_stream###}.txt'), { force: true });
  fs.createReadStream('readme.md').pipe(stream).on('finish', () => {
    t.true(stream.path.endsWith('test_stream001.txt'));
    t.end();
  });
});

test.serial.cb('fails to write unique file with a stream to non existed directory', t => {
  const stream = fsu.createWriteStreamUnique(path.join('nonexisted', 'test{_stream###}.txt'));
  fs.createReadStream('readme.md').pipe(stream)
    .on('finish', () => t.fail())
    .on('error', () => t.end())
});

test.serial.cb('writes big unique file with fs stream', t => {
  const stream = fsu.createWriteStreamUnique(path.join('test', 'test{_stream###}.txt'), { force: true });
  fs.createReadStream('package-lock.json')
    .pipe(stream)
    .on('finish', () => {
      t.true(stream.path.endsWith('test_stream002.txt'));
      t.end();
    });
});
