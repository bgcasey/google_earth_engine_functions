/**
 * Title: "Calculate TWI"
 * Author: "Brendan Casey"
 * Created: "2024-07-01"
 * Description:
 * Calculate the Topographic Wetness Index (TWI) for a given AOI.
 * TWI: ln(α / tan(β)), where α is upslope drainage area, β is slope.
 *
 * Data citation: Yamazaki D., D. Ikeshima, J. Sosa, P.D. Bates, 
 * G.H. Allen, T.M. Pavelsky. MERIT Hydro: A high-resolution global 
 * hydrography map based on latest topography datasets Water 
 * Resources Research, vol.55, pp.5053-5073, 2019, 
 * doi:10.1029/2019WR024873
 * 
 * @param {ee.Geometry} aoi - Area of interest for TWI calculation.
 * @return {ee.Image} The calculated TWI image.
 */
 
function calculateTWI(aoi) {
  // Load upslope area, clip to AOI, select 'upa' band
  var upslopeArea = ee.Image("MERIT/Hydro/v1_0_1")
    .clip(aoi)
    .select('upa');

  // Load elevation, clip to AOI, select 'elv' band
  var elevation = ee.Image("MERIT/Hydro/v1_0_1")
    .clip(aoi)
    .select('elv');

  // Calculate slope from elevation
  var slope = ee.Terrain.slope(elevation);

  // Convert upslope area from km^2 to m^2
  upslopeArea = upslopeArea.multiply(1000000).rename('UpslopeArea');

  // Convert slope from degrees to radians
  var slopeRad = slope.divide(180).multiply(Math.PI).rename('slopeRad');

  // Calculate TWI: ln(α / tan(β))
  var TWI = upslopeArea.divide(slopeRad.tan()).log().rename('twi');

  return TWI;
}

// Export the function
exports.calculateTWI = calculateTWI;

// Example usage:
// // Define the AOI 
// var aoi = ee.Geometry.Polygon([
//   [
//     [-113.60000044487279, 55.15000133914695],
//     [-113.60000044487279, 55.35000089418191],
//     [-113.15000137891523, 55.35000086039801],
//     [-113.15000138015347, 55.15000133548429],
//     [-113.60000044487279, 55.15000133914695]
//   ]
// ]);
// var twi = calculateTWI(aoi);
// Map.addLayer(twi, {}, 'TWI');