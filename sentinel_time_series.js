/**
 * Title: Get a Time Series of Sentinel-2 Images
 * Author: Brendan Casey
 * Date: 2024-06-23
 * 
 * Summary:
 * This script processes Sentinel-2 satellite imagery, calculates selected
 * vegetation indices, and merges the results into a single image collection
 * for a specified time period and area of interest (AOI). 
 * The script performs the following steps:
 * 
 * 1. Retrieves the Sentinel-2 collection for the specified date range and AOI.
 * 2. Applies cloud masking to the images.
 * 3. Calculates the selected indices for each image in the collection.
 * 4. Merges the results into a single image collection, providing the median
 *    composite for each date range.
 * 
 * Example usage is provided that demonstrates how to specify dates,
 * intervals, AOI, and indices for the analysis, and how to visualize the
 * results in Google Earth Engine.
 */
 
// Import the required module for Sentinel-2 indices calculations
var indices = require(
  "users/bgcasey/functions:sentinel_indices_and_masks"
);

/**
 * Function to process Sentinel-2 images, calculate indices,
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
exports.s2_fn = function(dates, interval, intervalType, aoi, selectedIndices) {
  
  /**
   * Process images for a single date.
   * 
   * @param {string} d1 - Start date string for the image collection.
   * @returns {ee.Image} - Median image with selected indices.
   */
  var s2_ts = function(d1) {
    var start = ee.Date(d1);
    var end = start.advance(interval, intervalType);
    
    // Get Sentinel-2 collection for the date range
    var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                          .filterBounds(aoi)
                          .filterDate(start, end)
                          // Pre-filter to get less cloudy granules.
                          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                          .map(indices.maskS2clouds);

// Apply selected indices to the collection
selectedIndices.forEach(function(index) {
  switch(index) {
    case 'BSI':
      s2Collection = s2Collection.map(indices.addBSI); 
      break;
    case 'CRE':
      s2Collection = s2Collection.map(indices.addCRE);
      break;
    case 'DRS':
      s2Collection = s2Collection.map(indices.addDRS);
      break;
    case 'DSWI':
      s2Collection = s2Collection.map(indices.addDSWI);
      break;
    case 'EVI':
      s2Collection = s2Collection.map(indices.addEVI); 
      break;
    case 'GNDVI':
      s2Collection = s2Collection.map(indices.addGNDVI);
      break;
    case 'LAI':
      s2Collection = s2Collection.map(indices.addLAI); 
      break;
    case 'NBR':
      s2Collection = s2Collection.map(indices.addNBR);
      break;
    case 'NDMI':
      s2Collection = s2Collection.map(indices.addNDWI); 
      break;
    case 'NDRE1':
      s2Collection = s2Collection.map(indices.addNDRE1);
      break;
    case 'NDRE2':
      s2Collection = s2Collection.map(indices.addNDRE2);
      break;
    case 'NDRE3':
      s2Collection = s2Collection.map(indices.addNDRE3);
      break;
    case 'NDVI':
      s2Collection = s2Collection.map(indices.addNDVI);
      break;
    case 'NDRS':
      s2Collection = s2Collection.map(indices.addNDRS);
      break;
    case 'NDWI':
      s2Collection = s2Collection.map(indices.addNDWI); 
      break;  
    case 'RDI':
      s2Collection = s2Collection.map(indices.addRDI);
      break;
    case 'SAVI':
      s2Collection = s2Collection.map(indices.addSAVI); 
      break;
    case 'SI':
      s2Collection = s2Collection.map(indices.addSI); 
      break;
    // Additional indices can be added here
  }
});
    
    // Return median of collection with metadata
    return s2Collection
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
  var s2 = ee.ImageCollection.fromImages(dates.map(function(d) {
    return s2_ts(d).clip(aoi);
  }));
  
  return s2;
};



// // Usage example of s2_fn

// var sentinel_time_series = require(
//   "users/bgcasey/functions:sentinel_time_series"
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
// Available Indices: DSWI, DRS, NDRE3, NDVI, NDWI, NDRS, RDI
// var selectedIndices = ['NDVI'];

// // Call s2_fn with specified parameters
// var sentinel2Collection = sentinel_time_series.s2_fn(
//   dates, interval, intervalType, aoi, selectedIndices
// );
// print('Sentinel-2 Image Collection:', sentinel2Collection);

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
//   var image = sentinel2Collection.filter(
//     ee.Filter.eq('year', year)
//   ).first().select('NDVI');
//   Map.addLayer(image, ndviVis, 'NDVI ' + year);
// });