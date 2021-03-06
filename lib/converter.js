'use strict';

var path = require('path');
var through = require('through2');
var replacer = require('./replacer');

module.exports = function() {
  return through.obj(function(file, enc, next) {
    var str = file.contents.toString();
    file.contents = new Buffer(convert(str));
    next(null, file);
  });
};

function convert(str) {
  var fixtures = [];
  var hasProps = [];
  var move = [];

  var lines = str.split('\n').reduce(function(acc, line) {
    if (filter(line)) {
      return acc;
    }

    var newLine = hasProperties(line);
    if (newLine !== line) {
      hasProps = [
        `var support = require('../support');`,
        `var hasProperties = support.hasProperties;`
      ];
      line = newLine;
    }

    line = hasOwn(line);
    line = notHasOwn(line);
    line = assert(line);
    line = notAssert(line);
    line = assertEqual(line);
    line = assertNotEqual(line);
    line = assertStrictEqual(line);

    if (/assert/.test(line)) {
      if (move.indexOf('assert') === -1) {
        move.push('assert');
      }
    }

    if (match(line, 'assert')) {
      if (move.indexOf('assert') === -1) {
        move.push('assert');
      }
      return acc;
    }

    if (match(line, 'consolidate')) {
      if (move.indexOf('consolidate') === -1) {
        move.push('consolidate');
      }
      return acc;
    }
    if (match(line, 'fs')) {
      if (move.indexOf('fs') === -1) {
        move.push('fs');
      }
      return acc;
    }
    if (match(line, 'path')) {
      if (move.indexOf('path') === -1) {
        move.push('path');
      }
      return acc;
    }

    newLine = convertPath(line);
    if (newLine !== line) {
      if (move.indexOf('path') === -1) {
        move.push('path');
      }
      fixtures = ['var fixtures = path.resolve.bind(path, __dirname, \'fixtures\');'];
      line = newLine;
    }

    return acc.concat('  ' + line);
  }, []);

  var prefix = [
    '\'use strict\';',
    '',
    ...move.map(toRequire),
    ...fixtures,
    ...hasProps,
    '',
    'module.exports = function(App, options, runner) {',
    '  var app;',
    ''
  ];

  lines.push('};');
  var str = prefix.concat(lines).join('\n');
  return str.replace(/\n  \n};$/, '\n};') + '\n';
};

function match(line, name) {
  var re = new RegExp(`var ${name} = require\\('${name}'\\)`);
  if (re.test(line)) {
    return name;
  }
}

function toRequire(name) {
  return `var ${name} = require('${name}');`;
}

function filter(str) {
  if (/use strict/.test(str)) {
    return true;
  }
  if (/var app;/.test(str)) {
    return true;
  }
  if (/require\('(mocha|should)'\)/.test(str)) {
    return true;
  }
  if (/var support = require\('\.\/support'\)/.test(str)) {
    return true;
  }
  if (/support\.resolve\(/.test(str)) {
    return true;
  }
  return false;
}

function convertPath(line) {
  if (/<%/.test(line)) {
    return line;
  }
  var re = /(["'])(test\/fixtures\/)([^\1]+?)\1/g;
  return line.replace(re, function(_, $1, $2, $3) {
    return 'fixtures(\'' + $3 + '\')';
  });
}

function hasProperties(str) {
  return replacer(/should\.have\.properties/, str, function(line) {
    return 'hasProperties(' + line.split('.should.have.properties(').join(', ');
  });
}
function doesNotHaveProperties(str) {
  return replacer(/\.should\.not\.have\.properties\(/, str, function(line) {
    return 'doesNotHaveProperties(' + line.split('.should.not.have.properties(').join(', ');
  });
}
function assertEqual(str) {
  return replacer(/\.should\.equal/, str, function(line) {
    return 'assert.equal(' + line.split('.should.equal(').join(', ');
  });
}
function assertNotEqual(str) {
  return replacer(/\.should\.not\.equal/, str, function(line) {
    return 'assert.notEqual(' + line.split('.should.not.equal(').join(', ');
  });
}
function hasOwn(str) {
  return replacer(/should\.have\.property\('/, str, function(line) {
    return 'assert(' + line
      .split('should.have.property(\'')
      .join('hasOwnProperty(\'')
      .replace(/;$/, ');');
  });
}
function notHasOwn(str) {
  return replacer(/should\.not\.have\.property\('/, str, function(line) {
    return 'assert(!' + line
      .split('should.not.have.property(\'')
      .join('hasOwnProperty(\'')
      .replace(/;$/, ');');
  });
}
function assert(str) {
  return replacer(/should\.exist\(/, str, function(line) {
    return line.split('should.exist(').join('assert(');
  });
}
function notAssert(str) {
  return replacer(/should\.not\.exist\(/, str, function(line) {
    return line.split('should.not.exist(').join('assert(!');
  });
}
function assertStrictEqual(str) {
  return replacer(/\.should\.eql/, str, function(line) {
    return 'assert.deepEqual(' + line.split('.should.eql(').join(', ');
  });
}

