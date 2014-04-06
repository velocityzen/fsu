#fsu (fs unique)
Unique filenames with streams support

**Checking if a file exists before opening is an anti-pattern that leaves you vulnerable to race conditions: another process can remove the file between the calls to fs.exists() and fs.open(). This functions doesn't use fs.exists functionality. If file doesn't exist this will work like usual fs module methods**

##Instalation
`npm install fsu`

## writeFileUnique(filename, data, [options], callback)
Same as [fs.writeFile](http://nodejs.org/api/fs.html#fs_fs_writefile_filename_data_options_callback) but creates unique filename.

```js
var fsu = require('fsu');

fsu.writeFileUnique("text{_###}.txt", "test", function(err) {
    console.log("Done");
});

```

## createUniqueWriteStream(path, [options])
Same as [fs.createReadStream](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options) but returns writable stream for unique file.

```js
var fsu = require('fsu');
var stream = fsu.createUniqueWriteStream("text{_###}.txt");

```

## pattern
You must use `{#}` pattern in filename and path. All `#` characters will be change with counter for existing files. Number of `#` means padding for unique counter

If we run first example several times filenames will be
```
text.txt
text_001.txt
text_002.txt
```


License: MIT
