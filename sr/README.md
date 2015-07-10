# Synergy Reboot

## Branch Management

We're using [hgflow], which implements the Generalised Driessen's Branching
Model documented for Git in [A Successful Git Branching Model][gitflow].

[gitflow]: http://nvie.com/posts/a-successful-git-branching-model/
[hgflow]: https://bitbucket.org/yujiewu/hgflow/wiki/Home

Our production code is in the `master` branch. We only update it by merging.

Our main work-in-progress branch is the `develop` branch. We can commit small
changes there directly, or work on them separately in feature branches.

For more details, read the [git flow][gitflow] and [hgflow] pages.

To get started:

* Install [Atlassian SourceTree][ast1], which has hgflow built in; or
* [Obtain hgflow.py][hp1] and add `flow = /path/to/hgflow.py` under
  `[extensions]` in your `.hgrc` or `Mercurial.ini`; or
* Both of the above.

[ast1]: http://www.sourcetreeapp.com
[hp1]: https://bitbucket.org/yujiewu/hgflow/downloads/

## Development

This is a Node project. The following are as handy as always:

* `npm install`
* `npm test`

We use [gulp] for additional automation:

* `gulp` to build everything into `dist/`
* `gulp clean` to clean everything out
* `gulp watch` to watch the filesystem and react to your changes
* `gulp serve` to do so while serving the results and the API
* `gulp open` to serve and open [https://127.0.0.1:8443]

[https://127.0.0.1:8443]: https://sr.local.techteam.netapp.com:8443

To enforce code style, install an [editorconfig] plugin for your text editor,
e.g. [editorconfig-sublime], and check your [jshint] results regularly.

[editorconfig]: http://editorconfig.org
[editorconfig-sublime]: https://github.com/sindresorhus/editorconfig-sublime
[jshint]: http://www.jshint.com
[gulp]: https://github.com/gulpjs/gulp
[format]: http://momentjs.com/docs/#/displaying/format/

## Deployment

The `dist` directory is NOT in the `.npmignore` file, so we can prepare for
deployment like this:

* `hg up -C` to update cleanly
* `npm install` to pull all the development dependencies
* `gulp` to build everything we want in `dist`
* `npm pack` to pack the `sr-X.Y.Z.tgz` file

At the destination, we can then:

* `npm install --production http://example.com/sr-X.Y.Z.tgz`
* launch a Hapi server using the `sr` plugin
