'use strict';

var assert = require('assert'),
    util = require('util'),
    Store = require('./store');

function EventJournalStore() {
    assert(this instanceof EventJournalStore, 'use new');
    Store.call(this, 'EVENTJOURNAL');
    this.events = [];
    this.open = false;
}

util.inherits(EventJournalStore, Store);

EventJournalStore.prototype._act = Store.prototype.act;

EventJournalStore.prototype.act = function act(id) {
    // Most stores only want to see their own events.
    // This store is different.

    assert(typeof(id) === 'string', 'need action ID');

    // copy arguments into simple array rather than array-themed object
    var args = [];
    for (var idx = 0; idx < arguments.length; idx++) {
        args.push(arguments[idx]);
    }

    this.events.push(args);
    var applied = this._act.apply(this, arguments);
    this.changed();
    return applied;
};

EventJournalStore.prototype.getState = function getState() {
    return {
        events: this.events, // TODO: clone it to prevent mutation
    };
};

EventJournalStore.prototype.EVENTJOURNAL_CLEAR = function open() {
    this.events = [];
    // no need to call this.changed() because our custom ask always does it
};

module.exports = EventJournalStore;
