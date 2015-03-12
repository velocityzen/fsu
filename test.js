"use strict";
var fs = require('fs');
var fsu = require('./index.js');

var stream = fsu.createWriteStreamUnique("text{_stream###}.txt");

fsu.writeFileUnique("text{_file###}.txt", "test", function(err) {
	if(err) {
		console.log(err);
	} else {
		fs.createReadStream("readme.md").pipe(stream);
	}
});
