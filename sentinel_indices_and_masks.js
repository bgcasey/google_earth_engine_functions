/**
 * Title: Sentinel-2 Indices and Masks Functions
 * Date: 2024-06-01
 * Author: Brendan Casey
 * 
 * Summary:
 * This script defines functions to calculate various spectral 
 * indices and apply masks to a time series of Sentinel-2 images. 
 * The indices include vegetation, moisture, and stress-related 
 * indices. Masks are used for cloud, snow, and QA filtering.
 */
 
/**
 * Adds Disease Stress Water Index (DSWI) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added DSWI band.
 */
 
exports.addDSWI = function(image) {
  var DSWI = image.expression(
    '(NIR + Green) / (Red + SWIR)', {
      'NIR': image.select('B8'),
      'Green': image.select('B3'),
      'Red': image.select('B4'),
      'SWIR': image.select('B11'),  
    }).rename('DSWI');
  return image.addBands([DSWI]);
};

/**
 * Adds Distance Red & SWIR (DRS) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added DRS band.
 */
exports.addDRS = function(image) {
  var DRS = image.expression(
    'sqrt(((RED) * (RED)) + ((SWIR) * (SWIR)))', {
      'SWIR': image.select('B11'),
      'RED': image.select('B4'),
    }).rename('DRS');
  return image.addBands([DRS])
    .copyProperties(image, ['system:time_start']);
};

/**
 * Adds Normalized Difference Red-edge Index 3 (NDRE3) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added NDRE3 band.
 */
exports.addNDRE3 = function(image) {
  var NDRE3 = image.expression(
    '(RedEdge4 - RedEdge3) / (RedEdge4 + RedEdge3)', {
      'RedEdge4': image.select('B8A'),
      'RedEdge3': image.select('B7'),
    }).rename('NDRE3');
  return image.addBands([NDRE3]);
};

/**
 * Adds Normalized Difference Vegetation Index (NDVI) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added NDVI band.
 */
exports.addNDVI = function(image) {
  var NDVI = image.normalizedDifference(['B8', 'B4'])
    .rename('NDVI');
  return image.addBands([NDVI])
    .copyProperties(image, ['system:time_start']);
};

/**
 * Adds Normalized Difference Water Index (NDWI) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added NDWI band.
 */
exports.addNDWI = function(image) {
  var NDWI = image.expression(
    '(NIR - SWIR) / (NIR + SWIR)', {
      'NIR': image.select('B8A'),
      'SWIR': image.select('B11'),
    }).rename('NDWI');
  return image.addBands([NDWI]);
};

// exports.addNDRS = function(image) {
//   // Ensure the DRS band is present
//   var hasDRS = image.bandNames().contains('DRS');
//   image = ee.Image(ee.Algorithms.If(hasDRS, image, ee.Image.constant(0).rename('DRS')));

//   // Define the area of interest (AOI) using the image's geometry
//   var aoi = image.geometry();

//   // Extract the year from the image properties
//   var year = ee.Number.parse(image.get('year'));

//   // Define start and end dates based on the year
//   var startDate = ee.Date(ee.Algorithms.If(
//     year.gt(2019), '2019-01-01', image.get('start_date')));
//   var endDate = ee.Date(ee.Algorithms.If(
//     year.gt(2019), '2019-12-31', image.get('end_date')));

//   // Load landcover data for the specified period
//   var forest_lc = require(
//     "users/bgcasey/functions:annual_forest_land_cover");
//   var lcCollection = forest_lc.lc_fn(startDate, endDate, aoi);
//   var landcoverImage = ee.Image(lcCollection.first())
//     .select('forest_lc_class');

//   // Create a mask for forest pixels
//   var forestMask = landcoverImage.remap([210, 220, 230], [1, 1, 1], 0);

//   // Apply the forest mask to the DRS band
//   var DRS = image.select('DRS');
//   var maskedDRS = DRS.updateMask(forestMask);

//   // Calculate min and max of DRS for forest pixels
//   var minMax = maskedDRS.reduceRegion({
//     reducer: ee.Reducer.minMax(),
//     geometry: aoi.bounds(),
//     scale: 1000,
//     maxPixels: 1e10,
//     bestEffort: true,
//     tileScale: 8
//   });

//   // Extract the min and max values
//   var DRSmin = ee.Number(minMax.get('DRS_min'));
//   var DRSmax = ee.Number(minMax.get('DRS_max'));

//   // Ensure min and max are valid numbers
//   DRSmin = ee.Algorithms.If(DRSmin, DRSmin, 0);
//   DRSmax = ee.Algorithms.If(DRSmax, DRSmax, 1);

//   // Calculate NDRS using the min and max values
//   var NDRS = image.expression(
//     '(DRS - DRSmin) / (DRSmax - DRSmin)', {
//       'DRS': DRS,
//       'DRSmin': ee.Number(DRSmin),
//       'DRSmax': ee.Number(DRSmax)
//     }).rename('NDRS');

//   // Add the NDRS band to the image
//   return image.addBands(NDRS);
// };

/**
 * Creates a binary mask based on the NDRS threshold to 
 * classify stressed and not stressed forest pixels.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added binary mask band.
 */
exports.createBinaryMask = function(image) {
  var masks = require("users/bgcasey/functions:masks");
  var maskedImage = masks.maskByLandcover(image).unmask(0);
  var band = maskedImage.select(bandName);
  var binaryMask = band.gt(threshold).rename('NDRS_stressed');
  var imageWithMask = image.addBands(binaryMask);
  return imageWithMask;
};

/**
 * Adds Ratio Drought Index (RDI) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added RDI band.
 */
exports.addRDI = function(image) {
  var RDI = image.expression(
    'SWIR2 / RedEdge4', {
      'SWIR2': image.select('B12'),
      'RedEdge4': image.select('B8A'),
    }).rename('RDI');
  return image.addBands([RDI]);
};



/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
exports.maskS2clouds = function(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}
