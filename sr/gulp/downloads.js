'use strict';

var path = require('path');

var VENDOR_ASSETS = {
    'react-addons-min': 'http://fb.me/react-with-addons-0.12.2.min.js',
    'react-addons': 'http://fb.me/react-with-addons-0.12.2.js',
    'lodash-compat-min': 'https://raw.github.com/lodash/lodash/2.4.1/dist/lodash.compat.min.js',
};

function makeDownloadTasks(gulp, gulpex, paths) {
    var tasks = [];

    for (var key in VENDOR_ASSETS) {
        var url = VENDOR_ASSETS[key],
            parts = url.split('/'),
            fileName = parts[parts.length - 1],
            taskName = 'download-' + key;
        tasks.push(taskName);
        gulp.task(taskName, gulpex.download.file({
            url: url,
            fileName: fileName,
            targetPath: paths.output.dist
        }));
    }

    // use this task as a parent if you want to wait for all downloads
    gulp.task('download-vendor-assets', tasks);

    // gulp at its best: downloads and unzips on the fly
    gulp.task('download-bootstrap', gulpex.download.zipFile({
        url: 'https://github.com/twbs/bootstrap/archive/v3.1.1.zip',
        targetPath: path.dirname(paths.bootstrap),
        checkPath: paths.bootstrap
    }));

    gulp.task('download-font-awesome', gulpex.download.zipFile({
        url: 'http://fortawesome.github.io/Font-Awesome/assets/font-awesome-4.3.0.zip',
        targetPath: path.dirname(paths.fontAwesome),
        checkPath: paths.fontAwesome
    }));
}

module.exports = makeDownloadTasks;
