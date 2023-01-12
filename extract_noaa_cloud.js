// Run this script using the Earth Engine code editor at code.earthengine.google.com
 
 // check https://developers.google.com/earth-engine/guides/landsat for simplecloudscore algorithm

//########################################################################################################
//##### User defined inputs ##### 
//########################################################################################################

// import ibutton xy locations
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
print(ibuttons, "ibuttons")

// // limit number of ibuttons for testing purposes
// var ibuttons =ibuttons.limit(4)


var study_area = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");
print(study_area, "study_area")

// Create geometry object,for study area
var geometry = /* color: #ffc82d */study_area.geometry();
print(geometry, "geometry");
//Map.addLayer(geometry);

// defin e a geometry - there are lots of ways to do this, see the GEE User guide
var aoi = geometry


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

// //########################################################################################################
// //##### Define Landsat time series functions ##### 
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
  var bands_1 = image.select('cloud_fraction', 'cloud_probability').multiply(0.00393701).add(0.5);
  return image.addBands(bands_1, null, true);
}








// var dataset = ee.ImageCollection('NOAA/CDR/PATMOSX/V53')
//                   .filter(ee.Filter.date('2017-05-01', '2017-05-14'));
// var cloudEmissivityAndHeight = dataset.select(
//     ['cloud_fraction', 'cloud_probability']);
// Map.setCenter(71.72, 52.48, 1);
// Map.addLayer(cloudEmissivityAndHeight, {}, 'Cloud Emissivity and Height');


var noaa_fn = function(d1) {
  var start = ee.Date(d1);
  var end = ee.Date(d1).advance(num_months_in_interval, 'month');
  var date_range = ee.DateRange(start, end);
  var date =ee.Date(d1)
  var noaa=ee.ImageCollection('NOAA/CDR/PATMOSX/V53')
    .select(['cloud_fraction', 'cloud_probability'])
    .filterDate(date_range)
    .map(function(img){return img.clip(aoi)})//clip to study area
    .map(applyScaleFactors)
  return(noaa
        .median()
        .set("date", date,"month", date.get('month'), "year", date.get('year'))
        )
        ;
};

var noaa_monthly_list = dates.map(noaa_fn);
print("noaa_monthly_list", noaa_monthly_list);
var noaa_monthly = ee.ImageCollection(noaa_monthly_list); // add the list of images to a single image collection
print("noaa_monthly", noaa_monthly);


//########################################################################################################
// // ### Get a time series of noaa over each ibutton location ###
//########################################################################################################

// use the map function to apply reduceRegions to every ibutton locations. reduceRegions extract each layer of the 
// image collection to the ibutton locations where as reduceRegion would just process a single layer. 


var extracted_values = noaa_monthly.map(function(img) {
  return img.reduceRegions({
    collection: ibuttons,
    reducer: ee.Reducer.first(), // set the names of output properties to the corresponding band names
    scale: 30,
    tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties from the stack
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections

 
print ("extracted_values", extracted_values.limit(10))

 
//########################################################################################################
// // ### Save/export time series data ###
//########################################################################################################

// Export noaa variables to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: extracted_values,
  description:'ibutton_noaa_cloud_monthly',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year', 
                  'month', 
                  'Project', 
                  'St_SttK',
                  'cloud_fraction',
                  'cloud_probability'] 
});







