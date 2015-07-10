'use strict';

var React = require('react'),
    FAGlyph = require('./faglyph');

var ShelfDriveGroupSummary = React.createClass({
    propTypes: {
        driveGroup: React.PropTypes.object.isRequired,
        fpSupport: React.PropTypes.bool.isRequired,
        shelfCount: React.PropTypes.number.isRequired
    },

    _shortenedCapacityString: function(size) {
        return size > 999 ? (size/1000) + 'TB' : size + 'GB';
    },

    _iconForDriveType: function (combo) {
        switch (combo.type) {
            case 'SATA': return 'hdd-o';
            case 'FC': return 'hdd-o';
            case 'SAS': return 'hdd-o';
            case 'SSD': return 'hdd-o';
            case 'MSATA': return 'hdd-o';
            case 'NL-SAS': return 'hdd-o';
            default: return 'hdd-o';
        }
    },

    _classNameForDriveType: function (combo) {
        switch (combo.rpm) {
            case 10: return 'text-blue';
            case 15: return 'text-green';
            case 50: return 'text-purple';
            default: return '';
        }
    },

    render: function() {
        var shelfCount = this.props.shelfCount,
            d = this.props.driveGroup,
            encrypted = d.encrypted ? 'key' : '',
            supportsFlashPool = this.props.fpSupport ? 'flash' : '';

        console.log('DEBUG: shelfDrivesGroup', d);
        return (
            <div className="drive-summary-block">
                <span className="drive-count">{ d.quantity * shelfCount }</span>
                <span className={ this._classNameForDriveType(d) }><FAGlyph name={ this._iconForDriveType(d) }/></span>
                <span className="drive-label-size">{ this._shortenedCapacityString(d.rawgb) }
                    <span className="hide-contracted drive-type">{ d.type }</span>
                </span>
                <span className="hide-contracted">
                    <FAGlyph name={ supportsFlashPool } hideIfUnnamed="true" title="Supports Flash Pool"/>
                    <FAGlyph name={ encrypted } hideIfUnnamed="true" title="Encrypted"/>
                </span>
            </div>
        );
    }
});

module.exports = ShelfDriveGroupSummary;
