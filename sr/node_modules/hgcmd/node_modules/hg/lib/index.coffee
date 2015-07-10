
HGCommandServer = require "./HGCommandServer"
HGRepo = require "./HGRepo"

###
The public facing API of the node-hg module exposes convenience methods for various common Mercurial tasks.
###
class HGAPI
	constructor: ->

	init: (initPath, opts, done) ->
		HGRepo.MakeTempRepo (err, repo) ->
			return done err if err

			repo.init initPath, done

	clone: (from, to, opts, done) ->
		HGRepo.MakeTempRepo (err, repo) ->
			return done err if err

			repo.clone from, to, opts, done

	add: (path, opts, done) ->
		repo = new HGRepo(path)

		repo.add opts, done

	commit: (path, opts, done) ->
		repo = new HGRepo(path)

		repo.commit opts, done

	summary: (path, opts, done) ->
		repo = new HGRepo(path)

		repo.summary opts, done

	log: (path, opts, done) ->
		repo = new HGRepo(path)

		repo.log opts, done

api = new HGAPI()

api.HGCommandServer = HGCommandServer
api.HGRepo = HGRepo

module.exports = api