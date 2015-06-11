
function Triad() {

}

/* Outputs a GeoJSON Feature Polygon that is the convex hull of an array of GeoJSON Point Features.
 * @param points {GeoJSON FeatureCollection} An feature collection of GeoJSON Point Features.
 * @return {GeoJSON Feature Polygon} A polygon representing the convex hull of the input points.
 * Uses the Monotone Chain algorithm: http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
*/
Triad.prototype.getConvexHull = function(pointFeatureCollection) {
	var self = this;
	
	//handle degenerate cases
	if (pointFeatureCollection.features.length <= 2) {
		return { type: "Feature", geometry: { type: "Polygon", coordinates: [[]] }, properties:{} };
	} 

	var points = pointFeatureCollection.features.map(function(feature) {
		return feature.geometry.coordinates;
	});

	//sort lexigraphically
	points.sort(function(a, b) {
		return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
	});

	//process the lower hull
	var lower = [];
	for (var i = 0; i < points.length; i++) {
		while (lower.length >= 2 && self.crossProduct(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
			lower.pop();
		}
		lower.push(points[i]);
	}

	//process the upper hull
	var upper = [];
	for (var i = points.length - 1; i >= 0; i--) {
		while (upper.length >= 2 && self.crossProduct(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
			upper.pop();
		}
		upper.push(points[i]);
	}

	upper.pop();
	lower.pop();

	var coords = lower.concat(upper);
	coords.push(coords[0]);
	var json = JSON.stringify({ type: "Feature", geometry: {type:"Polygon", coordinates: [[coords]]}, properties: {}});
	return JSON.parse(json);

};

/*
 * Constructs a GeoJSON LineString Feature from a GeoJSON FeatureCollection of points.
 * @param {GeoJSON Point FeatureCollection} a FeatureCollection containing points.
 * @return {GeoJSON LineString Feature} a LineString Feature
 */
Triad.prototype.getLineString  = function(pointFeatureCollection) {
	var self = this;
	var lineCoords = pointFeatureCollection.features.map(function(feature) {
		return feature.geometry.coordinates;
	});
	var lineString = JSON.stringify({type: "Feature", geometry: lineCoords, properties: {}});
	return JSON.parse(lineString);
};

/*
 * Constructs a GeoJSON Polygon Feature from a GeoJSON FeatureCollection of points, a GeoJSON MultiPoint Feature, or a GeoJSON LineString Feature. 
 * The points or line are assumed to construct a linear ring.
 * @param geoJSON {GeoJSON Point FeatureCollection | GeoJSON MultiPoint Feature | GeoJSON LineString Feature} The GeoJSON object from which to construct the polygon.
 * @return {GeoJSON Polygon Feature} the polygon to return.
 */
 Triad.prototype.getPolygon = function(geoJSON) {
 	
 	var coords = [[]];

 	//feature collection
    if (geoJSON.features) {
    	for (var i = 0; i < geoJSON.features; i++) {
 			var coord = [geoJSON.featurse[i].geometry.coords[0], geoJSON.features[i].geometry.coords[1]];
 			coords[0].push(coord);
 		}
    } else if (geoJSON.geometry.type === "MultiPoint" || geoJSON.geometry.type === "LineString") {
    	var srcCoords = JSON.stringify(geoJSON.geometry.coordinates);
    	coords = JSON.parse(srcCoords);
    }

 	return {type: "Feature", geometry: { type: "Polygon", coords: coords}, properties: {}};
 };
 
 //note that for multipoints, each point my lie within the poly to return true. Use intersects to test if some do.
 Triad.prototype.pointInPolygon = function(pointFeature, polygonFeature) {
 	var self = this;
 	var polys = polygonFeature.geometry.coordinates;
 	if (polygonFeature.geometry.type === 'Polygon') {
 		polys = [polys]; //handle multipolygon and polygon
 	}

 	//assume this feature intersects the bounding box first.
 	//we'll test this later.
 	var intersectsBBox = true;

	//check for a bbox property. If there is one, 
 	//assume it is correct and check if the point intersects the bbox first.
 	var bbox;
 	if (polygonFeature.bbox) {
 		bbox = polygonFeature.bbox;
 	}
 	if (polygonFeature.geometry.bbox) {
 		bbox = polygonFeature.geometry.bbox;
 	}
 	if (bbox) {
 		var x = pointFeature.geometry.coordinates[0];
 		var y = pointFeature.geometry.coordinates[1];

 		if (pointInBBox([x,y], bbox)) {
 			intersectsBBox = false;
 		}
 	}

 	if (intersectsBBox) {
		for (var i = 0; i < polys.length; i++) {
			if (self.inRing(pointFeature.coordinates, polys[i][0])) {
				var k = 1;
				while (k < polys[i].length) {
					if (self.inRing(pointFeature.coordinates, polys[i][k])) {
						return false;
					}
					k++;
				}
				return true;
			}
 		}
 	}

 	return false;
 	
 };

 Triad.prototype.pointInBBox = function(pointCoord, bbox) {
	var x = pointCoord[0];
	var y = pointCoord[1];
	if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) {
		intersectsBBox = false;
	}
 };


 Triad.prototype.inRing = function(pointCoord, linearRing) {
	var insideRing = false;
	for (var i = 0, j = linearRing.length - 1 ; i < linearRing.length; j = i++) {
		if (((linearRing[i][1] > pointCoord[1]) != 
			(linearRing[j][1] > pointCoord[1])) &&
				(pointCoord[0] < (linearRing[j][0]-linearRing[i][0]) * 
					(pointCoord[1] - linearRing[i][1]) / 
						(linearRing[j][1]-linearRing[i][1]) + linearRing[i][0]) )
		insideRing = !insideRing;
	}
	return insideRing;
 };

/*
 * Returns the envelope of a geoJson object.
 * @param geoJSON {GeoJSON} the GeoJSON object from which to obtain the envelope.
 * @return {GeoJSON Feature Polygon} The envelope as a GeoJSON Feature Polygon.
*/
 Triad.prototype.getBBox = function(geoJSON) {
 	
 	var minx = Number.MAX_VALUE;
 	var miny = Number.MAX_VALUE;
 	var maxx = Number.MIN_VALUE;
 	var maxy = Number.MIN_VALUE;

 	var bbox = [minx, miny, maxx, maxy];

 	var features = geoJSON;

 	var gjsType = "Array";

 	if (geoJSON.type) {
 		gjsType = geoJSON.type;
 	}

 	if (gjsType === "Feature") {
 		features = [geoJSON];
 	} else if (gjsType === "FeatureCollection") {
 		features = geoJSON.features;
 	} else if (gjsType === "GeometryCollection") {
 		features = geoJSON.geometries;
 	} else {
 		if (geoJSON.coordinates) {
 			features = geoJSON.coordinates;
 		}
 	}

 	for (var i = 0; i < features.length; i++) {
 		var coords = features[i]; //assume just a list of positions first.
 		if (gjsType !== "GeometryCollection" && features[i].type) {
 			coords = features[i].geometry.coordinates;
 		}
 		if (gjsType === "Point" || gjsType === "MultiPoint" || gjsType === "LineString") {
	 		bbox = this.expandBBox(coords, bbox);
	 	} else if (gjsType === "MultiLineString" || gjsType === "Polygon") {
	 		for (var j = 0; j < coords.length; j++) {
	 			bbox = this.expandBBox(coords[j], bbox);
	 		}
	 	} else if (gjsType === "MultiPolygon") {
	 		for (var j = 0; j < coords.length; j++) {
	 			for (var k = 0; k < coords[j].length; j++) {
	 				bbox = this.expandBBox(coords[j][k], bbox);
	 			}
	 		}
	 	}
 	}
 	return bbox;
 };

/*
 * Expands a bounding box to include the specified coordinate list.
 * @param coords {Array} coordinates to try and expand with.
 * @param origBBox {Array} the bounding box to expand.
 * @return {Array} the original bounding box, modified to include the minx, miny, maxx, and maxy of coords
*/
 Triad.prototype.expandBBox = function(coords, origBBox) {
 	
 	//handle a single point
 	if (coords.length === 2 && !coords[0].length) {
 		coords = [coords];
 	}

 	for (var i = 0; i < coords.length; i++) {
 		if (coords[i][0] < origBBox[0]) {
 			origBBox[0] = coords[i][0];
 		}
 		if (coords[i][0] > origBBox[2]) {
 			origBBox[2] = coords[i][0];
 		}
 		if (coords[i][1] < origBBox[1]) {
 			origBBox[1] = coords[i][1];
 		}
 		if (coords[i][1] > origBBox[3]) {
 			origBBox[3] = coords[i][1];
 		}
 	}
 	return origBBox;
 };

/*
 * Returns the cross product of three points, used to determine if r 
 * is to the left or the right of the line through p and q
 * @param p {GeoJSON Point Feature}
 * @param q {GeoJSON Point Feature}
 * @param r {GeoJSON Point Feature}
 * @return {Number} < zero if left, 0 if on the line, > 0 if to the right
*/
Triad.prototype.crossProduct = function(p, q, r) {
	return (q[0] - p[0]) * 
		(r[1] - p[1]) - 
		(q[1] - p[1]) * 
		(r[0] - p[0]);
};

/*
 * Tests whether a feature collections contains homogeneous geometry, e.g. all Polygons or all LineStrings, etc 
 * @param featureCollection {GeoJSON FeatureCollection} the feature collection to test.
 * @return boolean
*/
Triad.prototype.isHomogeneousFeatureCollection = function(featureCollection) {
	var firstGeom;
	if (featureCollection.features.length === 0) {
		return true;
	} else {
		firstGeom = featureCollection.features[0].geometry.type;
	}
	for (var i = 0; i < features.length; i++) {
		if (featureCollection.features[i].geometry.type !== firstGeom) {
			return false;
		}
	}
	return true;
};

Triad.prototype.clipPointsToPolygon = function(gjsPoints, gjsPoly) {
	
	var self = this;

	//get a copy of the properties
	var props = self.cloneObject(gjsLine.properties);

	var result = { type: "Feature", geometry: { type: gjsPoints.geometry.type, coordinates: [] }, properties: props };

	if (gjsLine.geometry.coordinates.length === 0) {
		return result;
	}

	if (gjsPoly.geometry.coordinates.length === 0) {
		return result;
	}

	//Handle intersecting points with polygons and multipolygons.
	//If the point(s) is not within the polygon, return the empty result Feature
	if ((gjsLine.geometry.type === "Point" || 
		gjsLine.geometry.type === "MultiPoint") && 
		(gjsPoly.geometry.type === "Polygon" || 
		gjsPoly.geometry.type == "MultiPolygon")) {
		var points = gjsLine.geometry.coordinates;
		if (gjsLine.type === "Point") {
			//handle multipoint
			points = [points];
		}
		for (var i = 0; i < points.length; i++) {
			//stupid hack by creating a feature here. I should handle this better.
			if (self.pointInPolygon({type:"Feature", geometry:{ type:"Point", coordinates: points[i], properties: {} } }, gjsPoly)) {
				var coord = self.cloneObject(points[i]);
				if (gjsLine.type === "Point") {
					result.geometry.coordinates = coord;
				} else {
					result.geometry.coordinates.push(coord);
				}
			}
		}
		return result;
	}
};

Triad.prototype.getPositions = function(geoJson) {
	var positions = [];
	if (geoJson.type === "Point" || geoJson.type === "MultiPoint" || geoJson.type === "LineString" || geoJson.type === "MultiLineString" || geoJson.type === "Polygon" || geoJson.type === "MultiPolygon") {
		positions = positions.concat.apply(positions, geoJson.coordinates);
	}
};

Triad.prototype.clipLineStringToPolygon = function(gjsLine, gjsPoly) {

	var self = this;
	var insideRing = false;

	var result = self.cloneObject(gjsLine);

	if (gjsLine.geometry.coordinates.length === 0) {
		return result;
	}

	if (gjsPoly.geometry.coordinates.length === 0) {
		return result;
	}

	var line = result.geometry.coordinates;

	//treat as Multilinetring
	if (result.type === "LineString") {
		line = [line];
	}

	var priorityQueue = [];

	var searchTree = { value: null, left: null, right: null };


	//for each individual linestring
	for (var i = 0; i < line.length; i++) {


		
		var intersectingLineSegmentStart = -1;
		var intersectingLineSegmentEnd = -1;

		//for each linestring position (vertex)
		for (var j = 0; j < line[i].length; j++) {

			if (j < line[i].length - 1) {

				var lineStartCoord = line[i][j];
				var lineEndCoord = line[i][j+1];

				var line1StartX = lineStartCoord[0];
				var line1StartY = lineStartCoord[1];

				var line1EndX = lineEndCoord[0];
				var line1EndY = lineEndCoord[1];

				var polys = gjsPoly.geometry.coordinates;

				if (gjsPoly.type === "Polygon") {
					polys = [polys];
				}

				//for each individual polygon
				for (var k = 0; k < polys.length; k++) {

					//for each linear ring in the polygon
					for (var m = 0; m < polys[k].length; m++) {
						//for each positional coordinate in the linear ring
						for (p = 0; p < polys[k][m].length; p++) {
							if (p < polys[k][m].length - 1) {
								
								var linRingSegStartCoord = polys[k][m][p];
								var linRingSegEndCoord = polys[k][m][p+1];

								var line2StartX = linRingSegStartCoord[0];
								var line2StartY = linRingSegStartCoord[1];

								var line2EndX = linRingSegEndCoord[0];
								var line2EndY = linRingSegEndCoord[1];

								var denom = ((line2EndY - line2StartY) * 
									(line1EndX - line1StartX)) - 
									((line2EndX - line2StartX) * 
									(line1EndY - line1StartY));

								if (denom === 0) {
									//the line segment and the polygon edge segment are parrallel.
									continue;
								} else {
									
									var a = line1StartY - line2StartY;
									var b = line1StartX - line2StartX;
								    var numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    								var numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    								a = numerator1 / denominator;
    								b = numerator2 / denominator;

    								//an infinite line along the line segment and an infinite line
    								//along the polygon segment will intersect here.
    								var x = line1StartX + (a * (line1EndX - line1StartX));
    								var y = line1StartY + (a * (line1EndY - line1StartY));

    								if (a > 0 && a < 1 && b > 0 && b < 1) {
    									//(x, y) falls on the line segment and the polygon edge segment

    									//index of this position along the line
    									intersectingLineSegmentStart = j;
    									
    								}

								}

							}
						}
					}				
				}
			}
		}
	}
};

Triad.prototype.cloneObject = function(object) {
	var strObj = JSON.stringify(object);
	return JSON.parse(strObj);
};

