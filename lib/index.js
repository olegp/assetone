var fs = require('fs-base');

// TODO sourcemaps

var joinjs = exports.joinjs = function(filename) {
	var i = filename.lastIndexOf('/');
	var base = filename.substr(0, i), main = filename.substr(i + 1);
	var r = [];
	r.push(fs.read('./require.js'));
	fs.listTree(base).forEach(
			function(file) {
				var name = fs.join(base, file);
				if (fs.isFile(name)) {
					var extension = fs.extension(file);
					if (extension == ".js") {
						var module = file.substr(0, file.length - extension.length);
						r.push('modules["' + module
								+ '"] = function(require, exports, module) {');
						r.push(fs.read(name).split('\n').map(function(line) {
							return line ? '  ' + line : '';
						}).join('\n') + '};\n');
					} else {
						r.push('modules["' + file
								+ '"] = function(require, exports, module) {');
						r.push('  module.exports = ' + JSON.stringify(fs.read(name))
								+ ';\n};\n');
					}
				}
			});
	if (main) {
		r.push('require("' + main + '");');
	}
	return r.join('\n');
}

var middleware = exports.middleware = function(next, app) {
	app.joinjs = [{
		filename : "./js/index",
		uri : "/js/index.js"
	}];
	return function(request) {
		app.joinjs.forEach(function(e) {
			if (request.pathInfo = script.uri) {
				return {
					status : 200,
					headers : {},
					body : [e.script = e.script || joinjs(e.filename)]
				}
			}
		});
		return next(request);
	}
}
