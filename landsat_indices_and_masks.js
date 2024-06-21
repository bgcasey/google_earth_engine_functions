// Define Landsat indices functions

// Add Bare Soil Index (BSI) band
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

// Add Disease Stress Water Index (DSWI) band
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

// Add Distance Red & SWIR (DRS) band
exports.addDRS = function(image) {
  var DRS = image.expression(
    'sqrt(((RED) * (RED)) + ((SWIR) * (SWIR)))', {
      'SWIR': image.select('SR_B5'),
      'RED': image.select('SR_B3'),
    }).rename('DRS');
  return image.addBands([DRS]);
};

// Add Enhanced Vegetation Index (EVI) band
exports.addEVI = function(image) {
  var EVI = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': image.select('SR_B4'),
      'RED': image.select('SR_B3'),
      'BLUE': image.select('SR_B1')
    }).rename('EVI');
  return image.addBands([EVI]);
};

// Add Leaf Area Index (LAI) band
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

// Add Normalized Difference Moisture Index (NDMI) band
exports.addNDMI = function(image) {
  var NDMI = image.expression(
    '(NIR - SWIR) / (NIR + SWIR)', {
      'NIR': image.select('SR_B4'),
      'SWIR': image.select('SR_B5'),
    }).rename('NDMI');
  return image.addBands([NDMI]);
};

// Add Normalized Difference Snow Index (NDSI) band
exports.addNDSI = function(image) {
  var NDSI = image.normalizedDifference(['SR_B2', 'SR_B5']).rename('NDSI');
  return image.addBands([NDSI]);
};

// Add Normalized Difference Vegetation Index (NDVI) band
exports.addNDVI = function(image) {
  var NDVI = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
  return image.addBands([NDVI]);
};

// Add Normalized Distance Red & SWIR (NDRS) band
exports.addNDRS = function(image) {
  var NDRS = image.expression(
    '(DRS - DRSmin) / (DRSmax - DRSmin)', {
      'DRS': image.select('DRS'),
      'DRSmin': 0, // Placeholder value
      'DRSmax': 1  // Placeholder value
    }).rename('NDRS');
  return image.addBands([NDRS]);
};

// Add Soil Adjusted Vegetation Index (SAVI) band
exports.addSAVI = function(image) {
  var SAVI = image.expression(
    '((NIR - R) / (NIR + R + 0.428)) * (1.428)', {
      'NIR': image.select('SR_B4'),
      'R': image.select('SR_B3')
    }).rename('SAVI');
  return image.addBands([SAVI]);
};

// Add Shadow Index (SI) band
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

// Mask clouds and snow from Landsat images
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

// Mask clouds from Landsat images
exports.mask_cloud = function(image) {
  var qa = image.select('QA_PIXEL');
  var cloudsBitMask = 1 << 3; // Cloud mask
  var cloudShadowBitMask = 1 << 4; // Cloud shadow mask
  var mask = qa.bitwiseAnd(cloudsBitMask).eq(0)
             .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0));
  return image.updateMask(mask);
};

// Add snow band based on NDSI values
exports.addSnow = function(image) {
  var snow = image.normalizedDifference(['SR_B2', 'SR_B5']).gt(0.4).rename('snow');
  return image.addBands([snow]);
};

// Create a binary mask for stressed and not stressed forest pixels
exports.createBinaryMask = function(image) {
  // Placeholder for complex processing not included in this snippet
  // This is a simplified version
  var binaryMask = image.select('NDRS').gt(0.5).rename('NDRS_stressed');
  return image.addBands([binaryMask]);
};

