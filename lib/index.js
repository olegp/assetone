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

var joinjs = exports.joinjs = function (filename, main, optimize) {
  var i = filename.lastIndexOf('/');
  var base = filename.substr(0, i), main = main || filename.substr(i + 1);
  return modularize(base, [filename], main, optimize)
}

function modularizeFile(file, base) {
  var r = [];
  var name = fs.relative(base || fs.directory(file), file);
  var extension = fs.extension(file);
  if (extension == ".js") {
    var module = name.substr(0, name.length - extension.length);
    r.push('modules["' + module
      + '"] = function(require, exports, module) {');
    r.push(fs.read(file).split('\n').map(function (line) {
      return line ? '  ' + line : '';
    }).join('\n') + '};\n');
  } else {
    r.push('modules["' + name
      + '"] = function(require, exports, module) {');
    r.push('  module.exports = ' + JSON.stringify(fs.read(file))
      + ';\n};\n');
  }
  return r.join('\n');
}

function modularizeDirectory(directory, base) {
  var r = [];
  base = base || directory;
  fs.listTree(directory).forEach(function (file) {
    var name = './' + fs.normal(fs.join(directory, file));
    if (fs.isFile(name)) {
      r.push(modularizeFile(name, base));
    }
  });
  return r.join('\n');
}

var modularize = exports.modularize = function (base, paths, main, optimize) {
  var r = [];
  r.push('modules = window.modules || {};')
  if (main) {
    r.push(fs.read(resolve(module, './require.js')));
  }
  paths.forEach(function(path) {
    if(fs.isFile(path)) {
      r.push(modularizeFile(path, base));
    } else if(fs.isDirectory(path)) {
      r.push(modularizeDirectory(path, base));
    }
  });
  if (main) {
    r.push('require("' + removeExtension(main) + '");');
  }
  var result = r.join('\n');
  if (minify && optimize) {
    result = minify(result, {
      fromString:true
    }).code;
  }
  return result;
}

var concat = exports.concat = function (files, optimize, css) {
  var r = [];
  files.forEach(function (file) {
    r.push(fs.read(file));
  });
  var result = r.join('\n');
  if (minify && optimize) {
    if (css) {
      result = compress(result, {keepSpecialComments:0});
    } else {
      result = minify(result, {
        fromString:true
      }).code;
    }
  }
  return result;
}

var middleware = exports.middleware = function (next, app) {
  app.joinjs = [
    {
      main:"./js/index.js",
      uri:"/js/index.js"
    }
  ];
  return function (request) {
    for (var i = 0; i < app.joinjs.length; i++) {
      var e = app.joinjs[i];
      if (request.pathInfo == e.uri) {
        if (!e.content) {
          if (e.paths) {
            e.content = modularize (e.base, e.paths, e.main, e.optimize);
          } else {
            e.content = concat(e.files, e.optimize, e.css);
          }
        }
        return {
          status:200,
          headers:{
            "Content-Type":e.css ? "text/css" : "application/javascript"
          },
          body:[ e.content ]
        }
      }
    }
    return next(request);
  }
}
