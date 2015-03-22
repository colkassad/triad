
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
 * Constructs a GeoJSON Polygon Feature from a GeoJSON FeatureCollection of points.
 * 
 */
 Triad.prototype.getPolygon = function(pointFeatureCollection) {

 };

 Triad.prototype.inside = function(pointFeature, polygonFeature) {
 	var self = this;
 	var polys = polygonFeature.geometry.coordinates;
 	if (polygonFeature.geometry.type === 'Polygon') {
 		polys = [polys]; //handle multipolygon and polygon
 	}

 	//check for a bbox property. If there is one, 
 	//assume it is correct and check if the point intersects the bbox first.
 	var bbox;
 	var intersectsBBox = true;
 	if (polygonFeature.bbox) {
 		bbox = polygonFeature.bbox;
 	}
 	if (polygonFeature.geometry.bbox) {
 		bbox = polygonFeature.geometry.bbox;
 	}
 	if (bbox) {
 		var x = pointFeature.geometry.coordinates[0];
 		var y = pointFeature.geometry.coordinates[1];
 		if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) {
 			intersectsBBox = false;
 		}
 	}

 	if (intersectsBBox) {
		for (var i = 0; i < polys.length; i++) {
			if (self.inRing(pointFeature, polys[i][0])) {
				var k = 1;
				while (k < polys[i].length) {
					if (self.inRing(pointFeature, polys[i][k])) {
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


 Triad.prototype.inRing = function(pointFeature, linearRing) {
	var insideRing = false;
	for (var i = 0, j = linearRing.length - 1 ; i < linearRing.length; j = i++) {
		if (((linearRing[i][1]>pointFeature.geometry.coordinates[1]) != 
			(linearRing[j][1]>pointFeature.geometry.coordinates[1])) &&
				(pointFeature.geometry.coordinates[0] < (linearRing[j][0]-linearRing[i][0]) * 
					(pointFeature.geometry.coordinates[1]-linearRing[i][1]) / 
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
 Triad.prototype.getEnvelope = function(geoJSON) {
 	
 	var minx = Number.MAX_VALUE;
 	var miny = Number.MAX_VALUE;
 	var maxx = Number.MIN_VALUE;
 	var maxy = Number.MIN_VALUE;

 	var bbox = [minx, miny, maxx, maxy];

 	var features = geoJSON;

 	//treat anything as a FeatureCollection
 	//TODO: handle Geometries and GeometryCollections
 	if (geoJSON.type === "Feature") {
 		features = [JSON.parse(JSON.stringify(geoJSON))];
 	} else {
 		features = geoJSON.features;
 	}

 	for (var i = 0; i < features.length; i++) {
 		if (features[i].geometry.type === "Point") {
 			bbox = this.expandBBox([features[i].geometry.coordinates], bbox);
	 	} else if (features[i].geometry.type === "MultiPoint" || features[i].geometry.type === "LineString") {
	 		bbox = this.expandBBox(features[i].geometry.coordinates, bbox);
	 	} else if (features[i].geometry.type === "MuliLineString" || features[i].geometry.type === "Polygon") {
	 		for (var j = 0; j < features[i].geometry.coordinates.length; j++) {
	 			bbox = this.expandBBox(features[i].geometry.coordinates[j], bbox);
	 		}
	 	} else if (features[i].geometry.type === "MultiPolygon") {
	 		for (var j = 0; j < features[i].geometry.coordinates.length; j++) {
	 			for (var k = 0; k < features[i].geometry.coordinates[j].length; j++) {
	 				bbox = this.expandBBox(features[i].geometry.coordinates[j][k], bbox);
	 			}
	 		}
	 	}
 	}

 	return { 
		type: "Feature", 
		geometry: {
			type: "Polygon", 
			coordinates: [
				[
 					[bbox[0], bbox[1]], 
 					[bbox[0], bbox[3]], 
 					[bbox[2], bbox[3]], 
 					[bbox[2], bbox[1]], 
 					[bbox[0], bbox[1]]
				]
			]
		}, 
		properties: {}
	};
 };

//return [minx, miny, maxx, maxy] of an envelope polygon feature
 Triad.prototype.getBBox = function(featureEnvelope) {
 	var coords = JSON.parse(JSON.stringify(featureEnvelope.geometry.coordinates));
 	return [[[coords[0]]], [[coords[1]]], [[coords[2]]], [[coords[3]]]];
 };

/*
 * Expands a bounding box.
 * @param coords {Array} coordinates to try and expand with.
 * @param origBBox {Array} the bounding box to expand.
 * @return {Array} the original bounding box, modified to include the minx, miny, maxx, and maxy of coords
*/
 Triad.prototype.expandBBox = function(coords, origBBox) {
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
 * @return {Number} less than zero if left, 0 if on the line, > 0 if to the right
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
	for (var i = 1; i < features.length; i++) {
		if (featureCollection.features[i].geometry.type !== firstGeom) {
			return false;
		}
	}
	return true;
};