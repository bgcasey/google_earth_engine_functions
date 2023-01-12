// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### INPUTS ##### 
//########################################################################################################

// import ibutton xy locations and  and the study area.
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");

// Import image collection. Here we are using the ERA5 monthly summaries
var era5= ee.ImageCollection("ECMWF/ERA5/MONTHLY");                       

// //########################################################################################################
// //##### Define study area ##### 
// //########################################################################################################

//define study area
var aoi = ibuttons.geometry().bounds().buffer(10000).bounds();
// var region_t = ibuttons.getInfo()
print(aoi, "aoi")

// convert the geometry to a feature to get the batch.Download.ImageCollection.toDrive function to work
var aoi1=ee.FeatureCollection(aoi)
print(aoi1, "aoi1")
//########################



//########################################################################################################
//##### Filter image collection ##### 
//########################################################################################################

// //filter to specifc years 
var era5_filterYr = era5.filter(ee.Filter.calendarRange(2005,2021,'year'));
// //.filter(ee.Filter.calendarRange(6,8,'month'));
print(era5_filterYr.limit(10), 'era5_filterYr')


//########################################################################################################
// // ### Get a time series of ERA5 over each ibutton location ###
//########################################################################################################

// use the map function to apply reduceRegions to every ibutton locations. reduceRegions extract each layer of the 
// image collection to the ibutton locations where as reduceRegion would just process a single layer. 

var regionalTemp = era5_filterYr.map(function(img) {
  return img.reduceRegions({
    collection: ibuttons,
    reducer: ee.Reducer.first(),
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties from the ERA5 mosaic stack
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections

print (regionalTemp.limit(10), "regionalTemp")


//########################################################################################################
// // ### Save/export time series data ###
//########################################################################################################

// Export ERA5 variables to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: regionalTemp,
  description:'ibutton_timeSeries_ERA5_monthly',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year', 
                  'month', 
                  'Project', 
                  'St_SttK',
                  'dewpoint_2m_temperature', 
                  'maximum_2m_air_temperature', 
                  'mean_2m_air_temperature', 
                  'mean_sea_level_pressure', 
                  'minimum_2m_air_temperature', 
                  'surface_pressure', 
                  'total_precipitation', 
                  'u_component_of_wind_10m', 
                  'v_component_of_wind_10m'] 
});


