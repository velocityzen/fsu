"use strict";
var fs = require('fs');
var fsu = require('./index.js');

var stream = fsu.createUniqueWriteStream("text{_stream###}.txt");

fsu.writeFileUnique("text{_file###}.txt", "test", function(err) {
	if(!err) {
		fs.createReadStream("readme.md").pipe(stream);
	}
});
