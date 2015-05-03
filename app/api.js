var mongo = require('mongodb');
var Data = require('./data.js');

var Api = function(config) {
	for (var prop in config) this[prop] = config[prop];
	this.data = new Data(this);
};

Api.prototype.lineDistance = function(point1, point2) {
	var xs = 0;
	var ys = 0;

	xs = point2[1] - point1[1];
	xs = xs * xs;

	ys = point2[0] - point1[0];
	ys = ys * ys;

	return Math.sqrt(xs + ys);
};

Api.prototype.vacants = function(req, res, cb) {

	var line = (req.query.bounds) ? JSON.parse(req.query.bounds) : undefined;

	this.doBoundsSearch(req, res, cb, line || [[
		[-76.711293669970217, 39.371957030672938],
		[-76.52967423510151, 39.371971900043278],
		[-76.529858300949158, 39.209622953304475],
		[-76.549725312649713, 39.197233450625106],
		[-76.583673126628199, 39.208120531796183],
		[-76.61161075881013, 39.234394547529099],
		[-76.711161349110256, 39.277838496606982],
		[-76.711293669970217, 39.371957030672938]
	]], 'property', 'Polygon');

};

Api.prototype.neighborhoods = function(req, res, cb) {

	this.data.query(res, 'neighborhood', {
		"properties.vacants": { "$gt": 0 },
	}, 'geojson', cb);

};

Api.prototype.doBoxSearch = function(req, res, cb, collection) {

	if (!req.query.bbox) res.jsonp({
		error: ['no bbox specified']
	});

	var bbox = req.query.bbox.split(',').map(function(e) {
		return parseFloat(e);
	});

	var topLeft = [bbox[1], bbox[2]];
	var topRight = [bbox[3], bbox[2]];
	var botRight = [bbox[3], bbox[0]];
	var botLeft = [bbox[1], bbox[0]];

	//var dist = this.lineDistance([bbox[1], bbox[0]], [bbox[3], bbox[2]]);

	var bounds = [
		[topLeft, topRight, botRight, botLeft, topLeft]
	];

	this.doBoundsSearch(req, res, cb, bounds, collection)

};

Api.prototype.doBoundsSearch = function(req, res, cb, bounds, collection, type) {

	var query = {
		"properties.vacant": true,
		"geometry": {
			"$geoWithin": {
				"$geometry": {
					type: (type) ? type : "Polygon",
					coordinates: bounds
				}
			}
		}
	};

	console.log(JSON.stringify(query));

	this.data.query(res, collection, query, 'geojson', cb);

};

module.exports = Api;