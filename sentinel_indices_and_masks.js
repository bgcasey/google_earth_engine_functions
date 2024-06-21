/////////////////////////////////////////////////
// Sentinel 2
/////////////////////////////////////////////////
 
 
/////////////////////////////////////////////////

// Normalized Difference Vegetation Index NDVI band
exports.addNDVI=function(image) {
  var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  return image.addBands([NDVI]).copyProperties(image, ['system:time_start'])
}

/////////////////////////////////////////////////


///////////////////////////////////////////////

// Normalized Difference Water Index (NDWI) 
exports.addNDWI =function(image) {
  var NDMI = image.expression(
        '(NIR - SWIR) / (NIR + SWIR)', {
            'NIR': image.select('B8A'),
            'SWIR': image.select('B11'),
        }).rename('NDWI')
  return image.addBands([NDMI])
}

/////////////////////////////////////////////////

// Disease Stress Water Index (DSWI)
exports.addDSWI =function(image) {
  var DSWI = image.expression(
        '(NIR + Green) / (Red + SWIR)', {
            'NIR': image.select('B8'),
            'Green': image.select('B3'),
            'Red': image.select('B4'),
            'SWIR': image.select('B11'),
        }).rename('DSWI')
  return image.addBands([DSWI])
}
  
/////////////////////////////////////////////////

// Ratio Drought Index (RDI)  
exports.addRDI =function(image) {
  var RDI = image.expression(
        'SWIR2 / RedEdge4', {
            'SWIR2': image.select('B12'),
            'RedEdge4': image.select('B8A'),
        }).rename('RDI')
  return image.addBands([RDI])
}  

/////////////////////////////////////////////////
// Normalized Difference Red-edge Index 3 (NDRE3)
exports.addNDRE3 =function(image) {
  var NDRE3 = image.expression(
        '(RedEdge4 - RedEdge3) / (RedEdge4 + RedEdge3)', {
            'RedEdge4': image.select('B8A'),
            'RedEdge3': image.select('B7'),
        }).rename('NDRE3')
  return image.addBands([NDRE3])
}  
  
/////////////////////////////////////////////////
  
// Distance red & SWIR (DRS) function
exports.addDRS = function(image) {
       var DRS = image.expression('sqrt (((RED)*(RED)) + ((SWIR)*(SWIR)))',
       {'SWIR': image.select ('B11'),
       'RED': image.select ('B4'),})
       .rename('DRS');
       return image.addBands([DRS]).copyProperties(image, ['system:time_start'])
     }

// exports.addDRS = function(image) {
//       var DRS = image.expression('sqrt (((RED)*(RED)) + ((SWIR)*(SWIR)))',
//       {'SWIR': image.select ('B11').divide(10000),
//       'RED': image.select ('B4').divide(10000),})
//       .rename('DRS');
//       return image.addBands([DRS])
//     }

/////////////////////////////////////////////////


/////////////////////////////////////////////////

// Normalized distance red & SWIR (NDRS) function

exports.addNDRS = function(image) {
  var masks = require("users/bgcasey/functions:masks");

  var maskedImage_1 = masks.maskByForestAge(image)
  var maskedImage_2 = masks.maskByLandcover(maskedImage_1)
  // var maskedImage_3 = masks.dynamicWorld(image)
    // var maskYear = ee.Date(image.get('system:time_start')).get('year');
    // // Filter the mask collection based on the image's year
    // var maskImage = maskCollection
    //   .filter(ee.Filter.calendarRange(maskYear, maskYear, 'year'))
    //   .first();
        
    // // Create a binary mask based on landcover classes
    // var mask = maskImage.eq(landcoverClass1)
    //   .or(maskImage.eq(landcoverClass2))
    //   .or(maskImage.eq(landcoverClass3));
    // Get the geometry of the image
    
    var imageGeometry = image.geometry();

    // var forestMask = image.updateMask(mask)
    var max = maskedImage_2.select('DRS').reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: imageGeometry,
      scale: 10,
      bestEffort: true,
      tileScale: 8
      });
      var min = maskedImage_2.select('DRS').reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: imageGeometry,
      scale: 10,
      bestEffort: true, 
      tileScale: 8
      });
      var NDRS = image.expression('(DRS - DRSmin) / (DRSmax - DRSmin)',
      {'DRS': image.select('DRS'),
      'DRSmin': ee.Number(min.get('DRS')),
      'DRSmax': ee.Number(max.get('DRS'))
      // 'DRSmin': min,
      // 'DRSmax': max
      })
      .rename('NDRS');
      // return image.addBands([NDRS])
      return image.addBands(NDRS)
      
    }

/////////////////////////////////////////////////


/////////////////////////////////////////////////

// Use NDRS to classify stressed and not stressed forest pixels
// Define the name of the band to apply the threshold
var bandName = 'NDRS';

// Define the threshold value
var threshold = 0.5;

// Define a function to create a binary mask based on the threshold
exports.createBinaryMask = function(image) {
  var masks = require("users/bgcasey/functions:masks");
  //mask out non forest pixels and replace with zero to maintain a continuos raster
  var maskedImage = masks.maskByLandcover(image).unmask(0)

  // Get the specific band to apply the threshold
  var band =  maskedImage.select(bandName);
  
  // Apply the threshold to the band
  var binaryMask = band.gt(threshold).rename('NDRS_stressed');
  
  // Add the binary mask as a new band to the image
  var imageWithMask = image.addBands(binaryMask);

  return imageWithMask;
};  

/////////////////////////////////////////////////
// Landcover variables
/// From 'projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2'

// feature_collection are the features you are extracting landcover data to 
exports.Landcover_ts = function(feature_collection, Date_Start, Date_End) {
      var LC = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2').
      filterDate(Date_Start, Date_End);
      
      // choose reducers
      var reducers = ee.Reducer.count().combine({
        reducer2: ee.Reducer.frequencyHistogram(),
        sharedInputs: true
      });
      
      var LC_1 = LC.map(function(img) {
        return img.reduceRegions({
          collection: feature_collection,
          reducer: reducers, // set the names of output properties to the corresponding band names
          scale: 600,
          tileScale: 2
        }).map(function (feature) {
                  var histogramResults = ee.Dictionary(feature.get('histogram'));
                  var pixel_count= ee.Number(feature.get('count'))
            return feature.copyProperties(img, ['system:time_start']) //to get year properties from the stack
                  .set(// get proportion of landcover from histogram 
                      // by dividing histogram pixel values by the total pixel_count.
                      'Unclassified', ee.Number(histogramResults.get('0', 0)).divide(pixel_count),
                      'Water', ee.Number(histogramResults.get('20', 0)).divide(pixel_count),
                      'Snow_Ice', ee.Number(histogramResults.get('31', 0)).divide(pixel_count),
                      'Rock_Rubble', ee.Number(histogramResults.get('32', 0)).divide(pixel_count),
                      'Exposed_Barren_land', ee.Number(histogramResults.get('33', 0)).divide(pixel_count),
                      'Bryoids', ee.Number(histogramResults.get('40', 0)).divide(pixel_count),
                      'Shrubs', ee.Number(histogramResults.get('50', 0)).divide(pixel_count),
                      'Wetland', ee.Number(histogramResults.get('80', 0)).divide(pixel_count),
                      'Wetland-treed', ee.Number(histogramResults.get('81', 0)).divide(pixel_count),
                      'Herbs', ee.Number(histogramResults.get('100', 0)).divide(pixel_count),
                      'Coniferous', ee.Number(histogramResults.get('210', 0)).divide(pixel_count),
                      'Broadleaf', ee.Number(histogramResults.get('220', 0)).divide(pixel_count),
                      'Mixedwood', ee.Number(histogramResults.get('230', 0)).divide(pixel_count),
                      'landcover_yr', img.date().format('YYYY'));
        })
      }).flatten(); //  Flattens collections of collections into a feature collection of those collections
      return LC_1;
}



/////////////////////////////////////////////////



// var dataset = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');

// var visualization = {
//   bands: ['recurrence'],
//   min: 0.0,
//   max: 100.0,
//   palette: ['ffffff', 'ffbbbb', '0000ff']
// };
// print(dataset, "dataset")


// Map.addLayer(dataset, visualization, 'Occurrence');





// // Distance to water
// // exports.distance_to_water = function(points){
// // // Load the feature collection of points
// // // var points = ee.FeatureCollection('POINT_COLLECTION_ID');

// // // Load the water bodies data (e.g., a water mask or water bodies feature collection)

// var maskYear = 2019

// var maskCollection = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2')// resolution=30 m
//   .filter(ee.Filter.calendarRange(maskYear, maskYear, 'year'))

// // Define the landcover classes you want to create a mask for
// var landcoverClass1 = 20;
    
// var mask = maskCollection.first().eq(landcoverClass1)
// Map.addLayer(mask,  {palette: ['white', 'blue'], opacity: 0.8}, 'LC');


// // Define a function to mask an image by multiple landcover classes
// exports.maskByLandcover = function(image) {
//   // Filter the mask collection based on the image's year
//   var maskImage = maskCollection.first()
//     // .filter(ee.Filter.calendarRange(maskYear, maskYear, 'year'))
//     // .first();
    
//     var mask = maskImage.eq(landcoverClass1)
//       // .or(maskImage.eq(landcoverClass2))
//       // .or(maskImage.eq(landcoverClass3));
    
//   return  image.updateMask(mask); 
// }

// var waterBodies = ee.Image('WATER_BODY_IMAGE_ID');


// // Compute the distance to the nearest water body for each point
// var distanceToWater = points.map(function(point) {
//   var distance = waterBodies.distance(ee.Geometry(point.geometry()), 30); // Specify the scale as desired
//   return point.set('distance_to_water', distance);
// });

// // Print the resulting feature collection
// print(distanceToWater);






