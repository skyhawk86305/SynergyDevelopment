'use strict';

var gulp = require('gulp'),
    browserify = require('browserify'),
    globalShim = require('browserify-global-shim'),
    reactify = require('reactify'),
    less = require('gulp-less'),
    prefix = require('gulp-autoprefixer'),
    oopen = require('open'), // 'open' gave jshint headache
    path = require('path'),
    fs = require('fs'),
    gulpex = require('gulpex')(gulp),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    versionFixer = require('./gulp/version-fixer'),
    version = require('./version');

var DEBUG = false,
    WRITE_MAPS = version.branch !== 'master';

var paths = {
    frontEndIndex: './app/index.js',
    bootstrap: 'vendor/bootstrap/bootstrap-3.1.1',
    fontAwesome: 'vendor/font-awesome/font-awesome-4.3.0',
    assets: 'assets/**',
    app: 'app/**',
    lib: 'lib/**',
    less: [
        'app/styles/main.less',
        'app/styles/_bootstrap.less',
        'vendor/font-awesome/font-awesome-4.3.0/less/font-awesome.less'
    ],
    watchless: [
        'app/styles/*.less',
        'vendor/bootstrap/bootstrap-3.1.1/less/*.less',
        'vendor/font-awesome/font-awesome-4.3.0/less/*.less'
    ],
    output: {
        mainBundle: 'sr.js',
        mainBundleMap: 'sr.map.json',
        dist: 'dist',
        vendor: 'vendor/**',
        oldVendor: 'app/vendor/**',
    }
};

gulp.task('default', [
    'build',
    'test',
    'lint',
]);

gulp.task('build', [
    'copy-unpackable-static-assets-to-dist',
    'pack-scripts',
    'download-vendor-assets',
    'less'
]);

gulp.task('jshint', [],
    gulpex.run('jshint index.js gulpfile.js gulp test lib app'));

gulp.task('jsxhint', [],
    gulpex.run('jsxhint app'));

gulp.task('lint', ['jshint', 'jsxhint', 'check-stale', 'check-dep-links']);

gulp.task('test', gulpex.run('lab -v'));

gulp.task('coverage', gulpex.run('lab -c -o coverage.html -r html'));

gulp.task('ensure-dist-created', function(callback) {
    fs.mkdir(paths.output.dist, function() {
        callback(null); // ignore errors
    });
});

gulp.task('pack-scripts', ['ensure-dist-created'], function() {
    var browserifyOptions = {
            entries: paths.frontEndIndex,
            extensions: ['.jsx'],
            debug: true, // required for minifyify
        },
        globalify = globalShim.configure({
            lodash: '_',
            react: 'React',
        });

    var pipeline = browserify(browserifyOptions)
        .transform(reactify);

    if (process.env.GULP_AVOID_HG !== 'true') {
        pipeline = pipeline.transform(versionFixer(__dirname));
    }

    pipeline = pipeline
        .transform({ global: true }, globalify)
        .bundle()
        // transition from stream to vinyl stream here
        .pipe(source('sr.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }));

    if (!DEBUG) {
        pipeline = pipeline.pipe(uglify({compress: false}));
    }

    if (WRITE_MAPS) {
        pipeline = pipeline.pipe(sourcemaps.write('./'));
    }

    return pipeline.pipe(gulp.dest(paths.output.dist));
});

gulp.task('copy-unpackable-static-assets-to-dist', function() {
    return gulp.src(paths.assets)
        .pipe(gulp.dest(paths.output.dist));
});

require('./gulp/downloads')(gulp, gulpex, paths);

gulp.task('less', ['copy-bootstrap-fonts', 'copy-fontawesome-fonts'], function() {
    var lessDir = path.join(__dirname, paths.bootstrap, 'less'),
        faLessDir = path.join(__dirname, paths.fontAwesome, 'less'),
        lessOpts = {
            paths: [lessDir, faLessDir]
        };
    return gulp.src(paths.less)
        .pipe(less(lessOpts))
        .pipe(prefix('last 2 versions', '> 1%', 'ie 8', 'ie 9'))
        .pipe(gulp.dest(paths.output.dist));
});

gulp.task('copy-bootstrap-fonts', ['download-bootstrap'], function() {
    var src = path.join(paths.bootstrap, 'fonts/**'),
        dest = path.join(paths.output.dist, 'fonts');
    return gulp.src(src).pipe(gulp.dest(dest));
});

gulp.task('copy-fontawesome-fonts', ['download-font-awesome'], function() {
    var src = path.join(paths.fontAwesome, 'fonts/**'),
        dest = path.join(paths.output.dist, 'fonts');
    return gulp.src(src).pipe(gulp.dest(dest));
});

gulp.task('watch', ['default'], function() {
    gulp.watch(paths.app, ['pack-scripts']);
    gulp.watch(paths.lib, ['pack-scripts']);
    gulp.watch(paths.assets, ['copy-unpackable-static-assets-to-dist']);
    gulp.watch(paths.watchless, ['less']);
});

gulp.task('loose-watch', function() {
    gulp.watch(paths.app, ['pack-scripts']);
    gulp.watch(paths.lib, ['pack-scripts']);
    gulp.watch(paths.assets, ['copy-unpackable-static-assets-to-dist']);
    gulp.watch(paths.watchless, ['less']);
});

gulp.task('serve', ['watch'], function(cb) {
    var BenchTest = require('hapi-bench-test');
    (new BenchTest()).start(cb);
});

gulp.task('pack-n-go', ['ensure-dist-created', 'build', 'loose-watch'], function(cb) {
    var BenchTest = require('hapi-bench-test');
    (new BenchTest()).start(cb);
});

gulp.task('open', ['serve'], function() {
    oopen('https://127.0.0.1:8443/');
});

gulp.task('check-deps', gulpex.run('david --warn404'));

gulp.task('check-stale', gulpex.checkStale);

gulp.task('check-dep-links', gulpex.checkDepLinks);

gulp.task('clean', gulpex.clean(paths.output));

process.on('uncaughtException', function(err) {
    console.error(err.stack || err);
});
