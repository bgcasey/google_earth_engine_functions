/**
 * Convert degrees to radians.
 * From https://github.com/aazuspan/geeTools
 * @param {ee.Number or ee.Image} deg An angle in degrees
 * @return {ee.Number or ee.Image} The angle in radians
 */
exports.deg2rad = function (deg) {
  var coeff = 180 / Math.PI;
  return deg.divide(coeff); 
};


/**
 * Combine a list of images into a single multi-band image. 
 * From https://github.com/aazuspan/geeTools
 * This is a  convenience function over repeatedly calling addBands for each
 * image you want to combine.
 * @param {ee.List} imgList A list of images to combine. Images can be single 
 * or multiband.
 * @param {Object} [optionalParameters] A dictionary of optional parameters to 
 * override defaults.
 * @param {boolean, default true} [optionalParameters.prefix] If true, all band
 * names will be prefixed with the list index of the image it came from. This 
 * allows combining images with identical band names. If false, original band 
 * names will be kept. If there are duplicate band names, an error will be 
 * thrown.
 * @param {ee.Dictionary, default null} [optionalParameters.props] Properties 
 * to store in the combined image. If null, properties will be taken from the 
 * first image in imgList and the result will be identical to using addBands.
 * @return {ee.Image} An image with the bands of all images in imgList
 */
exports.combineImages = function (imgList, optionalParameters) {
  var first = ee.Image(ee.List(imgList).get(0));

  // Default parameters
  var params = {
    prefix: true,
    props: first.toDictionary(first.propertyNames()),
  };

  params = exports.updateParameters(params, optionalParameters);

  // Convert the list to a collection and collapse the collection into a 
  // multiband image. Rename bands to match original band names.
  var combined = ee.ImageCollection
    // Convert the image list to a collection
    .fromImages(imgList)
    // Convert the collection to a multiband image
    .toBands()
    // Store properties
    .set(params.props);

  if (params.prefix === false) {
    // Grab a 1D list of original band names
    var bandNames = ee
      .List(
        imgList.map(function (img) {
          return img.bandNames();
        })
      )
      .flatten();
    combined = combined.rename(bandNames);
  }

  return combined;
};


/**
 * Perform band-wise normalization on an image 
 * * From https://github.com/aazuspan/geeTools
 * Convert values to range from 0 - 1.
 * @param {ee.Image} img An image.
 * @param {object} [optionalParameters] A dictionary of optional parameters to 
 * override defaults.
 * @param {number} [optionalParameters.scale] The scale, in image units, to 
 * calculate image statistics at.
 * @param {ee.Geometry} [optionalParameters.region] The area to calculate image
 * statistics over.
 * @param {number, default 1e13} [optionalParameters.maxPixels] The maximum 
 * number of pixels to sample when calculating image statistics.
 * @return {ee.Image} The input image with all bands rescaled between 0 and 1.
 */
exports.normalizeImage = function (img, optionalParameters) {
  var params = {
    region: null,
    scale: null,
    maxPixels: 1e13,
  };

  params = exports.updateParameters(params, optionalParameters);

  var min = img
    .reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: params.region,
      scale: params.scale,
      maxPixels: params.maxPixels,
    })
    .toImage(img.bandNames());

  var max = img
    .reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: params.region,
      scale: params.scale,
      maxPixels: params.maxPixels,
    })
    .toImage(img.bandNames());

  return img.subtract(min).divide(max.subtract(min));
};



/**
 * Generates a list of dates for time series analysis, starting
 * from the first day of each month within a specified date range.
 * The interval between dates is defined by the `interval` and
 * `intervalType` parameters.
 *
 * @param {ee.Date} Date_Start - The start date of the time series.
 * @param {ee.Date} Date_End - The end date of the time series.
 * @param {number} interval - Units to skip between dates in series.
 * @param {string} intervalType - Type of interval ('months', 'weeks',
 *                                'days', 'years').
 * @returns {ee.List} A list of dates for the time series.
 */
exports.createDateList = function createDateList(Date_Start, Date_End, interval,
                                  intervalType) {
  // Calculate total intervals between start and end dates
  var n_intervals = Date_End.difference(Date_Start, intervalType)
                     .round();
  
  // Generate sequence of numbers from 0 to n_intervals, step by interval
  var dates = ee.List.sequence(0, n_intervals, interval);
  
  // Function to advance start date by n intervals
  var make_datelist = function(n) {
    return Date_Start.advance(n, intervalType);
  };
  
  // Apply function to each number in sequence for dates list
  dates = dates.map(make_datelist);
  
  return dates;
}

// Example usage of createTimeSeriesDateList function

// var utils = require("users/bgcasey/functions:utils");

// // Define the start and end dates for the time series
// var Date_Start = ee.Date('2020-01-01');
// var Date_End = ee.Date('2020-12-31');

// // Define the interval and interval type for the time series
// var interval = 1; // Every 1 unit of intervalType
// var intervalType = 'months'; // Interval type is months

// // Call the createDateList function to generate the list
// var dateList = utils.createDateList(Date_Start, Date_End, interval, intervalType);

// // Print the generated list of dates for the time series
// print('Generated list of dates:', dateList);
