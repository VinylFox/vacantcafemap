var fs = require('fs');
var async = require('async');

process.on('uncaughtException', function(error) {
	console.log(error.stack);
});

var test = false;

var MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://127.0.0.1:27017/vacantcafe', function(err1, db) {
	if (err1) throw err1;

	var collection = db.collection('property');
	var queue = [],
		x = 0;

	collection.ensureIndex({
      "geometry": "2dsphere"
    }, function() {
      console.log(arguments);
    });

	collection.ensureIndex({
      "properties.address": "text"
    }, function() {
      console.log(arguments);
    });

	fs.readFile('./data/parcels.geojson', 'utf-8', function(err2, contents) {
		var data = JSON.parse(contents),
			len = data.features.length;
		//console.log(len);
		for (var i = 0; i < len; i++) {
			//console.log(data.features[i].properties.PIN);
			queue.push(data.features[i]);
		}
		queue.push({
			done: true
		});
		async.eachSeries(queue, function(data, callback) {
			if (data.done) {
				console.log('done');
				setImmediate(function() {
					callback();
				});
				process.exit(0);
			} else {
				//console.log(data.properties.PIN);
				collection.findOne({
					_id: data.properties.PIN
				}, function(err, result) {
					//console.log('result of find being processed');
					if (err) {
						console.log(err);
						setImmediate(function() {
							callback();
						});
					} else {
						//console.log('result of find has no error');

						if (data.geometry && data.properties.FULLADDR != '0' && data.properties.FULLADDR != null) {
							// lets find out if the geometry is valid (ish)
							var coords = data.geometry.coordinates,
								coordlen = data.geometry.coordinates.length;
							//console.log('First geom lats:',geom[0][0], geom[geomlen-1][0]);
							//console.log('First geom lngs:',geom[0][1], geom[geomlen-1][1]);
							for (var i = 0; i < coordlen; i++) {
								var geom = coords[i],
									geomlen = geom.length;
								if (geom[0][0] != geom[geomlen - 1][0] || geom[0][1] != geom[geomlen - 1][1]) {
									console.log('Start and end are not the same.');
									data.geometry.coordinates[i].push(geom[0]);
								}
							}

							/*if (coordlen > 1) {
								console.log("found a ", "MultiPolygon", coordlen);
								data.geometry.type = "MultiPolygon";
							}*/

							if (result != null) {
								console.log('Updating existing property for ' + data.properties.PIN);
								result.geometry = data.geometry;
								result.properties.lot_area = data.properties.SHAPE_Area;
								if (!test) {
									collection.update({
										_id: data.properties.PIN
									}, result, function() {
										setImmediate(function() {
											callback();
										});
									});
								} else {
									setImmediate(function() {
										callback();
									});
								}
							} else {
								if (result == null) {
									console.log('No property exists yet, adding one for ' + data.properties.PIN);
									var entry = {
										_id: data.properties.PIN,
										properties: {
											block: data.properties.BLOCKNUM,
											lot: data.properties.PARCELNUM,
											property_address: data.properties.FULLADDR,
											lot_area: data.properties.SHAPE_Area
										},
										geometry: data.geometry
									};
									if (!test) {
										collection.insert(entry, {
											w: 1
										}, function(err, result2) {
											if (err) {
												console.log(err);
											} 
											setImmediate(function() {
												callback();
											});
										});
									} else {
										setImmediate(function() {
											callback();
										});
									}
								} else {
									console.log('Result is something else : ' + result);
									setImmediate(function() {
										callback();
									});
								}
							}
						}
					}
				});
			}
		});
	});
});