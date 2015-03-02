/**
* Module to test various Triad spatial functions
**/
QUnit.module("Triad", {
	setup: function() {
		this.triad = new Triad();
		//some points
		this.gjsPoint1 = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[0,0]}};
		this.gjsPoint2 = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[0,7.2]}};

		this.gjsPoints = { 
			type: "FeatureCollection", 
			features: [
				{ 
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0, 0]
					},
					properties: {id: 1}
				},
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [1, 1]
					},
					properties: {id: 2}
				},
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [0.5, 0.5]
					},
					properties: {id: 4}
				},
				{
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [1, 0]
					},
					properties: {id: 3}
				},
			]
		};

		//a line
		this.gjsLine = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[0, 0], [0, 10]]}};

		//a line that crosses all test polygons
		this.gjsLineCrosses = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[-107.28344909483172,39.013850159782635],[-107.12268720236165,36.334485285281346],[-105.89988225630543,33.25097507638969]]}};
		
		//a line that crosses gjsPolyWithHole, including the hole in the center of the poly
		this.gjsLineCrossesPolyWithHoleAcrossHole = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[-106.47729812705359,35.91597140291964],[-105.3161211562084,33.35567136064623]]}};
		
		//a line that touches the border of all polygons
		this.gjsLineTouches = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[-104.04577105007536,34.66982992203816],[-102.2247867121485,38.136074986491906],[-106.05564721582329,40.02768002099424],[-106.05564721582329,38.314288624068524]]}};
		
		//a line that touches one corner of all polygons
		this.gjsLineTouchesCorner = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[-107.22762149755846,34.82141934023787],[-108.84233634210386,35.84985679169819],[-109.10761316342922,40.048960577890455],[-107.81168943812605,38.314288624068524]]}};
		
		//a point inside gjsPolyRectangle
		this.gjsPointInsideRectangle = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Point","coordinates":[-105.82721895926359,37.614727088354385]}};

		//a point inside the hole of gjsPolyWithHole
		this.gjsPointInsideHole = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Point","coordinates":[-105.67208852268062,34.465451973765404]}};

		//a point inside the border of gjsPolyWithHole
		this.gjsPointInsidePolyWithHole = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Point","coordinates":[-105.59055232554748,35.51622195394005]}};

		//a point outside of all polygons
		this.gjsPointOutside = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Point","coordinates":[-102.24027122933843,39.589859195921484]}};

		//a point that touches the corner of gjsPolyRectangle
		this.gjsPointTouchesRectCorner = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Point","coordinates":[-103.67142728798137,38.314288624068524]}};

		//a rectangle
		this.gjsPolyRectangle = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Polygon","coordinates":[[[-107.81168943812605,38.314288624068524],[-103.67142728798137,38.314288624068524],[-103.67142728798137,36.72956759418554],[-107.81168943812605,36.72956759418554],[-107.81168943812605,38.314288624068524]]]}};

		//a polygon that overlaps both gjsPolyRectangle and gjsPolyWithHole
		this.gjsPolyToClip = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Polygon","coordinates":[[[-106.2526770081032,37.139966144318635],[-104.80596471655838,37.13044830029531],[-104.77741118448841,35.26495087172435],[-106.16970102336404,34.25910821436008],[-106.30295083969054,34.46469364526388],[-106.2526770081032,37.139966144318635]]]}};

		//a polygon with a hole in the middle (rough donut)
		this.gjsPolyWithHole = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Polygon","coordinates":[[[-105.09562443633479,35.22116878921736],[-104.6958749873553,34.70720521195801],[-104.31802087586152,35.02122213904124],[-103.70601920892989,34.23131301079195],[-105.61867453538082,33.75314917917933],[-106.00057959849119,33.65767291340177],[-106.25680140717998,33.59361746122943],[-107.22762149755852,34.82141934023787],[-105.34308838094114,36.344274383969264],[-104.89166346395427,35.76162129343993],[-105.09562443633479,35.22116878921736]],[[-106.33294415936655,34.888044248400945],[-105.78713867291168,34.02081997547839],[-105.46682035324432,34.13613457055857],[-105.71428429785067,34.94515131254087],[-106.33294415936655,34.888044248400945]]]}};
		
		//a line that does not intersect anything		
		this.gjsLineOutside = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"LineString","coordinates":[[-110.31370953772938,34.61284993661309],[-110.31370953772938,36.851858433342386]]}};

		//a polygon that doesn't intersect anything
		this.gjsPolyOutside = {"type":"Feature","properties":{"Id":0},"geometry":{"type":"Polygon","coordinates":[[[-102.65210233798359,35.83730770826196],[-101.69002837454508,35.85479996214269],[-101.70752062842581,34.77028022153945],[-102.66959459186421,34.82275698318148],[-102.65210233798359,35.83730770826196]]]}};

		this.gjsFeatureCollection = {"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[102.0,0.5]},"properties":{"prop0":"value0"}},{"type":"Feature","geometry":{"type":"LineString","coordinates":[[102.0,0.0],[103.0,1.0],[104.0,0.0],[105.0,1.0]]},"properties":{"prop0":"value0","prop1":0.0}},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[100.0,0.0],[101.0,0.0],[101.0,1.0],[100.0,1.0],[100.0,0.0]]]},"properties":{"prop0":"value0","prop1":{"this":"that"}}}]};
	}	
});

/**
* Assert that clipping produces correct GeoJSON geometry
**/
QUnit.test("Convex Hulls", function(assert) {
	expect(4);
	var hull = this.triad.getConvexHull(this.gjsPoints);
	assert.equal(hull.type, "Feature", "The convex hull returned is a GeoJSON Feature.");
	assert.equal(hull.geometry.type, "Polygon", "The convex hull returned is of geoemetry type Polygon.");
	assert.equal(hull.geometry.coordinates[0][0].length - 1, 3, "The convex hull returned has the expected number of vertices.");
});

