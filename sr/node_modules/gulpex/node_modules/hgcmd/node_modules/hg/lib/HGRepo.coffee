fs = require "fs"
os = require "os"
fspath = require "path"
{spawn} = require "child_process"

uuid = require "uuid"
_ = require "lodash"

HGCommandServer = require "./HGCommandServer"

class HGRepo
	###
	Create a new repo in a random temp directory.  Useful for no-repo commands like init and clone
	that require a repo
	###
	@MakeTempRepo: (done) ->
		tmpDir = fspath.join(os.tmpDir(), uuid.v1())

		fs.mkdir tmpDir, (err) ->
			done err if err

			initProcess = spawn "hg", ["init"], 
				cwd: tmpDir

			initProcess.on "exit", (code) ->
				unless code == 0
					err = new Error "Non zero status code returned when creating temporary repo: " + code
					return done err

				done null, new HGRepo(tmpDir)

	###
	Create a new HGRepo with a rootpath defined by the passed in `@path` (defaults to `process.cwd()`)
	###
	constructor: (@path = process.cwd()) ->

	###
	Initialize a new repository at the provided path.  Due to limitations of the cmdserver, 
	this must be run from an existing repo.
	###
	init: (initPath, done) ->
		serverCmd = (server) -> 
			server.runcommand "init", initPath

		@_runCommandGetOutput @path, serverCmd, done

	###
	Add files to a repository.
	###
	add: (paths, done) ->
		# Curry the optional paths parameter
		if _.isFunction paths
			done = paths
			paths = []

		serverCmd = (server) ->
			server.runcommand.apply server, ["add"].concat(paths)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Commit changes to a repository
	###
	commit: (opts, done) ->
		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["commit"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Clone a repository.  Due to limitations of the cmdserver, this must be run from an 
	existing location.
	###
	clone: (from, to, opts, done) ->
		# Curry the arguments if no opts passed
		if _.isFunction opts
			done = opts 
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["clone", from, to].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Get a summary of the current repository path.
	###
	summary: (opts, done) ->
		# Curry the arguments if no opts passed
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["summary"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Get a log of commits for this repository.

	`opts` is optional and can be either an object or array of arguments.
	###
	log: (opts, done) ->
		# Curry the arguments if no opts passed
		if _.isFunction opts
			done = opts 
			opts = []

		# Convert an object to an array of opts
		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["log"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Pull changes from another repository.
	###
	pull: (from, opts, done) ->
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["pull", from].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Update to the latest changes in a repository.
	###
	update: (opts, done) ->
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["update"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Push changes to another repository
	###
	push: (to, opts, done) ->
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["push", to].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Merge changes from another repository
	###
	merge: (opts, done) ->
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["merge"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Resolve conflicts in a repository.
	###	
	resolve: (opts, done) ->
		if _.isFunction opts
			done = opts
			opts = []

		opts = @_parseOptions opts

		serverCmd = (server) ->
			server.runcommand.apply server, ["resolve"].concat(opts)

		@_runCommandGetOutput @path, serverCmd, done

	###
	Parse an object into an array of command line arguments
	###
	_parseOptions: (opts) ->
		# Convert an object to an array of opts
		if _.isObject opts
			newOpts = []
			currKey = ""
			pushVal = (v) ->
				newOpts.push currKey
				newOpts.push v if v

			for own key, val of opts
				currKey = key
				if _.isArray val
					# Push an array of values
					_.each val, pushVal
				else
					# Push a single value
					pushVal val

			opts = newOpts

		opts

	###
	Start a command server and return it for use
	###
	_startServer: (path, done) ->
		server = new HGCommandServer()
		server.start path, (err) ->
			return done err if err

			done null, server

	###
	Convenience wrapper for starting a command server and executing a command
	###
	_runCommandGetOutput: (path, serverAction, done) ->
		@_startServer path, (err, server) ->
			return done err if err

			cleanUp = ->
				server.removeAllListeners "output"
				server.removeAllListeners "error"

			allOutput = []

			server.on "output", (body, lines) ->
				allOutput = allOutput.concat lines

			server.on "error", (err, line) ->
				# Skip warnings, store as output
				# TODO: Allow this to be configured
				if line?.body?.slice(0, 7) == "warning"
					return allOutput.push line

				cleanUp()
				done err

			server.once "result", (body, lines) ->
				allOutput = allOutput.concat lines if lines.length > 0

				server.stop()

			server.once "exit", (code) ->
				cleanUp()

				done null, allOutput, server

			serverAction server

module.exports = HGRepo

				


		


