'use strict';

function Annotation(actionName, friendlyDescription, targetId, actionArgs) {
    this.action = actionName;
    this.description = friendlyDescription;
    this.target = targetId;
    this.args = actionArgs || [];

    return this;
}

module.exports = Annotation;
