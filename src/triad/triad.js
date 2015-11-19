
var Triad = function() {

};

/* Outputs an array of ordered output coordinates that is the convex hull of an array of input coordinates.
 * @param coords {Array} An array of coordinates e.g. [[0, 0], [0, 1]]
 * @return {Array} An array representing the convex hull of the input coordinates.
 * Uses the Monotone Chain algorithm: http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
*/
Triad.prototype.convexHull = function(coords) {
	
	//handle degenerate cases
	if (coords.length <= 2) {
		return coords.slice();
	}

	//sort lexigraphically
	coords.sort(function(a, b) {
		return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
	});

	//process the lower hull
	var lower = [];
	for (var i = 0; i < coords.length; i++) {
		while (lower.length >= 2 && self.crossProduct(lower[lower.length - 2], lower[lower.length - 1], coords[i]) <= 0) {
			lower.pop();
		}
		lower.push(coords[i]);
	}

	//process the upper hull
	var upper = [];
	for (var i = coords.length - 1; i >= 0; i--) {
		while (upper.length >= 2 && self.crossProduct(upper[upper.length - 2], upper[upper.length - 1], coords[i]) <= 0) {
			upper.pop();
		}
		upper.push(coords[i]);
	}

	upper.pop();
	lower.pop();

	var hull = lower.concat(upper);

	return hull;
};

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

	var hull = self.convexHull(points);

	//wrap around to meet GeoJSON polygon specification
	hull.push(hull[0]);

	return { type: "Feature", geometry: { type:"Polygon", coordinates: [[hull]]}, properties: {} };

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
			if (self.inRing(pointFeature.geometry.coordinates, polys[i][0])) {
				var k = 1;
				while (k < polys[i].length) {
					if (self.inRing(pointFeature.geometry.coordinates, polys[i][k])) {
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
 * Returns the bounding box of a geoJson object.
 * @param geoJSON {GeoJSON} the GeoJSON object from which to obtain the bounding box.
 * @return {Array} The bounding box as the array: [minx, miny, maxx, maxy] .
*/
 Triad.prototype.getBBox = function(geoJSON) {
 	
	//Obtains a minx, miny, maxx, maxy bounding box from a geojson coordinate array. Recursive if needed.
	var getMinMaxCoord = function(currMinMaxBBox, coords) {
		if (coords.length === 2 && !Array.isArray(coords[0])) {
			if (coords[0] < currMinMaxBBox[0]) {
				currMinMaxBBox[0] = coords[0];
			}
			if (coords[1] < currMinMaxBBox[1]) {
				currMinMaxBBox[1] = coords[1];
			}
			if (coords[0] > currMinMaxBBox[2]) {
				currMinMaxBBox[2] = coords[0];
			}
			if (coords[1] > currMinMaxBBox[3]) {
				currMinMaxBBox[3] = coords[1];
			}
		} else {
			for (var i = 0; i < coords.length; i++) {
				getMinMaxCoord(currMinMaxBBox, coords[i]);
			}
		}
	};

 	var minx = Number.MAX_VALUE;
 	var miny = Number.MAX_VALUE;
 	var maxx = -Number.MAX_VALUE;
 	var maxy = -Number.MAX_VALUE;

 	var bbox = [minx, miny, maxx, maxy];
 	
 	var coords;

 	//checks for FeatureCollection, GeometryCollection, Feature, then points, lines, etc.
 	if (geoJSON.type && geoJSON.type === "FeatureCollection") {
 		for (var i = 0; i < geoJSON.features.length; i++) {
 			coords = geoJSON.features[i].geometry.coordinates;
 			getMinMaxCoord(bbox, coords);
 		}
 	} else if (geoJSON.type  && geoJSON.type === "GeometryCollection") {
 		for (var i = 0; i < geoJSON.geometries.length; i++) {
 			coords = geoJSON.geometries[i].coordinates;
 			getMinMaxCoord(bbox, coords);
 		}
 	} else if (geoJSON.type && geoJSON.type === "Feature") {
 		coords = geoJSON.geometry.coordinates;
 		getMinMaxCoord(bbox, coords);
 	} else if (geoJSON.type) {
 		coords = geoJSON.coordinates;
 		getMinMaxCoord(bbox, coords);
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
 * @param p {Array}
 * @param q {Array}
 * @param r {Array}
 * @return {Number} < 0 if left, 0 if on the line, > 0 if to the right
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

	//tracking data structure of coord objects {coord, inside}
	var processedCoords = [];

	//holds the clipped coords we will stuff into a LineString GeoJSON object
	var clippedCoords = [];

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

	//for each individual linestring
	for (var i = 0; i < line.length; i++) {

		//for each linestring position (vertex)
		for (var j = 0; j < line[i].length; j++) {
			var startVertex = line[i][j];
			var endVertex = line[i][j+1];
			var linearRings = gjsPoly.geometry.coordinates;
			for (var k = 0; k < linearRings.length; k++) {
				//does this vertex lie within the linear ring?
				if (self.inRing(startVertex, linearRings[k])) {
					if (k === 0) {
						//it's not in a hole
						processedCoords.push({ 
							coord: [startVertex[0], startVertex[1]],
							inside: true
						});
					} else {
						//it's in a hole
						processedCoords.push({ 
							coord: [startVertex[0], startVertex[1]],
							inside: false
						});
					}
				} else {
					//it's outside the poly altogether
					processedCoords.push({ 
						coord: [startVertex[0], startVertex[1]],
						inside: false
					});
				}
			}
		}
	}

	//Now loop though the processedCoords. If one has inside = true and the other false,
	//then that line segment intersects a polygon edge. Get the point of
	//intersection and deal with it and keep track of holes and lines that weave in and out of the poly!
	var inHole = true;
	for (var i = 0; i < processedCoords.length; i++) {
		if (i < processedCoords.length - 1) {
			//if this vertex is inside or the next one is inside...
			if (processedCoords[i].inside || processedCoords[i + 1].inside) {
				
				//if both are not inside...
				if (!processedCoords[i].inside && processedCoords[i+1].inside) {
					
					//get the point of intersection
					var coord = getIntersectionPointOfLineToPoly([processedCoords[i].coord, processedCoords[i+1].coord], gjsPoly);
					
					//if the startvertex is inside and we are at the beginning of the linestring, add it.
					if (processedCoords[i].inside) {
						//push the intersection vertex
						clippedCoords.push(processedCoords[i]);
						clippedCoords.push(coord);
					} else {
						clippedCoords.push(coord);
					}
				} else {
					//both of these points are inside the poly. add them
					clippedCoords.push(processedCoords[i].coord);
				}
			} 
		} else {
			//...
		}
	}
};

Triad.prototype.cloneObject = function(object) {
	var strObj = JSON.stringify(object);
	return JSON.parse(strObj);
};

