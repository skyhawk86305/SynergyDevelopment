'use strict';

var React = require('react'),
    moment = require('moment'),
    DriveSummary = require('./drive-summary'),
    Button = require('./button'),
    Link = require('react-router').Link,
    SeparatedList = require('./separated-list'),
    FAGlyph = require('./faglyph'),
    Glyph = require('./glyph'),
    _ = require('lodash');

var PH_FETCH = 'Loading\u2026',
    PH_NORMAL = 'Search by project name, project ID, part number, configuration, drive capacity, drive speed, drive type, version, or mode',
    PORTFOLIO_DEFAULT_NAME = 'Unnamed Project';

var ProjectAutoDesc = React.createClass({
    propTypes: {
        project: React.PropTypes.object.isRequired
    },

    _toModelEntries: function (modelToCount) {
        if (!modelToCount) {
            return null;
        } else {
            var entries = [];
            for (var key in modelToCount) {
                entries.push({
                    model: key,
                    count: modelToCount[key]
                });
            }
            return entries;
        }
    },

    _renderModelEntry: function (entry) {
        return (
            <div className="count-of">
                <span className="count-num">{ entry.count }x&nbsp;</span>
                <span className="count-what">{ entry.model /* attach tag filtering here */ }</span>
            </div>
        );
    },

    _renderModels: function (headText, modelToCount, className) {
        var head = (
            <span className="pad-header">{ headText }</span>
        );
        return (
            <SeparatedList
                className={ className }
                seq={ this._toModelEntries(modelToCount) }
                head={ head }
                render={ this._renderModelEntry } />
        );
    },

    _renderGood: function (desc) {
        return (
            <div className="project-auto-description">
                <DriveSummary drives={ desc.drives } className="pull-right" />
                { this._renderModels('Nodes: ', desc.nodes, "pad-nodes") }
                { this._renderModels('Shelves: ', desc.shelves, "pad-shelves") }
            </div>
        );
    },

    _renderBad: function() {
        return (
            <div className="project-auto-description hide">
                { /* no auto desc available; malformed clip? */ }
            </div>
        );
    },

    render: function() {
        var desc = this.props.project._x_autodesc;

        if (desc && desc.modes && desc.modes.length) {
            return this._renderGood(desc);
        } else {
            return this._renderBad();
        }
    },
});

var AUTOTAG_EXCLUSIONS = [
        /^X/,         // drive, card model numbers
        /^[0-9.]+K/,  // drive speeds
    ],
    AUTOTAG_EXCLUDE_DESC_KEYS = [
        'nodes',
        'shelves',
    ];

var ProjectEntry = React.createClass({
    propTypes: {
        project: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        inEditMode: React.PropTypes.bool.isRequired
    },

    getInitialState: function() {
        return {
            editingName: false,
            newName: null,
       };
    },

    componentDidMount: function() {
        if(this.props.inEditMode){
            this.setState({
                editingName: true,
                newName: this.props.project._x_project_name || ''
            });

            if (this.refs.projectNameInput) {
                this.refs.projectNameInput.getDOMNode().select();
            }
        }
    },

    _filterAutoTag: function(tag) {
        for (var idx in AUTOTAG_EXCLUSIONS) {
            if (tag.match(AUTOTAG_EXCLUSIONS[idx])) {
                return false;
            }
        }

        if (this.props.project._x_autodesc) {
            for (var idx2 in AUTOTAG_EXCLUDE_DESC_KEYS) {
                var key = AUTOTAG_EXCLUDE_DESC_KEYS[idx2],
                    ob = this.props.project._x_autodesc[key];
                if (ob) {
                    if (_.has(ob, tag)) {
                        return false;
                    }
                }
            }
        }

        return true;
    },

    _gatherTags: function(project) {
        var autoTags = _.filter(project._x_autotags || [], this._filterAutoTag),
            tags = autoTags.concat(project._x_usertags || []);

        if (tags.length > 0) {
            tags.sort(); // mutate-in-place
            return tags;
        } else {
            return null; // suppress list
        }
    },

    _renderTag: function(tag) {
        return (
            <span className="pad-tag">{ tag }</span>
        );
    },

    _editName: function() {
        this.setState({
            editingName: true,
            newName: this.props.project._x_project_name || ''
        }, function() {
            // Move focus to the input field after we render it (and select text)
            if (this.refs.projectNameInput) {
                this.refs.projectNameInput.getDOMNode().select();
            }
        });
    },

    _archiveProject: function() {
        this.setState({
            archivingProject: true
        });
    },

    _confirmArchiveProject: function() {
        this.setState({
            archivingProject: false
        });
        this.props.fire('PORTFOLIO_ARCHIVE',
            this.props.project._uuid,
            this.props.project._version);
    },

    _cancelArchiveProject: function() {
        this.setState({
            archivingProject: false
        });
    },

    _captureNewName: function(event) {
        this.setState({
            newName: event.target.value || ''
        });
    },

    _saveNewName: function() {
        this.setState({
            editingName: false,
            newName: null,
        });
        this.props.fire('PORTFOLIO_SET_NAME',
                        this.props.project._uuid,
                        this.props.project._version,
                        this.state.newName);
        this.props.fire('PROJECT_UNLOAD', this.props.project._uuid);
    },

    _cancelEditName: function() {
        this.setState({
            editingName: false,
            newName: this.props.project._x_project_name || ''
        });
    },

    _renderStateGlyph: function() {
        if (this.props.project._X_STATE.adjusting) {
            return (
                <Button
                    faglyph="refresh"
                    title="saving"
                    spin={ true }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                    }} />
            );
        } else if (this.props.project._X_STATE.err) {
            return (
                <Button
                    title="an error occurred amending your project"
                    glyph="warning-sign"
                    spin={ false }
                    onClick={ this._editName }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                    }} />
            );
        } else {
            return (
                <ul className="edit-strip">
                    <li>
                        <FAGlyph
                            name="chevron-down"
                            title="project options" />
                        <ul className="edit-strip-items">
                            <li>
                                <Button
                                    faglyph="pencil"
                                    title="edit the name of your project"
                                    onClick={ this._editName }
                                    alignRight={ true }
                                    extraClasses={{
                                        'btn-default': true,
                                        'no-border': true,
                                    }}>
                                    Edit project title
                                </Button>
                            </li>
                            <li>
                                <Button
                                    faglyph="trash"
                                    title="delete this project"
                                    onClick={ this._archiveProject }
                                    alignRight={ true }
                                    extraClasses={{
                                        'btn-default': true,
                                        'no-border': true,
                                    }}>
                                    Delete project
                                </Button>
                            </li>
                        </ul>
                    </li>
                </ul>
            );
        }
    },

    _handleKeyUp: function(event) {
        if (event.key === 'Enter') {
            this._saveNewName();
        } else if (event.key === 'Escape') {
            this._cancelEditName();
        }
    },

    _renderArchiveProjectOverlay: function() {
        if (this.state.archivingProject) {
            return (
                <div className="archive-project-overlay">
                    <div className="inner">
                        Delete this project?
                        <div className="archive-project-buttons">
                            <Button
                                faglyph="check"
                                title="confirm deleting of project"
                                onClick={ this._confirmArchiveProject }
                                extraClasses={{
                                    'btn-success': true,
                                    'no-border': true,
                                }} />
                            <Button
                                faglyph="times"
                                title="cancel deleting of project"
                                onClick={ this._cancelArchiveProject }
                                extraClasses={{
                                    'btn-danger': true,
                                    'no-border': true,
                                }} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    },

    _renderNameOrNameInput: function() {
        // Truncate long names to prevent pushing other UI elements off the page
        var project = this.props.project,
            fullName = this.state.newName || project._x_project_name || PORTFOLIO_DEFAULT_NAME,
            displayName = (fullName.length > 80) ? fullName.slice(0,80) + '\u2026' : fullName;

        if (this.state.editingName) {
            return (
                <div className="project-title edit-mode">
                    <div className="edit-title">
                        <input
                            type="text"
                            ref="projectNameInput"
                            value={ this.state.newName }
                            placeholder="Name the project"
                            onChange={ this._captureNewName }
                            onKeyUp={ this._handleKeyUp }
                            className="form-control" />
                        <span className="toolstrip">
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
                        </span>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="project-title">
                    <span>
                        <span className="project-title-name">
                            <Link
                                title={ project._x_project_name || PORTFOLIO_DEFAULT_NAME }
                                to="project"
                                params={{ uuid: project._uuid }}
                                className="pad-tlink" >
                                { displayName }
                            </Link>
                        </span>
                        <span className="toolstrip pull-right">
                            { this._renderStateGlyph() }
                        </span>
                    </span>
                    <span className="project-date">
                        Created:&nbsp;
                        { moment.unix(project._x_original_timestamp/1000).calendar() }
                        &nbsp;|&nbsp;Last Modified:&nbsp;
                        { moment.unix(project._timestamp/1000).calendar() }
                    </span>
                </div>
            );
        }
    },

    render: function() {
        var project = this.props.project;
        // console.log("Timestamp: " + project._timestamp);

        // want to make the whole project div clickable?
        // consider an onClick handler calling Router.transitionTo
        return (
            <div key={ project._uuid } className="project-entry">
                { /* insert user description here */ }
                { this._renderArchiveProjectOverlay() }
                { this._renderNameOrNameInput() }
                <div className="project-info">
                    <ProjectAutoDesc project={ project } />
                </div>
            </div>
        );
    },
});

var ProjectList = React.createClass({
    propTypes: {
        projects: React.PropTypes.array.isRequired,
        fire: React.PropTypes.func.isRequired,
        projectIdsInEditMode: React.PropTypes.object.isRequired
    },

    _addButtonClick: function() {
        this.props.fire('PORTFOLIO_ADD_NEW');
    },

    render: function() {
        var items = [];

        _.forEach(this.props.projects, function renderProject(project) {
            if (!project._x_archived) {
                items.push(
                    <ProjectEntry
                        key={ project._uuid }
                        project={ project }
                        fire={ this.props.fire }
                        inEditMode={ _.has(this.props.projectIdsInEditMode, project._uuid) }/>
                );
            }
        }, this);

        return (
            <div className="project-list">
                <div className="row-list-item selectable new" onClick={ this._addButtonClick }>
                    <div className="row-list-cell">
                        Add a new project
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-plus"></span>
                    </span>
                </div>
                { items }
            </div>
        );
    },
});

var ProjectListPanel = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return this.props.stores.portfolio.getState();
    },

    componentWillMount: function() {
        if (!this.state.fetching && !this.state.fetched) {
            this.props.fire('PORTFOLIO_FETCH');
        }
    },

    componentDidMount: function() {
        this.props.stores.portfolio.watch(this._onChange);

        // Start focus in the search field
        var projectSearchDOM = this.refs.projectSearch.getDOMNode();

        if (projectSearchDOM) {
            projectSearchDOM.focus();
        }
    },

    componentWillUnmount: function() {
        this.props.stores.portfolio.unwatch(this._onChange);
    },

    _searchChange: function (event) {
        this.props.fire('PORTFOLIO_SEARCH', event.target.value);
    },

    _searchClear: function () {
        this.props.fire('PORTFOLIO_SEARCH', '');
    },

    _handleKeyUp: function(event) {
        if (event.key === 'Escape') {
            this._searchClear();
        }
    },

    _content: function() {
        if (this.state.fetching) {
            return (
                <div className="placeholder-pane">
                    <Glyph
                        name="refresh"
                        spin={ true }
                        extraClasses={{ pad1em: true }} />
                    <span className="placeholder-loading-text">Loading your projects&hellip;</span>
                </div>
            );
        }

        return (
            <ProjectList projects={ this.state.projects } fire={ this.props.fire } projectIdsInEditMode={ this.state.projectIdsInEditMode }/>
        );
    },

    render: function() {
        var searchHolder = this.state.fetching ? PH_FETCH : PH_NORMAL;

        return (
            <div className="col-sm-8 project-pane">
                <div className="project-search">
                  <input
                      type="text"
                      ref="projectSearch"
                      value={ this.state.search }
                      placeholder={ searchHolder }
                      onChange={ this._searchChange }
                      onKeyUp={ this._handleKeyUp }
                      className="form-control" />
                  <Button
                        faglyph={ this.state.search.length ? 'times' : 'search' }
                        title="clear search text"
                        onClick={ this._searchClear }
                        extraClasses={{
                            'disabled': this.state.search.length === 0,
                            'no-border': true,
                        }}>
                  </Button>
                </div>
                { this._content() }
            </div>
        );
    },

    /**
    * Event handler for 'change' events coming from the TodoStore
    */
    _onChange: function() {
        this.setState(this.props.stores.portfolio.getState());
    }
});

module.exports = ProjectListPanel;
