'use strict';

var os = require('os');
var path = require('path');
var actual = path.join(__dirname, 'actual');
var spies = require('./support/spy');
var fs = require('graceful-fs');
var rimraf = require('rimraf');
var assert = require('assert');
var expect = require('expect');
var bufferEqual = require('buffer-equal');
var through = require('through2');
var File = require('vinyl');
var isWindows = (os.platform() === 'win32');

module.exports = function(App, options, runner) {
  var chmodSpy = spies.chmodSpy;
  var statSpy = spies.statSpy;
  var bufferStream;
  var app;

  var wipeOut = function(cb) {
    app = new App();
    spies.setError('false');
    statSpy.reset();
    chmodSpy.reset();
    expect.restoreSpies();
    rimraf(path.join(__dirname, 'actual/'), cb);
  };

  var dataWrap = function(fn) {
    return function(data, enc, cb) {
      fn(data);
      cb();
    };
  };

  var MASK_MODE = parseInt('777', 8);

  function masked(mode) {
    return mode & MASK_MODE;
  }

  describe('app.dest', function() {
    beforeEach(wipeOut);
    afterEach(wipeOut);

    it('should explode on invalid folder (empty)', function(cb) {
      var stream;
      try {
        stream = app.dest();
      } catch (err) {
        assert(err && typeof err === 'object');
        assert(!stream);
        cb();
      }
    });

    it('should explode on invalid folder (empty string)', function(cb) {
      var stream;
      try {
        stream = app.dest('');
      } catch (err) {
        assert(err && typeof err === 'object');
        assert(!stream);
        cb();
      }
    });

    it('should pass through writes with cwd', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');

      var expectedFile = new File({
        base: __dirname,
        cwd: __dirname,
        path: inputPath,
        contents: null
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        cb();
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should pass through writes with default cwd', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');

      var expectedFile = new File({
        base: __dirname,
        cwd: __dirname,
        path: inputPath,
        contents: null
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        cb();
      };

      var stream = app.dest(path.join(__dirname, 'actual/'));

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should not write null files', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: null
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), false);
        cb();
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should write buffer files to the right folder with relative cwd', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');
      var expectedContents = fs.readFileSync(inputPath);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), expectedContents), true);
        cb();
      };

      var stream = app.dest('actual/', {cwd: path.relative(process.cwd(), __dirname)});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should write buffer files to the right folder with function and relative cwd', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');
      var expectedContents = fs.readFileSync(inputPath);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), expectedContents), true);
        cb();
      };

      var stream = app.dest(function(file) {
        assert(file);
        assert.equal(file, expectedFile);
        return './actual';
      }, {cwd: path.relative(process.cwd(), __dirname)});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should write buffer files to the right folder', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('655', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), expectedContents), true);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should write streaming files to the right folder', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('655', 8);

      var contentStream = through.obj();
      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: contentStream,
        stat: {
          mode: expectedMode
        }
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), expectedContents), true);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      setTimeout(function() {
        contentStream.write(expectedContents);
        contentStream.end();
      }, 100);
      stream.end();
    });

    it('should write directories to the right folder', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test');
      var expectedCwd = __dirname;
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('655', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: null,
        stat: {
          isDirectory: function() {
            return true;
          },
          mode: expectedMode
        }
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(buffered[0].cwd, expectedCwd, 'cwd should have changed');
        assert.equal(buffered[0].base, expectedBase, 'base should have changed');
        assert.equal(buffered[0].path, expectedPath, 'path should have changed');
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(fs.lstatSync(expectedPath).isDirectory(), true);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should allow piping multiple dests in streaming mode', function(cb) {
      var inputPath1 = path.join(__dirname, 'actual/multiple-first');
      var inputPath2 = path.join(__dirname, 'actual/multiple-second');
      var inputBase = path.join(__dirname, 'actual/');
      var srcPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var stream1 = app.dest('actual/', {cwd: __dirname});
      var stream2 = app.dest('actual/', {cwd: __dirname});
      var content = fs.readFileSync(srcPath);
      var rename = through.obj(function(file, _, next) {
        file.path = inputPath2;
        this.push(file);
        next();
      });

      stream1.on('data', function(file) {
        assert.equal(file.path, inputPath1);
      });

      stream1.pipe(rename).pipe(stream2);
      stream2.on('data', function(file) {
        assert.equal(file.path, inputPath2);
      }).once('end', function() {
        assert.equal(fs.readFileSync(inputPath1, 'utf8'), content.toString());
        assert.equal(fs.readFileSync(inputPath2, 'utf8'), content.toString());
        cb();
      });

      var file = new File({
        base: inputBase,
        path: inputPath1,
        cwd: __dirname,
        contents: content
      });

      stream1.write(file);
      stream1.end();
    });

    it('should write new files with the default user mode', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedMode = parseInt('0666', 8) & (~process.umask());

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      chmodSpy.reset();
      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should write new files with the specified mode', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedMode = parseInt('744', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(buffered[0], expectedFile);
        assert.equal(fs.existsSync(expectedPath), true);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      chmodSpy.reset();
      var stream = app.dest('actual/', { cwd: __dirname, mode: expectedMode });

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

      stream.pipe(bufferStream);
      stream.write(expectedFile);
      stream.end();
    });

    it('should update file mode to match the vinyl mode', function(cb) {
      if (isWindows) {
        this.skip();
        return;
      }

      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl');
      var expectedPath = path.join(__dirname, './actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedBase = path.join(__dirname, './actual');
      var startMode = parseInt('0655', 8);
      var expectedMode = parseInt('0722', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      var onEnd = function() {
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      };

      fs.mkdirSync(expectedBase);
      fs.closeSync(fs.openSync(expectedPath, 'w'));
      fs.chmodSync(expectedPath, startMode);

      var stream = app.dest('actual/', { cwd: __dirname });
      stream.on('end', onEnd);
      stream.write(expectedFile);
      stream.end();
    });

    it('should use different modes for files and directories', function(cb) {
      var inputBase = path.join(__dirname, 'fixtures/vinyl');
      var inputPath = path.join(__dirname, 'fixtures/vinyl/wow/suchempty');
      var expectedBase = path.join(__dirname, 'actual/wow');
      var expectedDirMode = parseInt('755', 8);
      var expectedFileMode = parseInt('655', 8);

      var firstFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        stat: fs.statSync(inputPath)
      });

      var onEnd = function() {
        assert.equal(masked(fs.lstatSync(expectedBase).mode), expectedDirMode);
        assert.equal(masked(buffered[0].stat.mode), expectedFileMode);
        cb();
      };

      var stream = app.dest('actual/', {
        cwd: __dirname,
        mode: expectedFileMode,
        dirMode: expectedDirMode
      });

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

      stream.pipe(bufferStream);
      stream.write(firstFile);
      stream.end();
    });

    it.skip('should change to the specified base as string', function(cb) {
      var inputBase = path.join(__dirname, 'fixtures/vinyl');
      var inputPath = path.join(__dirname, 'fixtures/vinyl/wow/suchempty');

      var firstFile = new File({
        cwd: __dirname,
        path: inputPath,
        stat: fs.statSync(inputPath)
      });

      var onEnd = function() {
        assert.equal(buffered[0].base, inputBase);
        cb();
      };

      var stream = app.dest('actual/', {
        cwd: __dirname,
        base: inputBase
      });

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

      stream.pipe(bufferStream);
      stream.write(firstFile);
      stream.end();
    });

    it.skip('should change to the specified base as function', function(cb) {
      var inputBase = path.join(__dirname, 'fixtures/vinyl');
      var inputPath = path.join(__dirname, 'fixtures/vinyl/wow/suchempty');

      var firstFile = new File({
        cwd: __dirname,
        path: inputPath,
        stat: fs.statSync(inputPath)
      });

      var onEnd = function() {
        assert.equal(buffered[0].base, inputBase);
        cb();
      };

      var stream = app.dest('actual/', {
        cwd: __dirname,
        base: function(file) {
          assert(file);
          assert.equal(file.path, inputPath);
          return inputBase;
        }
      });

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

      stream.pipe(bufferStream);
      stream.write(firstFile);
      stream.end();
    });

    it('should report IO errors', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('722', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      fs.mkdirSync(expectedBase);
      fs.closeSync(fs.openSync(expectedPath, 'w'));
      fs.chmodSync(expectedPath, 0);

      var stream = app.dest('actual/', {cwd: __dirname});
      stream.on('error', function(err) {
        assert.equal(err.code, 'EACCES');
        cb();
      });
      stream.write(expectedFile);
    });

    it.skip('should report stat errors', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('722', 8);

      var file = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      fs.mkdirSync(expectedBase);
      fs.closeSync(fs.openSync(expectedPath, 'w'));

      spies.setError(function(mod, fn) {
        if (fn === 'fstat' && typeof arguments[2] === 'number') {
          return new Error('stat error');
        }
      });

      var stream = app.dest('actual/', {cwd: __dirname});
      stream.on('error', function(err) {
        assert.equal(err.message, 'stat error');
        cb();
      });
      stream.write(file);
    });

    it.skip('should report fchmod errors', function(cb) {
      if (isWindows) {
        this.skip();
        return;
      }

      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('722', 8);

      var fchmodSpy = expect.spyOn(fs, 'fchmod').andCall(function() {
        var callback = arguments[arguments.length - 1];
        callback(new Error('mocked error'));
      });

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      fs.mkdirSync(expectedBase);
      fs.closeSync(fs.openSync(expectedPath, 'w'));

      var stream = app.dest('actual/', { cwd: __dirname });
      stream.on('error', function(err) {
        assert(err);
        assert.equal(fchmodSpy.calls.length, 1);
        cb();
      });
      stream.write(expectedFile);
    });

    it('should not fchmod a matching file', function(cb) {
      if (isWindows) {
        this.skip();
        return;
      }

      var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedMode = parseInt('711', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: expectedMode
        }
      });

      var stream = app.dest('actual/', { cwd: __dirname });
      stream.on('end', function() {
        assert.equal(fchmodSpy.calls.length, 0);
        assert.equal(masked(fs.lstatSync(expectedPath).mode), expectedMode);
        cb();
      });
      stream.write(expectedFile);
      stream.end();
    });

    it.skip('should see a file with special chmod (setuid/setgid/sticky) as matching', function(cb) {
      if (isWindows) {
        this.skip();
        return;
      }

      var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedContents = fs.readFileSync(inputPath);
      var expectedBase = path.join(__dirname, 'actual');
      var expectedMode = parseInt('3722', 8);
      var normalMode = parseInt('722', 8);

      var expectedFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: expectedContents,
        stat: {
          mode: normalMode
        }
      });

      var onEnd = function() {
        assert.equal(fchmodSpy.calls.length, 0);
        cb();
      };

      fs.mkdirSync(expectedBase);
      fs.closeSync(fs.openSync(expectedPath, 'w'));
      fs.chmodSync(expectedPath, expectedMode);

      var stream = app.dest('actual/', { cwd: __dirname });
      stream.on('end', onEnd);
      stream.write(expectedFile);
      stream.end();
    });

    it('should not overwrite files with overwrite option set to false', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var inputContents = fs.readFileSync(inputPath);

      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedBase = path.join(__dirname, 'actual');
      var existingContents = 'Lorem Ipsum';

      var inputFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: inputContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), new Buffer(existingContents)), true);
        cb();
      };

      // Write expected file which should not be overwritten
      fs.mkdirSync(expectedBase);
      fs.writeFileSync(expectedPath, existingContents);

      var stream = app.dest('actual/', {cwd: __dirname, overwrite: false});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(inputFile);
      stream.end();
    });

    it('should overwrite files with overwrite option set to true', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var inputContents = fs.readFileSync(inputPath);

      var expectedPath = path.join(__dirname, 'actual/test.coffee');
      var expectedBase = path.join(__dirname, 'actual');
      var existingContents = 'Lorem Ipsum';

      var inputFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: inputContents
      });

      var onEnd = function() {
        assert.equal(buffered.length, 1);
        assert.equal(bufferEqual(fs.readFileSync(expectedPath), new Buffer(inputContents)), true);
        cb();
      };

      // This should be overwritten
      fs.mkdirSync(expectedBase);
      fs.writeFileSync(expectedPath, existingContents);

      var stream = app.dest('actual/', {cwd: __dirname, overwrite: true});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(inputFile);
      stream.end();
    });

    it('should create symlinks when the `symlink` attribute is set on the file', function(cb) {
      var inputPath = path.join(__dirname, 'fixtures/vinyl/test-create-dir-symlink');
      var inputBase = path.join(__dirname, 'fixtures/vinyl/');
      var inputRelativeSymlinkPath = 'wow';

      var expectedPath = path.join(__dirname, 'actual/test-create-dir-symlink');

      var inputFile = new File({
        base: inputBase,
        cwd: __dirname,
        path: inputPath,
        contents: null
      });

      // `src()` adds this side-effect with `keepSymlinks` option set to false
      inputFile.symlink = inputRelativeSymlinkPath;

      var onEnd = function() {
        fs.readlink(buffered[0].path, function() {
          assert.equal(buffered[0].symlink, inputFile.symlink);
          assert.equal(buffered[0].path, expectedPath);
          cb();
        });
      };

      var stream = app.dest('actual/', {cwd: __dirname});

      var buffered = [];
      bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
      stream.pipe(bufferStream);
      stream.write(inputFile);
      stream.end();
    });

    it('should emit finish event', function(cb) {
      var srcPath = path.join(__dirname, 'fixtures/vinyl/test.coffee');
      var stream = app.dest('actual/', {cwd: __dirname});

      stream.once('finish', function() {
        cb();
      });

      var file = new File({
        path: srcPath,
        cwd: __dirname,
        contents: new Buffer('1234567890')
      });

      stream.write(file);
      stream.end();
    });
  });

  describe('dest', function() {
    beforeEach(function() {
      app = new App();
    });

    afterEach(function(cb) {
      rimraf(actual, cb);
    });

    describe('streams', function() {
      it('should return a stream', function(cb) {
        var stream = app.dest(path.join(__dirname, 'fixtures/'));
        assert(stream);
        assert(stream.on);
        cb();
      });

      it('should return an output stream that writes files', function(cb) {
        var instream = app.src(path.join(__dirname, 'fixtures/copy/e*.txt'));
        var outstream = app.dest(actual);
        instream.pipe(outstream);

        outstream.on('error', cb);
        outstream.on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert(file.contents);
          assert.equal(path.join(file.path, ''), path.join(actual, 'example.txt'));
          assert.equal(String(file.contents), 'Hello world!');
        });
        outstream.on('end', function() {
          fs.readFile(path.join(actual, 'example.txt'), function(err, contents) {
            assert(!err);
            assert(contents);
            assert.equal(String(contents), 'Hello world!');
            cb();
          });
        });
      });

      it('should return an output stream that does not write non-read files', function(cb) {
        var instream = app.src(path.join(__dirname, 'fixtures/copy/e*.txt'), {read: false});
        var outstream = app.dest(actual);
        instream.pipe(outstream);

        outstream.on('error', cb);
        outstream.on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert(!file.contents);
          assert.equal(path.join(file.path, ''), path.join(actual, 'example.txt'));
        });

        outstream.on('end', function() {
          fs.readFile(path.join(actual, 'example.txt'), function(err, contents) {
            assert(err);
            assert(!contents);
            cb();
          });
        });
      });

      it('should return an output stream that writes streaming files', function(cb) {
        var instream = app.src(path.join(__dirname, 'fixtures/copy/e*.txt'), {buffer: false});
        var outstream = instream.pipe(app.dest(actual));

        outstream.on('error', cb);
        outstream.on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert(file.contents);
          assert.equal(path.join(file.path, ''), path.join(actual, 'example.txt'));
        });
        outstream.on('end', function() {
          fs.readFile(path.join(actual, 'example.txt'), function(err, contents) {
            assert(!err);
            assert(contents);
            assert.equal(String(contents), 'Hello world!');
            cb();
          });
        });
      });
    });

    describe('dirs', function() {
      it('should return an output stream that writes streaming files to new directories', function(cb) {
        testWriteDir({}, cb);
      });

      it('should return an output stream that writes streaming files to new directories (buffer: false)', function(cb) {
        testWriteDir({buffer: false}, cb);
      });

      it('should return an output stream that writes streaming files to new directories (read: false)', function(cb) {
        testWriteDir({read: false}, cb);
      });

      it('should return an output stream that writes streaming files to new directories (read: false, buffer: false)', function(cb) {
        testWriteDir({buffer: false, read: false}, cb);
      });
    });

    describe('ext', function() {
      beforeEach(function() {
        app = new App();
        app.set('ext', '.txt');
      });

      afterEach(function() {
        app.set('ext', '.html');
      });

      it('should return a stream', function(cb) {
        var stream = app.dest(path.join(__dirname, 'fixtures/'));
        assert(stream);
        assert(stream.on);
        cb();
      });

      it('should return an output stream that writes files', function(cb) {
        var instream = app.src(path.join(__dirname, 'fixtures/copy/e*.txt'));
        var outstream = app.dest(actual);
        instream.pipe(outstream);

        outstream.on('error', cb);
        outstream.on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert(file.contents);
          assert.equal(path.join(file.path, ''), path.join(actual, 'example.txt'));
          assert.equal(String(file.contents), 'Hello world!');
        });
        outstream.on('end', function() {
          fs.readFile(path.join(actual, 'example.txt'), function(err, contents) {
            assert(!err);
            assert(contents);
            assert.equal(String(contents), 'Hello world!');
            cb();
          });
        });
      });

      it('should return an output stream that does not write non-read files', function(cb) {
        var instream = app.src(path.join(__dirname, 'fixtures/dest/*.txt'), {read: false});
        var outstream = app.dest(actual);
        instream.pipe(outstream);

        outstream.on('error', cb);
        outstream.on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert(!file.contents);
          assert.equal(path.join(file.path, ''), path.join(actual, 'example.txt'));
        });

        outstream.on('end', function() {
          fs.readFile(path.join(actual, 'example.txt'), function(err, contents) {
            assert(err);
            assert(!contents);
            cb();
          });
        });
      });
    });

    function testWriteDir(srcOptions, cb) {
      app.src(path.resolve(__dirname, 'fixtures/generic/'), srcOptions)
        .pipe(app.dest(actual))
        .on('data', function(file) {
          // data should be re-emitted correctly
          assert(file);
          assert(file.path);
          assert.equal(path.join(file.path, ''), path.join(actual, 'generic'));
        })
        .on('error', cb)
        .on('end', function() {
          fs.exists(path.join(actual, 'generic'), function(exists) {
            assert(exists);
            cb();
          });
        });
    }
  });

};
