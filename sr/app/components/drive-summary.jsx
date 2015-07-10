'use strict';

var React = require('react');

var DEFAULT_TITLE = 'drive counts and total raw capacity by type';

var DriveEntry = React.createClass({
    render: function () {
        var p = this.props,
            glyphClass = 'fa fa-fw fa-' + p.glyph,
            tlist,
            cap,
            rounded,
            mainClass,
            dclassCSS = p.dclassCSS;

        if (p.rawtb) {
            cap = Math.round(p.rawtb);
            rounded = Math.abs(p.rawtb - cap) > 0.01 && cap < 1000;
            cap = rounded ? '~' + cap : cap;
        } else {
            cap = '';
            rounded = '';
        }

        if (p.count) {
            tlist = [ p.count, p.dclass, 'drives;', p.rawtb, 'TB total' ];
        } else {
            tlist = [ 'No', p.dclass, 'drives' ];
        }

        function mir(className) {
            // mute if required
            return p.count ? className : className + ' text-mute';
        }

        function iir(className) {
            // invisible if required
            var invis = className + ' hide';
            if (p.hideCapacity || p.count === 0) {
                return invis;
            } else {
                return className;
            }
        }

        // TODO: round thousands; output in bold

        if (p.hideIfZero && !p.count) {
            mainClass = 'drive-summary-block no-overflow hide';
        } else {
            mainClass = 'drive-summary-block no-overflow';
        }
        mainClass = mainClass + ' ' + dclassCSS;

        return (
            <div className={ mainClass } title={ tlist.join(' ') }>
                <span className={ mir('drive-count') }>{p.count || 0}</span>
                <span className={ glyphClass }></span>
                <span className={ mir('drive-label') }>{ p.dclass }</span>
                <span className={ iir('drive-rawtb') }>{ cap }</span>
                <span className={ iir('text-mute') }>TB</span>
            </div>
        );
    },
});

var DriveSummary = React.createClass({
    propTypes: {
        hideCapacity: React.PropTypes.bool
    },

    render: function() {
        var count = this.props.drives.count,
        rawtb = this.props.drives.rawtb;
//console.log('DriveSummary',count,rawtb);
        return (
            <div className={ this.props.className }
                 title= { this.props.title || DEFAULT_TITLE }>
                <DriveEntry hideIfZero={ this.props.hideIfZero }
                            hideCapacity={ this.props.hideCapacity }
                            dclass="Solid-State Drive"
                            glyph="hdd-o"
                            dclassCSS="drive-ssd"
                            count={ count.SSD }
                            rawtb={ rawtb.SSD } />
                <DriveEntry hideIfZero={ this.props.hideIfZero }
                            hideCapacity={ this.props.hideCapacity }
                            dclass="Performance HDD"
                            glyph="hdd-o"
                            dclassCSS="drive-performance"
                            count={ count.performance }
                            rawtb={ rawtb.performance } />
                <DriveEntry hideIfZero={ this.props.hideIfZero }
                            hideCapacity={ this.props.hideCapacity }
                            dclass="Capacity HDD"
                            glyph="hdd-o"
                            dclassCSS="drive-capacity"
                            count={ count.capacity }
                            rawtb={ rawtb.capacity } />
            </div>
        );
    },
});

module.exports = DriveSummary;
