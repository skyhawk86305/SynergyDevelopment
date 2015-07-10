'use strict';

var _ = require('lodash'),
    React = require('react'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    FAGlyph = require('./faglyph'),
    Button = require('./button'),
    Tooltip = require('./tooltip'),
    constants = require('../../lib/constants.js');

var ShelfSpecRow = React.createClass({
    fireOnClick: function(event) {
        if (this.props.enabled) {
            this.props.fire(event);
        }
    },
    render: function () {
        var p = this.props;
        var d2c = <span/>;
        var d2m = <span/>;
        var d2i = <span/>;
        var cssClassName = React.addons.classSet({
            'row-list-item': true,
            'ssp-selected': p.selected,
            'selectable': !p.conflicts || p.conflicts.length === 0,
            'disabled-selection': p.conflicts && p.conflicts.length > 0
        });

        if (p.dnB) {
            d2c = (
                <div className="count-icon-grouping">
                    <span className="count">{ p.dnB }</span>
                    <span className="icon">
                        <span className={ "fa fa-fw fa-hdd-o " + p.dcssB }></span>
                    </span>
                    <span className="item">
                        <span className="capacity-count">{ ((p.dcB > 999) ? (p.dcB/1000) + 'TB ' : p.dcB + 'GB ') }</span>
                        { p.dtB }
                    </span>
                </div>
            );
            d2m = (
                <div>
                    <span>{ p.dmB }</span>
                    <span>{ p.doB }</span>
                </div>
            );
            d2i = (
                <div>
                    <FAGlyph name="flash" extraClasses={p.dfB} title="Supports Flash Pool"/>
                    <FAGlyph name="key" extraClasses={p.deB} title="Encrypted"/>
                    <FAGlyph name="clock-o" extraClasses={p.doB} title="End of Availability"/>
                </div>
            );
        }

        var disabledTooltip;
        if (p.conflicts && p.conflicts.length > 0) {
            var conflicts = _.map(p.conflicts, function(conflict) {
                var attribute = conflict.attribute.toUpperCase().replace('.','_'),
                    limit_type = constants.LIMIT_TYPES[attribute],
                    limit_reason = constants.LIMIT_REASONS[limit_type];

                return (
                    <div>
                        { limit_reason }
                    </div>
                );
            });
            disabledTooltip = (
                <Tooltip title="Disabled"
                     position="top"
                     titleClassName="right strong">
                     { conflicts }
                </Tooltip>
            );
        }

        return (
            <div>
                <div className={ cssClassName } onClick={ this.fireOnClick }>
                    <div className="row-list-cell row-list-cell-s">
                        <span className="emphasize">{ p.sm }</span>
                    </div>
                    <div className="row-list-cell row-list-cell-m">
                        <div className="count-icon-grouping">
                            <span className="count">{ p.dnA }</span>
                            <span className="icon">
                                <span className={ "fa fa-fw fa-hdd-o " + p.dcssA }></span>
                            </span>
                            <span className="item">
                                <span className="capacity-count">{ ((p.dcA > 999) ? (p.dcA/1000) + 'TB' : p.dcA + 'GB') }</span>
                                { p.dtA }
                            </span>
                        </div>
                        { d2c }
                    </div>
                    <div className="row-list-cell row-list-cell-s">
                         <span>{ p.dmA }</span>
                        { d2m }
                    </div>
                    <div className="row-list-cell icon-tag-grouping">
                        <div>
                            <FAGlyph name="flash" extraClasses={p.dfA} title="Supports Flash Pool"/>
                            <FAGlyph name="key" extraClasses={p.deA} title="Encrypted"/>
                            <FAGlyph name="clock-o" extraClasses={p.doA} title="End of Availability"/>
                        </div>
                        { d2i }
                    </div>
                </div>
                { disabledTooltip }
            </div>
        );
    }
});

var ShelfList = React.createClass({
    propTypes: {
        selection: React.PropTypes.object.isRequired,
        selectDetails: React.PropTypes.object.isRequired,
        selectedItem: React.PropTypes.array.isRequired,
        fire: React.PropTypes.func.isRequired,
        onClose: React.PropTypes.func,
        map: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return {
            speedFilter: false,
            modelFilter: false,
            showEoa: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (!_.isEqual(this.props.selectDetails, nextProps.selectDetails)) {
            this.setState({
                speedFilter: false,
                modelFilter: false,
                showEoa: false
            });
        }
    },

    componentDidMount: function() {
        this.refs.FilterSpeedNone.getDOMNode().setAttribute('checked', 'checked');
        this.refs.FilterModelNone.getDOMNode().setAttribute('checked', 'checked');
    },

    _getShelfDriveCombos: function(shelfConfigs) {
        var allShelfDriveCombos = [],
            hagroup = this.props.selectedItem.length ? this.props.selectedItem[0] : this.props.selectedItem,
            matrix = this.props.map.inspect(hagroup).config.matrix;

        _.forEach(shelfConfigs, function(shelfConfig) {
            var drive1, drive1Quantity, drive2, drive2Quantity;
            if (shelfConfig.drives && shelfConfig.drives.length) {
                drive1 = shelfConfig.drives[0].drive;
                drive1Quantity = shelfConfig.drives[0].quantity;
                if (shelfConfig.drives.length > 1) {
                    drive2 = shelfConfig.drives[1].drive;
                    drive2Quantity = shelfConfig.drives[1].quantity;
                }
            }

            // fp_support needs to represent the platform limit, not just physical drive support
            var shelfModel = shelfConfig.shelf.model,
                d1Model = drive1 && drive1.model,
                drive1Compat = drive1 ? matrix.checkVersionShelfDrive(shelfConfig.newVersion, shelfModel, d1Model) : {};

            var d2Model = drive2 && drive2.model,
                drive2Compat = drive2 ? matrix.checkVersionShelfDrive(shelfConfig.newVersion, shelfModel, d2Model) : {};

            allShelfDriveCombos.push({
                config: shelfConfig,
                shelf: shelfConfig.shelf.model,
                _isSellable: shelfConfig.shelf.sellable,
                _isembedded: shelfConfig.isEmbedded,
                isMixed: _.isEmpty(drive2) ? false : true,
                drive1DriveType: drive1 && drive1.type,
                drive1MarketingCapacity: drive1 && drive1.capacity && drive1.capacity.marketing,
                drive1Model: drive1 && drive1.model,
                drive1Quantity: drive1Quantity || 0,
                drive1Speed: drive1 && drive1.speed,
                drive1Encrypted: drive1 && drive1.encrypted,
                drive1FlashPool: drive1 && drive1Compat.fp_support_drive || false,
                drive1Sellable: drive1 && drive1.sellable,
                drive2DriveType: drive2 && drive2.type,
                drive2MarketingCapacity: drive2 && drive2.capacity && drive2.capacity.marketing,
                drive2Model: drive2 && drive2.model,
                drive2Quantity: drive2Quantity || 0,
                drive2Speed: drive2 && drive2.speed,
                drive2Encrypted: drive2 && drive2.encrypted,
                drive2FlashPool: drive2 && drive2Compat.fp_support_drive || false,
                drive2Sellable: drive2 && drive2.sellable || true
            });
        });

        allShelfDriveCombos = _.uniq(allShelfDriveCombos, function(combo) { return JSON.stringify(_.omit(combo, 'config')); });
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1Model', 'drive2Model']);
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1Encrypted', 'drive2Encrypted']).reverse();
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1MarketingCapacity', 'drive2MarketingCapacity']);
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1Quantity', 'drive2Quantity']);
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1DriveType', 'drive2DriveType']).reverse();
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, ['drive1Speed', 'drive2Speed']).reverse();
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, 'shelf').reverse();
        allShelfDriveCombos = _.sortBy(allShelfDriveCombos, 'isMixed');

        return allShelfDriveCombos;
    },

    _stop: function (event) {
        if (event) {
            event.stopPropagation();
            // event.preventDefault(); // prevent radio button from being checked
        }
    },

    _filterSpeedChange: function (event) {
        this._stop(event);
        if (event.target.checked) {
            this._filterChange(event.target.value, this.state.modelFilter, this.state.showEoa);
        }
    },

    _filterChangeModel: function (event) {
        this._stop(event);
        if (event.target.checked) {
            this._filterChange(this.state.speedFilter, event.target.value, this.state.showEoa);
        }
    },

    _filterShowEoa: function (event) {
        this._stop(event);
        this._filterChange(this.state.speedFilter, this.state.modelFilter, true);
    },

    _filterHideEoa: function (event) {
        this._stop(event);
        this._filterChange(this.state.speedFilter, this.state.modelFilter, false);
    },

    _applyFilter: function (all, speed, model, showEoa) {
        return this._applyFilterWithProps(all, speed, model, showEoa, this.props);
    },

    _applyFilterWithProps: function (all, speed, model, showEoa, props) {
        var shelves = (props.selection.length === 1) ? props.selection[0] : props.selection,
            isShelf = _(props.selectDetails).has('shelf') ? true : false;

        return _(all)
            .filter(checkSellable)
            .filter(checkModel)
            .filter(checkSpeed)
            .filter(checkEmbedding)
            .value();

        function checkEmbedding(combo) {
            return (!isShelf && !combo._isembedded) ||
                isShelf &&
                ((shelves._isembedded === combo._isembedded) ||
                 (!shelves._isembedded && !combo._isembedded));
        }

        function checkSpeed(combo) {
            return !speed ||
                   (speed === 'split' && combo.drive2Speed) ||
                   (combo.drive1Speed === Number(speed)) ||
                   (combo.drive2Speed === Number(speed));
        }

        function checkModel(combo) {
            return !model || (combo.shelf === model);
        }

        function checkSellable(combo) {
            return showEoa || (combo._isSellable && combo.drive1Sellable && combo.drive2Sellable);
        }
    },

    _filterChange: function (speed, model, showEoa) {
        this.setState({
            speedFilter: speed,
            modelFilter: model,
            showEoa: showEoa
        });
    },

    _deleteShelf: function (version, event) {
        this._stop(event);

        var props = this.props,
            currentShelf =  props.selection.length ? props.selection[0] : props.selection;

        if (currentShelf) {
            _.forEach(props.selectedItem, function(s) {
                props.fire('PROJECT_DELETE_SHELVES', s._id, currentShelf);

                if (s.is_clustered) {
                    props.fire('PROJECT_SET_CLUSTER_VERSION', s.cluster._id, version);
                } else {
                    props.fire('PROJECT_SET_SYSTEM_VERSION', s._id, version);
                }
            });
        }

        this._close(event);
    },

    _addShelf: function (shelfDriveCombo, addingTo, replacing, event) {
        this._stop(event);

        var fire = this.props.fire,
            specs = shelfDriveCombo.config.buildSpec(addingTo, replacing);

        fire('PROJECT_CHANGE_SYSTEMS', specs);
        this._close(event);
    },

    _close: function (event) {
        this.props.onClose(event);
    },

    _renderShelfFilter: function () {
        var eSeriesShelfModels = ["DE6600", "DE5600", "DE1600"],
            fasShelfModels = ["DS2246", "DS4243", "DS4246", "DS4486"];
        var  props = this.props,
             shelfFilter = [],
             selector = props.selection.length ? props.selection[0] : props.selection;
        var filterChangeModel = this._filterChangeModel;

        function renderFilter(shelfmodel) {
            var inputId = "Filter" + shelfmodel,
                filter = [];
            filter.push(
                <input
                    onChange={ filterChangeModel }
                    type="radio"
                    name="filterShelvesByModel"
                    value={shelfmodel}
                    id={inputId} />
            );

            filter.push(
                <label htmlFor={inputId} className="btn btn-default">
                    <span>{shelfmodel}</span>
                </label>
            );

            return filter;
        }

        //cheated both ESeries model and shelf model contains E
        if (selector.model.substring(0, 1) === 'E') {
            for (var i = 0; i < eSeriesShelfModels.length; i++) {
                var model = eSeriesShelfModels[i];
                shelfFilter.push(renderFilter(model));
            }
        } else {
            for (var index = 0; index < fasShelfModels.length; index++) {
                var fasModel = fasShelfModels[index];
                shelfFilter.push(renderFilter(fasModel));
            }
        }

        return shelfFilter;
    },

    render: function() {
        var props = this.props,
            selection = props.selection,
            selectDetails = props.selectDetails;

        var isShelf = _.has(selectDetails, 'shelf') ? true : false,
            shelf = selection.length ? selection[0] : selection,
            addShelf = this._addShelf;

        var addingTo, replacing;

        if (isShelf) {
            addingTo = _.pick(selectDetails, ['installation', 'cluster', 'hagroup']);
            replacing = selectDetails;
        } else {
            addingTo = selectDetails;
        }

        var hagroup = props.selectedItem.length ? props.selectedItem[0] : props.selectedItem,
            policies = hagroup._policies || {},
            versionPolicy = policies.version || {},
            options = versionPolicy.pin ? { version: hagroup.version } : {};

        var guard = props.map.guard(addingTo, options),
            configs = isShelf ? guard.addingShelf(replacing) : guard.addingShelf();

        var speedFilter = this.state.speedFilter || false,
            modelFilter = this.state.modelFilter || false,
            showEoa = this.state.showEoa || false;

        var allCombos = this._getShelfDriveCombos(configs),
            filteredCombos = this._applyFilterWithProps(allCombos, speedFilter, modelFilter, showEoa, props);

        var enabledItems = [],
            disabledItems = [],
            dcssA = '',
            dcssB = '';

        _.forEach(filteredCombos, function renderCombo(combo) {
            switch(combo.drive1Speed) {
                case 10:
                    dcssA = 'text-blue';
                    break;
                case 15:
                    dcssA = 'text-green';
                    break;
                case 50:
                    dcssA = 'text-purple';
                    break;
                default:
                    dcssA = '';
            }

            switch(combo.drive2Speed) {
                case 10:
                    dcssB = 'text-blue';
                    break;
                case 15:
                    dcssB = 'text-green';
                    break;
                case 50:
                    dcssB = 'text-purple';
                    break;
                default:
                    dcssB = '';
            }

            if (combo.config.isEnabled) {
                enabledItems.push(
                    <ShelfSpecRow enabled={ true } fire={ _.partial(addShelf, combo, addingTo, replacing) }
                        sm={ combo.shelf }
                        dcssA={ dcssA }
                        dgA={ combo.drive1DriveType === 'SSD' ? 'hdd-o' : 'hdd-o' }
                        dmA={ combo.drive1Model }
                        dnA={ combo.drive1Quantity }
                        dcA={ combo.drive1MarketingCapacity }
                        dtA={ combo.drive1DriveType }
                        deA={ { 'disable-tag': !combo.drive1Encrypted } }
                        dfA={ { 'disable-tag': !combo.drive1FlashPool } }
                        doA={ { 'disable-tag': combo.drive1Sellable } }
                        dcssB={ dcssB }
                        dgB={ combo.drive2DriveType === 'SSD' ? 'hdd-o' : 'hdd-o' }
                        dmB={ combo.drive2Model }
                        dnB={ combo.drive2Quantity }
                        dcB={ combo.drive2MarketingCapacity }
                        dtB={ combo.drive2DriveType }
                        deB={ { 'disable-tag': !combo.drive2Encrypted } }
                        dfB={ { 'disable-tag': !combo.drive2FlashPool } }
                        doB={ { 'disable-tag': combo.drive2Sellable } }
                        conflicts={ combo.config.conflicts } />
                );
            } else {
                disabledItems.push(
                    <ShelfSpecRow enabled={ false }
                        sm={ combo.shelf }
                        dcssA={ dcssA }
                        dgA={ combo.drive1DriveType === 'SSD' ? 'hdd-o' : 'hdd-o' }
                        dmA={ combo.drive1Model }
                        dnA={ combo.drive1Quantity }
                        dcA={ combo.drive1MarketingCapacity }
                        dtA={ combo.drive1DriveType }
                        deA={ { 'disable-tag': !combo.drive1Encrypted } }
                        dfA={ { 'disable-tag': !combo.drive1FlashPool } }
                        doA={ { 'disable-tag': combo.drive1Sellable } }
                        dcssB={ dcssB }
                        dgB={ combo.drive2DriveType === 'SSD' ? 'hdd-o' : 'hdd-o' }
                        dmB={ combo.drive2Model }
                        dnB={ combo.drive2Quantity }
                        dcB={ combo.drive2MarketingCapacity }
                        dtB={ combo.drive2DriveType }
                        deB={ { 'disable-tag': !combo.drive2Encrypted } }
                        dfB={ { 'disable-tag': !combo.drive2FlashPool } }
                        doB={ { 'disable-tag': combo.drive2Sellable } }
                        conflicts={ combo.config.conflicts } />
                );
            }
        });

        var mode, displayShelfSlotFilterStyle, removeShelfLink;

        if (isShelf) {
            if (shelf._isembedded) {
                mode = 'Change Internal Drives';
                displayShelfSlotFilterStyle = {display: 'none;'};
            } else {
                var delConfigs = guard.deletingShelf(replacing),
                    deleteShelfConfig = _.last(delConfigs),
                    delAction = _.partial(this._deleteShelf, deleteShelfConfig.newVersion);

                mode = 'Change Shelf';
                displayShelfSlotFilterStyle = {};
                removeShelfLink = (
                    <ActionLink
                        isToggle={ false }
                        select={ delAction }
                        selected={ false }
                        enabled={ (deleteShelfConfig && deleteShelfConfig.isEnabled) }>
                        Delete
                    </ActionLink>
                );
            }
        } else {
            mode = 'Add Shelf';
            displayShelfSlotFilterStyle = {};
        }

        var disabledItemsList;

        if (disabledItems.length > 0) {
            disabledItemsList = (
                <div>
                    { disabledItems }
                </div>
            );
        } else {
            disabledItemsList = null;
        }

        return (
            <div>
                <ColumnHeader columnTitle={ mode }>
                    { removeShelfLink }
                    <ActionLink
                        isToggle={ false }
                        select={ this._close }
                        selected={ false }
                        enabled={ true }>
                        Close
                    </ActionLink>
                </ColumnHeader>
                <div>
                    <div className="filter-pane">
                        <div className="btn-group">
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value=""
                                ref="FilterSpeedNone"
                                id="FilterSpeedNone" />
                            <label htmlFor="FilterSpeedNone" className="btn btn-default">
                                <span> All</span>
                            </label>
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value="7.2"
                                id="FilterSpeed72" />
                            <label htmlFor="FilterSpeed72" className="btn btn-default">
                                <span> 7.2K<FAGlyph name={ 'hdd-o' } /></span>
                            </label>
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value="10"
                                id="FilterSpeed10" />
                            <label htmlFor="FilterSpeed10" className="btn btn-default">
                                <span className="text-blue"> 10K<FAGlyph name={ 'hdd-o' } /></span>
                            </label>
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value="15"
                                id="FilterSpeed15" />
                            <label htmlFor="FilterSpeed15" className="btn btn-default">
                                <span className="text-green"> 15K<FAGlyph name={ 'hdd-o' } /></span>
                            </label>
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value="50"
                                id="FilterSpeed50" />
                            <label htmlFor="FilterSpeed50" className="btn btn-default">
                                <span className="text-purple"> SSD<FAGlyph name={ 'hdd-o' } /></span>
                            </label>
                            <input
                                onChange={ this._filterSpeedChange }
                                type="radio"
                                name="filterShelvesBySpeed"
                                value="split"
                                id="FilterSpeedSplit" />
                            <label htmlFor="FilterSpeedSplit" className="btn btn-default">
                                <span className="text-orange"> Mixed<FAGlyph name={ 'code-fork' } /></span>
                            </label>
                        </div>
                        <div className="btn-group pull-right">
                            <Button
                                onClick={ this._filterShowEoa }
                                title="toggle show end of availability"
                                alignRight= { true }
                                extraClasses={{
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': this.state.showEoa,
                                }}>
                                Show EOA
                            </Button>
                            <Button
                                onClick={ this._filterHideEoa }
                                title="toggle hide end of availability"
                                alignRight= { true }
                                extraClasses={{
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': !this.state.showEoa,
                                }}>
                                Hide EOA
                            </Button>
                        </div>
                    </div>

                    <div className="filter-pane">
                        <div className="btn-group" style={displayShelfSlotFilterStyle}>
                            <input
                                onChange={ this._filterChangeModel }
                                type="radio"
                                name="filterShelvesByModel"
                                value=""
                                ref="FilterModelNone"
                                id="FilterModelNone" />
                            <label htmlFor="FilterModelNone" className="btn btn-default">
                                <span> All</span>
                            </label>
                            { this._renderShelfFilter() }
                        </div>
                    </div>

                    <ScrollableRegion top="130">
                        { enabledItems }
                        { disabledItemsList }
                    </ScrollableRegion>
                </div>
            </div>
        );
    }
});

module.exports = ShelfList;
