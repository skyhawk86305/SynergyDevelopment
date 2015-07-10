'use strict';

var React = require('react'),
    modelUtil = require('../../lib/model/util'),
    ShelfDriveGroupSummary = require('./hw-shelf-drive-group'),
    _ = require('lodash'),
    cnst = require('./constants'),
    constants = require('../../lib/constants.js');

var ShelfDetails = React.createClass({
    propTypes: {
        systems: React.PropTypes.array.isRequired,
        selected: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired,
        fire: React.PropTypes.func.isRequired,
        col3View: React.PropTypes.string.isRequired,
    },
    _getWrappedSystems: function() {
        var props = this.props,
            isGroupedSystems = Array.isArray(props.systems),
            wrappedSystems = isGroupedSystems ? props.systems : [props.systems];
        return wrappedSystems;
    },

    selectShelf: function(shelf, event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = {
                shelf: {
                    model: shelf.model,
                    _isembedded: false,
                    _x_bom: { drive_specs: [] }
                }
            };

        _.forEach(shelf._x_bom.drive_specs, addSelectorConstraint);

        function addSelectorConstraint(spec) {
            selector.shelf._x_bom.drive_specs.push({ model: spec.model, quantity: spec.quantity });
        }

        this.props.select(selector, cnst.UI_SELECT_ADD_CHANGE_SHELF_DRIVE_LIST);
    },

    addShelf: function(event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.select({}, cnst.UI_SELECT_ADD_CHANGE_SHELF_DRIVE_LIST);
    },

    _isAddNewSelected: function() {
        if (this.props.col3View === cnst.UI_SELECT_ADD_CHANGE_SHELF_DRIVE_LIST) {
            if (_.isEmpty(this.props.selected.shelf)) {
                return true;
            }
        }
        return false;
    },

    render: function () {
        // TODO: extract this copied grouping code
        var _this = this;
        var systems = this.props.systems;
        var grouped = modelUtil.groupShelves(_(systems).flatten('shelves').where(function(s){return !s._isembedded;}).value());

        var shelfGroupEditors = _.map(Object.keys(grouped).sort(), function(k) {
            var safeShelf = _.find(grouped[k], isNotUsedInManual) || grouped[k][0];

            function isNotUsedInManual(shelf) {
                return !_this.props.map.inspect(shelf).isUsedByManualAggregate();
            }

            var selectDetails = _.partial(_this.selectShelf, safeShelf);

            return (
                <ShelfGroupEditor
                    shelf={safeShelf}
                    map={ _this.props.map }
                    count={grouped[k].length}
                    fire={_this.props.fire}
                    selected={ _this.props.selected }
                    selectDetails={ selectDetails }
                    systems={systems} />
            );
        });

        var addNewCSS = React.addons.classSet({
            'row-list-item': true,
            'selectable': true,
            'new': true,
            'selected': this._isAddNewSelected(),
        });

        return(
            <div className="row-list-item-grouping">
                <div className={ addNewCSS } onClick={ this.addShelf }>
                    <div className="row-list-cell row-list-cell-s">
                    </div>
                    <div className="row-list-cell">
                        Add a new shelf
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-plus"></span>
                    </span>
                </div>
                {shelfGroupEditors}
            </div>
        );
    }
});

var ShelfGroupEditor = React.createClass({
    propTypes: {
        fire: React.PropTypes.func.isRequired,
        selectDetails: React.PropTypes.func.isRequired,
        selected: React.PropTypes.object.isRequired,
        shelf: React.PropTypes.object.isRequired,
        count: React.PropTypes.number.isRequired,
        systems: React.PropTypes.array.isRequired
    },
    getInitialState: function() {
        return {
            showLimitReason: false,
            limitReasonToDisplay: ''
        };
    },
    componentWillReceiveProps: function(/* nextProps */) {
        this.setState({
            showLimitReason: false,
            limitReasonToDisplay: ''
        });
    },
    _getByMatchingShelfCount: function (shelf) {
        var matching  = _.groupBy(this.props.systems,
            function(c) { return _.reduce(c.shelves,
                function(c, s) { return c + (modelUtil.shelfDriveComboEquals(s, shelf) ? 1 : 0); }, 0); });
        return matching;
    },
    _addShelf: function (specs, event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.fire('PROJECT_CHANGE_SYSTEMS', specs);
    },
    _deleteShelf: function (version, event) {
        event.stopPropagation();
        event.preventDefault();

        var _props = this.props;
        if (_props.systems && _props.shelf) {
            var systemsByMatchingShelfCount = this._getByMatchingShelfCount(_props.shelf);
            var maxCountOfShelves = _.max(Object.keys(systemsByMatchingShelfCount)); // TODO: verify _.max parseInt on these keys for compares
            var targetSystems = systemsByMatchingShelfCount[maxCountOfShelves]; // systems with the most of these shelves

            _props.fire('PROJECT_DELETE_SHELF', targetSystems[0]._id, _props.shelf);

            if (targetSystems[0].is_clustered) {
                _props.fire('PROJECT_SET_CLUSTER_VERSION', targetSystems[0].cluster._id, version);
            } else {
                _props.fire('PROJECT_SET_SYSTEM_VERSION', targetSystems[0]._id, version);
            }
        }
    },

    _displayLimitReason: function(config, event) {
        event.stopPropagation();
        event.preventDefault();

        var type = constants.LIMIT_TYPES.DRIVE_TOTAL,
            conflict = _.first(config ? config.conflicts || [] : []);

        if(!_.isEmpty(conflict)) {
            var attribute = conflict.attribute.toUpperCase().replace('.','_');

            type = constants.LIMIT_TYPES[attribute];
        }

        this.setState({
            showLimitReason: true,
            limitReasonToDisplay: type
        });
    },

    _isSelected: function() {
        var selectedShelf = this.props.selected.shelf,
            currentShelf = _.first(this.props.shelf) || this.props.shelf;

        if (selectedShelf && currentShelf) {
            if (_.has(selectedShelf, '_x_bom') && _.has(currentShelf, '_x_bom')) {
                return modelUtil.shelfDriveComboEquals(selectedShelf, currentShelf);
            } else {
                return false;
            }
        } else {
            return false;
        }
    },

    render: function () {
        var props = this.props,
            hagroup = (props.systems.length === 1) ? props.systems[0] : props.systems,
            matrix = props.map.inspect(hagroup).config.matrix,
            version = hagroup.version;

        var shelf = props.shelf,
            count = this.props.count,
            imageUrl = '../media/img/' + shelf.model.replace(" ","") + '_front_view.png',
            drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs,
            drivesDisplay = _(drive_specs).map(function(d) {
                var compat = matrix.checkVersionShelfDrive(version, shelf.model, d.model);

                return(
                    <ShelfDriveGroupSummary
                        driveGroup={ d }
                        fpSupport={ compat.fp_support_drive }
                        shelfCount={ count } />
                );
            }).value(),
            shelfCSS = React.addons.classSet({
                'row-list-item': true,
                'selectable': true,
                'selected': this._isSelected(),
            });

        var policies = hagroup._policies || {},
            versionPolicy = policies.version || {},
            options = versionPolicy.pin ? { version: version } : {};

        var base = _.pick(this.props.selected, ['installation', 'cluster', 'hagroup']),
            guard = this.props.map.guard(base, options),
            configs = guard.addingShelf(),
            addShelfConfig = _.find(configs, function match(config) {
                return modelUtil.isConfigForShelf(config, shelf);
            }),
            countDom;

        var replacing = _.merge({ shelf: { _id: shelf._id } }, base),
            delConfigs = guard.deletingShelf(replacing),
            deleteShelfConfig = _.last(delConfigs),
            deleteDom;

        if (deleteShelfConfig && deleteShelfConfig.isEnabled) {
            var delAction = _.partial(this._deleteShelf, deleteShelfConfig.newVersion);

            deleteDom = (<span className="fa fa-fw fa-minus" onClick={ delAction }></span>);
        } else {
            var delReason = _.partial(this._displayLimitReason, deleteShelfConfig);

            deleteDom = (<span className="fa fa-fw fa-lock disabled" onClick={ delReason }></span>);
        }

        if (addShelfConfig && addShelfConfig.isEnabled) {
            var specs = addShelfConfig.buildSpec(base),
                addShelf = _.partial(this._addShelf, specs);

            countDom = (
                <div className="row-list-cell row-list-cell-s">
                    { deleteDom }
                    <input type="text" value={this.props.count} className="input-count" />
                    <span className="fa fa-fw fa-plus" onClick={ addShelf }></span>
                </div>
            );
        } else {
            var showReason = _.partial(this._displayLimitReason, addShelfConfig);

            countDom = (
                <div className="row-list-cell row-list-cell-s">
                    { deleteDom }
                    <input type="text" value={this.props.count} className="input-count" />
                    <span className="fa fa-fw fa-warning disabled" onClick={ showReason }></span>
                </div>
            );
        }

        var shelfHeadroom;
        if (this.state.showLimitReason)
        {
            var warningMsg = constants.LIMIT_REASONS[this.state.limitReasonToDisplay],
                glyph = '';
            switch (this.state.limitReasonToDisplay) {
                case constants.LIMIT_TYPES.AGGR_MANUAL:
                    glyph = 'fa-lock';
                break;
                default:
                    glyph = 'fa-warning';
                break;
            }

            shelfHeadroom = (
                <div className="headroom">
                    <span className={ 'fa fa-fw ' + glyph }></span> { warningMsg }
                </div>
            );
        }

        return (
            <div>
                { shelfHeadroom }
                <div className={ shelfCSS } onClick={this.props.selectDetails}>
                    { countDom }
                    <div className="row-list-cell row-list-cell-l">
                        <span className="emphasize">{shelf.model}</span>
                        {drivesDisplay}
                    </div>
                    <div className="row-list-cell row-list-cell-m row-list-cell-img hide-contracted-full">
                        <img src={ imageUrl } alt={ shelf.model } className="shelf-img" />
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-chevron-right"></span>
                    </span>
                </div>
            </div>
        );
    }
});

module.exports = ShelfDetails;
