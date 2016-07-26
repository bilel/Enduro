// * ———————————————————————————————————————————————————————— * //
// * 	abstractor
// *
// *	adds data to context by fetching external content
// * ———————————————————————————————————————————————————————— * //
var abstractor = function () {};

// vendor dependencies
var Promise = require('bluebird')
var fs = require('fs')
var glob = require('glob-promise')
var path = require('path')

// local dependencies
var enduro_helpers = require(ENDURO_FOLDER + '/libs/flat_utilities/enduro_helpers')
var flat_file_handler = require(ENDURO_FOLDER + '/libs/flat_utilities/flat_file_handler')

abstractor.prototype.abstractors = {}

abstractor.prototype.init = function () {

	var self = this

	var abstractors_path = CMD_FOLDER + '/app/abstractors/*.js'

	// fetches the files
	return glob(abstractors_path)
		.then((files) => {
			var abstraction_inits = []

			for(f in files) {

				var abstractor_name = path.basename(files[f], '.js')

				global.abstractors[abstractor_name] = require(files[f])
				abstraction_inits.push(abstractors[abstractor_name].init())
			}
			return Promise.all(abstraction_inits)
		})
		.then(() => {

			var all_cms_files = CMD_FOLDER + '/cms/**/*.js'

			return glob(all_cms_files)
		})
		.then((files) => {

			var file_abstractions = []

			for(f in files) {
				file_abstractions.push(self.abstract_file(files[f]))
			}

			return Promise.all(file_abstractions)
		})
}

abstractor.prototype.abstract_file = function (filename) {

	var self = this
	var cms_filename = flat_file_handler.get_cms_filename_from_fullpath(filename)

	var inter_context = ''

	return flat_file_handler.load(cms_filename)
		.then((context) => {
			inter_context = context
			return self.abstract_context(context)
		})
		.then((abstracted_context) => {

			// check if the abstractor changed the context
			if(inter_context == abstracted_context) {
				return new Promise.resolve()
			} else {
				return flat_file_handler.save(cms_filename, abstracted_context)
			}
		})
}

abstractor.prototype.abstract_context = function (context) {
	return new Promise(function(resolve, reject){
		deep_abstract(context)
		.then(() => {
			resolve(context)
		})
	})
}

function deep_abstract(context) {

	var self = this

	var abstraction_list = []

	for(c in context) {

		if(c in abstractors) {
			abstraction_list.push(abstractors[c].abstract(context))
		}

		if(typeof context[c] == 'object') {
			abstraction_list.push(deep_abstract(context[c]))
		}
	}

	return Promise.all(abstraction_list)
}

module.exports = new abstractor()