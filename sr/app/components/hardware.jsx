'use strict';

var _ = require('lodash'),
    React = require('react'),
    Column = require('./layout/column'),
    AggregateEditor = require('./aggregate-editor'),
    ClusterDetails = require('./cluster-details'),
    InstallationList = require('./installation-list'),
    Placeholder = require('./placeholder'),
    ProductConfigs = require('./product-configs'),
    ProductLines = require('./product-lines'),
    Reports = require('./reports'),
    ShelfList = require('./shelf-list'),
    SystemOverview = require('./system-overview'),
    VersionList = require('./version-list'),
    usual = require('../usual-props'),
    cnst = require('./constants'),
    _ = require('lodash');

var Hardware = React.createClass({
    propTypes: _.defaults({
        projectId: React.PropTypes.string.isRequired,
        selected: React.PropTypes.object.isRequired,
        productInfo: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    componentDidMount: function() {
        window.addEventListener('keyup', this.handleKeyUp);
    },

    componentWillUnmount: function(){
        window.removeEventListener('keyup', this.handleKeyUp);
    },

    handleKeyUp: function(event) {
        if (event.which === 27) { // Escape
            this.closeCol3(event);
        }
    },

    closeCol3: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var currentSelector = this.props.selected.selector,
            selector = _.pick(currentSelector, ['installation', 'cluster', 'hagroup']),
            col2View = this.props.selected.col2View;

        this.props.fire('HARDWARE_SELECT', this.props.projectId, selector, col2View, null);
    },

    resolveCol2Selection: function() {
        var currentSelector = this.props.selected.selector;
        var selector = _.pick(currentSelector, ['installation', 'cluster', 'hagroup']);
        var selection = this.props.map.resolveSelection(selector);

        return selection.length ? selection : null;
    },

    resolveCol3Selection: function() {
        var selection = this.props.map.resolveSelection(this.props.selected.selector);

        return selection.length ? selection : null;
    },

    render: function() {
        var col2Items = this.resolveCol2Selection(),
            col3Items = this.resolveCol3Selection(),
            isShowingCol3 = !!(col3Items && this.props.selected.col3View);

        var col3View = _.isEmpty(col3Items) ? null : this.props.selected.col3View;

        return (
            <div id="hardware-view">
                <Column
                    expanded={ true }
                    lightTheme={ true }
                    expandedWidth="2"
                    collapsedWidth="2"
                    zIndex={ 3 }>
                    <InstallationList
                        installations={ this.props.map.installations }
                        selected={ this.props.selected }
                        projectId={ this.props.projectId }
                        { ... usual(this.props) } />
                </Column>
                <Column
                    expanded={ !isShowingCol3 }
                    lightTheme={ false }
                    expandedWidth="6"
                    collapsedWidth="3"
                    onClick={ this.closeCol3 }
                    zIndex={ 2 }>
                    <DetailsLevel2
                        items={ col2Items }
                        selected={ this.props.selected }
                        projectId={ this.props.projectId }
                        userPreferences={ this.props.userPreferences }
                        platformConfig={ this.props.productInfo }
                        col3View={ col3View }
                        { ... usual(this.props) } />
                </Column>
                <Column
                    expanded={ isShowingCol3 }
                    lightTheme={ !isShowingCol3 }
                    expandedWidth="7"
                    collapsedWidth="4"
                    zIndex={ 3 }>
                    <DetailsLevel3
                        items={ col3Items }
                        installations={ this.props.map.installations }
                        selectedItem={ col2Items }
                        selected={ this.props.selected }
                        projectId={ this.props.projectId }
                        userPreferences = { this.props.userPreferences }
                        platformConfig={ this.props.productInfo }
                        closeSelf={ this.closeCol3 }
                        view={ col3View }
                        { ... usual(this.props) } />
                </Column>
            </div>
        );
    }
});

var DetailsLevel2 = React.createClass({
    propTypes: _.defaults({
        items: React.PropTypes.array.isRequired,
        selected: React.PropTypes.object.isRequired,
        projectId: React.PropTypes.string.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        platformConfig: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        col3View: React.PropTypes.string,
    }, usual),

    clearSelection: function() {
        this.props.fire('HARDWARE_CLEAR');
    },

    selectHardware: function(selector, col3View) {
        var base = _.pick(this.props.selected.selector, ['installation', 'cluster', 'hagroup']),
            newSelector = _.merge(_.clone(base), selector),
            col2View = this.props.selected.col2View;

        var isSameCol3 = col3View && (col3View === this.props.selected.col3View),
            isSameHardware = _.isEqual(this.props.selected.selector, newSelector);

        col3View = (isSameCol3 && isSameHardware) ? null : col3View;
        newSelector = col3View ? newSelector : base;

        this.props.fire('HARDWARE_SELECT', this.props.projectId, newSelector, col2View, col3View);
    },

    selectCol2View: function(col2View) {
        var selector = this.props.selected.selector,
            col3View = this.props.selected.col3View;

        this.props.fire('HARDWARE_SELECT', this.props.projectId, selector, col2View, col3View);
    },

    render: function() {
        var items = this.props.items,
            view = _.isEmpty(items) ? null : this.props.selected.col2View;

        console.log('DetailsLevel2 items:', items, 'view:', view);

        // Overly complicated until we take the time to refactor out into seperate components
        if ((view === 'SystemOverview') || (view === 'Aggregates') || (view === 'Policies')) {
            return (
                <SystemOverview
                    systems={ items }
                    select={ this.selectHardware }
                    clearSelection={ this.clearSelection }
                    selectDetails={ this.props.selected.selector }
                    userPreferences={ this.props.userPreferences }
                    col3View={ this.props.col3View }
                    col2Tab={ view }
                    selectCol2View={ this.selectCol2View }
                    { ... usual(this.props) } />
            );
        } else if (view === 'ClusterGrouping') {
            return (
                <ClusterDetails
                    cluster={ items[0] }
                    select={ this.selectHardware }
                    clearSelection={ this.clearSelection }
                    col3View={ this.props.col3View }
                    { ... usual(this.props) } />
            );
        } else if (view === 'ProductLines') {
            return (
                <ProductLines
                    installation={ items[0] }
                    productInfo={ this.props.platformConfig }
                    select={ this.selectHardware }
                    clearSelection={ this.clearSelection }
                    { ... usual(this.props) } />
            );
        } else {
            return (
                <Placeholder />
            );
        }
    }
});

var DetailsLevel3 = React.createClass({
    propTypes: _.defaults({
        items: React.PropTypes.array.isRequired,
        installations: React.PropTypes.array.isRequired,
        selectedItem: React.PropTypes.array.isRequired,
        selected: React.PropTypes.object.isRequired,
        projectId: React.PropTypes.string.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        platformConfig: React.PropTypes.object.isRequired,
        closeSelf: React.PropTypes.func.isRequired,
        view: React.PropTypes.string,
    }, usual),

    render: function () {
        var items = this.props.items,
            view = this.props.view;

        console.log('DetailsLevel3 items:', items, 'view:', view);

        if (view === cnst.UI_SELECT_ADD_CHANGE_SHELF_DRIVE_LIST) {
            return(
                <ShelfList
                    selection={ items }
                    selectedItem={ this.props.selectedItem }
                    selectDetails={ this.props.selected.selector }
                    onClose={ this.props.closeSelf }
                    { ... usual(this.props) } />
            );
        } else if (view === cnst.UI_SELECT_ADD_CHANGE_SYSTEMS) {
            return(
                <ProductConfigs
                    selection={ items[0] }
                    selectDetails={ this.props.selected.selector }
                    productInfo={ this.props.platformConfig }
                    projectId={ this.props.projectId }
                    onClose={ this.props.closeSelf }
                    { ... usual(this.props) } />
            );
        } else if (view === cnst.UI_SELECT_ADD_CHANGE_AGGREGATE) {
            return (
                <AggregateEditor
                    selection={ items }
                    platformConfig={ this.props.platformConfig }
                    selectedItem={ this.props.selectedItem }
                    selected={ this.props.selected }
                    onClose={ this.props.closeSelf }
                    userPreferences = { this.props.userPreferences }
                    installations = { this.props.installations }
                    { ... usual(this.props) } />
            );
        } else if (view === 'VersionList') {
            return (
                <VersionList
                    hagroups={ items }
                    hardwareSelector={ this.props.selected.selector }
                    handleClose={ this.props.closeSelf }
                    { ... usual(this.props) } />
            );
        } else {
            return (
                <Reports
                    selectedItem={ this.props.selectedItem }
                    installations={ this.props.installations }
                    userPreferences={ this.props.userPreferences }
                    projectId={ this.props.projectId }
                    { ... usual(this.props) } />
            );
        }
    },
});

module.exports = Hardware;
