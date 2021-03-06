'use strict';

var path = require('path');
var assert = require('assert');
var fixtures = path.resolve.bind(path, __dirname, 'fixtures');

module.exports = function(App, options, runner) {
  var app;

  describe('app.data', function() {
    beforeEach(function() {
      app = new App();
    });

    it('should set a key-value pair on cache.data:', function() {
      app.data('a', 'b');
      assert.equal(app.cache.data.a, 'b');
    });

    it('should set an object on cache.data:', function() {
      app.data({c: 'd'});
      assert.equal(app.cache.data.c, 'd');
    });

    it('should load data from a file onto cache.data:', function() {
      app.data(fixtures('data/a.json'));
      assert.equal(app.cache.data.a.one.a, 'aaa');
    });

    it('should load a glob of data onto cache.data:', function() {
      app.data(fixtures('data/*.json'));
      assert.equal(app.cache.data.a.one.a, 'aaa');
      assert.equal(app.cache.data.b.two.b, 'bbb');
      assert.equal(app.cache.data.c.three.c, 'ccc');
    });

    it('should use `namespace` defined on global opts:', function() {
      app.option('namespace', function(key) {
        return 'prefix_' + path.basename(key, path.extname(key));
      });
      app.data(fixtures('data/*.json'));
      assert.equal(app.cache.data.prefix_a.one.a, 'aaa');
      assert.equal(app.cache.data.prefix_b.two.b, 'bbb');
      assert.equal(app.cache.data.prefix_c.three.c, 'ccc');
    });

    it('should use `namespace` defined on data opts:', function() {
      app.data(fixtures('data/*.json'), {
        namespace: function(key) {
          return 'prefix_' + path.basename(key, path.extname(key));
        }
      });
      assert.equal(app.cache.data.prefix_a.one.a, 'aaa');
      assert.equal(app.cache.data.prefix_b.two.b, 'bbb');
      assert.equal(app.cache.data.prefix_c.three.c, 'ccc');
    });

    it('should extend `cache.data`', function() {
      app.data({a: 'aaa', b: 'bbb', c: 'ccc'});
      app.data({x: 'xxx', y: 'yyy', z: 'zzz'});
      assert.equal(app.cache.data.a, 'aaa');
      assert.equal(app.cache.data.b, 'bbb');
      assert.equal(app.cache.data.c, 'ccc');
      assert.equal(app.cache.data.x, 'xxx');
      assert.equal(app.cache.data.y, 'yyy');
      assert.equal(app.cache.data.z, 'zzz');
    });

    it('should extend the `cache.data` object when the first param is a string.', function() {
      app.data('foo', {x: 'xxx', y: 'yyy', z: 'zzz'});
      app.data('bar', {a: 'aaa', b: 'bbb', c: 'ccc'});
      assert.equal(app.cache.data.foo.x, 'xxx');
      assert.equal(app.cache.data.bar.a, 'aaa');
    });

    it('should be chainable.', function() {
      app
        .data({x: 'xxx', y: 'yyy', z: 'zzz'})
        .data({a: 'aaa', b: 'bbb', c: 'ccc'});

      assert.equal(app.cache.data.x, 'xxx');
      assert.equal(app.cache.data.a, 'aaa');
    });
  });
};
