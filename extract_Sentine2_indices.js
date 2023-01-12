/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Run this script using the Earth Engine code editor at code.earthengine.google.com
 

//########################################################################################################
//##### User defined inputs ##### 
//########################################################################################################

// import ibutton xy locations
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
print(ibuttons, "ibuttons")

// var study_area = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");
// print(study_area, "study_area")

// Create geometry object,for study area
var geometry = /* color: #ffc82d */study_area.geometry();
print(geometry, "geometry");
//Map.addLayer(geometry);

// defin e a geometry - there are lots of ways to do this, see the GEE User guide
var aoi = geometry


// // filter ibuttons for testing
// var ibuttons_filter = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/RIVR_xy")
//   //.filter("St_SttK,'RIVR-009-01'")
//   .filter(ee.Filter.eq('St_SttK','RIVR-009-01'))
//   .first()
//   .geometry()
// ;
// print(ibuttons_filter, "ibuttons_filter")


// define a buffer size around point locations (for zonal stats)
var buf=30

//// set up time steps. In this case we want to extract median monthy spectral indices for a date range
// Define start and end dates
var Date_Start = ee.Date('2005-01-01');
var Date_End = ee.Date('2021-12-01');

var num_months_in_interval=1;
//var Date_window = ee.Number(30); //creates a 30day/month time step

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

// var printGeoJSONString = function(geometry) {
//   geometry = ee.Geometry(geometry);
//   print(geometry.toGeoJSONString());
// };


// Map the study area and ibutton locations

// Add two maps to the screen.
var left = ui.Map();
var right = ui.Map();
ui.root.clear();
ui.root.add(left);
ui.root.add(right);

// Link maps, so when you drag one map, the other will be moved in sync.
ui.Map.Linker([left, right], 'change-bounds');


var outline = ee.Image().byte().paint({  // get border of study area
  featureCollection: aoi,
  color: 1,
  width: 3
});

left.addLayer(outline, {palette: ['blue']}, 'AOI')
right.addLayer(outline, {palette: ['blue']}, 'AOI')

// add ibutton locations

// left.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")
// right.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")


// //########################################################################################################
// //##### Sentinel Indices ##### 
// //########################################################################################################


// Create list of dates for time series. It start at the firest of each month in the date range
var n_months = Date_End.difference(Date_Start,'month').round();
var dates = ee.List.sequence(0, n_months, num_months_in_interval);
var make_datelist = function(n) {
  return Date_Start.advance(n,'month');
};
dates = dates.map(make_datelist);

print(dates, 'list of dates for time series')


// // Function to remove cloud and snow pixels
// function maskCloudAndShadows(image) {
//   var cloudProb = image.select('MSK_CLDPRB');
//   var snowProb = image.select('MSK_SNWPRB');
//   var cloud = cloudProb.lt(20);
//   var snow = snowProb.lt(20);
//   var scl = image.select('SCL'); 
//   var shadow = scl.eq(3); // 3 = cloud shadow
//   var cirrus = scl.eq(10); // 10 = cirrus
//   // Cloud probability less than 5% or cloud shadow classification
//   var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
//   return image.updateMask(mask);
// }


// snow mask
function snowMask2(image) {
  var SCL = image.select('SCL');
  var snow = SCL.eq(11);
  var mask=snow.neq(1)
  return image.updateMask(mask);
}  



// cloud mask
function maskS2clouds(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}


// Function to adding a calculated Normalized Difference Vegetation Index NDVI band
function addNDVI(image) {
  var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  return image.addBands([NDVI])
}

// Function to adding a calculated Normalized Difference Moisture Index (NDMI) band
function addNDMI(image) {
  var NDMI = image.normalizedDifference(['B8', 'B11']).rename('NDMI')
  return image.addBands([NDMI])
}


// Function to adding a calculated  Enhanced Vegetation Index (EVI) band (Sentinel 2 imagery in EE has been scaled by 10000. Divided by 10000 to adjust for scale factor)
function addEVI(image) {
  var EVI =image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
            'NIR': image.select('B8'),
            'RED': image.select('B4'),
            'BLUE': image.select('B2')
        }).rename('EVI')
  return image.addBands([EVI])
}


// Function to adding a calculated  Leaf Area Index (LAI) band
function addLAI(image) {
  var LAI = image.expression(
        '3.618 *(2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1)))-0.118', {
            'NIR': image.select('B8'),
            'RED': image.select('B4'),
            'BLUE': image.select('B2')
        }).rename('LAI')
  return image.addBands([LAI])
}  
  

// Function to adding a calculated Soil Adjusted Vegetation Index (SAVI) band
function addSAVI(image) {
  var SAVI =image.expression(
        '((NIR - R) / (NIR + R + 0.428)) * (1.428)', {
          'NIR': image.select('B8'),
          'R': image.select('B4')
        }).rename('SAVI')
    return image.addBands([SAVI])
}

// Function to adding a calculated Bare Soil Index (BSI) band
function addBSI(image) {
  var BSI =image.expression(
        '((Red+SWIR) - (NIR+Blue)) / ((Red+SWIR) + (NIR+Blue))', {
          'NIR': image.select('B8'),
          'Red': image.select('B4'),
          'Blue': image.select('B2'),
          'SWIR': image.select('B11') 
        }).rename('BSI')
    return image.addBands([BSI])
}

// Function to adding a calculated Shadow index (SI)
function addSI(image) {
  var SI =image.expression(
          '(1 - blue) * (1 - green) * (1 - red)', {
          'blue': image.select('B2'),
          'green': image.select('B3'),
          'red': image.select('B4'),
        }).rename('SI')
      return image.addBands([SI])
}


// define a function apply the cloud mask and and caluclate spectral metrics.
var S2_fn = function(d1) {
  var start = ee.Date(d1);
  var end = ee.Date(d1).advance(num_months_in_interval, 'month');
  var date_range = ee.DateRange(start, end);
  var date =ee.Date(d1)
  var S2=ee.ImageCollection('COPERNICUS/S2_SR')
    .filterDate(date_range)
    .map(maskS2clouds) // apply the cloud mask function
    .map(snowMask2)
    .map(addNDVI)  // apply NDVI function
    .map(addNDMI)  // apply NDMI function
    .map(addEVI)  // apply NDMI function
    .map(addSAVI)
    .map(addBSI)
    .map(addSI)
    .map(addLAI)
    .map(function(img){return img.clip(aoi)})//clip to study area
  return(S2
        .median()
        .set("date", date,"month", date.get('month'), "year", date.get('year'))
        .select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']))
        ;
};


var S2_monthly_list = dates.map(S2_fn);
print(S2_monthly_list, "S2_monthly_list");
var S2_monthly = ee.ImageCollection(S2_monthly_list); // add the list of images to a single image collection
print(S2_monthly, "S2_monthly");



// add a single layer to the map
var s2_ndvi= S2_monthly.select('NDVI')
.filterMetadata('year', 'equals', 2020)
.filterMetadata('month', 'equals', 1)
print(s2_ndvi, "s2_NDVI")

left.centerObject(aoi, 6) // center the map on the study area
left.addLayer(s2_ndvi,{}, "s2_ndvi_2020_01")
left.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")


var batch = require('users/fitoprincipe/geetools:batch')

batch.Download.ImageCollection.toDrive(S2_monthly, 'S2_monthly_rasters', 
                { 
                name:'S2_monthly_{year}_{month}',
                scale:30,
                //maxPixels: 1e13,
                region:aoi1
                })



//########################################################################################################
// // ### Extract a time series of zonal statistics around each ibutton location ###
//########################################################################################################

// use the map function to apply reduceRegions to every ibutton locations. reduceRegions extract each layer of the 
// image collection to the ibutton locations where as reduceRegion would just process a single layer. 
// Here we selected the ndvi band to map over ibutton locations.
var extracted_values = S2_monthly.select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']).map(function(img) {
  return img.reduceRegions({
    collection: ibuttons_buff,
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    scale: 30,
    tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties from the stack
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections


print (extracted_values, "extracted_values")


// ### Save/export Senitenl zonal stats ###

// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: extracted_values,
  description:'ibutton_sentinel_indices',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year',
                  'month',
                  'date',
                  'Project', 
                  'St_SttK',
                  'NDVI',
                  'EVI',
                  'NDMI',
                  'SAVI',
                  'BSI',
                  'SI',
                  'LAI'] 
});


//########################################################################################################
// // // ### Focal statistics via reduceNeighborhood ###
// //########################################################################################################


var neighborhood= S2_monthly.select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']).map(function(img) {
return img.reduceNeighborhood({
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    kernel: ee.Kernel.circle(100, "meters"),
    }).copyProperties(img)

}); 
print(neighborhood, "neighborhood")


var neighborhood_ndvi= neighborhood.select('NDVI_mean')
    .filterMetadata('year', 'equals', 2020)
    .filterMetadata('month', 'equals', 1)
print(neighborhood_ndvi, "s2_NDVI")


right.addLayer(neighborhood_ndvi,{}, "neighborhood_ndvi")
right.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")

var batch = require('users/fitoprincipe/geetools:batch')


batch.Download.ImageCollection.toDrive(neighborhood, 'sentinel_neighborhood_rasters', 
                {name:'sentinel_neighborhood_{year}_{month}',
                scale: 30, 
                region:aoi1
});


var neighborhood_extracted_values = neighborhood .select(['NDVI_mean', 'NDMI_mean', 'EVI_mean', 'SAVI_mean', 'BSI_mean', 'SI_mean', 'LAI_mean']).map(function(img) {
  return img.reduceRegions({
    collection: ibuttons,
    reducer: ee.Reducer.first(), // set the names of output properties to the corresponding band names
    scale: 30,
    tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections

print (neighborhood_extracted_values, "neighborhood_extracted_values")


/////////////////
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: neighborhood_extracted_values,
  description:'ibutton_sentinel_neighborhood_indices',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year',
                  'month',
                  'date',
                  'Project', 
                  'St_SttK',
                  'NDVI_mean', 'NDMI_mean', 'EVI_mean', 'SAVI_mean', 'BSI_mean', 'SI_mean', 'LAI_mean'] 
});







