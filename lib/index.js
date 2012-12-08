var fs = require('fs-base');
var RINGO = module.resolve != undefined;
var minify, compress;
if (!RINGO) {
  minify = require("uglify-js2").minify;
  compress = require("clean-css").process;
}

// TODO sourcemaps

function resolve(m, name) {
  if (RINGO) {
    return m.resolve(name);
  } else {
    var fs = require("fs-base");
    return fs.normal(fs.join(fs.directory(m.filename), name));
  }
}

function removeExtension(filename) {
  return filename.substr(0, filename.length - fs.extension(filename).length);
}

var joinjs = exports.joinjs = function(filename, optimize) {
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
    r.push('require("' + removeExtension(main) + '");');
  }
  var result = r.join('\n');
  if (minify && optimize) {
    result = minify(result, {
      fromString : true
    }).code;
  }
  return result;
}

var concat = exports.concat = function(files, optimize, css) {
  var r = [];
  files.forEach(function(file) {
    r.push(fs.read(file));
  });
  var result = r.join('\n');
  if (minify && optimize) {
    if(css) {
      result = compress(result);
    } else {
      result = minify(result, {
        fromString : true
      }).code;
    }
  }
  return result;
}

var middleware = exports.middleware = function(next, app) {
  app.joinjs = [ {
    main : "./js/index.js",
    uri : "/js/index.js"
  } ];
  return function(request) {
    for ( var i = 0; i < app.joinjs.length; i++) {
      var e = app.joinjs[i];
      if (request.pathInfo == e.uri) {
        if (!e.content) {
          if (e.main) {
            e.content = joinjs(e.main, e.optimize);
          } else {
            e.content = concat(e.files, e.optimize, e.css);
          }
        }
        return {
          status : 200,
          headers : {
            "Content-Type" : e.css ? "text/css" : "application/javascript"
          },
          body : [ e.content ]
        }
      }
    }
    return next(request);
  }
}
