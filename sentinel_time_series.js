// Import the required module for Sentinel-2 indices calculations
var s2_indices = require(
  "users/bgcasey/functions:sentinel_indices"
);

/**
 * Function to process Sentinel-2 images over a given time period,
 * interval, area of interest (AOI), and calculate specified indices.
 * 
 * @param {Array} dates - An array of date strings in the format
 * 'YYYY-MM-DD' indicating the start dates for processing.
 * @param {number} interval - The interval in months to advance from
 * each start date for processing.
 * @param {ee.Geometry} aoi - The area of interest as an Earth Engine
 * Geometry object.
 * @param {Array} selectedIndices - An array of strings indicating
 * which indices to calculate (e.g., ['NDVI', 'NDWI']).
 * @returns {ee.ImageCollection} - An ImageCollection of processed
 * images, each representing the median values of the selected indices
 * over the specified interval.
 */
exports.S2_DRS_fn = function(dates, interval, aoi, selectedIndices) {
  
  // Function to process Sentinel-2 images for a single date
  var s2_ts = function(d1) {
    var start = ee.Date(d1);
    var end = start.advance(interval, 'month');
    var date_range = ee.DateRange(start, end);
    var date = ee.Date(d1);
    
    // Load and filter the Sentinel-2 image collection
    var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(date_range)
      .filter(ee.Filter.calendarRange(6, 9, 'month'))
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(aoi)
      .map(masks.maskS2clouds)
      .map(function(i) { return i.multiply(0.0001); })
    
      // Dynamically apply selected indices calculations
      .map(function(img) {
        var result = img;
        selectedIndices.forEach(function(index) {
          if (s2_indices['add' + index]) {
            result = s2_indices['add' + index](result);
          }
        });
        return result;
      });
    
    // Return the median of the selected indices for the date range
    return s2
      .select(selectedIndices)
      .median()
      .set("date", date, "month", date.get('month'), "year", date.get('year'));
  };

  // Map over each date, process it with s2_ts, and return as an
  // ImageCollection
  var s2_collection = ee.ImageCollection(dates.map(s2_ts))
    .map(function(img) { return img.clip(aoi); });
  
  return s2_collection;
};

// Example usage of the S2_DRS_fn function
// var dates = ['2020-01-01', '2020-02-01']; // Define the dates for analysis
// var interval = 1; // Define the interval in months
// var aoi = ee.Geometry.Rectangle(
//   [-123.262, 44.574, -122.774, 45.656]
// ); // Define the AOI
// var selectedIndices = ['NDVI', 'NDWI', 'DSWI', 'RDI', 'NDRE3', 'DRS'];

// // Call the function with the specified parameters
// var s2ImageCollection = exports.S2_DRS_fn(
//   dates, interval, aoi, selectedIndices
// );

// // Print the result to the console (Google Earth Engine Code Editor)
// print('S2 Image Collection:', s2ImageCollection);

// // Add result to the map (Google Earth Engine Code Editor)
// Map.addLayer(
//   s2ImageCollection.median(), 
//   {bands: 'NDVI', min: 0, max: 1}, 
//   'Median NDVI'
// );
// Map.centerObject(aoi);