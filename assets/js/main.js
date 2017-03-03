var map, turbineSearch = [], turbineIcon, turbineIconHighlighted;

// Basemap Layers
var mapquestOSM = L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png", {
		maxZoom : 19,
		subdomains : ["otile1", "otile2", "otile3", "otile4"],
		attribution : 'Tiles courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">. Map data (c) <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, CC-BY-SA.'
	});
mapLink = '<a href="http://www.esri.com/">Esri</a>';
wholink = 'i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
var aerials = L.tileLayer(
		'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attribution : '&copy; ' + mapLink + ', ' + wholink,
		maxZoom : 18
	});

turbineIcon = L.icon({
		iconUrl : "assets/img/Turbine.png",
		iconSize : [35, 35],
		shadowUrl : "assets/img/Shadow.png",
		shadowAnchor : [8, 25],
		shadowSize : [30, 30],
		iconAnchor : [12, 28],
		popupAnchor : [0, -25]
	});
turbineIconHighlighted = L.icon({
		iconUrl : "assets/img/Highlight.png",
		iconSize : [35, 35],
		shadowUrl : "assets/img/Shadow.png",
		shadowAnchor : [8, 25],
		shadowSize : [30, 30],
		iconAnchor : [12, 28],
		popupAnchor : [0, -25]
	});

// Overlay Layers
var turbines = L.geoJson(null, {
		pointToLayer : function (feature, latlng) {
			return L.marker(latlng, {
				icon : turbineIcon,
				title : feature.properties.NAME,
				alt : feature.properties.NAME,
				riseOnHover : true,
			});
		},
		onEachFeature : function (feature, layer) {
			if (feature.properties.Label) {
				var content = "<p><h4>Turbine<strong> ";
				content += feature.properties.Label;
				content += "</strong></p></h4>";

				layer.on({
					mouseover : highlightFeature,
					mouseout : resetHighlight,
				});

				if (document.body.clientWidth <= 767) {
					layer.on({
						click : function (e) {
							$("#feature-title").html(feature.properties.Number);
							$("#feature-info").html(content);
							$("#featureModal").modal("show");
						}
					});

				} else {
					layer.bindPopup(content, {
						closeButton : true
					});
				};
				turbineSearch.push({
					name : layer.feature.properties.Name,
					source : "Turbines",
					id : L.stamp(layer),
					lat : layer.feature.geometry.coordinates[1],
					lng : layer.feature.geometry.coordinates[0]
				});
			}
		}
	});
$.getJSON("data/turbines.geojson", function (data) {
	turbines.addData(data);
});

map = L.map("map", {
		layers : [mapquestOSM, turbines],
		minZoom : 5,
		tapTolerance : 30
	});
var locator = L.control.locate({
		icon : 'icon-locate',
	}).addTo(map);

// Larger screens get expanded layer control
if (document.body.clientWidth <= 10) {
	var isCollapsed = true;
} else {
	var isCollapsed = false;
};

var baseLayers = {
	"Streets" : mapquestOSM,
	"Aerials" : aerials
};

var overlays = {
	"<img src='assets/img/Turbine.png' width='24' height='28'>&nbsp;Turbines" : turbines
};

var layerControl = L.control.layers(baseLayers, overlays, {
		collapsed : false
	}).addTo(map);

// Highlight search box text on click
$("#searchbox").click(function () {
	$(this).select();
});

// Typeahead search functionality
$(document).one("ajaxStop", function () {
	map.fitBounds(turbines.getBounds());
	$("#loading").hide();

	var turbinesBH = new Bloodhound({
			name : "Turbines",
			datumTokenizer : function (d) {
				return Bloodhound.tokenizers.whitespace(d.name);
			},
			queryTokenizer : Bloodhound.tokenizers.whitespace,
			local : turbineSearch,
			limit : 10
		});

	var geonamesBH = new Bloodhound({
			name : "GeoNames",
			datumTokenizer : function (d) {
				return Bloodhound.tokenizers.whitespace(d.name);
			},
			queryTokenizer : Bloodhound.tokenizers.whitespace,
			remote : {
				url : "http://api.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=5&countryCode=US&name_startsWith=%QUERY",
				filter : function (data) {
					return $.map(data.geonames, function (result) {
						return {
							name : result.name + ", " + result.adminCode1,
							lat : result.lat,
							lng : result.lng,
							source : "GeoNames"
						};
					});
				},
				ajax : {
					beforeSend : function (jqXhr, settings) {
						settings.url += "&east=" + map.getBounds().getEast() + "&west=" + map.getBounds().getWest() + "&north=" + map.getBounds().getNorth() + "&south=" + map.getBounds().getSouth();
						$("#searchicon").removeClass("fa-search").addClass("fa-refresh fa-spin");
					},
					complete : function (jqXHR, status) {
						$('#searchicon').removeClass("fa-refresh fa-spin").addClass("fa-search");
					}
				}
			},
			limit : 10
		});
	turbinesBH.initialize();
	geonamesBH.initialize();

	// instantiate the typeahead UI
	$("#searchbox").typeahead({
		minLength : 3,
		highlight : true,
		hint : false
	}, {
		name : "Turbines",
		displayKey : "name",
		source : turbinesBH.ttAdapter(),
		templates : {
			header : "<h4 class='typeahead-header'><img src='assets/img/Turbine.png' width='24' height='28'>&nbsp;Turbines</h4>"
		}
	}, {
		name : "GeoNames",
		displayKey : "name",
		source : geonamesBH.ttAdapter(),
		templates : {
			header : "<h4 class='typeahead-header'><img src='assets/img/globe.png' width='25' height='25'>&nbsp;GeoNames</h4>"
		}
	}).on("typeahead:selected", function (obj, datum) {
		if (datum.source === "Turbines") {
			if (!map.hasLayer(turbines)) {
				map.addLayer(turbines);
			};
			map.setView([datum.lat, datum.lng], 17);
			if (map._layers[datum.id]) {
				map._layers[datum.id].fire("click");
			};
		};
		if (datum.source === "GeoNames") {
			map.setView([datum.lat, datum.lng], 14);
		};
		if ($(".navbar-collapse").height() > 50) {
			$(".navbar-collapse").collapse("hide");
		};
	}).on("typeahead:opened", function () {
		$(".navbar-collapse.in").css("max-height", $(document).height() - $(".navbar-header").height());
		$(".navbar-collapse.in").css("height", $(document).height() - $(".navbar-header").height());
	}).on("typeahead:closed", function () {
		$(".navbar-collapse.in").css("max-height", "");
		$(".navbar-collapse.in").css("height", "");
	});
	$(".twitter-typeahead").css("position", "static");
	$(".twitter-typeahead").css("display", "block");
});

// Placeholder hack for IE
if (navigator.appName == "Microsoft Internet Explorer") {
	$("input").each(function () {
		if ($(this).val() === "" && $(this).attr("placeholder") !== "") {
			$(this).val($(this).attr("placeholder"));
			$(this).focus(function () {
				if ($(this).val() == $(this).attr("placeholder"))
					$(this).val("");
			});
			$(this).blur(function () {
				if ($(this).val() === "")
					$(this).val($(this).attr("placeholder"));
			});
		}
	});
}

function highlightFeature(e) {
	e.target.setIcon(turbineIconHighlighted);
}

function resetHighlight(e) {
	e.target.setIcon(turbineIcon);
}

function onLocationFound(e) {
	var radius = e.accuracy / 2;

	L.marker(e.latlng).addTo(map)
	.bindPopup("You are within " + radius + " meters from this point").openPopup();

	L.circle(e.latlng, radius).addTo(map);
}
