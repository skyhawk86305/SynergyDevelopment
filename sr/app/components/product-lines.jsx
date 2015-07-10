'use strict';

var _ = require('lodash'),
    React = require('react'),
    cnst = require('./constants'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    Repeat = require('./repeat');

var ProductLines = React.createClass({
    propTypes: {
        installation: React.PropTypes.object.isRequired,
        productInfo: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func.isRequired
    },

    close: function(event) {
        event.stopPropagation();
        event.preventDefault();
        this.props.clearSelection();
    },

    render: function() {
        var props = this.props,
            configs = props.productInfo.getConfigGroups() || [];

        return (
            <div>
                <ColumnHeader columnTitle="Add System">
                    <ActionLink
                        isToggle={ false }
                        select={ this.close }
                        selected={ false }
                        enabled={ true }>
                        Close
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
                    <Repeat seq={ configs }
                            prop="line">
                        <ProductLine
                            installation={ props.installation }
                            select={ props.select } />
                    </Repeat>
                </ScrollableRegion>
            </div>
        );
    }
});

var ProductLine = React.createClass({
    propTypes: {
        line: React.PropTypes.object.isRequired,
        installation: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    render: function() {
        var props = this.props,
            line = props.line,
            title = (typeof line.title === 'string') ? line.title.trim() : '',
            subtitle = (typeof line.subtitle === 'string') ? line.subtitle.trim() : '',
            formattedSubtitle = subtitle ? ' (' + subtitle + ')' : '';

        if (line.enabled) {
            return (
                <EnabledLineEntry
                    image={ line.img }
                    title={ title }
                    subtitle={ formattedSubtitle }
                    subGroups={ line.subGroups || [] }
                    lineId={ line.id }
                    installation={ props.installation }
                    select={ props.select } />
            );
        } else {
            return (
                <DisabledLineEntry
                    image={ line.img }
                    title={ title }
                    subtitle={ formattedSubtitle } />
            );
        }
    }
});

var EnabledLineEntry = React.createClass({
    propTypes: {
        image: React.PropTypes.string.isRequired,
        title: React.PropTypes.string.isRequired,
        subtitle: React.PropTypes.string.isRequired,
        subGroups: React.PropTypes.array.isRequired,
        lineId: React.PropTypes.string.isRequired,
        installation: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    render: function() {
        var props = this.props,
            groups = _.where(props.subGroups, { enabled: true });

        return (
            <div className="product-grouping">
                <div className="product-image hide-contracted-full">
                    <img src={ props.image } className="controller-img" alt={ props.title } />
                </div>
                <div className="product-links">
                    <div className="row-list-item no-border no-color">
                        <div className="row-list-cell">
                            <span className="emphasize" >
                                { props.title }
                                <span className="hide-contracted-full">{ props.subtitle }</span>
                            </span>
                        </div>
                    </div>
                    <Repeat seq={ groups }
                            prop="subLine">
                        <ProductSubLine
                            lineId={ props.lineId }
                            installation={ props.installation }
                            select={ props.select } />
                    </Repeat>
                </div>
            </div>
        );
    }
});

var DisabledLineEntry = React.createClass({
    propTypes: {
        image: React.PropTypes.string.isRequired,
        title: React.PropTypes.string.isRequired,
        subtitle: React.PropTypes.string.isRequired
    },

    // The 'coming soon' title was required during the beta - remove it as soon as possible
    render: function() {
        var props = this.props;

        return (
            <div className="product-grouping" title="coming soon">
                <div className="product-image hide-contracted-full disabled">
                    <img src={ props.image } className="controller-img" alt={ props.title } />
                </div>
                <div className="product-links">
                    <div className="row-list-item no-border no-color">
                        <div className="row-list-cell">
                            <span className="text-muted" >
                                { props.title }
                                <span className="hide-contracted-full">{ props.subtitle }</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

var ProductSubLine = React.createClass({
    propTypes: {
        lineId: React.PropTypes.string.isRequired,
        subLine: React.PropTypes.object.isRequired,
        installation: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    render: function() {
        var props = this.props,
            subLine = props.subLine,
            title = (typeof subLine.title === 'string') ? subLine.title.trim() : '';

        return (
            <EnabledSubLineEntry
                title={ title }
                lineId={ props.lineId }
                subLine={ subLine }
                installation={ props.installation }
                select={ props.select } />
        );
    }
});

var EnabledSubLineEntry = React.createClass({
    propTypes: {
        title: React.PropTypes.string.isRequired,
        lineId: React.PropTypes.string.isRequired,
        subLine: React.PropTypes.object.isRequired,
        installation: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    add: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = {
                installation: { _id: this.props.installation._id },
                'productLine': this.props.lineId,
                'productSubLine': this.props.subLine.id
            };

        this.props.select(selector, cnst.UI_SELECT_ADD_CHANGE_SYSTEMS);
    },

    render: function() {
        return (
            <div className="row-list-item no-border no-color selectable" onClick={ this.add }>
                <div className="row-list-cell row-list-cell-m">
                    <span>{ this.props.title }</span>
                </div>
                <div className="row-list-cell row-list-cell-m row-list-cell-img hide-contracted-full">
                </div>
                <span className="chevron">
                    <span className="fa fa-fw fa-chevron-right"></span>
                </span>
            </div>
        );
    }
});

module.exports = ProductLines;
