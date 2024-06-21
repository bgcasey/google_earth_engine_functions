// Import the landsat functions module
var landsat = require(
  "users/bgcasey/functions:landsat_indices"
);

/**
 * Function to process Landsat 5 and Landsat 7 images, calculate 
 * indices, and merge them into a single collection.
 * 
 * @param {Array} dates - Date strings for image collection time range.
 * @param {number} interval - Interval in months to advance from dates.
 * @param {Object} aoi - Area of interest as an ee.Geometry object.
 * @param {Array} selectedIndices - Indices to calculate (e.g., ['NDVI']).
 * @returns {ee.ImageCollection} - Processed images clipped to AOI.
 */
exports.leo7_fn = function(dates, interval, aoi, selectedIndices) {
  
  /**
   * Process images for a single date.
   * 
   * @param {string} d1 - Start date string for the image collection.
   * @returns {ee.Image} - Median image with selected indices.
   */
  var leo7_ts = function(d1) {
    var start = ee.Date(d1);
    var end = start.advance(interval, 'month');
    var date_range = ee.DateRange(start, end);
    var date = start;
    
    // Collect images from Landsat 5 and 7 for date range
    var leo5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
               .filterDate(date_range);
    var leo7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
               .filterDate(date_range);
    
    // Merge collections and apply preprocessing
    var mergedCollection = leo5.merge(leo7)
      .map(landsat.applyScaleFactors) // Scale factors
      .map(landsat.mask_cloud_snow); // Cloud and snow mask
    
    // Apply selected indices to the merged collection
    selectedIndices.forEach(function(index) {
      switch(index) {
        case 'NDVI':
          mergedCollection = mergedCollection.map(landsat.addNDVI);
          break;
        case 'NDMI':
          mergedCollection = mergedCollection.map(landsat.addNDMI);
          break;
        case 'EVI':
          mergedCollection = mergedCollection.map(landsat.addEVI);
          break;
        case 'SAVI':
          mergedCollection = mergedCollection.map(landsat.addSAVI);
          break;
        case 'BSI':
          mergedCollection = mergedCollection.map(landsat.addBSI);
          break;
        case 'SI':
          mergedCollection = mergedCollection.map(landsat.addSI);
          break;
        case 'LAI':
          mergedCollection = mergedCollection.map(landsat.addLAI);
          break;
        case 'DSWI':
          mergedCollection = mergedCollection.map(landsat.addDSWI);
          break;
        case 'DRS':
          mergedCollection = mergedCollection.map(landsat.addDRS);
          break;
        // Additional indices can be added here
      }
    });
    
    // Return median of collection with metadata and selected indices
    return mergedCollection
      .median()
      .set("date", date, "month", date.get('month'), "year", date.get('year'))
      .select(selectedIndices);
  };

  // Map processing function over dates, clip to AOI, return collection
  var leo7 = ee.ImageCollection(dates.map(leo7_ts))
    .map(function(img) { return img.clip(aoi); });
  return leo7;
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

// // Define the AOI as a GeoJSON geometry or an ee.Geometry object
// // Example: AOI as a rectangle (replace with actual AOI)
// var aoi = ee.Geometry.Rectangle(
//   [-123.262, 44.574, -122.774, 45.656]
// );

// // Define which indices to calculate
// var selectedIndices = ['NDVI', 'EVI', 'SAVI']; // Calculate these indices

// // Call leo7_fn with specified parameters
// var combinedImageCollection = landsat.leo7_fn(
//   dates, interval, aoi, selectedIndices
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
