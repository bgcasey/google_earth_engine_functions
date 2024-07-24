/**
 * Title: "Get Canopy Height"
 * Author: "Brendan Casey"
 * Created: "2024-07-01"
 * Description:
 * Load and combine global canopy height and its standard
 * deviation into a single image for a given AOI.
 * 
 * data citation: Lang, Nico, Walter Jetz, Konrad Schindler, 
 * and Jan Dirk Wegner. "A high-resolution canopy height 
 * model of the Earth." arXiv preprint arXiv:2204.08322 (2022).
 *
 * @param {ee.Geometry} aoi - Area of interest.
 * @return {ee.Image} Combined canopy height and standard
 * deviation image.
 */
 
function get_canopy_data(aoi) {
  // Load canopy height, rename, and clip to AOI
  var canopyHeight = ee.Image('users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1')
    .rename("canopy_height")
    .clip(aoi);

  // Load canopy height standard deviation, rename, and clip
  var canopySD = ee.Image('users/nlang/ETH_GlobalCanopyHeightSD_2020_10m_v1')
    .rename('canopy_standard_deviation')
    .clip(aoi);

  // Combine canopy height and standard deviation bands
  var canopy = canopyHeight.addBands([canopySD]);

  return canopy;
}

// Export the function
exports.get_canopy_data = get_canopy_data;

// Example usage:
// var aoi = ee.Geometry.Polygon([
//   [
//     [-113.60000044487279, 55.15000133914695],
//     [-113.60000044487279, 55.35000089418191],
//     [-113.15000137891523, 55.35000086039801],
//     [-113.15000138015347, 55.15000133548429],
//     [-113.60000044487279, 55.15000133914695]
//   ]
// ]);
//
// var canopy = get_canopy_data(aoi);

// var canopy_vis = {
//   min: 0.0,
//   max: 50.0,
//   palette: ['#010005', '#150b37', '#3b0964', '#61136e', '#85216b', 
//             '#a92e5e', '#cc4248', '#e75e2e', '#f78410', '#fcae12', 
//             '#f5db4c', '#fcffa4'],
// };

// Map.addLayer(canopy.select('canopy_height'), canopy_vis, 'Canopy Height');




