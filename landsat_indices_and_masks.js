/**
 * title: Landsat Indices and Masks Functions
 * author: Brendan Casey
 * areated: 2024-06-01
 * description:
 * This script defines functions to calculate various spectral 
 * indices and apply masks to a time-series of Landsat images. 
 * The indices include vegetation, moisture, and stress-related 
 * indices. Masks are used for cloud, snow, and QA filtering.
 */
 
// var utils = require("users/bgcasey/functions:utils");

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
 * Adds Green Normalized Difference Vegetation Index (GNDVI) band to an image.
 * Gitelson and Merzlyak (1998)
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added NDVI band.
 */
exports.addGNDVI = function(image) {
  var GNDVI = image.normalizedDifference(['SR_B4', 'SR_B2'])
    .rename('GNDVI');
  return image.addBands([GNDVI])
    .copyProperties(image, ['system:time_start']);
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
 * Adds Normalized Burn Ratio (NBR) band to an image.
 * NDMI = (NIR - SWIR) / (NIR + SWIR)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDMI band added.
 */
exports.addNBR = function(image) {
  var NBR = image.expression(
    '(NIR - SWIR2) / (NIR + SWIR2)', {
      'NIR': image.select('SR_B4'),
      'SWIR2': image.select('SR_B7'),
    }).rename('NBR');
  return image.addBands([NBR]);
};



/**
 * Adds Normalized Difference Moisture Index (NDMI) band to an image.
 * NDMI = (NIR - SWIR) / (NIR + SWIR)
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDMI band added.
 */
exports.addNDMI = function(image) {
  var NDMI = image.expression(
    '(NIR - SWIR1) / (NIR + SWIR1)', {
      'NIR': image.select('SR_B4'),
      'SWIR1': image.select('SR_B5'),
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
 * Adds Normalized Difference Water Index (NDWI) band to an image.
 * @param {ee.Image} image - The input image.
 * @returns {ee.Image} The image with the added NDWI band.
 */
exports.addNDWI = function(image) {
  var NDWI = image.expression(
    '(Green - NIR) / (Green + NIR)', {
      'NIR': image.select('SR_B4'),
      'Green': image.select('SR_B2'),
    }).rename('NDWI');
  return image.addBands([NDWI]);
};

/**
 * Adds Normalized Distance Red & SWIR (NDRS) band 
 * to an image. Assumes the presence of a DRS band and applies 
 * a forest mask to get min and max DRS of forested pixels.
 * It calls a function that gets forest data from
 * https://gee-community-catalog.org/projects/ca_lc/.
 * 
 * @param {Object} image - The image to process.
 * @returns {Object} The image with the NDRS band added.
 */
exports.addNDRS = function(image) {
  // Define the area of interest (AOI) using the image's geometry
  var aoi = image.geometry();
  
  // Extract the year from the image properties
  var year = ee.Number.parse(image.get('year'));
  
  // Define start and end dates based on the year
  var startDate = ee.Algorithms.If(
    year.gte(2019),
    ee.Date('2019-01-01'),
    // Create start date of "year-01-01"
    ee.Date(year.format().cat('-01-01')) 
  );
  
  var endDate = ee.Algorithms.If(
    year.gte(2019),
    ee.Date('2019-12-31'),
    // Create end date of "year-12-31"
    ee.Date(year.format().cat('-12-31')) 
  );
    
    // Load landcover data for the specified period
    var forest_lc = require(
      "users/bgcasey/functions:annual_forest_land_cover");
    var lcCollection = forest_lc.lc_fn(startDate, endDate, aoi);
    var landcoverImage = ee.Image(lcCollection.first())
      .select('forest_lc_class');
    
    // Create a mask for forest pixels
    var forestMask = landcoverImage.remap([210, 220, 230], [1, 1, 1], 0);
  
    // Apply the forest mask to the DRS band
    var DRS = image.select('DRS');
    var maskedDRS = DRS.updateMask(forestMask);
    
    // Calculate min and max of DRS for forest pixels
    var minMax = maskedDRS.reduceRegion({
      reducer: ee.Reducer.minMax(),
      geometry: aoi.bounds(),
      scale: 1000,
      maxPixels: 1e10,
      bestEffort: true,
      tileScale: 8
    });
    
    // Extract the min and max values
    var DRSmin = ee.Number(minMax.get('DRS_min'));
    var DRSmax = ee.Number(minMax.get('DRS_max'));
    
    // Calculate NDRS using the min and max values
    var NDRS = image.expression(
      '(DRS - DRSmin) / (DRSmax - DRSmin)', {
        'DRS': DRS,
        'DRSmin': DRSmin,
        'DRSmax': DRSmax
      }).rename('NDRS');
    
    // Add the NDRS band to the image
    return image.addBands(NDRS);
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




/**
 * Masks a Landsat image based on QA_RADSAT Bit 9.
 * Bit 9: 0 = Pixel present, 1 = Detector doesn't have a value
 * @param {ee.Image} image - The Landsat image to mask.
 * @return {ee.Image} The masked image.
 */
exports.mask_qa9 = function(image) {
  // Extract the QA_RADSAT band.
  var qaBand = image.select('QA_RADSAT');

  // Bit 9 is used to indicate pixels that are present (0) or where the detector doesn't have a value (1).
  // Create a mask to identify pixels with Bit 9 set to 0.
  var mask = qaBand.bitwiseAnd(1 << 9).eq(0);

  // Apply the mask to the image, keeping only pixels where Bit 9 is 0.
  return image.updateMask(mask);
}

exports.maskFill = function(image) {
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');

  // Bit 0, when set to 0, indicates a valid pixel; when set to 1, indicates a fill pixel.
  var mask = qa.bitwiseAnd(1).eq(0);

  // Update the image mask to exclude fill pixels.
  return image.updateMask(mask);
}



// Create a binary mask for identifying stressed forest pixels
// based on the NDRS index.

// Import required masks module
var masks = require("users/bgcasey/functions:masks");

// Define the band name and threshold for stressed pixel classification
var bandName = 'NDRS';
var threshold = 0.5;

/**
 * Stressed forest pixels
 * Creates a binary mask to identify stressed forest pixels.
 * Masks out non-forest pixels, applies a threshold to the NDRS band.
 * Pixels above the threshold are considered stressed.
 * 
 * @param {Object} image - The image to process.
 * @returns {Object} Image with an added binary mask band ('NDRS_stressed').
 */
exports.NDRS_stressed = function(image) {
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

/**
 * Apply scaling factors to Landsat images 
 * 
 * @param {ee.Image} image - The input Landsat image to be scaled.
 *                           Expected to contain bands named
 *                           according to the standard Landsat
 *                           naming convention (e.g., 'SR_B.' for
 *                           surface reflectance bands and 'ST_B6'
 *                           for the thermal band).
 * 
 * @returns {ee.Image} - The input image with optical and thermal
 *                       bands scaled. 
 */
exports.applyScaleFactors = function(image) {
  // Apply scaling factors to optical bands
  // Optical bands are multiplied by 0.0000275 and then have
  // 0.2 subtracted from them
  var opticalBands = image.select('SR_B.')
                          .multiply(0.0000275).add(-0.2);
  
  // Apply scaling factor to thermal band (ST_B6)
  // The thermal band is multiplied by 0.00341802 and then has
  // 149.0 added to it
  var thermalBand = image.select('ST_B6')
                         .multiply(0.00341802).add(149.0);
  
  // Add the scaled bands back to the image, replacing the
  // original bands
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
};