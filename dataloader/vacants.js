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

	fs.readFile('./data/vacants.json', 'utf-8', function(err2, contents) {
		if (err2) throw err2;
		var data = JSON.parse(contents),
			len = data.data.length;
		//console.log(len);
		for (var i = 0; i < len; i++) {
			//console.log(data.features[i].properties.PIN);
			queue.push(data.data[i]);
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
				console.log(data[8].replace(' ', ''));
				collection.findOne({
					_id: data[8].replace(' ', '')
				}, function(err, result) {
					console.log('result of find being processed');
					if (err) {
						console.log(err);
						setImmediate(function() {
							callback();
						});
					} else {
						console.log('result of find has no error');
						if (result != null) {
							console.log('Updating existing property for ' + data[8]);
							result.properties.vacant = true;
							//result.property_address = data[9];
							if (!test) {
								collection.update({
									_id: data[8].replace(' ', '')
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
								console.log('No property exists yet, adding one for ' + data[8].replace(' ', ''));
								var entry = {
									_id: data[8].replace(' ', ''),
									properties: {
										vacant: true,
										block: data[8].substr(0, 5).trim(),
										lot: data[8].substr(4, 4).trim(),
										property_address: data[9].trim()
									}
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
				});
			}
		});
	});
});