var config = {},
	map,
	vacants,
	neighborhoods,
	hood,
	results,
	info;

config.defaultMapCenter = {
	lat: 39.2854197594374,
	lon: -76.61796569824219,
	zoom: 12
};

config.heightDiff = 129;

$(window).resize(function() {
	$('#mainmap').css({
		'height': ($(window).height() - config.heightDiff) + 'px'
	});
	map.invalidateSize();
});

$(function() {
	map = L.map('mainmap', {
		zoomControl: false
	}).setView([config.defaultMapCenter.lat, config.defaultMapCenter.lon], config.defaultMapCenter.zoom);

	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 22,
		attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>'
	}).addTo(map);

	L.Control.Results = L.Control.extend({
		options: {
			position: 'topleft',
			zoomInText: '+',
			zoomInTitle: 'Zoom in',
			zoomOutText: '-',
			zoomOutTitle: 'Zoom out'
		},

		onAdd: function (map) {
			var zoomName = 'leaflet-control-results',
			    container = L.DomUtil.create('div', zoomName + ' leaflet-bar'),
			    options = this.options;
			
			return container;
		}
	});

	results = new L.Control.Results({
		position: 'topright'
	}).addTo(map);

	L.Control.Info = L.Control.extend({
		options: {
			position: 'topleft'
		},

		onAdd: function (map) {
			var clsName = 'leaflet-control-info',
			    container = L.DomUtil.create('div', clsName + ' leaflet-bar'),
			    options = this.options;
			
			return container;
		}
	});

	info = new L.Control.Info().addTo(map);

	$(info._container).css('opacity',0);
	$(info._container).html('&nbsp;</br>&nbsp;');

	L.control.zoom({
		position: 'topleft'
	}).addTo(map);

	var updateVacants = function(bounds){
		if (vacants){
	    	vacants.clearLayers();
	    }

		$.get("/api/vacant?bounds="+bounds).success(function(data, status) {
			var html = '';
			$(results._container).html('');
			data.features.forEach(function(itm){
				html = html + itm.properties.block + " " +itm.properties.lot+"</br>"+itm.properties.property_address+"</br></br>";
			});
			$(results._container).html(html);
			vacants = L.geoJson(data, {
				style: {
					fillColor: "#137B80",
					weight: 2,
					opacity: 1,
					color: 'red',
					fillOpacity: 0.35
				},
				onEachFeature: function(feature, layer) {
					layer.on({
						mouseover: function(e){
							$(info._container).css('opacity',1);
							$(info._container).html('<b>' + e.target.feature.properties.block + " " +e.target.feature.properties.lot+"</b></br>"+e.target.feature.properties.property_address);
						},
						mouseout: function(){
							$(info._container).css('opacity',0);
							$(info._container).html('&nbsp;</br>&nbsp;');
						},
						click: function(e){

						}
					});
				}
			}).addTo(map);
		});	
	}

	var drawnItems = new L.FeatureGroup();
	map.addLayer(drawnItems);

	// Initialise the draw control and pass it the FeatureGroup of editable layers
	var drawControl = new L.Control.Draw({
	    draw: {
	    	polyline: false,
	    	rectangle: false,
	    	circle: false,
	        polygon: {
		    	shapeOptions: {
	                color: '#00FF00'
	            }
		    },
	        marker: false
	    },
	    edit: {
	        featureGroup: drawnItems,
	        edit: false,
	        remove: false
	    }
	});
	map.addControl(drawControl);

	map.on('draw:drawstart', function(e){
		drawnItems.clearLayers();
	});

	map.on('draw:created', function(e){
	    var layer = e.layer;
	    drawnItems.addLayer(layer);
	    map.fitBounds(layer.getBounds());

	    updateVacants(JSON.stringify(layer.toGeoJSON().geometry.coordinates));

	});

	var getNeighborhoodColor = function(d, t) {

		if (map.getZoom() > 10){

			var n = (d == 0 || t < 200) ? 0 : ((((d / t) * 100) - 100) * -1).toFixed(0),
				G = (((255 * n) / 100) - 80).toFixed(0),
				R = ((255 * (100 - n)) / 100).toFixed(0),
				B = '10',
				val = (n > 0) ? 'rgb(' + R + ',' + G + ',' + B + ')' : '#CCCCCC';
		} else {
			var val = '#FFF';
		}

		return val;
	};

	var getStyle = function(feature){
		return {
			fillColor: getNeighborhoodColor(feature.properties.vacants, feature.properties.properties),
			weight: 2,
			opacity: 1,
			color: 'white',
			dashArray: 3,
			fillOpacity: 0.65
		}
	};

	$.get("/api/neighborhood").success(function(data, status) {
		neighborhoods = L.geoJson(data, {
			style: getStyle,
			onEachFeature: function(feature, layer) {
				layer.on({
					mouseover: function(e){
						var props = e.target.feature.properties;
						$(info._container).css('opacity',1);
						$(info._container).html('<b>' + props.LABEL + '</b></br>' + props.vacants + ' vacants of ' + props.properties + ' total properties (' + ((parseInt(props.vacants,10) / parseInt(props.properties, 10)) * 100).toFixed(1) + '% vacant)');
					},
					mouseout: function(){
						$(info._container).css('opacity',0);
						$(info._container).html('&nbsp;</br>&nbsp;');
					},
					click: function(e){
						if (hood){
							neighborhoods.resetStyle(hood);
						}
						hood = layer;
						map.fitBounds(e.target.getBounds());
						updateVacants(JSON.stringify(e.layer.toGeoJSON().geometry.coordinates));
						e.layer.setStyle({
							weight: 2,
							opacity: 1,
							color: 'black',
							fillOpacity: 0
						});
						layer.bringToFront();
					}
				});
			}
		}).addTo(map);
	});

	$('#mainmap').css({
		'height': ($(window).height() - config.heightDiff) + 'px'
	});

	map.invalidateSize();

});