/**
 * Title: Get a Time Series of Landsat Images
 * Author: Brendan Casey
 * Date: 2024-06-23
 * 
 * Summary:
 * This script processes Landsat satellite imagery (Landsat 5, 7, 8, and 9),
 * harmonizes spectral reflectance values from different sensors,
 * calculates selected vegetation indices, and merges the results into a
 * single image collection. The process prioritizes using Landsat 5, 8, and 9
 * over Landsat 7 due to the latter's Scan Line Corrector (SLC) failure.
 * 
 * The script performs the following steps:
 * 
 * 1. Retrieves and harmonizes Landsat Surface Reflectance (SR) collections
 *    for the specified time period and area of interest (AOI).
 * 2. Combines harmonized Landsat 5, 7, 8, and 9 collections, prioritizing
 *    Landsat 5, 8, and 9 over 7.
 * 3. Processes the combined collection and calculates composites of selected
 *    vegetation indices and merges them into a single image collection.
 * 
 * Example usage is provided that demonstrates how to specify dates,
 * intervals, AOI, and indices for the analysis and visualize the results in
 * Google Earth Engine.
 */


// Import the landsat indices and masks functions module
var landsat = require("users/bgcasey/functions:landsat_indices_and_masks");

/**
 * Function to harmonizes Landsat 8 or 9 (OLI) to Landsat 7 (ETM+) spectral
 * reflectance values using reduced major axis (RMA) regression
 * coefficients. Adapted from script written by Jennifer Hird. 
 * 
 * Citation: Roy, D.P., Kovalskyy, V., Zhang, H.K., Vermote, E.F., 
 * Yan, L., Kumar, S.S, Egorov, A., 2016, Characterization of Landsat-7 
 * to Landsat-8 reflective wavelength and normalized difference 
 * vegetation index continuity, Remote Sensing of Environment, 185, 
 * 57-70. http://dx.doi.org/10.1016/j.rse.2015.12.024; Table 2
 * 
 * @param {ee.Image} image - The input Landsat 8 or 9 image.
 * @returns {ee.Image} The harmonized image.
 */
var harmonize_OLI_to_ETM = function(image) {
  // Define slopes and intercepts for each band
  var slopes = ee.Image.constant([0.9785, 0.9542, 0.9825, 
                                  1.0073, 1.0171, 0.9949]);
  var itcp = ee.Image.constant([-0.0095, -0.0016, -0.0022, 
                                -0.0021, -0.0030, 0.0029]);
  // Apply the harmonization transformation
  var harmonized = image.select(['SR_B2', 'SR_B3', 'SR_B4', 
                                 'SR_B5', 'SR_B6', 'SR_B7'], 
                                ['SR_B1', 'SR_B2', 'SR_B3', 
                                 'SR_B4', 'SR_B5', 'SR_B7'])
                        .resample('bicubic')
                        .subtract(itcp.multiply(10000))
                        .divide(slopes)
                        .set('system:time_start', 
                             image.get('system:time_start'));
  // Preserve the QA_PIXEL band
  var qa_pixel = image.select('QA_PIXEL');
  return harmonized.addBands(qa_pixel, null, true);
};

/**
 * Retrieves and harmonizes a Landsat Surface Reflectance (SR) sensor 
 * collection for a given time period and area of interest (AOI).
 * 
 * @param {string} startDate - The start date for the collection.
 * @param {string} endDate - The end date for the collection.
 * @param {string} sensor - The Landsat sensor code (e.g., 'LC08').
 * @param {ee.Geometry} aoi - The area of interest.
 * @returns {ee.ImageCollection} The harmonized image collection.
 */
var getHarmonizedSRCollection = function(startDate, endDate, sensor, aoi) {
  var srCollection = ee.ImageCollection('LANDSAT/' + sensor + '/C02/T1_L2')
                       .filterBounds(aoi)
                       .filterDate(startDate, endDate)
                       .map(landsat.mask_cloud_snow); // apply cloud and snow mask

  
  // Apply harmonization to Landsat 8 or 9 images
  if (sensor === 'LC08' || sensor === 'LC09') {
    srCollection = srCollection.map(harmonize_OLI_to_ETM);
  }

  // Select relevant bands and add the QA_PIXEL band
  return srCollection.map(function(img) {
    var qa_pixel = img.select('QA_PIXEL');
    return img.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 
                       'SR_B5', 'SR_B7']).addBands(qa_pixel);
  });
};

/**
 * Combines harmonized Landsat 5, 7, 8, and 9 collections for a given 
 * time period and area of interest (AOI). The function prioritizes 
 * Landsat 5, 8, and 9 over 7 due to banding caused by the failure of 
 * Landsat 7's Scan Line Corrector (SLC).
 * 
 * @param {string} startDate - The start date for the collection.
 * @param {string} endDate - The end date for the collection.
 * @param {ee.Geometry} aoi - The area of interest.
 * @returns {ee.ImageCollection} The combined harmonized collection.
 */
var getCombinedHarmonizedCollection = function(startDate, endDate, aoi) {
  // Retrieve harmonized collections for each sensor
  var lt5 = getHarmonizedSRCollection(startDate, endDate, 'LT05', aoi);
  var le7 = getHarmonizedSRCollection(startDate, endDate, 'LE07', aoi);
  var lc8 = getHarmonizedSRCollection(startDate, endDate, 'LC08', aoi);
  var lc9 = getHarmonizedSRCollection(startDate, endDate, 'LC09', aoi);

  // Determine collection sizes for priority handling
  var lt5Size = lt5.size();
  var lc8Size = lc8.size();
  var lc9Size = lc9.size();

  // Combine collections based on availability and priority
  var combinedCollection = ee.ImageCollection(
    ee.Algorithms.If(
      lt5Size.gt(0).and(lc8Size.gt(0).or(lc9Size.gt(0))),
      lt5.merge(lc8).merge(lc9),
      ee.Algorithms.If(
        lt5Size.gt(0),
        lt5,
        ee.Algorithms.If(
          lc8Size.gt(0).or(lc9Size.gt(0)),
          lc8.merge(lc9),
          le7
        )
      )
    )
  );
  
  return combinedCollection;
};

/**
 * Function to process Landsat images, calculate indices,
 * and merge them into a single collection.
 * 
 * @param {Array} dates - Date strings for image collection time range.
 * @param {number} interval - Interval units to advance from dates.
 * @param {string} intervalType - Type of interval ('days', 'weeks', 
 *                                'months', 'years').
 * @param {Object} aoi - Area of interest as an ee.Geometry object.
 * @param {Array} selectedIndices - Indices to calculate (e.g., ['NDVI']).
 * @returns {ee.ImageCollection} - Processed images clipped to AOI.
 */
exports.ls_fn = function(dates, interval, intervalType, aoi, selectedIndices) {
  
  /**
   * Process images for a single date.
   * 
   * @param {string} d1 - Start date string for the image collection.
   * @returns {ee.Image} - Median image with selected indices.
   */
  var ls_ts = function(d1) {
    var start = ee.Date(d1);
    var end = start.advance(interval, intervalType);
    
    // Get combined Landsat collection for the date range
    var combinedCollection = getCombinedHarmonizedCollection(start, end, aoi);
    
    // Apply selected indices to the combined collection
    selectedIndices.forEach(function(index) {
  switch(index) {
    case 'BSI':
      combinedCollection = combinedCollection.map(landsat.addBSI);
      break;
    case 'DRS':
      combinedCollection = combinedCollection.map(landsat.addDRS);
      break;
    case 'DSWI':
      combinedCollection = combinedCollection.map(landsat.addDSWI);
      break;
    case 'EVI':
      combinedCollection = combinedCollection.map(landsat.addEVI);
      break;
    case 'GNDVI':
      combinedCollection = combinedCollection.map(landsat.addGNDVI);
      break;
    case 'LAI':
      combinedCollection = combinedCollection.map(landsat.addLAI);
      break;
    case 'NBR':
      combinedCollection = combinedCollection.map(landsat.addNBR);
      break;
    case 'NDMI':
      combinedCollection = combinedCollection.map(landsat.addNDMI);
      break;
    case 'NDSI':
      combinedCollection = combinedCollection.map(landsat.addNDSI);
      break;
    case 'NDVI':
      combinedCollection = combinedCollection.map(landsat.addNDVI);
      break;
    case 'NDWI':
      combinedCollection = combinedCollection.map(landsat.addNDWI);
      break;
    case 'NDRS':
      combinedCollection = combinedCollection.map(landsat.addNDRS);
      break;
    case 'SAVI':
      combinedCollection = combinedCollection.map(landsat.addSAVI);
      break;
    case 'SI':
      combinedCollection = combinedCollection.map(landsat.addSI);
      break;
        // Additional indices can be added here
      }
    });
    
    // Return median of collection with metadata
    return combinedCollection
      .select(selectedIndices)
      .median()
      .set({
        "start_date": start.format('YYYY-MM-dd'), 
        "end_date": end.format('YYYY-MM-dd'), 
        "month": start.get('month'), 
        "year": start.get('year')
      });
  };

  // Map processing function over dates, clip to AOI, return collection
  var ls = ee.ImageCollection.fromImages(dates.map(function(d) {
    return ls_ts(d).clip(aoi);
  }));
  
  return ls;
};


// Usage example of l2_fn

// // Load function
// var landsat_time_series = require(
//   "users/bgcasey/functions:landsat_time_series"
// );

// // Define the AOI as an ee.Geometry object
// var aoi = ee.Geometry.Polygon([
//   [
//     [-113.60000044487279, 55.15000133914695],
//     [-113.60000044487279, 55.35000089418191],
//     [-113.15000137891523, 55.35000086039801],
//     [-113.15000138015347, 55.15000133548429],
//     [-113.60000044487279, 55.15000133914695]
//   ]
// ]);

// // Define the dates for the analysis
// var dates = ['2022-01-01', '2023-01-01', '2024-01-01'];

// // Define the interval and interval type
// var interval = 12; // 12 months interval
// var intervalType = 'months';

// // Define which indices to calculate
// // Available Indices: BSI, DRS, DSWI, EVI, LAI, NDMI, NDVI, SAVI, SI
// var selectedIndices = ['NDVI'];

// // Call s2_fn with specified parameters
// var landsatCollection = landsat_time_series.ls_fn(
//   dates, interval, intervalType, aoi, selectedIndices
// );
// print('Landsat Image Collection:', landsatCollection);

// // Define visualization parameters for the NDVI band
// var ndviVis = {
//   min: -1,
//   max: 1,
//   palette: ['red', 'yellow', 'green']
// };

// // Center the map on the AOI
// Map.centerObject(aoi, 10);

// // Add the NDVI layers for each year to the map
// dates.forEach(function(date) {
//   var year = ee.Date(date).get('year').getInfo();
//   var image = landsatCollection.filter(
//     ee.Filter.eq('year', year)
//   ).first().select('NDVI');
//   Map.addLayer(image, ndviVis, 'NDVI ' + year);
// });