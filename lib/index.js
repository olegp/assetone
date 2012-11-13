var fs = require('fs-base');

// TODO sourcemaps

function resolve(m, name) {
	if (m.resolve) {
		// RingoJS
		return m.resolve(name);
	} else if (m.filename) {
		// Common Node
		var fs = require("fs-base");
		return fs.normal(fs.join(fs.directory(m.filename), name));
	}
	throw new Error('Unknown ServerJS platform, cannot resolve');
}

var joinjs = exports.joinjs = function(filename) {
	var i = filename.lastIndexOf('/');
	var base = filename.substr(0, i), main = filename.substr(i + 1);
	var r = [];
	r.push(fs.read(resolve(module, './require.js')));
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

var concat = exports.concat = function(files) {
	var r = [];
	files.forEach(function(file) {
		r.push(fs.read(file));
	});
	return r.join('\n');
}

var middleware = exports.middleware = function(next, app) {
	app.joinjs = [{
		main : "./js/index",
		uri : "/js/index.js"
	}];
	return function(request) {
		for ( var i = 0; i < app.joinjs.length; i++) {
			var e = app.joinjs[i];
			if (request.pathInfo == e.uri) {
				if(!e.script) {
					if(e.main) {
						e.script = joinjs(e.main);
					} else {
						e.script = concat(e.files);
					}
				}
				return {
					status : 200,
					headers : {
						"Content-Type" : "application/javascript"
					},
					body : [e.script]
				}
			}
		}
		return next(request);
	}
}
