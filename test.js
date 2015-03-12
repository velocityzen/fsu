"use strict";
var fs = require("fs");
var fsu = require("./index.js");

var stream = fsu.createWriteStreamUnique("text{_stream###}.txt");

fsu.writeFileUnique("css/text{_file###}.txt", "test", {force: true}, function(err) {
	if(err) {
		console.log(err);
	} else {
		fs.createReadStream("readme.md").pipe(stream);
	}
});
