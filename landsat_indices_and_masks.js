// Define Landsat indices functions

/**
 * Adds Bare Soil Index (BSI) band to an image.
 * BSI = ((Red + SWIR) - (NIR + Blue)) / ((Red + SWIR) + (NIR + Blue))
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the BSI band added.
 */
exports.addBSI = function(image) {
  var BSI = image.expression(
    '((Red + SWIR) - (NIR + Blue)) / ((Red + SWIR) + (NIR + Blue))', {
      'NIR': image.select('SR_B4'),
      'Red': image.select('SR_B3'),
      'Blue': image.select('SR_B1'),
      'SWIR': image.select('SR_B5')
    }).rename('BSI');
  return image.addBands([BSI]);
};

/**
 * Adds Disease Stress Water Index (DSWI) band to an image.
 * DSWI = (NIR + Green) / (Red + SWIR)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the DSWI band added.
 */
exports.addDSWI = function(image) {
  var DSWI = image.expression(
    '(NIR + Green) / (Red + SWIR)', {
      'NIR': image.select('SR_B4'),
      'Green': image.select('SR_B2'),
      'Red': image.select('SR_B3'),
      'SWIR': image.select('SR_B5'),
    }).rename('DSWI');
  return image.addBands([DSWI]);
};

/**
 * Adds Distance Red & SWIR (DRS) band to an image.
 * DRS = sqrt((RED^2) + (SWIR^2))
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the DRS band added.
 */
exports.addDRS = function(image) {
  var DRS = image.expression(
    'sqrt(((RED) * (RED)) + ((SWIR) * (SWIR)))', {
      'SWIR': image.select('SR_B5'),
      'RED': image.select('SR_B3'),
    }).rename('DRS');
  return image.addBands([DRS]);
};

/**
 * Adds Enhanced Vegetation Index (EVI) band to an image.
 * EVI = 2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the EVI band added.
 */
exports.addEVI = function(image) {
  var EVI = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': image.select('SR_B4'),
      'RED': image.select('SR_B3'),
      'BLUE': image.select('SR_B1')
    }).rename('EVI');
  return image.addBands([EVI]);
};

/**
 * Adds Leaf Area Index (LAI) band to an image.
 * LAI = 3.618 * EVI - 0.118
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the LAI band added.
 */
exports.addLAI = function(image) {
  var LAI = image.expression(
    '3.618 * (EVI) - 0.118', {
      'EVI': image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
          'NIR': image.select('SR_B4'),
          'RED': image.select('SR_B3'),
          'BLUE': image.select('SR_B1')
        })
    }).rename('LAI');
  return image.addBands([LAI]);
};

/**
 * Adds Normalized Difference Moisture Index (NDMI) band to an image.
 * NDMI = (NIR - SWIR) / (NIR + SWIR)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDMI band added.
 */
exports.addNDMI = function(image) {
  var NDMI = image.expression(
    '(NIR - SWIR) / (NIR + SWIR)', {
      'NIR': image.select('SR_B4'),
      'SWIR': image.select('SR_B5'),
    }).rename('NDMI');
  return image.addBands([NDMI]);
};

/**
 * Adds Normalized Difference Snow Index (NDSI) band to an image.
 * NDSI = (Green - SWIR) / (Green + SWIR)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDSI band added.
 */
exports.addNDSI = function(image) {
  var NDSI = image.normalizedDifference(['SR_B2', 'SR_B5']).rename('NDSI');
  return image.addBands([NDSI]);
};

/**
 * Adds Normalized Difference Vegetation Index (NDVI) band to an image.
 * NDVI = (NIR - Red) / (NIR + Red)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDVI band added.
 */
exports.addNDVI = function(image) {
  var NDVI = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
  return image.addBands([NDVI]);
};

/**
 * Adds Normalized Distance Red & SWIR (NDRS) band to an image.
 * NDRS = (DRS - DRSmin) / (DRSmax - DRSmin)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDRS band added.
 */
exports.addNDRS = function(image) {
  var NDRS = image.expression(
    '(DRS - DRSmin) / (DRSmax - DRSmin)', {
      'DRS': image.select('DRS'),
      'DRSmin': 0, // Placeholder value
      'DRSmax': 1  // Placeholder value
    }).rename('NDRS');
  return image.addBands([NDRS]);
};

/**
 * Adds Soil Adjusted Vegetation Index (SAVI) band to an image.
 * SAVI = ((NIR - Red) / (NIR + Red + 0.428)) * 1.428
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the SAVI band added.
 */
exports.addSAVI = function(image) {
  var SAVI = image.expression(
    '((NIR - R) / (NIR + R + 0.428)) * (1.428)', {
      'NIR': image.select('SR_B4'),
      'R': image.select('SR_B3')
    }).rename('SAVI');
  return image.addBands([SAVI]);
};

/**
 * Adds Shadow Index (SI) band to an image.
 * SI = (1 - Blue) * (1 - Green) * (1 - Red)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the SI band added.
 */
exports.addSI = function(image) {
  var SI = image.expression(
    '(1 - blue) * (1 - green) * (1 - red)', {
      'blue': image.select('SR_B1'),
      'green': image.select('SR_B2'),
      'red': image.select('SR_B3')
    }).rename('SI');
  return image.addBands([SI]);
};

// Define Landsat masks functions

/**
 * Masks clouds and snow from Landsat images.
 * @param {Object} image - The image to process.
 * @returns {Object} The image with clouds and snow masked.
 */
exports.mask_cloud_snow = function(image) {
  var qa = image.select('QA_PIXEL');
  var cloudsBitMask = 1 << 3; // Cloud mask
  var cloudShadowBitMask = 1 << 4; // Cloud shadow mask
  var snowBitMask = 1 << 5; // Snow mask
  var mask = qa.bitwiseAnd(cloudsBitMask).eq(0)
             .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0))
             .and(qa.bitwiseAnd(snowBitMask).eq(0));
  return image.updateMask(mask);
};

/**
 * Masks clouds from Landsat images.
 * @param {Object} image - The image to process.
 * @returns {Object} The image with clouds masked.
 */
exports.mask_cloud = function(image) {
  var qa = image.select('QA_PIXEL');
  var cloudsBitMask = 1 << 3; // Cloud mask
  var cloudShadowBitMask = 1 << 4; // Cloud shadow mask
  var mask = qa.bitwiseAnd(cloudsBitMask).eq(0)
             .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0));
  return image.updateMask(mask);
};

/**
 * Adds a snow band based on NDSI values to an image.
 * Snow band is true where NDSI > 0.4.
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the snow band added.
 */
exports.addSnow = function(image) {
  var snow = image.normalizedDifference(['SR_B2', 'SR_B5']).gt(0.4).rename('snow');
  return image.addBands([snow]);
};



// Create a binary mask for identifying stressed forest pixels
// based on the NDRS index.

// Import required masks module
var masks = require("users/bgcasey/functions:masks");

// Define the band name and threshold for stressed pixel classification
var bandName = 'NDRS';
var threshold = 0.5;

/**
 * Creates a binary mask to identify stressed forest pixels.
 * Masks out non-forest pixels, applies a threshold to the NDRS band.
 * Pixels above the threshold are considered stressed.
 * 
 * @param {Object} image - The image to process.
 * @returns {Object} Image with an added binary mask band ('NDRS_stressed').
 */
exports.createBinaryMask = function(image) {
  // Mask non-forest pixels, replace with zero for continuous raster
  var maskedImage = masks.maskByLandcover(image).unmask(0);

  // Select the NDRS band from the masked image
  var band = maskedImage.select(bandName);
  
  // Apply threshold to identify stressed pixels
  var binaryMask = band.gt(threshold).rename('NDRS_stressed');
  
  // Add binary mask as a new band to the original image
  var imageWithMask = image.addBands(binaryMask);

  return imageWithMask;
};