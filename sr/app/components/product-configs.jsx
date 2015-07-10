'use strict';

var _ = require('lodash'),
    React = require('react'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    cnst = require('./constants'),
    Tooltip = require('./tooltip'),
    Button = require('./button'),
    constants = require('../../lib/constants.js');

var CONFIG_GROUPS = constants.CONFIG_GROUPS;

var ProductConfigs = React.createClass({
    propTypes: {
        selection: React.PropTypes.object.isRequired,
        selectDetails: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        productInfo: React.PropTypes.object.isRequired,
        projectId: React.PropTypes.string.isRequired,
        onClose: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            showEoa: false,
            configFilters: {
                isSellable: true,
                isHA: true
            }
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (!_.isEqual(this.props.selectDetails, nextProps.selectDetails)) {
            this.setState({
                showEoa: false,
                configFilters: {
                    isSellable: true,
                    isHA: true
                }
            });
        }
    },

    componentDidMount: function() {
        if (this.refs.FilterFasMultiNodeCluster) {
            this.refs.FilterFasMultiNodeCluster.getDOMNode().setAttribute('checked', 'checked');
        } else if (this.refs.filterESeriesDuplex) {
            this.refs.filterESeriesDuplex.getDOMNode().setAttribute('checked', 'checked');
        }
    },

    _filterConfigs: function(configs, constraint) {
        return _.isEmpty(constraint) ? _.where(configs) : _.where(configs, constraint);
    },

    _fixSelectionAfterAdd: function (err, hagroup) {
        if (err) {
            return console.error(err);
        }

        var base = _.pick(this.props.selectDetails, 'installation'),
            newSelector = _.merge(base, { hagroup: { _id: hagroup._id } }),
            col2View = 'SystemOverview';

        if (hagroup.cluster && hagroup.cluster._id) {
            newSelector = _.merge(newSelector, {
                cluster: { _id: hagroup.cluster._id },
                hagroup: { _model: hagroup._model }
            });
        }

        this.props.fire('HARDWARE_SELECT', this.props.projectId, newSelector, col2View, null);
    },

    addSystem: function(config, addingTo, replacing, event) {
        event.stopPropagation();

        var specs = config.buildSpec(addingTo, replacing),
            spec = specs[0];

        if (config.groupId === cnst.PRODUCTLINE_SUBTYPE_CDOT) {
            var fire = this.props.fire,
                isCluster = _(this.props.selectDetails).has('cluster') ? true : false;

            if (isCluster) {
                fire('PROJECT_EXPAND_CLUSTER', this.props.selection._id, spec);
                this._close(event);
            } else {
                fire('PROJECT_ADD_CLUSTER', spec, this._fixSelectionAfterAdd);
            }
        } else {
            this.props.fire('PROJECT_ADD_STANDALONE', spec, this._fixSelectionAfterAdd);
        }
    },

    changeSystem: function (config, addingTo, replacing, event) {
        event.stopPropagation();

        var props = this.props,
            specs = config.buildSpec(addingTo, replacing),
            selector = _.merge(props.selectDetails, { hagroup: { _model: config.configModel } });

        props.fire('PROJECT_CHANGE_SYSTEMS', specs);
        props.fire('HARDWARE_SELECT', props.projectId, selector, 'SystemOverview', null);
    },

    _close: function (event) {
        this.props.onClose(event);
    },

     _showDetails: function(systemConfig, event) {
        event.stopPropagation();
        this.setState({
            currentSystemHover: systemConfig
        });
    },

    render: function() {
        var props = this.props,
            selector = props.selectDetails,
            isConfigChange = _(selector).has('hagroup') ? true : false,
            isCluster = _(selector).has('cluster') ? true : false,
            action = isConfigChange ? this.changeSystem : this.addSystem;

        var addingTo, replacing, renderProductLineFilters, title, options, policies, versionPolicy;
        var showDetails = this._showDetails;

        if (isConfigChange) {
            var hagroup = props.selection,
                clusterSelector = isCluster ? { cluster: { _id: hagroup.cluster._id } } : {},
                hagroupSelector = { hagroup: { _id: hagroup._id } },
                model = hagroup._model;

            policies = hagroup._policies || {};
            versionPolicy = policies.version || {};
            options = versionPolicy.pin ? { version: hagroup.version } : {};

            addingTo = _.merge(_.pick(selector, 'installation'), clusterSelector);
            replacing = _.merge(_.pick(selector, ['installation', 'cluster']), hagroupSelector);
            title = 'Change ' + hagroup._model + ' System';

            if (isCluster) {
                renderProductLineFilters = this.renderClusteredFilters;
            } else if (model.substring(0, 3) === "FAS") {
                renderProductLineFilters = this.renderFasFilters;
            } else if (model.substring(0, 1) === "V") {
                renderProductLineFilters = this.renderFasFilters;
            } else if (model.substring(0, 2) === "EF") {
                renderProductLineFilters = this.renderEFSeriesFilters;
            } else if (model.substring(0, 1) === "E") {
                renderProductLineFilters = this.renderESeriesFilters;
            }
        } else {
            if (isCluster) {
                var sampleSystem = _.first(props.selection.hagroups);

                policies = sampleSystem._policies || {};
                versionPolicy = policies.version || {};
                options = versionPolicy.pin ? { version: sampleSystem.version } : {};

                addingTo = selector;
                title = 'Add System to ' + (props.selection.name || 'Cluster');
                renderProductLineFilters = _.partial(this.renderClusteredFilters, true);
            } else {
                var productLine = selector.productLine,
                    productSubLine = selector.productSubLine,
                    configGroup = props.productInfo.getConfigGroup(productLine, productSubLine);

                addingTo = configGroup;
                title = 'Add ' + configGroup.title + ' System';

                if (configGroup.id === CONFIG_GROUPS.FAS_CMODE_NORMAL) {
                    renderProductLineFilters = this.renderClusteredFilters;
                } else if (configGroup.id === CONFIG_GROUPS.FAS_7MODE_NORMAL) {
                    renderProductLineFilters = this.renderFasFilters;
                } else if (configGroup.id === CONFIG_GROUPS.E_NORMAL) {
                    renderProductLineFilters = this.renderESeriesFilters;
                } else if (configGroup.id === CONFIG_GROUPS.EF_NORMAL) {
                    renderProductLineFilters = this.renderEFSeriesFilters;
                }
            }
        }

        var guard = props.map.guard(addingTo, options),
            configs = guard.addingSystem(replacing),
            filteredConfigs = this._filterConfigs(configs, this.state.configFilters),
            enabledConfigs = this._filterConfigs(filteredConfigs, { isEnabled: true }),
            disabledConfigs = this._filterConfigs(filteredConfigs, { isEnabled: false });

        var enabledConfigList = _(enabledConfigs)
            .map(function (c) {
                return(
                    <div className="row-list-item selectable" onClick={_.partial(action, c, addingTo, replacing)} onMouseOver={ _.partial(showDetails, c) }>
                        <div className="row-list-cell">{c.configModel}</div>
                        <div className="row-list-cell">{ !c.isSellable ? '(EOA)' : '' }</div>
                    </div>
                    );
            }).value();
        var disabledConfigList = _(disabledConfigs)
            .map(function (c) {
                var disabledTooltip;
                var conflicts = _.map(c.conflicts, function(conflict) {
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
                return(
                    <div className="row-list-item disabled-selection" onMouseOver={ _.partial(showDetails, c) }>
                        <div className="row-list-cell">{c.configModel}</div>
                        <div className="row-list-cell">{ !c.isSellable ? '(EOA)' : '' }</div>
                        { disabledTooltip }
                    </div>
                    );
            }).value();

        return (
            <div>
                <ColumnHeader columnTitle={ title }>
                    <ActionLink
                        isToggle={ false }
                        select={ this._close }
                        selected={ false }
                        enabled={ true }>
                        Close
                    </ActionLink>
                </ColumnHeader>
                { renderProductLineFilters() }
                <ScrollableRegion top="80">
                    { enabledConfigList }
                    { disabledConfigList }
                </ScrollableRegion>
            </div>
        );
    },

    noOpFilter: function(/* c */) {
        return true;
    },

    renderClusteredFilters: function(disableSingleNodeClusterChoice) {
        //Single-Node, TNSC, Switched Cluster
        var disableSingleNodeFilter = disableSingleNodeClusterChoice ? 'disabled' : false;
        return (
            <div className="filter-pane">
                <div className="btn-group">
                    <input
                    onChange={ _.partial(this._chainFilters, { isHA: true }) }
                    type="radio"
                    name="filterFas"
                    ref="FilterFasMultiNodeCluster"
                    id="FilterFasMultiNodeCluster" />
                    <label htmlFor="FilterFasMultiNodeCluster" className="btn btn-default">
                        <span> Multi-Node</span>
                    </label>

                    <input
                    disabled={disableSingleNodeFilter}
                    onChange={ _.partial(this._chainFilters, { isHA: false }) }
                    type="radio"
                    name="filterFas"
                    ref="FilterFasSingleNodeCluster"
                    id="FilterFasSingleNodeCluster" />
                    <label
                        disabled={disableSingleNodeFilter}
                        htmlFor="FilterFasSingleNodeCluster"
                        className="btn btn-default">
                        <span> Single-Node</span>
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
            );
    },

    renderFasFilters: function() {
        return (
            <div className="filter-pane">
                <div className="btn-group">
                    <input
                    onChange={ _.partial(this._chainFilters, { isHA: true }) }
                    type="radio"
                    name="filterFas"
                    ref="FilterFasMultiNodeCluster"
                    id="FilterFasMultiNodeCluster" />
                    <label htmlFor="FilterFasMultiNodeCluster" className="btn btn-default">
                        <span> HA Pair</span>
                    </label>

                    <input
                    onChange={ _.partial(this._chainFilters, { isHA: false }) }
                    type="radio"
                    name="filterFas"
                    id="FilterFasStandalone" />
                    <label htmlFor="FilterFasStandalone" className="btn btn-default">
                        <span> Standalone</span>
                    </label>

                    <input
                    onChange={ _.partial(this._chainFilters, { isEmbedded: true }) }
                    type="radio"
                    name="filterFas"
                    id="FilterFasEmbedded" />
                    <label htmlFor="FilterFasEmbedded" className="btn btn-default">
                        <span> Internal Disk</span>
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
        );
    },

    renderESeriesFilters: function() {
        return (
            <div className="filter-pane">
                <div className="btn-group">
                    <input
                    onChange={ _.partial(this._chainFilters, { isHA: true }) }
                    type="radio"
                    name="filterE"
                    ref="filterESeriesDuplex"
                    id="filterESeriesDuplex" />
                    <label htmlFor="filterESeriesDuplex" className="btn btn-default">
                        <span> Duplex</span>
                    </label>
                    <input
                    onChange={ _.partial(this._chainFilters, { isHA: false }) }
                    type="radio"
                    name="filterE"
                    ref="filterESeriesSimplex"
                    id="filterESeriesSimplex" />
                    <label htmlFor="filterESeriesSimplex" className="btn btn-default">
                        <span> Simplex</span>
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
        );
    },

    renderEFSeriesFilters: function() {
        return (
            <div className="filter-pane">
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
                <div className="clearfix" />
            </div>
        );
    },

    _applyFiltersAndSetState: function(configFilters, showEoa) {
        var newConfigs = !showEoa ? { isSellable: true } : {};
        _.merge(newConfigs, configFilters);

        this.setState({showEoa: showEoa, configFilters: newConfigs});
    },

    _chainFilters: function(filter /*, event */) {
        this._applyFiltersAndSetState(filter, this.state.showEoa);
    },

    _filterShowEoa: function(/* event */) {
        var filters = _.clone(this.state.configFilters);
        delete filters.isSellable;
        this._applyFiltersAndSetState(filters, true);
    },

    _filterHideEoa: function(/* event */) {
        var filters = _.clone(this.state.configFilters);
        delete filters.isSellable;
        this._applyFiltersAndSetState(filters, false);
    },
});

module.exports = ProductConfigs;
