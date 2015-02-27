
function Triad() {

}

/* Outputs a feature collection that is the convex hull of an array of GeoJSON Point Features.
 * @param points {GeoJSON FeatureCollection} An feature collection of GeoJSON Point Features.
 * @return {GeoJSON FeatureCollection} A GeoJSON FeatureCollection representing the convex hull of the input points.
 * Uses the Monotone Chain algorithm: http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
*/
Triad.prototype.convexHull = function(pointFeatureCollection) {
	var self = this;
	
	var points = JSON.stringify(pointFeatureCollection.features);
	points = JSON.parse(points);

	if (points.length === 0) {
		return { type: "FeatureCollection", features: [] };
	} else if (points.length === 1) {
		return { type: "FeatureCollection", features: points };
	}
	points.sort(function(a, b) {
		return q.geometry.coordinates[0] == r.geometry.coordinates[0] ? a.geometry.coordinates[1] - b.geometry.coordinates[1] : a.geometry.coordinates[0] - b.geometry.coordinates[0];
		});

	var lower = [];
	for (var i = 0; i < points.length; i++) {
		while (lower.length >= 2 && self.crossProduct(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
			lower.pop();
		}
		lower.push(points[i]);
	}

	var upper = [];
	for (var i = points.length - 1; i >= 0; i--) {
		while (upper.length >= 2 && self.crossProduct(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
			upper.pop();
		}
		upper.push(points[i]);
	}

	upper.pop();
	lower.pop();

	var features = lower.concat(upper);

	return {type: "FeatureCollection", features: features };

};

/*
 * Returns the cross product of three points, used to determine if r 
 * is to the left or the right of the line through p and q
 * @param p {GeoJSON Point Feature}
 * @param q {GeoJSON Point Feature}
 * @param r {GeoJSON Point Feature}
*/
Triad.prototype.crossProduct = function(p, q, r) {
	return (q.geometry.coordinates[0] - p.geometry.coordinates[0]) * 
		(r.geometry.coordinates[1] - p.geometry.coordinates[1]) - 
		(q.geometry.coordinates[1] - p.geometry.coordinates[1]) * 
		(r.geometry.coordinates[0] - p.geometry.coordinates[0]);
};