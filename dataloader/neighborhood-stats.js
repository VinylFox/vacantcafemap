var async = require('async');

process.on('uncaughtException', function(error) {
	console.log(error.stack);
});

var MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://127.0.0.1:27017/vacantcafe', function(err1, db) {
	if (err1) throw err1;

	var neighborhood = db.collection('neighborhood');
	var property = db.collection('property');
	var queue = [],
		x = 0;

	neighborhood.find({}).toArray(function(err, result) {

		var len = result.length;

		for (var i = 0; i < len; i++) {
			queue.push(result[i]);
		}
		queue.push({
			done: true
		});
		async.eachSeries(queue, function(data, callback) {
			if (data.done) {
				console.log('done with property counts');
				setImmediate(function() {
					callback();
				});
				async.eachSeries(queue, function(data, callback) {
					if (data.done) {
						console.log('done');
						setImmediate(function() {
							callback();
						});
						process.exit(0);
					} else {
						console.log(data.properties.LABEL);
						property.find({
							"properties.vacant": true,
							"geometry": {
								"$geoWithin": {
									"$geometry": data.geometry
								}
							}
						}).count(function(e, count){
							console.log(count + ' vacants');
							data.properties.vacants = count;
							neighborhood.update({
								_id: data._id
							}, data, function(){
								console.log('updated vacant count');
								setImmediate(function() {
									callback();
								});
							})
						});
					}
				});
			} else {
				console.log(data.properties.LABEL);
				property.find({
					"geometry": {
						"$geoWithin": {
							"$geometry": data.geometry
						}
					}
				}).count(function(e, count){
					console.log(count + ' properties');
					data.properties.properties = count;
					setImmediate(function() {
						callback();
					});
				});
			}
		});
	});
});