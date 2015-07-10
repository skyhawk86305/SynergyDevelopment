'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    requestQueue = require('../lib/request-queue');

lab.experiment('Request Queue', function () {
    var queue,
        statusCode,
        active,
        maxActive,
        request;

    function xhr(method, url, options, callback) {
        function later() {
            active = active - 1;
            callback(null, {
                statusCode: statusCode,
                body: JSON.stringify({ method: method, url: url, options: options })
            });
        }

        active = active + 1;
        if (active > maxActive) {
            maxActive = active;
        }

        setTimeout(later, 10);
    }

    lab.beforeEach(function (done) {
        statusCode = 200;
        active = 0;
        maxActive = 0;
        queue = new requestQueue(xhr);
        request = {
            method: 'GET',
            basePath: 'basePath',
            options: { payload: { _uuid: 'uuid', _version: 1, value: 1 } }
        };
        done();
    });

    lab.experiment('if request flows are successful for', function () {
        lab.experiment('a read request', function () {
            lab.test('the request is run and the response is sent back', function (done) {
                function callback(err, result) {
                    lab.expect(err).to.eql(null);
                    lab.expect(result).to.be.instanceof(Object);
                    lab.expect(result.options.payload.value).to.eql(1);
                    done();
                }

                queue.pushToReadQueue(request, callback);
            });
        });

        lab.experiment('6 read requests (max concurrency is 5)', function () {
            lab.test('request 6 is held until one of the first 5 finish', function (done) {
                function callback(err, result) {
                    lab.expect(err).to.eql(null);
                    lab.expect(result).to.be.instanceof(Object);
                    lab.expect(result.options.payload.value).to.eql(1);
                    lab.expect(maxActive).to.eql(5);
                    done();
                }

                queue.pushToReadQueue(request, _.noop);
                queue.pushToReadQueue(request, _.noop);
                queue.pushToReadQueue(request, _.noop);
                queue.pushToReadQueue(request, _.noop);
                queue.pushToReadQueue(request, _.noop);
                queue.pushToReadQueue(request, callback);
            });
        });

        lab.experiment('a write request', function () {
            lab.test('the request is run and the response is sent back', function (done) {
                function callback(err, result) {
                    lab.expect(err).to.eql(null);
                    lab.expect(result).to.be.instanceof(Object);
                    lab.expect(result.options.payload.value).to.eql(1);
                    done();
                }

                queue.pushToWriteQueue(request, callback);
            });
        });

        lab.experiment('6 write requests (max concurrency is 5)', function () {
            lab.test('request 6 is held until one of the first 5 finish', function (done) {
                function callback(err, result) {
                    lab.expect(err).to.eql(null);
                    lab.expect(result).to.be.instanceof(Object);
                    lab.expect(result.options.payload.value).to.eql(1);
                    lab.expect(maxActive).to.eql(5);
                    done();
                }

                queue.pushToWriteQueue(request, _.noop);
                queue.pushToWriteQueue(request, _.noop);
                queue.pushToWriteQueue(request, _.noop);
                queue.pushToWriteQueue(request, _.noop);
                queue.pushToWriteQueue(request, _.noop);
                queue.pushToWriteQueue(request, callback);
            });
        });
    });

    lab.experiment('if request flows fail for', function () {
        lab.experiment('a read request', function () {
            lab.test('the request is run and the error is sent back', function (done) {
                function callback(err) {
                    lab.expect(err).to.be.instanceof(Error);
                    lab.expect(err.message).to.eql('basePath/uuid/1 -> 500');
                    done();
                }

                statusCode = 500;
                queue.pushToReadQueue(request, callback);
            });
        });

        lab.experiment('a write request', function () {
            lab.test('the request is run and the error is sent back', function (done) {
                function callback(err) {
                    lab.expect(err).to.be.instanceof(Error);
                    lab.expect(err.message).to.eql('basePath/uuid/1 -> 500');
                    done();
                }

                statusCode = 500;
                queue.pushToWriteQueue(request, callback);
            });
        });
    });

    lab.experiment('pause and resume', function () {
        lab.experiment('the read queue', function () {
            lab.test('status reflects the correct state', function (done) {
                lab.expect(queue.queueStatus().readQueuePaused).to.eql(false);
                queue.pauseReadQueue();
                lab.expect(queue.queueStatus().readQueuePaused).to.eql(true);
                queue.resumeReadQueue();
                lab.expect(queue.queueStatus().readQueuePaused).to.eql(false);
                done();
            });
        });

        lab.experiment('the write queue', function () {
            lab.test('status reflects the correct state', function (done) {
                lab.expect(queue.queueStatus().writeQueuePaused).to.eql(false);
                queue.pauseWriteQueue();
                lab.expect(queue.queueStatus().writeQueuePaused).to.eql(true);
                queue.resumeWriteQueue();
                lab.expect(queue.queueStatus().writeQueuePaused).to.eql(false);
                done();
            });
        });
    });
});
