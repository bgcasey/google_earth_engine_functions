// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### INPUTS ##### 
//########################################################################################################

// import ibutton xy locations and  and the study area.
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");

// limit number of ibuttons for testing purposes
// var ibuttons =ibuttons.limit(4)

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

// Define start and end dates
var Date_Start = ee.Date('2005-01-01');
var Date_End = ee.Date('2021-12-01');

//########################################################################################################
//##### Filter image collection ##### 
//########################################################################################################

var num_months_in_interval=1;

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
  var bands_1 = image.select('aet',
                                  'def',
                                  'pet',
                                  'soil',
                                  'srad',
                                  'tmmn',
                                  'tmmx').multiply(0.1);
  var bands_01 = image.select('pdsi',
                              'vpd',
                              'vs').multiply(0.1);
  var bands_001 = image.select('vap').multiply(0.001);                            
  return image.addBands(bands_1, null, true)
              .addBands(bands_01, null, true)
              .addBands(bands_001, null, true);
}


var terra_fn = function(d1) {
  var start = ee.Date(d1);
  var end = ee.Date(d1).advance(num_months_in_interval, 'month');
  var date_range = ee.DateRange(start, end);
  var date =ee.Date(d1)
  var terra=ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
    .filterDate(date_range)
    .map(function(img){return img.clip(aoi)})//clip to study area
    .map(applyScaleFactors)
  return(terra
        .median()
        .set("date", date,"month", date.get('month'), "year", date.get('year'))
        )
        ;
};

var terra_monthly_list = dates.map(terra_fn);
print("terra_monthly_list", terra_monthly_list);
var terra_monthly = ee.ImageCollection(terra_monthly_list); // add the list of images to a single image collection
print("terra_monthly", terra_monthly);


//########################################################################################################
// // ### Get a time series of terra over each ibutton location ###
//########################################################################################################

// use the map function to apply reduceRegions to every ibutton locations. reduceRegions extract each layer of the 
// image collection to the ibutton locations where as reduceRegion would just process a single layer. 


var extracted_values = terra_monthly.map(function(img) {
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

// Export terra variables to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: extracted_values,
  description:'ibutton_terra_monthly',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year', 
                  'month', 
                  'Project', 
                  'St_SttK',
                  'aet',
                  'def',
                  'pdsi',
                  'pet',
                  'pr',
                  'ro',
                  'soil',
                  'srad',
                  'swe',
                  'tmmn',
                  'tmmx',
                  'vap',
                  'vpd',
                  'vs'] 
});

