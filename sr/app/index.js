'use strict';

var assert = require('assert'),
    async = require('async'),
    _ = require('lodash'),
    App = require('./components/app'),
    constants = require('../lib/constants'),
    Dispatcher = require('../lib/dispatcher'),
    EventJournalStore = require('../lib/stores/event-journal'),
    HardwareStore = require('../lib/stores/hardware'),
    LogApiHost = require('../lib/log-api'),
    LogStore = require('../lib/stores/logger'),
    MOTDStore = require('../lib/stores/motd'),
    PortfolioPage = require('./pages/portfolio'),
    PortfolioStore = require('../lib/stores/portfolio'),
    ProductInfoStore = require('../lib/stores/prodinfo'),
    ProjectPage = require('./pages/project'),
    ProjectStore = require('../lib/stores/project'),
    React = require('react'),
    ReleaseNotesPage = require('./pages/releasenotes'),
    Router = require('react-router'),
    UserPreferencesStore = require('../lib/stores/user-preferences'),
    UserSessionStore = require('../lib/stores/user-session'),
    xhr = require('../lib/xhr');

var Route = React.createFactory(Router.Route),
    DefaultRoute = React.createFactory(Router.DefaultRoute);

require('setimmediate'); // injects global
setImmediate(launch);

/**
 * Launch the application.
 */

function launch() {
    // READ THIS BEFORE CONDUCTING MAINTENANCE:
    // https://github.com/caolan/async#auto
    //
    // Each key maps to either an async function, or an array starting
    // with the names of other keys to perform first and ending with an
    // async function.
    //
    // create(Constructor, deps...) returns an array starting with the
    // deps and ending with an async function which calls the constructor
    // with an object created by selecting the deps from the results so far.
    //
    // steal(x) returns an async function which calls back with x.
    //
    // Taking it slow at first...
    async.auto({
        // Reminder: create returns an async function closed around its
        // arguments. The creation doesn't happen until it's this task's
        // turn, as decided by its dependencies.
        //
        // That said, this is roughly equivalent to its comment:
        logger: create(LogStore), // app.logger = new LogStore()

        // app.log = createBoundLogFn(app.logger)
        log: [
            'logger',
            createLoggingAPI
        ],

        // app.xhr = xhr
        xhr: steal(xhr),

        // app.portfolio = new PortfolioStore({ xhr: app.xhr });
        portfolio: create(PortfolioStore, 'xhr'),

        // ... and you should have it by now, so:
        productInfo: create(ProductInfoStore, 'xhr', 'log'),
        project: create(ProjectStore, 'xhr', 'productInfo'),
        journal: create(EventJournalStore),
        motd: create(MOTDStore),
        userSession: create(UserSessionStore),
        userPreferences: create(UserPreferencesStore, 'log'),
        hardware: create(HardwareStore),

        // Back to the usual async.auto way of describing tasks with deps:
        stores: [
            'hardware',
            'journal',
            'motd',
            'portfolio',
            'productInfo',
            'project',
            'project',
            'userPreferences',
            'userSession',
            getStoreGuards
        ],

        // DispatcherShim adapts the Dispatcher constructor API to resemble
        // the Store constructor API enough to succeed:
        dispatcher: create(DispatcherShim, 'log', 'stores'),

        routes: asyncify(makeRoutes),

        fire: [
            'dispatcher',
            asyncify(makeFireMethod, getApp)
        ],
    }, afterConstruction);

    function afterConstruction(err, app) {
        if (err) {
            return whine(err, app);
        }

        app.log.debug('constructed and rendered');

        // After construction, we hook up the JSX, start logging, and
        // fire some events at the stores to kick things off. All this
        // should be reasonably obvious from the series:
        async.eachSeries([
            // array of sync functions called by callWithApp
            render,
            openLogSpigot,
            makeFire('PORTFOLIO_FETCH'),
            makeFire('MOTD_FETCH'),
            makeFire('USER_SESSION_FETCH'),
            makeFire('PRODUCTINFO_FETCH'),
        ], callWithApp, afterLaunch);

        function callWithApp(fn, callback) {
            assert.equal(typeof fn, 'function', '77c98c62');
            assert.equal(typeof callback, 'function', '52b5bfcd');

            try {
                // jshint -W040
                fn.call(this, app);
                setImmediate(callback, null);
            } catch (err) {
                setImmediate(callback, err);
            }
        }

        function afterLaunch(launchErr) {
            if (launchErr) {
                return whine(launchErr, app);
            }

            app.log.debug('launched');
        }
    }

    function whine(err, app) {
        try {
            return app.log([ 'launch-fatal' ], err);
        } catch (err1) {
            try {
                return console.error(err);
            } catch (err2) {
                return; // give up
            }
        }
    }
}

/**
 * Make a synchronous fireAction(app) method closed around action.
 */

function makeFire(action) {
    assert.equal(typeof action, 'string', 'fa8553d2');
    fireSync._name = action;
    return fireSync;

    function fireSync(app) {
        assert.equal(typeof app, 'object', '4ec5a7b1');
        app.fire(action);
    }
}

/**
 * Create the logging API, returning its log method with log.info,
 * log.error, etc helper methods.
 */

function createLoggingAPI(callback, app) {
    var logStore = app.logger,
        options = { bind: logStore },
        apiHost = new LogApiHost(logStore.log, options);
    callback(null, apiHost.log);
}

/**
 * Find the stores in app; get their guards; return the object we'll
 * end up passing down to pages and many components as the stores prop.
 */

function getStoreGuards(callback, app) {
    var stores = {};
    _.forEach(app, function grabStores(value, key) {
        if (isStore(value)) {
            stores[key] = value.getGuard();
        }
    });
    callback(null, stores);
}

function isStore(v) {
    return typeof v === 'object' && v.act && v.getState && v.watch && v.unwatch;
}

/**
 * Adapt the Dispatcher constructor API to the usual store constructor API
 * so we can use it with create below.
 */

function DispatcherShim(app) {
    var stores = _.values(app.stores),
        log = app.log;
    return new Dispatcher(stores, log);
}

/**
 * Make the router.
 */

function makeRoutes() {
    // jshint newcap: false
    return Route({ handler: App },
        DefaultRoute({
            name: 'portfolio',
            handler: PortfolioPage
        }),
        Route({
            name: 'project',
            path: '/v/:uuid',
            handler: ProjectPage,
        }),
        Route({
            name: 'releasenotes',
            path: '/releasenotes',
            handler: ReleaseNotesPage,
        })
    );
}

/**
 * Make the fire method we'll pass to components as props.
 */

function makeFireMethod(app) {
    var dispatcher = app.dispatcher;

    return dispatcher.act.bind(dispatcher);
}

/**
 * Render the router into the target element.
 */

function render(app) {
    app.log.debug('rendering...');

    var routes = app.routes,
        stores = app.stores,
        fire = app.fire;

    Router.run(routes, Router.HistoryLocation, function (Handler, state) {
        var factory = React.createFactory(Handler),
            globalProps = {
                // required by all page handlers
                stores: stores,
                fire: fire,
                log: app.log,
                // required by all route handlers
                params: state.params,
                query: state.query
            };
        React.render(factory(globalProps), document.getElementById('container'));
    });
}

/**
 * Start log draining to the server.
 */

function openLogSpigot(app) {
    app.log.debug('starting log drainer...');

    app.dispatcher.on('dispatched', function (/* event */) {
        app.logger.drain(drainLogs);
    });

    function drainLogs(entries, callback) {
        xhr('POST', constants.CLIENT_LOG_PATH, { payload: entries }, callback);
    }
}

/**
 * Wrap Constructor in an async function suitable for async.auto. Returns
 * an array starting with the deps for async.auto. Picks those deps from
 * the async.auto results object (i.e. our app object) into an options
 * argument for Constructor.
 *
 * The async fn result calls back with the new object or, if it threw an
 * error, the error.
 */

function create(Constructor /*, dep1, dep2, dep3... */) {
    var depKeys = _.toArray(arguments).slice(1),
        createAsync = asyncify(createSync, getApp);

    return depKeys.concat([ createAsync ]);

    function createSync(results) {
        if (depKeys.length) {
            return new Constructor(_.pick(results, depKeys));
        } else {
            return new Constructor();
        }
    }
}

/**
 * Wrap result in an async function suitable for async.auto.
 */

function steal(result) {
    return stealAsync;

    function stealAsync(callback /*, results */) {
        callback(null, result);
    }
}

/**
 * Wrap fn in an async function suitable for async.auto. Uses makeArgs to
 * transform the results object from async.auto (i.e. our app object) into
 * arguments for fn.
 *
 * The async fn result calls back with fn's return value or, if it threw an
 * error, the error.
 */

function asyncify(fn, makeArgs) {
    assert.equal(typeof fn, 'function', 'can\'t asyncify ' + typeof fn);
    makeArgs = makeArgs || makeNoArgs;
    asyncificated._name = fn._name || fn.name || undefined;
    return asyncificated;

    function asyncificated(callback, results) {
        assert.equal(typeof callback, 'function', 'async fn needs callback');
        var result;

        try {
            // jshint -W040
            result = fn.apply(this, makeArgs(results));
        } catch (err) {
            setImmediate(callback, err);
        }

        setImmediate(callback, null, result);
    }

    function makeNoArgs() {
        return [];
    }
}

/**
 * Asyncify argument processor, passing the async.auto results object
 * as the first argument.
 */

function getApp(results) {
    return [ results ];
}
