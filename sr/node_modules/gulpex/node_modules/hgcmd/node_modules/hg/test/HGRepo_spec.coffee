fs = require "fs"
path = require "path"

should = require "should"
uuid = require "uuid"

HGRepo = require "../lib/HGRepo"

describe "HGRepo", ->

	it "can create a temporary repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->
			throw err if err

			should.exist repo
			
			fs.exists repo.path, (exists) ->
				exists.should.equal true

				done()

	it "can init a new repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->
			throw err if err

			newRepoPath = path.resolve path.join(repo.path, "..", uuid.v1())

			repo.init newRepoPath, (err, output) ->
				throw err if err

				should.exist output

				otherRepo = new HGRepo(newRepoPath)

				otherRepo.summary (err, output) ->
					throw err if err

					should.exist output

					done()

	it "can add files to a repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			fs.writeFile path.join(repo.path, "one.txt"), "Text Content 1", (err) ->
				throw err if err

				fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
					throw err if err

					repo.add ['.'], (err, output) ->
						throw err if err

						output.length.should.equal 3

						done()

	it "can commit changes to a repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			fs.writeFile path.join(repo.path, "one.txt"), "Text Content 1", (err) ->
				throw err if err

				fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
					throw err if err

					repo.add ['.'], (err, output) ->
						throw err if err

						output.length.should.equal 3

						commitOpts = 
							"-m": "A Test Commit"

						repo.commit commitOpts, (err, output) ->
							throw err if err

							should.exist output
							output.length.should.equal 1
							output[0].channel.should.equal "r"

							repo.log (err, output) ->
								throw err if err

								output.length.should.be.above 0
								output[0].body.indexOf("A Test Commit").should.be.above -1

								done()

	it "can clone a repo from a local path", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			fs.writeFile path.join(repo.path, "one.txt"), "Text Content 1", (err) ->
				throw err if err

				fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
					throw err if err

					repo.add ['.'], (err, output) ->
						throw err if err

						output.length.should.equal 3

						commitOpts = 
							"-m": "A Test Commit"

						repo.commit commitOpts, (err, output) ->
							throw err if err

							should.exist output

							otherPath = path.resolve(path.join(repo.path, "..", uuid.v1()))
							
							repo.clone repo.path, otherPath, (err, output) ->
								throw err if err

								should.exist output

								otherRepo = new HGRepo(otherPath)

								otherRepo.summary (err, output) ->
									throw err if err

									should.exist output

									done()

	it "can clone a repo from a remote path", (done) ->
		# Set a 5 second timeout for this test (relies on bitbucket connection)
		@timeout 5000

		HGRepo.MakeTempRepo (err, repo) ->

			otherPath = path.resolve(path.join(repo.path, "..", uuid.v1()))
			
			repo.clone "https://bitbucket.org/jacob4u2/node-hg", otherPath, (err, output) ->
				throw err if err

				should.exist output

				otherRepo = new HGRepo(otherPath)

				otherRepo.summary (err, output) ->
					throw err if err

					should.exist output

					done()

	it "can pull changes from another repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			otherPath = path.resolve(path.join(repo.path, "..", uuid.v1()))

			repo.clone repo.path, otherPath, (err, output) ->
				throw err if err

				should.exist output

				otherRepo = new HGRepo(otherPath)

				fs.writeFile path.join(repo.path, "one.txt"), "Text Content 1", (err) ->
					throw err if err

					fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
						throw err if err

						repo.add ['.'], (err, output) ->
							throw err if err

							output.length.should.equal 3

							commitOpts = 
								"-m": "A Test Commit"

							repo.commit commitOpts, (err, output) ->
								throw err if err

								should.exist output

								otherRepo.pull repo.path, (err, output) ->
									throw err if err

									should.exist output

									otherRepo.update (err, output) ->
										throw err if err

										should.exist output

										done()

	it "can push changes to another repo", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			otherPath = path.resolve(path.join(repo.path, "..", uuid.v1()))

			repo.clone repo.path, otherPath, (err, output) ->
				throw err if err

				should.exist output

				otherRepo = new HGRepo(otherPath)

				fs.writeFile path.join(repo.path, "one.txt"), "Text Content 1", (err) ->
					throw err if err

					fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
						throw err if err

						repo.add ['.'], (err, output) ->
							throw err if err

							output.length.should.equal 3

							commitOpts = 
								"-m": "A Test Commit"

							repo.commit commitOpts, (err, output) ->
								throw err if err

								should.exist output

								repo.push otherRepo.path, (err, output) ->
									throw err if err

									should.exist output

									otherRepo.update (err, output) ->
										throw err if err

										should.exist output

										otherRepo.summary (err, output) ->
											throw err if err

											should.exist output

											done()

	it "can merge changes between two repos", (done) ->
		HGRepo.MakeTempRepo (err, repo) ->

			otherPath = path.resolve(path.join(repo.path, "..", uuid.v1()))

			repo.clone repo.path, otherPath, (err, output) ->
				throw err if err

				should.exist output

				otherRepo = new HGRepo(otherPath)
				fileOne = path.join(repo.path, "one.txt")

				fs.writeFile fileOne, "Text Content 1", (err) ->
					throw err if err

					fs.writeFile path.join(repo.path, "two.txt"), "Text Content 2", (err) ->
						throw err if err

						repo.add ['.'], (err, output) ->
							throw err if err

							output.length.should.equal 3

							commitOpts = 
								"-m": "A Test Commit"

							repo.commit commitOpts, (err, output) ->
								throw err if err

								should.exist output

								otherRepo.pull repo.path, (err, output) ->
									throw err if err

									should.exist output

									otherRepo.update (err, output) ->
										throw err if err

										should.exist output

										otherFileOne = path.join(otherRepo.path, "one.txt")

										fs.appendFileSync otherFileOne, "\nSome More Text on Line 2"
										fs.writeFileSync fileOne, "Some Changes on Line 1\n"

										commitOpts = 
											"-m": "Repo One Update"

										repo.commit commitOpts, (err, output) ->
											throw err if err

											should.exist output

											commitOpts = 
												"-m": "Repo Two Update"

											otherRepo.commit commitOpts, (err, output) ->
												throw err if err

												should.exist output

												otherRepo.pull repo.path, (err, output) ->
													throw err if err

													should.exist output

													otherRepo.merge (err, output) ->
														throw err if err

														should.exist output

														resolveOpts = 
															"--list": ""

														otherRepo.resolve resolveOpts, (err, output) ->
															throw err if err

															should.exist output
															output.length.should.equal 2

															resolveOpts = 
																"-m": "one.txt"

															otherRepo.resolve resolveOpts, (err, output) ->
																throw err if err

																should.exist output

																otherRepo.commit {"-m": "Merging from one"}, (err, output) ->
																	throw err if err

																	should.exist output

																	# To get to the house that jack built....
																	done()