'use strict';
// jshint laxbreak: true

var assert = require('assert'),
    React = require('react'),
    classSet = React.addons.classSet,
    Button = require('./button'),
    Repeat = require('./repeat'),
    FAGlyph = require('./faglyph'),
    RaidTypes = require('../../lib/model/aggregates/raid-types'),
    toggles = require('../../lib/feature-toggles'),
    _ = require('lodash');

var MAX_SLICE_WIDTH_DEVICES = 28,
    MIN_SLICE_WIDTH_DEVICES = 2;

var AGGREGATE_EDITING_PROPS = {
        aggregate: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        hagi: React.PropTypes.object.isRequired,
        log: React.PropTypes.func.isRequired,
    };

var AggregateFlashPoolEditor = React.createClass({
    propTypes: AGGREGATE_EDITING_PROPS,

    render: function() {
        var aggregate = this.props.aggregate;

        // HA group wide devices:
        var devices = this.props.hagi.allPhysicalDevices(),
            qualifiedSSDsPresent = _(devices)
                .map('spec')
                .where({ fp_support: true })
                .where({ type: 'SSD' })
                .any();

        // devices in the aggregate:
        var aggregateSpecs = _(aggregate._raid_groups)
                .map('__deviceSpecs')
                .flatten()
                .where('count')
                .map('spec')
                .value(),
            aggregateHDD = _.filter(aggregateSpecs, isHDD),
            aggregateUnqual = _.where(aggregateHDD, { fp_support: false });

        if (_.all(aggregateSpecs, isSSD)) {
            return (
                <AggregateFlashPoolEditorDisabled { ... this.props }>
                    <p>
                        Flash Pool&#x2122; is not required on all-SSD
                        aggregates.
                    </p>
                </AggregateFlashPoolEditorDisabled>
            );

        } else if (_.any(aggregateUnqual)) {
            var rawSizes = _.map(aggregateUnqual, rawGB);

             return (
               <AggregateFlashPoolEditorDisabled { ... this.props }>
                    <p>
                        The { oxford(rawSizes) } drives in this
                        aggregate are not supported for Flash Pool&#x2122;.
                        Please select storage showing the flash symbol:
                        <FAGlyph name="flash" title="Supports Flash Pool" />
                    </p>
                </AggregateFlashPoolEditorDisabled>
            );

        } else if (!qualifiedSSDsPresent) {
             return (
               <AggregateFlashPoolEditorDisabled { ... this.props }>
                    <p>
                        None of the shelves in this system contain SSD
                        supported for Flash Pool&#x2122;. Please select
                        storage showing the flash symbol:
                        <FAGlyph name="flash" title="Supports Flash Pool" />
                    </p>
                </AggregateFlashPoolEditorDisabled>
            );

        } else {
            return (
                <AggregateFlashPoolEditorEnabled { ...this.props } />
            );
        }
    }
});

function isSSD(spec) {
    return spec.type === 'SSD';
}

function isHDD(spec) {
    return spec.type !== 'SSD';
}

function rawGB(spec) {
    return spec.rawgb + 'GB';
}

function oxford(strings) {
    assert(strings instanceof Array, '81f97cd7');
    assert.notEqual(strings.length, 0, '5e008ca5');

    if (strings.length === 1) {
        return strings;
    } else {
        strings = _.clone(strings);
        var last = strings.pop();
        return [ strings.join(', '), last ].join(' and ');
    }
}

var AggregateFlashPoolEditorDisabled = React.createClass({
    propTypes: {
        children: React.PropTypes.element.isRequired
    },

    render: function() {
        return (
            <div id="fp-editor">
                <div className="row-list-item-option-header">
                    Flash Pools
                </div>
                <SingleCellOrganism>
                    { this.props.children }
                </SingleCellOrganism>
                <FlashPools
                    warnIfNone={ false }
                    { ... this.props } />
            </div>
        );
    }
});

var AggregateFlashPoolEditorEnabled = React.createClass({
    propTypes: {
        aggregate: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        hagi: React.PropTypes.object.isRequired,
        log: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            adding: false,
        };
    },

    render: function() {
        var addClassName = classSet({
                'option-header-link': true,
                'disabled': !this._canAdd(),
            }),
            addText = this.state.adding
                ? 'Cancel'
                : 'Add Storage Pool';

        return (
            <div id="fp-editor">
                <NewPoolDriveSelector
                    isOpen={ this.state.adding }
                    cancel={ this._close }
                    fire={ hook(this.props.fire, this._close) }
                    { ... _.omit(this.props, 'fire') } />
                <div className="row-list-item-option-header">
                    Flash Pools
                    { this.state.adding ? null : (
                    <a className={ addClassName }
                       href="#"
                       onClick={ this._toggle }>
                       { addText }
                    </a>
                    ) }
                </div>
                <FlashPools
                    warnIfNone={ true }
                    { ... this.props } />
            </div>
        );
    },

    _canAdd: function() {
        // TODO: also checkthe guard to see whether or not
        // it should be allowed.
        return toggles.FEATURE_FP_MANUAL_ENABLED;
    },

    _toggle: function (event) {
        event.stopPropagation();
        event.preventDefault();

        if (this._canAdd()) {
            this.setState({ adding: !this.state.adding });
        }
    },

    _close: function() {
        this.setState({ adding: false });
    },
});

function hook(hookedFn, hookFn) {
    // jshint -W040
    return function hooked() {
        try {
            hookFn.apply(this, arguments);
        } catch (err) {
            try {
                console.error('hookFn', hookFn.name, 'failed:', err);
            } catch (err2) {
                // can't even whine? no worries
            }
        }
        return hookedFn.apply(this, arguments);
    };
}

var NewPoolDriveSelector = React.createClass({
    propTypes: _.merge({
        cancel: React.PropTypes.func.isRequired,
        isOpen: React.PropTypes.bool,
    }, AGGREGATE_EDITING_PROPS),

    _findAvailableFlashPoolDeviceSpecs: function () {
        var hagi = this.props.hagi,
            all = hagi.allPhysicalDevices(),
            available = hagi.unlockedPhysicalDevices(),
            allFpSSD = _.filter(all, isFpSSD),
            availFpSSD = _.filter(available, isFpSSD);

        this.props.log.debug('NewPoolDriveSelector', {
            all: allFpSSD,
            available: availFpSSD
        });

        return availFpSSD;
    },

    _cancel: function (event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.cancel();
    },

    render: function() {
        if (!this.props.isOpen) {
            return null;
        }

        var flashPoolDeviceSpecs = this._findAvailableFlashPoolDeviceSpecs();

        return (
            <div>
                <div className="row-list-item-option-header">
                    New Flash Pool
                    <a className="option-header-link"
                       href="#"
                       onClick={ this._cancel }>
                       Cancel
                    </a>
                </div>
                <div className="row-list-item">
                    <div className="fp-drive-choice">
                        <table>
                            <thead>
                                <tr className="row-list-item">
                                    <th className="row-list-cell right">Size</th>
                                    <th className="row-list-cell right">Count</th>
                                    <th className="row-list-cell right">
                                        Available<sup>&nbsp;*</sup> 
                                    </th>
                                </tr>
                            </thead>
                            <Repeat type="tableRow" seq={ flashPoolDeviceSpecs } prop="deviceSpec">
                                <FlashPoolDriveRow
                                    // deviceSpec={ /* comes from Repeat */ }
                                    { ... this.props }  />
                            </Repeat>
                            <tfoot>
                                <tr className="row-list-item no-border">
                                    <td className="row-list-cell" colSpan="3">
                                        <p className="fp-foot">
                                            <span className="fp-foot-hang-left">*</span>
                                            SSDs used by an auto-filled aggregate
                                            are considered available.
                                        </p>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
});

function isFpSSD(ds) {
    return ds.spec.fp_support && ds.spec.type === 'SSD';
}

var FlashPoolDriveRow = React.createClass({
    propTypes: _.merge({
        deviceSpec: React.PropTypes.object.isRequired
    }, AGGREGATE_EDITING_PROPS),

    _addStoragePool: function (event) {
        event.stopPropagation();
        event.preventDefault();

        var deviceCount = this.props.deviceSpec.devices.length,
            poolDeviceCount = Math.min(deviceCount - 1, MAX_SLICE_WIDTH_DEVICES),
            raidType = poolDeviceCount > 2
                ? new RaidTypes().RAID_DP
                : new RaidTypes().RAID_4;

        this.props.fire(
            'PROJECT_FP_ADD_POOL',
            this.props.aggregate._controller,
            this.props.deviceSpec.spec,
            raidType,
            poolDeviceCount);
    },

    render: function() {
        var deviceCount = this.props.deviceSpec.devices.length,
            rowClasses = {
                'row-list-item': true,
                selectable: deviceCount >= 3,
            };

        return(
            <tr className={ classSet(rowClasses) } onClick={ this._addStoragePool }>
                <td className="row-list-cell right">
                    {  this.props.deviceSpec.spec.rawgb + 'GB ' + this.props.deviceSpec.spec.type }
                </td>
                <td className="row-list-cell right">
                    { deviceCount }
                </td>
                <td className="row-list-cell right">
                    { deviceCount }
                </td>
            </tr>
        );
    }
});

var FlashPools = React.createClass({
    propTypes: _.merge({
        warnIfNone: React.PropTypes.bool
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var pools = _(this.props.hagi.hagroup.controllers)
                .where('storage_pools')
                .flatten('storage_pools')
                .value(),
            olds = _(this.props.hagi.hagroup.controllers)
                .map('aggregates').filter().flatten()
                .map('_raid_groups').filter().flatten()
                .where({ cache: true })
                .where(function noVirtuals(rg) {
                    var firstSpec = rg.__deviceSpecs[0].spec,
                        sliced = firstSpec._slice_name || firstSpec.slice;
                    return !sliced;
                })
                .value(),
            all = pools.concat(olds);

        this.props.log.debug('FlashPools.render', {
            pools: pools,
            olds: olds,
            all: all,
        });

        if (all.length) {
            return(
                <Repeat id="fp-existing-pools" seq={ all } key={ getId } prop="item">
                    <AppropriateRow { ... this.props } />
                </Repeat>
            );
        } else if (this.props.warnIfNone) {
            return(
                <SingleCellOrganism>
                    <p>There are no Flash Pool&#x2122; aggregates or
                    storage pools on this system.</p>
                </SingleCellOrganism>
            );
        } else {
            return null;
        }
    }
});

function getId(ob) {
    return ob._id;
}

var AllocationUnit = React.createClass({
    propTypes: _.merge({
        allocation: React.PropTypes.object.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    _getAggregateName: function (id) {
        if (!id) {
            return 'unclaimed';
        }

        try {
            var inspector = this.props.hagi.inspect({
                _type: 'aggregate',
                _id: id,
            });
            return inspector.aggregate.name;
        } catch (err) {
            this.props.log([ 'fp', 'aggregate-find' ], {
                err: err,
                id: id,
            });
            return '?';
        }
    },

    render: function() {
        var ownerId = this.props.allocation.aggr_id,
            ownerName = this._getAggregateName(ownerId),
            claimed = !!ownerId,
            mine = ownerId === this.props.aggregate._id,
            manual = this.props.aggregate._manual;

        var sliceCSS = React.addons.classSet({
                'fp-allocation-slice-claimed-manual': claimed && manual,
                'fp-allocation-slice-claimed-unclaimed': !claimed,
                'fp-allocation-slice-claimed-current': mine,
                'fp-allocation-slice-claimed-auto': claimed && !manual,
                'fp-allocation-slice': true,
            });

        return (
            <div className={ sliceCSS }>
                <span className="inner">{ ownerName }</span>
            </div>
        );
    }
});

var AllocationClaimer = React.createClass({
    propTypes: _.merge({
        allocations: React.PropTypes.array.isRequired,
        isSliced: React.PropTypes.bool.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var blockCSS = 'fp-allocation-block',
            allocationSlices,
            _props = _.pick(this.props, _.keys(AGGREGATE_EDITING_PROPS));

        if (this.props.isSliced) {
            allocationSlices = (
                <Repeat
                    seq={ this.props.allocations }
                    prop={ 'allocation' }>
                    <AllocationUnit { ... _props } />
                </Repeat>
            );
        } else {
            // TODO: old style FP doesn't involve "unsliced" pools, so
            // this doesn't make much sense.
            allocationSlices = (
                <div className='fp-allocation-unsliced'>
                    <p>?</p>
                </div>
            );
        }

        return (
            <div className={ blockCSS }>
                { allocationSlices }
            </div>
        );
    }
});

var PoolAdjuster = React.createClass({
    propTypes: _.merge({
        item: React.PropTypes.object.isRequired,
        canExpand: React.PropTypes.func.isRequired,
        canShrink: React.PropTypes.func.isRequired,
        expand: React.PropTypes.func.isRequired,
        shrink: React.PropTypes.func.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var item = this.props.item,
            driveSpec = item.__deviceSpecs[0].spec,
            driveRepr = driveSpec.rawgb + 'GB ' + driveSpec.type,
            canExpand = this.props.canExpand(),
            canShrink = this.props.canShrink(),
            expand = canExpand ? this.props._expand : this._noop,
            shrink = canShrink ? this.props._shrink : this._noop,
            isSlicedCSS = React.addons.classSet({
                // TODO: cater for normal RAID groups
                'fa': true,
                'fa-fw': true,
                'fa-toggle-on': true,
            }),
            slicedBlock = null;

        if (item._type === 'storage_pool') {
            slicedBlock = (
                <div className="fp-allocation-option">
                    <span className="option-title">Partitioned&nbsp;</span>
                    <span className={ isSlicedCSS }></span>
                </div>
            );
        }

        return (
            <div className="fp-allocation-options">
                <Button
                    onClick={ shrink }
                    faglyph="minus"
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                        'no-pad-right': true,
                        'disabled': !canShrink,
                    }} />
                <input
                    type="text"
                    value={ item._devices.length }
                    readOnly="true"
                    className="input-count"/>
                <Button
                    onClick={ expand }
                    faglyph="plus"
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                        'no-pad-left': true,
                        'disabled': !canExpand,
                    }} />
                <div className="fp-allocation-option">
                    { driveRepr }
                </div>
                { slicedBlock }
            </div>
        );
    },

    _noop: function(event) {
        event.stopPropagation();
        event.preventDefault();
    },

    _shrink: function(event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.shrink();
    },

    _expand: function(event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.expand();
    },
});

var PoolDeleter = React.createClass({
    propTypes: _.merge({
        allocationType: React.PropTypes.string.isRequired,
        deleteMe: React.PropTypes.func.isRequired
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        if (this.props.allocationType === 'manual') {
            return (
                <div className="fp-allocation-remove-block">
                    <Button
                        onClick={ this._deletePool }
                        faglyph="trash"
                        extraClasses={{
                            'btn-default': true,
                            'no-border': true,
                            'no-pad-left': true,
                            'no-pad-right': true
                        }} />
                </div>
            );
        } else {
            return (
                <div className="fp-allocation-remove-block" />
            );
        }
    },

    _deletePool: function(event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.deleteMe();
    },
});

var AppropriateRow = React.createClass({
    propTypes: _.merge({
        item: React.PropTypes.object.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var item = this.props.item,
            props = _.omit(this.props, 'item');

        switch (item._type) {
            case 'storage_pool':
                return (
                    <PoolRow pool={ item } { ... props } />
                );
            case 'raidgroup':
                return (
                    <RaidGroupRow raidGroup={ item } { ... props } />
                );
            default:
                this.props.log.debug('missing _type; bad raid group?');
                return null;
        }
    }
});

var RaidGroupRow = React.createClass({
    propTypes: _.merge({
        raidGroup: React.PropTypes.object.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var raidGroup = this.props.raidGroup,
            insp = this.props.hagi.inspect(raidGroup),
            aggregate = insp.aggregate,
            manual = aggregate._manual,
            allocationType = manual ? 'manual': 'auto',
            mine = aggregate._id === this.props.aggregate._id,
            sliceCSS = classSet({
                'fp-allocation-unsliced': true,
                'fp-allocation-slice-claimed-manual': manual,
                'fp-allocation-slice-claimed-current': mine,
                'fp-allocation-slice-claimed-auto': !manual,
                'fp-allocation-slice': true,
            });

        return (
            <div className="row-list-item fp-allocation-row">
                <PoolDeleter
                    allocationType={ allocationType }
                    deleteMe={ this._deleteMe }
                    { ... this.props } />
                <div className="fp-allocation-block">
                    <div className={sliceCSS}>
                        <span className="inner">{ aggregate.name }</span>
                    </div>
                </div>
                <PoolAdjuster
                    item={ this.props.raidGroup }
                    canExpand={ this._canExpand }
                    canShrink={ this._canShrink }
                    expand = { this._expand }
                    shrink = { this._shrink }
                    { ... this.props } />
            </div>
        );
    },

    _deleteMe: function() {
        this.props.fire('PROJECT_FP_DEL_AGGR_RG', this.props.raidGroup._id);
    },

    _canExpand: function() {
        return toggles.FEATURE_FP_MANUAL_ENABLED
            && this.props.pool._devices.length < MAX_SLICE_WIDTH_DEVICES
            && this._anyMoreOfTheseDrivesAvailable();
    },

    _canShrink: function() {
        return toggles.FEATURE_FP_MANUAL_ENABLED
            && false; // button ripped off
    },

    _anyMoreOfTheseDrivesAvailable: function() {
        // this.props.hagi -> Do we have room to improve?
        // TODO: Expand isn't implemented in the API, so we are saying NO you cannot.

        return false;
    },

    _expand: function() {
        if (!this._canExpand()) {
            return;
        }
        this.props.log.error('expanding FP raid groups not implemented');
        return;
    },

    _shrink: function() {
        if (!this._canShrink()) {
            return;
        }
        this.props.log.error('shrinking FP raid groups not implemented');
        return;
    },
});

var PoolRow = React.createClass({
    propTypes: _.merge({
        pool: React.PropTypes.object.isRequired,
    }, AGGREGATE_EDITING_PROPS),

    render: function() {
        var pool = this.props.pool,
            allocationType = pool._manual === false ? 'auto' : 'manual',
            isSliced = true;

        this.props.log.debug('PoolRow: this.props.pool', this.props.pool);

        return (
            <div className="row-list-item fp-allocation-row">
                <PoolDeleter
                    allocationType={ allocationType }
                    deleteMe={ this._deleteMe }
                    { ... this.props } />
                <AllocationClaimer
                    isSliced={ isSliced }
                    allocations={ pool._allocations }
                    { ... this.props } />
                <PoolAdjuster
                    item={ this.props.pool }
                    canExpand={ this._canExpand }
                    canShrink={ this._canShrink }
                    expand={ this._expand }
                    shrink={ this._shrink }
                    { ... this.props } />
            </div>
        );
    },

    _deleteMe: function() {
        this.props.fire('PROJECT_FP_DEL_POOL', this.props.pool._id);
    },

    _canExpand: function() {
        return toggles.FEATURE_FP_MANUAL_ENABLED
            && this.props.pool._devices.length < MAX_SLICE_WIDTH_DEVICES
            && this._anyMoreOfTheseDrivesAvailable();
    },

    _canShrink: function() {
        return toggles.FEATURE_FP_MANUAL_ENABLED
            && false; // button ripped off
    },

    _anyMoreOfTheseDrivesAvailable: function() {
        // this.props.hagi -> Do we have room to improve?
        // TODO: Expand isn't implemented in the API, so we are saying NO you cannot.

        return false;
    },

    _expand: function() {
        if (!this._canExpand()) {
            return;
        }

        var pool = this.props.pool,
            poolWidth = pool._devices.length,
            newPoolWidth = poolWidth + 1;

        assert(newPoolWidth <= MAX_SLICE_WIDTH_DEVICES, 'You cannot expand the pool above threshold');

        this.props.fire('PROJECT_FP_RESIZE_POOL', pool._id, newPoolWidth);
    },

    _shrink: function() {
        if (!this._canShrink()) {
            return;
        }

        var pool = this.props.pool,
            poolWidth = pool._devices.length,
            newPoolWidth = poolWidth - 1;

        assert(newPoolWidth >= MIN_SLICE_WIDTH_DEVICES, 'You cannot shrink the pool below threshold');

        this.props.fire('PROJECT_FP_RESIZE_POOL', pool._id, newPoolWidth);
    },
});

var SingleCellOrganism = React.createClass({
    propTypes: {
        children: React.PropTypes.element.isRequired
    },

    render: function () {
        return (
                <div className="row-list-item">
                    <div className="row-list-cell">
                        { this.props.children }
                    </div>
                </div>
        );
    }
});

module.exports = AggregateFlashPoolEditor;
