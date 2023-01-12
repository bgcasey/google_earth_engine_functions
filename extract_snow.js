// https://gis.stackexchange.com/questions/363058/calculating-area-of-snow-cover-in-gee

//########################################################################################################
//##### User defined inputs ##### 
//########################################################################################################

// import ibutton xy locations
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
print(ibuttons, "ibuttons")


// define a buffer size around point locations (for zonal stats)
var buf=31

//// set up time steps. In this case we want to extract median monthy spectral indices for a date range
// Define start and end dates
var Date_Start = ee.Date('2005-01-01');
var Date_End = ee.Date('2021-12-31');

var num_months_in_interval=1;

// //########################################################################################################
// //##### Buffer points and define study area ##### 
// //########################################################################################################

// for zonal stats create buffer around points
var ibuttons_buff= ibuttons.map(function(pt){
    return pt.buffer(buf);
  });

//define study area
var aoi = ibuttons.geometry().bounds().buffer(10000).bounds();
// var region_t = ibuttons.getInfo()
print(aoi, "aoi")

// convert the geometry to a feature to get the batch.Download.ImageCollection.toDrive function to work
var aoi1=ee.FeatureCollection(aoi)
print(aoi1, "aoi1")


// //########################################################################################################
// //##### Function to calculate Snow Cover ##### 
// //########################################################################################################

// Create list of dates for time series. It start at the firest of each month in the date range
var n_months = Date_End.difference(Date_Start,'month').round();
var dates = ee.List.sequence(0, n_months, num_months_in_interval);
var make_datelist = function(n) {
  return Date_Start.advance(n,'month');
};
dates = dates.map(make_datelist);

print(dates, 'list of dates for time series')


// apply scaling factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
}

// cloud mask
function mask_cloud(image) {
    var qa = image.select('QA_PIXEL'); 
    var cloudsBitMask = (1 << 3); // Get bit 3: cloud mask
    var cloudShadowBitMask = (1 << 4); // Get bit 4: cloud shadow mask
    var mask = qa.bitwiseAnd(cloudsBitMask).eq(0).and
          (qa.bitwiseAnd(cloudShadowBitMask).eq(0));
    return image.updateMask(mask);
}

// Function to adding a calculated Normalized Difference Snow Index NDSI band
function addNDSI(image) {
  var NDSI = image.normalizedDifference(['SR_B2', 'SR_B5']).rename('NDSI')
  return image.addBands([NDSI])
}

// Function for creating a binary image of snow/not snow.   NDSI values greater than 0 are considered snow
function addSnow(image) {
var snow = image.normalizedDifference(['SR_B2', 'SR_B5']).gt(0.4).rename('snow');
return image.addBands([snow])
}



// define a function apply the cloud mask and and caluclate spectral metrics.
var leo7_fn = function(d1) {
  var start = ee.Date(d1);
  var end = ee.Date(d1).advance(num_months_in_interval, 'month');
  var date_range = ee.DateRange(start, end);
  var date =ee.Date(d1)
  var leo7=ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(date_range)
    .map(applyScaleFactors)
    .map(mask_cloud) // apply the cloud mask function
    .map(addNDSI)  // apply NDSI function
    .map(addSnow)  // apply Snow function
    .map(function(img){return img.clip(aoi)})//clip to study area
  return(leo7
        .median()
        .set("date", date,"month", date.get('month'), "year", date.get('year'))
        .select(['NDSI', 'snow']))
        ;
};


var leo7_monthly_list = dates.map(leo7_fn);
print(leo7_monthly_list, "leo7_monthly_list");
var leo7_monthly = ee.ImageCollection(leo7_monthly_list); // add the list of images to a single image collection
print(leo7_monthly, "leo7_monthly");

/////////////////////////////////////////////////////////////
///// Generate neighborhood rasters
/////////////////////////////////////////////////////////////////

// //// View histogram of pixels classified as code
// var extracted_values = S2_monthly.select(['snow']).map(function(img) {
//   return img.reduceRegions({
//     collection: ibuttons_buff,
//     reducer: ee.Reducer.histogram(), // set the names of output properties to the corresponding band names
//     scale: 20,
//     tileScale: 2
//   }).map(function (featureWithReduction) {
//     return featureWithReduction.copyProperties(img); //to get year and month properties from the stack
//   });
// }).flatten(); //

// print(extracted_values, "extracted_values")




/// Neighborhood snow cover raster. 
/// Create 100m raster where pixel values represent the proportion of the pixel classified as snow
var neighborhood_snowCover= leo7_monthly.select(['snow']).map(function(img) {
return img.reduceNeighborhood({
    reducer: ee.Reducer.sum(), // set the names of output properties to the corresponding band names
    kernel: ee.Kernel.square({radius: 30, 
                            units: 'meters', 
                            normalize: true //Normalize the kernel values to sum to 1.
      
    }),
    }).copyProperties(img)

}); 
print(neighborhood_snowCover, "neighborhood_snowCover")

// neighborhood NDSI
var neighborhood_NDSI= leo7_monthly.select(['NDSI']).map(function(img) {
return img.reduceNeighborhood({
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    kernel: ee.Kernel.square({radius: 30, 
                            units: 'meters', 
                            normalize: false //Normalize the kernel values to sum to 1.
      
    }),
    }).copyProperties(img)

}); 
print(neighborhood_NDSI, "neighborhood_NDSI")

// Combine snow cover and NDSI neighborhood rasters into a single image collection 
var neighborhood_snow = neighborhood_snowCover.combine(neighborhood_NDSI)
print(neighborhood_snow, "neighborhood_snow")

// // export neighborhood rasters
// var batch = require('users/fitoprincipe/geetools:batch')

// batch.Download.ImageCollection.toDrive(neighborhood_snow, 'snow_monthly_rasters', 
//                 { 
//                 name:'snow_monthly_{year}_{month}',
//                 scale:30,
//                 //maxPixels: 1e13,
//                 region:aoi1
//                 })



// // Histogram of snow and NDSI values
// var snowList=ee.ImageCollection(neighborhood_snow).select('snow_sum').toList(999);
// var img1=ee.Image(ee.List(snowList).get(2)); 
// print(img1, 'img1')
// var histogram_snow= ui.Chart.image.histogram(img1, aoi, 10000)
// print(histogram_snow, "hist_snow")

// var NDSIList=ee.ImageCollection(neighborhood_snow).select('NDSI_mean').toList(999);
// var img2=ee.Image(ee.List(NDSIList).get(1)); 
// print(img2, 'img2')
// var histogram_NDSI= ui.Chart.image.histogram(img2, aoi, 10000)
// print(histogram_NDSI, "hist_NDSI")

/////////////////////////////////////////////////////////////
///// Extract values to points
/////////////////////////////////////////////////////////////////

var neighborhood_snow_extracted_values = neighborhood_snow.map(function(img) {
  return img.reduceRegions({
    collection: ibuttons,
    reducer: ee.Reducer.first(), // set the names of output properties to the corresponding band names
    scale: 30,
    tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections

print (neighborhood_snow_extracted_values, "neighborhood_snow_extracted_values")


// ### Save/export Senitenl stats ###
// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: neighborhood_snow_extracted_values,
  description:'ibutton_snow_neighborhood_indices',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year',
                  'month',
                  'date',
                  'Project', 
                  'St_SttK',
                  'snow_sum',
                  'NDSI_mean'] 
});


var extracted_values = leo7_monthly.map(function(img) {
  return img.reduceRegions({
    collection: ibuttons_buff,
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    scale: 30,
    // tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties from the stack
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections


print ("extracted_values", extracted_values.limit(10))


// ### Save/export Senitenl zonal stats ###

// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: extracted_values,
  description:'ibutton_snow_indices',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year',
                  'month',
                  'date',
                  'Project', 
                  'St_SttK',
                  'snow',
                  'NDSI'] 
});

//########################################################################################################
// // ### Map ###
//########################################################################################################

// // Map.addLayer(S2_monthly.select('snow').filterMetadata('month', 'equals', 8), {}, 'Snow');
// // Map.addLayer(S2_monthly.select('NDSI').filterMetadata('month', 'equals', 8), {min: -1, max: 1}, 'NDSI');
// Map.addLayer(neighborhood_snow.select('snow_sum').filterMetadata('month', 'equals', 5), {min:.2, max: .8}, 'Snow');
// Map.centerObject(aoi, 6) // center the map on the study area

// // add ibutton locations
// Map.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")

