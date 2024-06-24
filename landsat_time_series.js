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
 * Adapted from script written by Jennifer Hird. 
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
                       .filterDate(startDate, endDate);
  
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
        case 'NDVI':
          combinedCollection = combinedCollection.map(landsat.addNDVI);
          break;
        case 'NDMI':
          combinedCollection = combinedCollection.map(landsat.addNDMI);
          break;
        case 'EVI':
          combinedCollection = combinedCollection.map(landsat.addEVI);
          break;
        case 'SAVI':
          combinedCollection = combinedCollection.map(landsat.addSAVI);
          break;
        case 'BSI':
          combinedCollection = combinedCollection.map(landsat.addBSI);
          break;
        case 'SI':
          combinedCollection = combinedCollection.map(landsat.addSI);
          break;
        case 'LAI':
          combinedCollection = combinedCollection.map(landsat.addLAI);
          break;
        case 'DSWI':
          combinedCollection = combinedCollection.map(landsat.addDSWI);
          break;
        case 'DRS':
          combinedCollection = combinedCollection.map(landsat.addDRS);
          break;
        // Additional indices can be added here
      }
    });
    
    // Return median of collection with metadata
    return combinedCollection
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


// Example use
// // Import the required module
// var landsat = require(
//   "users/bgcasey/functions:landsat_time_series"
// );

// // Define the dates for the analysis
// var dates = ['2020-01-01', '2020-02-01']; // Example dates

// // Define the interval in months
// var interval = 1; // Monthly interval
// var intervalType = 'months'
// // Define the AOI as a GeoJSON geometry or an ee.Geometry object
// // Example: AOI as a rectangle (replace with actual AOI)
// var aoi = ee.Geometry.Rectangle(
//   [-123.262, 44.574, -122.774, 45.656]
// );

// // Define which indices to calculate
// var selectedIndices = ['NDVI', 'EVI', 'SAVI']; // Calculate these indices

// // Call ls_fn with specified parameters
// var combinedImageCollection = landsat.ls_fn(
//   dates, interval, intervalType, aoi, selectedIndices
// );

// // Print the result to the console (Google Earth Engine Code Editor)
// print('Combined Image Collection:', combinedImageCollection);

// // Add result to the map (Google Earth Engine Code Editor)
// // Assumes indices produce visualizable layers; adjust as needed.
// Map.addLayer(
//   combinedImageCollection.median(), 
//   {bands: 'NDVI', min: 0, max: 1}, 
//   'Median NDVI'
// );
// Map.centerObject(aoi);
