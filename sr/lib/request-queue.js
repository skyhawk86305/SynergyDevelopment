'use strict';

var assert = require('assert'),
    async = require('async'),
    _ = require('lodash'),
    constants = require('./constants');

function RequestQueue(xhr) {
    assert(this instanceof RequestQueue, 'use new');
    assert(typeof xhr === 'function', 'need xhr');

    this.xhr = xhr;
    this.readQueue = async.queue(_.bind(this.worker, this), constants.SERVER_READ_CONCURRENCY);
    this.writeQueue = async.queue(_.bind(this.worker, this), constants.SERVER_WRITE_CONCURRENCY);

    // this.readQueue.saturated = function() {
    //     console.log('Read queue saturated');
    // };

    // this.readQueue.drain = function() {
    //     console.log('Finished read queue');
    // };

    // this.writeQueue.saturated = function() {
    //     console.log('Write queue saturated');
    // };

    // this.writeQueue.drain = function() {
    //     console.log('Finished write queue');
    // };
}

/**
 * Async function for processing each queued xhr request.
 * It must call callback(err) when finished, with an optional error argument.
 */
RequestQueue.prototype.worker = function worker(task, callback) {
    assert(task instanceof Object);
    assert(typeof callback === 'function');
    assert(typeof task.method === 'string');
    assert(typeof task.basePath === 'string', 'buildUrl: basePath string');
    assert(task.options instanceof Object);

    function buildUrl(basePath, uuid, version) {
        var segments = [ basePath ];

        if (uuid === null) {
            assert(version === null, 'buildUrl: version null if uuid null');
        } else {
            segments.push(uuid);
            if (version !== null) {
                segments.push(version);
            }
        }

        // console.log('buildUrl :: ', segments.join('/'));

        return segments.join('/');
    }

    var uuid = task.options.payload && task.options.payload._uuid || null,
        version = task.options.payload && task.options.payload._version || null,
        url = buildUrl(task.basePath, uuid, version);

    this.xhr(task.method, url, task.options, function (err, res) {
        if (err) {
            console.error(err);
            return callback(err);
        }

        if (res.statusCode !== 200) {
            callback(new Error(url + ' -> ' + res.statusCode));
        } else {
            var result;
            try {
                result = JSON.parse(res.body);
            } catch (err) {
                callback(new Error('cannot parse response'));
            }
            callback(null, result);
        }
    });
};

RequestQueue.prototype.pauseReadQueue = function pause() {
    if (!this.readQueue.paused) {
        this.readQueue.pause();
    }
};

RequestQueue.prototype.pauseWriteQueue = function pause() {
    if (!this.writeQueue.paused) {
        this.writeQueue.pause();
    }
};

RequestQueue.prototype.resumeReadQueue = function resume() {
    if (this.readQueue.paused) {
        this.readQueue.resume();
    }
};

RequestQueue.prototype.resumeWriteQueue = function resume() {
    if (this.writeQueue.paused) {
        this.writeQueue.resume();
    }
};

RequestQueue.prototype.pushToReadQueue = function pushToReadQueue(request, callback) {
    this.readQueue.push(request, callback);
};

RequestQueue.prototype.pushToWriteQueue = function pushToWriteQueue(request, callback) {
    this.writeQueue.push(request, callback);
};

RequestQueue.prototype.queueStatus = function queueStatus() {
    return {
        readQueueLength: this.readQueue.length && this.readQueue.length() || 0,
        readQueueRunning: this.readQueue.running && this.readQueue.running() || 0,
        readQueuePaused: this.readQueue.paused,

        writeQueueLength: this.writeQueue.length && this.writeQueue.length() || 0,
        writeQueueRunning: this.writeQueue.running && this.writeQueue.running() || 0,
        writeQueuePaused: this.writeQueue.paused
    };
};

module.exports = RequestQueue;
