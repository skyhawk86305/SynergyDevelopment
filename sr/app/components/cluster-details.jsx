'use strict';

var _ = require('lodash'),
    React = require('react'),
    Button = require('./button'),
    cnst = require('./constants'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    Repeat = require('./repeat');

var SystemRow = React.createClass({
    propTypes: {
        system: React.PropTypes.object.isRequired,
        guard: React.PropTypes.object.isRequired,
        selector: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return {
            editingName: false,
            newControllerName1: '',
            newControllerName2: ''
       };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.system._id !== nextProps.system._id) {
            var controllers = nextProps.system.controllers || [];

            this.setState({
                editingName: false,
                newControllerName1: controllers[0] ? controllers[0].name || '' : '',
                newControllerName2: controllers[1] ? controllers[1].name || '' : ''
            });
        }
    },

    _editName: function() {
        var controllers = this.props.system.controllers || [];

        this.setState({
            editingName: true,
            newControllerName1: controllers[0] ? controllers[0].name || '' : '',
            newControllerName2: controllers[1] ? controllers[1].name || '' : ''
        }, function() {
            // Move focus to the input field after we render it (and select text)
            this.refs.controllerNameInput1.getDOMNode().select();
        });
    },

    _saveNewName: function() {

        if (this.state.newControllerName1 && this.state.newControllerName2) {
            this.setState({
                editingName: false,
                newControllerName1: '',
                newControllerName2: ''
            });

            if (this.props.system && this.props.system._id) {
                this.props.fire(
                    'PROJECT_NAME_CONTROLLERS',
                    this.props.system._id,
                    this.state.newControllerName1,
                    this.state.newControllerName2
                );
            }
        } else {
            this._cancelEditName();
        }

    },

    _cancelEditName: function() {
        var controllers = this.props.system.controllers || [];

        this.setState({
            editingName: false,
            newControllerName1: controllers[0] ? controllers[0].name || '' : '',
            newControllerName2: controllers[1] ? controllers[1].name || '' : ''
        });
    },

    _captureNewControllerName1: function(event) {
        if (!event.target.value) {
            this.setState({
                newControllerName1: ''
            });
        } else if (event.target.value.search('^[A-Za-z0-9_-]+$') !== -1) {
            this.setState({
                newControllerName1: event.target.value
            });
        }
    },

    _captureNewControllerName2: function(event) {
        if (!event.target.value) {
            this.setState({
                newControllerName2: ''
            });
        } else if (event.target.value.search('^[A-Za-z0-9_.-]+$') !== -1) {
            this.setState({
                newControllerName2: event.target.value
            });
        }
    },

    _deleteSystem: function(version, event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.fire('PROJECT_REMOVE_SYSTEM', this.props.system._id);

        if (version) {
            this.props.fire('PROJECT_SET_CLUSTER_VERSION', this.props.system.cluster._id, version);
        }
    },

    _getControllerPairName: function() {
        var controllerPairName = _.flatten((this.props.system.controllers || []), 'name').join(' / ');

        return (controllerPairName && controllerPairName !== ' / ') ? controllerPairName : 'un-named';
    },

    _getRawCapacity: function() {
        var rawCapacity = _.reduce(this.props.system.shelves, function(rawCapacity, shelf) {
            var drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs,
                shelfCapacity = _.reduce(drive_specs, function(shelfCapacity, bom) {
                    return shelfCapacity + (bom.rawgb || 0 * bom.quantity || 0);
                }, 0);
            return rawCapacity + shelfCapacity;
        }, 0);

        return rawCapacity ? ((rawCapacity > 999) ? (rawCapacity/1000) + 'TB ' : rawCapacity + 'GB ') + ' Raw' : '';
    },

    _handleKeyUp: function(event) {
        if (event.key === 'Enter') {
            this._saveNewName();
        } else if (event.key === 'Escape') {
            this._cancelEditName();
        }
    },

    _renderNameCells: function(controllers) {
        var items = [];

        // <div className={ controllers.length > 1 ? "row-list-cell row-list-cell-m row-list-cell-middle" : "row-list-cell row-list-cell-middle" }>
        items.push(
            <div className="row-list-cell row-list-cell-m row-list-cell-middle">
                <div className="edit-name-box">
                    <input
                        type="text"
                        ref="controllerNameInput1"
                        value={ this.state.newControllerName1 }
                        placeholder="name"
                        onChange={ this._captureNewControllerName1 }
                        onKeyUp={ this._handleKeyUp }
                        className="form-control" />
                </div>
            </div>
        );

        if (controllers.length > 1) {
            items.push(
                <div className="row-list-cell row-list-cell-m row-list-cell-middle">
                    <div className="edit-name-box">
                        <input
                            type="text"
                            ref="controllerNameInput2"
                            value={ this.state.newControllerName2 }
                            placeholder="name"
                            onChange={ this._captureNewControllerName2 }
                            onKeyUp={ this._handleKeyUp }
                            className="form-control" />
                    </div>
                </div>
            );
        }

        return items;
    },

    render: function() {
        if (this.state.editingName) {
            return (
                <div className="row-list-item">
                    <div className="row-list-cell row-list-cell-xs"></div>
                    { this._renderNameCells(this.props.system.controllers || []) }
                    <div className="row-list-cell row-list-cell-s"></div>
                    <div className="toolstrip">
                        <Button
                            faglyph="check"
                            title="save changes to project name"
                            onClick={ this._saveNewName }
                            extraClasses={{
                                'btn-success': true,
                                'no-border': true,
                            }} />
                        <Button
                            faglyph="times"
                            title="cancel changes to project name"
                            onClick={ this._cancelEditName }
                            extraClasses={{
                                'btn-danger': true,
                                'no-border': true,
                            }} />
                    </div>
                </div>
            );
        } else {
            var addingTo = _.clone(this.props.selector),
                replacing = _.assign(addingTo, { hagroup: { _id: this.props.system._id } }),
                delConfigs = this.props.guard.deletingSystem(replacing),
                deleteSystemConfig = _.last(delConfigs),
                newVersion = deleteSystemConfig ? deleteSystemConfig.newVersion : undefined,
                delAction = _.partial(this._deleteSystem, newVersion);

            return (
                <div className="row-list-item">
                    <div className="row-list-cell row-list-cell-xs">
                    </div>
                    <div className="row-list-cell row-list-cell-nopad">
                        <Button
                            faglyph="trash"
                            title="remove this system"
                            onClick={ delAction }
                            extraClasses={{
                                'btn-default': true,
                                'no-border': true,
                            }}>
                        </Button>
                    </div>
                    <div className="row-list-cell row-list-cell-m row-list-cell-middle">
                        <span>{ this._getControllerPairName() }</span>
                    </div>
                    <div className="row-list-cell row-list-cell-s row-list-cell-middle hide-contracted">
                        { this._getRawCapacity() }
                    </div>
                    <div className="row-list-cell row-list-cell-s"></div>
                    <span className="toolstrip">
                        <Button
                            faglyph="pencil"
                            title="edit the name of your system"
                            onClick={ this._editName }
                            extraClasses={{
                                'btn-default': true,
                                'no-border': true,
                            }}>
                        </Button>
                    </span>
                </div>
            );
        }
    }
});

// TODO: x nodes out of x after limits are available
var NodeCountRow = React.createClass({
    propTypes: {
        count: React.PropTypes.number.isRequired,
        model: React.PropTypes.string.isRequired
    },

    render: function() {
        return (
            <div className="row-list-item header">
                <div className="row-list-cell row-list-cell-m">
                    <div className="drive-summary-block no-overflow emphasize">
                        <span className="drive-count">{ this.props.count }</span>
                        <span className="fa fa-netapp-controller fa-fw"></span>
                        <span className="drive-label">{ this.props.model }</span>
                    </div>
                </div>
                <div className="row-list-cell row-list-cell-m">
                </div>
            </div>
        );
    },
});

var ModelGroup = React.createClass({
    propTypes: {
        modelGroup: React.PropTypes.object.isRequired,
        guard: React.PropTypes.object.isRequired,
        selector: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    _getNodeCounts: function() {
        var nodeCounts = {};

        _.forEach(this.props.modelGroup, function (hagroup) {
            var before = nodeCounts[hagroup.model] || 0,
                after = before + hagroup.controllers.length;
            nodeCounts[hagroup.model] = after;
        });

        return nodeCounts;
    },

    _renderRows: function(count, model) {
        return (
            <NodeCountRow count={ count } model={ model } />
        );
    },

    render: function() {
        return (
            <div>
                { _.map(this._getNodeCounts(), this._renderRows) }
                <Repeat seq={ this.props.modelGroup }
                        prop="system">
                    <SystemRow
                        guard={ this.props.guard }
                        selector={ this.props.selector }
                        fire={ this.props.fire } />
                </Repeat>
            </div>
        );
    },
});

var ClusterDetails = React.createClass({
    propTypes: {
        cluster: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        fire: React.PropTypes.func.isRequired,
        col3View: React.PropTypes.string.isRequired,
    },

    getInitialState: function() {
        return {
            editingName: false,
            newClusterName: ''
       };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.cluster._id !== nextProps.cluster._id) {
            this.setState({
                editingName: false,
                newClusterName: nextProps.cluster.name || ''
            });
        }
    },

    _editName: function() {
        this.setState({
            editingName: true,
            newClusterName: this.props.cluster.name || ''
        }, function() {
            // Move focus to the input field after we render it (and select text)
            this.refs.clusterNameInput.getDOMNode().select();
        });
    },

    _saveNewName: function() {
        this.setState({
            editingName: false,
            newClusterName: ''
        });

        this.props.fire('PROJECT_NAME_CLUSTER', this.props.cluster._id, this.state.newClusterName);
    },

    _cancelEditName: function() {
        this.setState({
            editingName: false,
            newClusterName: this.props.cluster.name || ''
        });
    },

    _captureNewName: function(event) {
        if (!event.target.value) {
            this.setState({
                newClusterName: ''
            });
        } else if (event.target.value.search('^[A-Za-z0-9_-]+$') !== -1) {
            this.setState({
                newClusterName: event.target.value
            });
        }
    },

    _delete: function(event) {
        event.stopPropagation();
        event.preventDefault();

        _.forEach(this.props.cluster.hagroups, function(hagroup) {
            this.props.fire('PROJECT_REMOVE_SYSTEM', hagroup._id);
        }, this);

        this.props.clearSelection();
    },

    _handleKeyUp: function(event) {
        if (event.key === 'Enter') {
            this._saveNewName();
        } else if (event.key === 'Escape') {
            this._cancelEditName();
        }
    },

    _renderNameOrNameInput: function() {
        if (this.state.editingName) {
            return (
                <div className="row-list-item-grouping">
                    <div className="row-list-item">
                        <div className="row-list-cell row-list-cell-xs row-list-cell-middle">
                            <span className="emphasize">Name</span>
                        </div>
                        <div className="row-list-cell row-list-cell-m">
                            <div className="edit-name-box">
                                <input
                                    type="text"
                                    ref="clusterNameInput"
                                    value={ this.state.newClusterName }
                                    placeholder="Name the cluster"
                                    onChange={ this._captureNewName }
                                    onKeyUp={ this._handleKeyUp }
                                    className="form-control" />
                            </div>
                        </div>
                        <div className="toolstrip">
                            <Button
                                faglyph="check"
                                title="save changes to cluster name"
                                onClick={ this._saveNewName }
                                extraClasses={{
                                    'btn-success': true,
                                    'no-border': true,
                                }} />
                            <Button
                                faglyph="times"
                                title="cancel changes to cluster name"
                                onClick={ this._cancelEditName }
                                extraClasses={{
                                    'btn-danger': true,
                                    'no-border': true,
                                }} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="row-list-item-grouping">
                    <div className="row-list-item">
                        <div className="row-list-cell row-list-cell-xs row-list-cell-middle">
                            <span className="emphasize">Name</span>
                        </div>
                        <div className="row-list-cell row-list-cell-m">
                            <span>{ this.props.cluster.name || 'un-named' }</span>
                        </div>
                        <div className="toolstrip">
                            <Button
                                faglyph="pencil"
                                title="edit the name of your cluster"
                                onClick={ this._editName }
                                extraClasses={{
                                    'btn-default': true,
                                    'no-border': true,
                                }}>
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
    },

    add: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = {
                'productLine': cnst.PRODUCTLINE_FAS,
                'productSubLine': cnst.PRODUCTLINE_SUBTYPE_CDOT
            };

        this.props.select(selector, cnst.UI_SELECT_ADD_CHANGE_SYSTEMS);
    },

    // TODO: CDOT FAS is the only option for now but we should look up the product line from prod info when it is available
    render: function() {
        var modelGroups = _.groupBy(this.props.cluster.hagroups, function(s) { return s.model; }),
            enableAddSystem = !_(this.props.cluster.hagroups)
                .any(function(s) { return s.controllers.length === 1; }),
            addSystemRowClass = React.addons.classSet({
                'row-list-item': true,
                'new': true,
                'selectable': enableAddSystem,
                'disabled': !enableAddSystem,
                'selected': (enableAddSystem && this.props.col3View === cnst.UI_SELECT_ADD_CHANGE_SYSTEMS)
            }),
            addSystemTextClass = React.addons.classSet({
                'row-list-cell': true,
                'row-list-cell-middle': true,
                'text-muted': !enableAddSystem
            }),
            addClick = enableAddSystem ? this.add : undefined;

            var hagroup = _.first(this.props.cluster.hagroups),
                policies = hagroup._policies || {},
                versionPolicy = policies.version || {},
                options = versionPolicy.pin ? { version: hagroup.version } : {};

            var inspector = this.props.map.inspect(this.props.cluster),
                selector = {
                    installation: { _id: inspector.installation._id },
                    cluster: { _id: inspector.cluster._id }
                },
                guard = this.props.map.guard(selector, options);

        return (
            <div>
                <ColumnHeader columnTitle="Cluster Details">
                    <ActionLink
                        isToggle={ false }
                        select={ this._delete }
                        selected={ false }
                        enabled={ true }>
                        Delete
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
                    <div className="hc-cluster">
                        { this._renderNameOrNameInput() }
                        <div className="row-list-item-grouping">
                            <div className={ addSystemRowClass } onClick={ addClick }>
                                <div className="row-list-cell row-list-cell-xs row-list-cell-middle">
                                </div>
                                <div className={addSystemTextClass}>
                                    Add a new system<span className="hide-contracted"> to this cluster</span>
                                </div>
                                <span className="chevron">
                                    <span className="fa fa-fw fa-plus"></span>
                                </span>
                            </div>
                            <Repeat seq={ modelGroups }
                                    prop="modelGroup">
                                <ModelGroup
                                    guard={ guard }
                                    selector={ selector }
                                    fire={ this.props.fire } />
                            </Repeat>
                        </div>
                    </div>
                </ScrollableRegion>
            </div>
        );
    }
});

module.exports = ClusterDetails;
