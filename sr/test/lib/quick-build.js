'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    prod = require('./get-cached-prodinfo'),
    Builder = require('../../lib/model/builder'),
    ModelMap = require('../../lib/model/map.js'),
    async = require('async');

function buildTo(specs) {
    specs = _.isPlainObject(specs) ? [specs] : specs;
    assert(_.isArray(specs));

    var context = {
            clip: null,
            result: null,
            map: null,
            hagi: null,
            err: null,
            ok: ok,
            then: then,
        },
        _then = [];

    _.forEach(context, addGetter);

    return build;

    function prodFirst(done) {
        prod(function (err) {
            if (err) {
                return done(err);
            } else {
                return build(done);
            }
        });
    }

    function build(done) {
        if (!prod.info) {
            return prodFirst(done);
        }

        try {
            context.clip = { synergy_model: { hagroups: [ ] } };
            context.builder = new Builder(prod.info, context.clip);
            _.forEach(specs, addSystem);
            context.map = new ModelMap(prod.info, context.clip);
            context.hagi = context.map.inspect(context.result);
            return async.series(_then, done);
        } catch (err) {
            context.err = err;
            console.error(err.stack);
            return done(err);
        }

        function addSystem(spec) {
            assert(_.isPlainObject(spec));

            if (spec.version.match(/cluster/i)) {
                var lastResult = context.result,
                    id = (lastResult && lastResult.cluster) ? lastResult.cluster._id : null;
                context.result = context.builder.addSystemToCluster(spec, id);
            } else {
                context.result = context.builder.addSystem(spec);
            }
        }
    }

    function then(fn) {
        _then.push(fn);
        return build;
    }

    function ok(done) {
        done(context.err);
    }

    function addGetter(value, key) {
        Object.defineProperty(build, key, {
            get: function () {
                return context[key];
            },
            enumerable: true,
            configurable: false,
        });
    }
}

module.exports = buildTo;
