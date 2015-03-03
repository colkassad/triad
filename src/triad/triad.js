
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

 };

 Triad.prototype.getEnvelope = function(feature) {
 	
 	var minx = Number.MAX_VALUE;
 	var miny = Number.MAX_VALUE;
 	var maxx = Number.MIN_VALUE;
 	var maxy = Number.MIN_VALUE;

 	var bbox = [minx, miny, maxx, maxy];

 	if (feature.geometry.type === "Point") {
 		return feature;
 	} else if (feature.geometry.type === "MultiPoint" || feature.geometry.type === "LineString") {
 		bbox = this.expandBBox(feature.geometry.coordinates, bbox);
 	} else if (feature.geometry.type === "MuliLineString" || feature.geometry.type === "Polygon") {
 		for (var i = 0; i < feature.geometry.coordinates.length; i++) {
 			bbox = this.expandBBox(feature.geometry.coordinates[i], bbox);
 		}
 	} else if (feature.geometry.type === "MultiPolygon") {
 		for (var i = 0; i < feature.geometry.coordinates.length; i++) {
 			for (var j = 0; j < feature.geometry.coordinates[i].length; j++) {
 				bbox = this.expandBBox(feature.geometry.coordinates[i][j], bbox);
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
*/
Triad.prototype.crossProduct = function(p, q, r) {
	return (q[0] - p[0]) * 
		(r[1] - p[1]) - 
		(q[1] - p[1]) * 
		(r[0] - p[0]);
};