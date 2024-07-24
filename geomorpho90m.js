/*
 * title: "Extract Geomorpho90m"
 * author: "Brendan Casey"
 * created: "2024-07-01"
 * description:
 * This script loads multiple geomorphometric variables from the 
 * Geomorpho90m dataset, mosaics them, clips them to a specified area 
 * of interest (aoi), and combines them into a single multiband image.
 *
 * Geomorpho90m Citation:
 * Amatulli, Giuseppe, Daniel McInerney, Tushar Sethi, Peter Strobl, 
 * and Sami Domisch. "Geomorpho90m, empirical evaluation and accuracy 
 * assessment of global high-resolution geomorphometric layers." 
 * Scientific Data 7, no. 1 (2020): 1-18.
 */

// Define the base path
var basePath = "projects/sat-io/open-datasets/Geomorpho90m/";

// Define the collection names
var collectionNames = [
  "aspect", // Aspect
  "aspect-cosine", // Aspect-Cosine
  "aspect-sine", // Aspect-Sine
  "eastness", // Eastness
  "northness", // Northness
  "cti", // Compound Topographic Index (CTI)
  "elev-stdev", // Elevation Standard Deviation
  "vrm", // Vector Ruggedness Measure (VRM)
  "roughness", // Roughness
  "tri", // Terrain Ruggedness Index (TRI)
  "tpi", // Topographic Position Index (TPI)
  "dev-magnitude", // Deviation Magnitude
  "dev-scale", // Deviation Scale
  "rough-magnitude", // Multiscale Roughness Magnitude
  "rough-scale" // Multiscale Roughness Scale
];

/**
 * Load, mosaic, clip, and rename an image collection.
 *
 * @param {string} collectionName - The name of the collection.
 * @param {ee.Geometry} aoi - The area of interest.
 * @return {ee.Image} The processed image.
 */
function loadAndProcess(collectionName, aoi) {
  var image = ee.ImageCollection(basePath + collectionName)
    .mosaic()
    .clip(aoi)
    .rename(collectionName);
  return image;
}

/**
 * Process all collections and combine them into a single multiband image.
 *
 * @param {ee.Geometry} aoi - The area of interest.
 * @return {ee.Image} The combined image.
 */
function getGeomorpho90m(aoi) {
  var elevation = ee.Image('MERIT/DEM/v1_0_3')
                  .clip(aoi)
                  .select(['dem'], ['elev']);
  var geomorpho90m = loadAndProcess(collectionNames[0], aoi);
  for (var i = 1; i < collectionNames.length; i++) {
    geomorpho90m = geomorpho90m.addBands(
      loadAndProcess(collectionNames[i], aoi)
    );
  }
  return geomorpho90m.addBands(elevation);
}

// Export the function
exports.getGeomorpho90m = getGeomorpho90m;

// Example usage of the getGeomorpho90m function
// // Define an area of interest (aoi) as a GeoJSON geometry
// var aoi = ee.Geometry.Polygon([
//   [[-123.574829, 45.523064], [-123.574829, 45.530954], 
//   [-123.561024, 45.530954], [-123.561024, 45.523064]]
// ]);

// // Call the getGeomorpho90m function with the defined aoi
// var geomorpho90mImage = getGeomorpho90m(aoi);

// print("geomorpho90m", geomorpho90m)

// var palettes = require('users/gena/packages:palettes')
// Map.addLayer(geomorpho90m.select('cti'), 
//               {min: -3, max: 6, palette: palettes.cmocean.Algae[7]}, 
//               'Compound Topographic Index (CTI)')
