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




/**
 * Function to get min and max visualization parameters for a band in an image.
 * 
 * @param {ee.Image} image - The image containing the band.
 * @param {String} band - The name of the band.
 * @param {ee.Geometry} aoi - The area of interest.
 * @param {Number} scale - The scale for the reduceRegion operation.
 * @returns {Object} An object with min and max visualization parameters.
 */
exports.getVisParams = function getVisParams(image, band, aoi, scale) {
  var stats = image.select(band).reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: aoi,
    scale: scale,
    bestEffort: true,
    tileScale: 8
  });

  var min = stats.get(band + '_min').getInfo();
  var max = stats.get(band + '_max').getInfo();

  return {
    min: min,
    max: max,
    palette: ['red', 'yellow', 'green']
  };
}


// Example usage:

// // Get visualization parameters for NDVI
// var ndviVis = getVisParams(imageWithNDVI, 'NDVI', aoi, 10);

// // Add the NDVI layer to the map
// Map.addLayer(imageWithNDVI.select('NDVI'), ndviVis, 'NDVI');
// Map.centerObject(aoi, 10);



/**
 * Function to split an AOI into rectangular tiles.
 * 
 * @param {ee.Geometry} aoi - The area of interest.
 * @param {number} tileSize - Side length of each tile, in meters.
 * @return {ee.List} Tiles as ee.Geometry.Rectangle objects.
 */
exports.splitAOIIntoTiles = function(aoi, tileSize) {
  // Ensure AOI is a valid geometry
  aoi = ee.Geometry(aoi);

  // Get bounds of the AOI and its coordinates
  var bounds = aoi.bounds();
  var coords = ee.List(bounds.coordinates().get(0));

  // Extract corner coordinates as points
  var bottomLeft = ee.Geometry.Point(coords.get(0));
  var topRight = ee.Geometry.Point(coords.get(2));
  
  // Calculate width and height of the AOI in meters
  var aoiWidth = bottomLeft.distance(
    ee.Geometry.Point([
      topRight.coordinates().get(0), 
      bottomLeft.coordinates().get(1)
    ])
  );
  var aoiHeight = bottomLeft.distance(
    ee.Geometry.Point([
      bottomLeft.coordinates().get(0), 
      topRight.coordinates().get(1)
    ])
  );
  
  // Calculate number of tiles needed horizontally and vertically
  var numTilesX = aoiWidth.divide(tileSize).ceil();
  var numTilesY = aoiHeight.divide(tileSize).ceil();
  
  // Create a list to hold the tiles
  var tiles = ee.List([]);

  // Generate the tiles
  tiles = ee.List.sequence(0, numTilesX.subtract(1)).map(function(i) {
    return ee.List.sequence(0, numTilesY.subtract(1)).map(function(j) {
      // Calculate tile's bottom left corner coordinates
      var x = ee.Number(bottomLeft.coordinates().get(0))
              .add(ee.Number(i).multiply(tileSize));
      var y = ee.Number(bottomLeft.coordinates().get(1))
              .add(ee.Number(j).multiply(tileSize));
      
      // Create the tile geometry
      return ee.Geometry.Rectangle([
        x, y, x.add(tileSize), y.add(tileSize)
      ]);
    });
  }).flatten();

  return tiles;
};


/**
 * Filters an image collection to include only images that contain
 * all of the specified bands.
 * 
 * @param {ee.ImageCollection} collection - The image collection to filter.
 * @param {Array} requiredBands - An array of strings representing the
 *                                 required band names.
 * @return {ee.ImageCollection} The filtered image collection.
 */

 exports.filterCollectionByBands = function(collection, requiredBands) {
  /**
   * Checks if an image contains all the specified bands.
   * 
   * @param {ee.Image} image - The image to check.
   * @return {ee.Image} The image with a 'hasAllBands' property set.
   */
  function hasAllRequiredBands(image) {
    // Get the names of the bands in the image
    var bandNames = image.bandNames();
    
    // Check if all required bands are present
    var hasAllBands = ee.List(requiredBands).map(function(band) {
      return bandNames.contains(band);
    }).reduce(ee.Reducer.min()); // Use min to ensure all are true
    
    // Set a property indicating if all bands are present
    return image.set('hasAllBands', hasAllBands);
  }

  // Apply the band check to each image in the collection
  var collectionWithBandCheck = collection.map(hasAllRequiredBands);

  // Filter the collection based on the 'hasAllBands' property
  var filteredCollection = collectionWithBandCheck.filterMetadata(
    'hasAllBands', 'equals', true);
  
  return filteredCollection;
}

// // Example usage of filterCollectionByBands function
// // Define the required bands
// var requiredBands = ['B4', 'B3', 'B2'];

// // Use the filterCollectionByBands function to filter the collection
// var filteredCollection = filterCollectionByBands(sentinelCollection, requiredBands);

// // Print the filtered collection to the console to verify the result
// print('Filtered Collection:', filteredCollection);


/**
 * Reduce image to buffered points
 * 
 * Processes points by optionally buffering them, applying a reducer to the buffered
 * regions or directly to the points if buffer size is 0, and renaming the properties
 * of the resulting features based on the reducer type, buffer size, and specified CRS,
 * scale, and tileScale.
 * 
 * @param {number} bufferSize - The buffer size to apply to points.
 * @param {Object} reducer - The reducer to apply to the buffered regions.
 * @param {Object} xyPoints - The collection of points for analysis.
 * @param {Object} aoi - The area of interest to filter points.
 * @param {Object} image - The image  to process.
 * @param {string} crs - The coordinate reference system to use.
 * @param {number} scale - The scale in meters for the reduction.
 * @param {number} tileScale - The scale for parallel processing.
 * @param {string} file_name - The prefix for the exported file.
 * @returns {Object} The collection with renamed properties.
 * 
 */
var image_to_points = function(bufferSize, reducer, xyPoints, aoi, 
                             image, crs, scale, tileScale, file_name) {
  // Convert the buffer value to a string for suffix creation
  var bufferStr = String(bufferSize);

  // Dynamically determine the reducer type for suffix creation
  var reducerInfo = reducer.getInfo();
  var reducerType = reducerInfo.type.split('.').pop();

  // Combine reducer type and buffer size to create a suffix
  var suffix = ee.String(reducerType).cat('_').cat(bufferStr);

  // Apply buffer if bufferSize is not 0, else use the point directly
  var processedPoints = xyPoints.filterBounds(aoi).map(function(pt) {
    return bufferSize === 0 ? pt : pt.buffer(bufferSize);
  });
  
  // Retrieve property names from the first feature of xyPoints
  var xyProperties = ee.Feature(xyPoints.first()).propertyNames();
  
  // Apply the specified reducer to the buffered points with given CRS, scale, and tileScale
  var reducedRegions = image.reduceRegions({
    collection: processedPoints,
    reducer: reducer,
    crs: crs,
    scale: scale,
    tileScale: tileScale
  });

  // Function to rename properties of each feature
  var renameProperties = function(feature) {
    // Iterate over property names to create new names
    var newProperties = ee.Dictionary(
      feature.propertyNames().map(function(name) {
        // Conditionally rename properties not in xyProperties
        var newName = ee.Algorithms.If(
          xyProperties.contains(name),
          name,
          ee.String(name).cat('_').cat(suffix)
        );
        return [newName, feature.get(name)];
      }).flatten()
    );

    // Return a new feature with the renamed properties
    return ee.Feature(feature.geometry(), newProperties);
  };

  // Rename properties of each feature in the reduced collection
  var renamedFeatureCollection = reducedRegions.map(renameProperties);


  // Export the result to Google Drive
  Export.table.toDrive({
    collection: renamedFeatureCollection,
    description: file_name,
    folder: "gee_exports",
    fileNamePrefix: file_name,
    fileFormat: 'CSV'
  });
  
  // Return the collection with renamed properties
  return renamedFeatureCollection;
};

exports.image_to_points = image_to_points

// // Example usage
// var bufferSize = 500;
// var reducer = ee.Reducer.mean();
// var xyPoints = ss_xy;
// var aoi = aoi;
// var image = cov_fixed;
// var crs = 'EPSG:3348';
// var scale = 30;
// var tileScale = 8;
// var file_name = "filename"

// // Call the function with the specified parameters
// var result = utils.processPoints(bufferSize, reducer, xyPoints, aoi, image,
//                           crs, scale, tileScale, file_name);




/**
 * Reduce image collection to buffered points
 * 
 * Processes points by optionally buffering them, applying a reducer 
 * to the buffered regions or directly to the points if buffer size 
 * is 0, and renaming the properties the resulting features based on 
 * the reducer type, buffer size, and specified CRS, scale, and 
 * tileScale.
 * 
 * @param {number} bufferSize - The buffer size to apply to points.
 * @param {Object} reducer - The reducer to apply to the buffered regions.
 * @param {Object} xyPoints - The collection of points for analysis.
 * @param {Object} aoi - The area of interest to filter points.
 * @param {Object} imageCollection - The image collection to process.
 * @param {string} crs - The coordinate reference system to use.
 * @param {number} scale - The scale in meters for the reduction.
 * @param {number} tileScale - The scale for parallel processing.
 * @param {string} file_name - The prefix for the exported file.
 * @returns {Object} The collection with renamed properties.
 */
var imageCollectionToPoints = function(
  bufferSize, reducer, xyPoints, aoi, imageCollection,
  crs, scale, tileScale, file_name) {
  
  // Convert buffer size to string for suffix creation
  var bufferStr = String(bufferSize);

  // Get reducer type for suffix creation
  var reducerInfo = reducer.getInfo();
  var reducerType = reducerInfo.type.split('.').pop();
  var suffix = ee.String(reducerType).cat('_').cat(bufferStr);

  // Ensure input is an ee.ImageCollection
  imageCollection = ee.ImageCollection(imageCollection);

  // Apply buffer to points or use directly based on bufferSize
  var processedPoints = xyPoints.filterBounds(aoi).map(function(pt) {
    return bufferSize === 0 ? pt : pt.buffer(bufferSize);
  });
  
  // Retrieve property names from the first feature
  var xyProperties = ee.Feature(xyPoints.first()).propertyNames();
  // Retrieve property names from the first image
  var imgProperties = ee.Feature(imageCollection.first()).propertyNames();
  var combinedProperties = xyProperties.cat(imgProperties);
  
  // Map over imageCollection to reduce regions
  var reducedRegion = imageCollection.map(function(img) {
    return img.reduceRegions({
      collection: processedPoints,
      crs: crs,
      reducer: reducer, 
      scale: scale, 
      tileScale: tileScale
    }).map(function(featureWithReduction) {
      // Copy properties from image to feature
      return featureWithReduction.copyProperties(img);
    });
  }).flatten(); // Flatten the collections

  // Function to rename properties of each feature
  var renameProperties = function(feature) {
    var newProperties = ee.Dictionary(
      feature.propertyNames().map(function(name) {
        // Conditionally rename properties
        var newName = ee.Algorithms.If(
          combinedProperties.contains(name),
          name,
          ee.String(name).cat('_').cat(suffix)
        );
        return [newName, feature.get(name)];
      }).flatten()
    );
    return ee.Feature(feature.geometry(), newProperties);
  };

  // Rename properties in the reduced collection
  var renamedFeatureCollection = reducedRegion.map(renameProperties);

  // Export the result to Google Drive
  Export.table.toDrive({
    collection: renamedFeatureCollection,
    description: file_name,
    folder: "gee_exports",
    fileNamePrefix: file_name,
    fileFormat: 'CSV'
  });
  
  return renamedFeatureCollection;
}

// Export the function for external use
exports.imageCollectionToPoints = imageCollectionToPoints;

// Example usage
// var bufferSize = 500;
// var reducer = ee.Reducer.mean();
// // Define xyPoints and aoi properly
// var xyPoints = ss_xy; // Placeholder, define properly
// var aoi = aoi; // Placeholder, define properly
// // Ensure imageCollection is an ee.ImageCollection
// var imageCollection = ee.ImageCollection(ls);
// var crs = 'EPSG:3348';
// var scale = 30;
// var tileScale = 8;
// var file_name = "ss_s2_mean_500";

// // Call the function with the specified parameters
// var ssS2Mean500 = utils.imageCollectionToPoints(
//   bufferSize, reducer, xyPoints, aoi, 
//   imageCollection, crs, scale, tileScale, file_name
// );

// // Print the first 10 features of the result
// print("ssS2Mean500", ssS2Mean500.limit(10));