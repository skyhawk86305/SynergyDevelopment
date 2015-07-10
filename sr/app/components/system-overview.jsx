'use strict';

var _ = require('lodash'),
    React = require('react'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    ShelfDetails = require('./shelf-details'),
    AggregateDetails = require('./aggregate-details'),
    SystemPolicies = require('./system-policies'),
    ShelfDriveGroupSummary = require('./hw-shelf-drive-group'),
    usual = require('../usual-props'),
    cnst = require('./constants');

var HardwareDisplay = React.createClass({
    propTypes: _.merge({
        systems: React.PropTypes.any.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        selectDetails: React.PropTypes.object.isRequired,
        col3View: React.PropTypes.string,
    }, usual.isRequired),

    _addSystem: function(spec, event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.select();    // Keep current selector, close col 3 (system was altered)
        var sampledSystem = this._getFirstSystem();
        this.props.fire('PROJECT_EXPAND_CLUSTER', sampledSystem.cluster._id, spec);
    },
    _removeSystem: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.select();    // Keep current selector, close col 3 (system was altered)
        var sampledSystem = this._getFirstSystem();
        this.props.fire('PROJECT_REMOVE_SYSTEM', sampledSystem._id);
    },
    _deleteSystem: function(version, event) {
        event.stopPropagation();
        event.preventDefault();

        var sampledSystem = this._getFirstSystem();
        this.props.fire('PROJECT_REMOVE_SYSTEM', sampledSystem._id);

        if (version) {
            if (sampledSystem.is_clustered) {
                this.props.fire('PROJECT_SET_CLUSTER_VERSION', sampledSystem.cluster._id, version);
            } else {
                this.props.fire('PROJECT_SET_SYSTEM_VERSION', sampledSystem._id, version);
            }
        }

        this.props.clearSelection();
    },
    _getWrappedSystems: function() {
        var props = this.props,
            isGroupedSystems = Array.isArray(props.systems),
            wrappedSystems = isGroupedSystems ? props.systems : [props.systems];
        return wrappedSystems;
    },
    _getFirstSystem: function() {
        var props = this.props,
            isGroupedSystems = Array.isArray(props.systems),
            sampledSystem = isGroupedSystems ? props.systems[0] : props.systems;
        return sampledSystem;
    },

    selectShelf: function(shelf, event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = { shelf: { _id: shelf._id } };
        this.props.select(selector, cnst.UI_SELECT_ADD_CHANGE_SHELF_DRIVE_LIST);
    },

    changeSystem: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.select({}, cnst.UI_SELECT_ADD_CHANGE_SYSTEMS);
    },

    changeVersion: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.select({}, 'VersionList');
    },

    _isSelected: function(currentConfig, selectedConfig) {
        if (currentConfig && selectedConfig) {
            if (currentConfig._id === selectedConfig._id) {
                return true;
            }
        }

        return false;
    },

    renderEmbeddedShelfSummary: function(sampledSystem) {
        var embeddedShelf = _(sampledSystem.shelves).find({ _isembedded: true }),
            shelfCSS = React.addons.classSet({
                'row-list-item': true,
                'selectable': true,
                'selected': this._isSelected(embeddedShelf, this.props.selectDetails.shelf),
            });

        if (!embeddedShelf) {
            return (<div/>);
        } else {
            var hagroup = this._getFirstSystem(),
                matrix = this.props.map.inspect(hagroup).config.matrix,
                version = hagroup.version;


            var fireChangeEmbeddedDiskShelf = _.partial(this.selectShelf, embeddedShelf),
                systemsCount = this.props.systems.length || 1,
                shelfCount = systemsCount,
                drive_specs = _.isEmpty(embeddedShelf._x_bom) ? [] : embeddedShelf._x_bom.drive_specs,
                shelfDriveGroupSummaries = _.map(drive_specs, function (driveGroup) {
                    var compat = matrix.checkVersionShelfDrive(version, embeddedShelf.model, driveGroup.model);

                    return (
                        <ShelfDriveGroupSummary
                            driveGroup={ driveGroup }
                            fpSupport={ compat.fp_support_drive }
                            shelfCount={ shelfCount } />
                    );
                });

            return (
                <div className={ shelfCSS } onClick={ fireChangeEmbeddedDiskShelf }>
                    <div className="row-list-cell row-list-cell-s">
                    </div>
                    <div className="row-list-cell">
                        <div>
                            <span className="emphasize">Internal drives</span>
                        </div>
                        {shelfDriveGroupSummaries}
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-chevron-right"></span>
                    </span>
                </div>
            );
        }
    },
    render: function() {
        var props = this.props,
            isGroupedSystems = Array.isArray(props.systems),
            sampledSystem = this._getFirstSystem(),
            system_model = sampledSystem.model,
            names = isGroupedSystems ? '' : _(sampledSystem.controllers).map('name').join('/'),
            countDom;

        var matrix = this.props.map.inspect(sampledSystem).config.matrix,
            displayVersion = matrix.getFullNameForVersion(sampledSystem.version);

        var modelWithoutSpaces = system_model.replace(' ', ''),
            imageModel = modelWithoutSpaces.replace('V', 'FAS'),
            imageUrl = '../media/img/' + imageModel + '_front_view.png';

        var policies = sampledSystem._policies || {},
            versionPolicy = policies.version || {},
            options = versionPolicy.pin ? { version: sampledSystem.version } : {};

        var selector = _.pick(props.selectDetails, ['installation', 'cluster']),
            guard = props.map.guard(selector, options);

        if (isGroupedSystems && sampledSystem.controllers.length > 1) {
            var configs = guard.addingSystem(),
                sampledConfigs = _.where(configs, function match(config) {
                    return config.isEnabled && (config.configModel === sampledSystem._model);
                }),
                sampledConfig = _.first(sampledConfigs);

            //  ensures that we cannot increase the count of SingleNodeClusters
            if (_.isEmpty(sampledConfig)) {
                // Guard says there are no valid configs for adding another one
                countDom = (
                    <div className="row-list-cell row-list-cell-s">
                        <span className="fa fa-fw fa-minus" onClick={ this._removeSystem }></span>
                        <input type="text" value={ props.systems.length } className="input-count" />
                    </div>
                );
            } else {
                var specs = sampledConfig.buildSpec(props.selectDetails),
                    addSystem = _.partial(this._addSystem, _.first(specs));

                countDom = (
                    <div className="row-list-cell row-list-cell-s">
                        <span className="fa fa-fw fa-minus" onClick={ this._removeSystem }></span>
                        <input type="text" value={ props.systems.length } className="input-count" />
                        <span className="fa fa-fw fa-plus" onClick={ addSystem }></span>
                    </div>
                );
            }
        } else {
            var replacing = _.pick(props.selectDetails, ['installation', 'cluster', 'hagroup']),
                delConfigs = guard.deletingSystem(replacing),
                deleteSystemConfig = _.last(delConfigs),
                newVersion = deleteSystemConfig ? deleteSystemConfig.newVersion : undefined,
                delAction = _.partial(this._deleteSystem, newVersion);

            countDom = (
                <div className="row-list-cell row-list-cell-s">
                    <span className="fa fa-fw fa-trash" onClick={ delAction }></span>
                </div>
            );
        }

        var embeddedShelfSummary = this.renderEmbeddedShelfSummary(sampledSystem),
            embeddedShelf = _(sampledSystem.shelves).find({ _isembedded: true }),
            controllerClassName = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-group-next': embeddedShelf,
                'selectable': true,
                'selected': this.props.col3View === cnst.UI_SELECT_ADD_CHANGE_SYSTEMS,
            });

        var automaticOSVersionDisplay,
            selectOSVersionDisplay,
            osVersionDisplayCSS = React.addons.classSet({
                'row-list-item': true,
                'selectable': true,
                'selected': this.props.col3View === 'VersionList',
            });

        if (!versionPolicy.pin) {
            automaticOSVersionDisplay = (
                <div>{ displayVersion }</div>
            );
        } else {
            selectOSVersionDisplay = (
                <div className={ osVersionDisplayCSS } onClick={ this.changeVersion }>
                    <div className="row-list-cell row-list-cell-s">
                    </div>
                    <div className="row-list-cell">
                        <span>{ displayVersion }</span><br/>
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-chevron-right"></span>
                    </span>
                </div>
            );
        }

        return (
            <ScrollableRegion>
                <div className="row-list-item-grouping">
                    <div className={ controllerClassName } onClick={ this.changeSystem }>
                        { countDom }
                        <div className="row-list-cell row-list-cell-l">
                            <span className="emphasize">{ sampledSystem._model }</span><br/>
                            { automaticOSVersionDisplay }
                            <span>{ names }</span>
                        </div>
                        <div className="row-list-cell row-list-cell-m row-list-cell-img hide-contracted-full">
                            <img src={ imageUrl } className="controller-img" alt={ system_model } />
                        </div>
                        <span className="chevron">
                            <span className="fa fa-fw fa-chevron-right"></span>
                        </span>
                    </div>
                    { embeddedShelfSummary }
                    { selectOSVersionDisplay }
                </div>
                <ShelfDetails systems={ this._getWrappedSystems() }
                                 map={ props.map }
                                 fire={ props.fire }
                                 select={ this.props.select }
                                 selected={ this.props.selectDetails }
                                 className="hw-details-level-1"
                                 col3View={ this.props.col3View } />
            </ScrollableRegion>
        );
    }
});

// TODO: AggregatesDisplay is a passthrough to the real AggregateDetails, so remove this middleman
var AggregatesDisplay = React.createClass({
    propTypes: _.merge({
        systems: React.PropTypes.any.isRequired,
        aggregateDisplayLanguage: React.PropTypes.string.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        selectDetails: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    render: function() {
        return (
            <ScrollableRegion>
                <AggregateDetails
                    systems={ this.props.systems }
                    aggregateDisplayLanguage={ this.props.aggregateDisplayLanguage }
                    clearSelection={ this.props.clearSelection }
                    select={ this.props.select }
                    selectDetails={ this.props.selectDetails }
                    userPreferences = { this.props.userPreferences }
                    { ... usual(this.props) } />
            </ScrollableRegion>
        );
    }
});

var CurrentTabDisplay = React.createClass({
    propTypes: _.merge({
        currentTab: React.PropTypes.string.isRequired,
        aggregateTabName: React.PropTypes.string.isRequired,
        systems: React.PropTypes.any.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        selectDetails: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        col3View: React.PropTypes.string,
    }, usual.isRequired),

    render: function() {
        var props = this.props,
            currentTabName = (props.aggregateTabName === props.currentTab) ? 'Aggregates' : props.currentTab;

        switch (currentTabName) {
            case 'Hardware':
                return (
                    <HardwareDisplay
                        systems={ props.systems }
                        clearSelection={ props.clearSelection }
                        select={ props.select }
                        selectDetails={ props.selectDetails }
                        col3View={ props.col3View }
                        { ... usual(this.props) } />
                );

            case 'Aggregates':
                return (
                    <AggregatesDisplay
                        systems={ props.systems }
                        aggregateDisplayLanguage={ props.aggregateTabName }
                        clearSelection={ props.clearSelection }
                        select={ props.select }
                        selectDetails={ props.selectDetails }
                        userPreferences= { props.userPreferences }
                        { ... usual(this.props) } />
                );

            case 'Policies':
                return (
                    // Wrap systems in an array until we refactor the rest of the way up
                    <SystemPolicies
                        hagroups={ [props.systems] }
                        hardwareSelector={ props.selectDetails }
                        { ... usual(this.props) } />
                );
        }
    }
});

var SystemOverview = React.createClass({
    propTypes: _.merge({
        systems: React.PropTypes.any.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        selectDetails: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        col3View: React.PropTypes.string,
        col2Tab: React.PropTypes.string.isRequired,
        selectCol2View: React.PropTypes.func.isRequired
    }, usual.isRequired),

    getInitialState: function() {
        return {
            currentTab: this._convertViewtoTabUntilWeRefactor()
        };
    },

    _convertViewtoTabUntilWeRefactor: function() {
        switch (this.props.col2Tab) {
            case 'SystemOverview': return 'Hardware';
            case 'Aggregates': return this._aggregateTabName();
            case 'Policies': return 'Policies';
            default: return 'Hardware';
        }
    },

    _changeTabHardware: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.setState({
            currentTab: 'Hardware'
        });

        this.props.selectCol2View('SystemOverview');
    },

    _changeTabAggregates: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.setState({
            currentTab: this._aggregateTabName()
        });

        this.props.selectCol2View('Aggregates');
    },

    _aggregateTabName: function() {
        console.log('determining aggr tab name with systems: ', this.props.systems);
        var map = this.props.map,
            systemsAreESeriesMap = _.map(this.props.systems, function(system) {
                return map.inspect(system).isESeries;
            }),
            allSystemsAreESeries = _.every(systemsAreESeriesMap);

        if (allSystemsAreESeries) {
            return 'Storage Containers';
        }
        else {
            return 'Aggregates';
        }
    },

    _changeTabPolicies: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.setState({
            currentTab: 'Policies'
        });

        this.props.selectCol2View('Policies');
    },

    render: function() {
        var props = this.props,
            aggregateTabName = this._aggregateTabName(),
            systems = (props.systems.length === 1) ? props.systems[0] : props.systems,
            systemTitle = (props.systems.length > 1) ? "Systems Detail" : "System Details",
            policyTitle = 'Options',
            tab = this.state.currentTab;

        var title = (tab === 'Hardware') ? systemTitle : (tab === 'Policies') ? policyTitle : tab;

        return (
            <div>
                <ColumnHeader columnTitle={ title }>
                    <ActionLink
                        isToggle={ true }
                        select={ this._changeTabHardware }
                        selected={ tab === 'Hardware' }
                        enabled={ true }
                        hideContracted={ true }>
                        Hardware
                    </ActionLink>
                    <ActionLink
                        isToggle={ true }
                        select={ this._changeTabAggregates }
                        selected={ tab === aggregateTabName }
                        enabled={ true }
                        hideContracted={ true }>
                        { aggregateTabName }
                    </ActionLink>
                    <ActionLink
                        isToggle={ true }
                        select={ this._changeTabPolicies }
                        selected={ tab === 'Policies' }
                        enabled={ true }
                        hideContracted={ true }>
                        Options
                    </ActionLink>
                </ColumnHeader>
                <CurrentTabDisplay
                    currentTab={ tab }
                    aggregateTabName={ aggregateTabName }
                    systems={ systems }
                    clearSelection={ props.clearSelection }
                    selectDetails={ props.selectDetails }
                    select={ props.select }
                    userPreferences= { props.userPreferences }
                    col3View={ props.col3View }
                    { ... usual(this.props) } />
            </div>
        );
    }
});

module.exports = SystemOverview;
