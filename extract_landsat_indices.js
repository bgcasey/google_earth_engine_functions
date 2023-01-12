// Run this script using the Earth Engine code editor at code.earthengine.google.com
 

//########################################################################################################
//##### User defined inputs ##### 
//########################################################################################################

// import ibutton xy locations
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
print(ibuttons, "ibuttons")

// limit number of ibuttons for testing purposes
//var ibuttons =ibuttons.limit(20)


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



//########################################################################################################
//##### Define Landsat time series functions ##### 
//########################################################################################################

// apply scaling factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
}


// cloud and snow mask
function mask_cloud_snow(image) {
    var qa = image.select('QA_PIXEL'); 
    var cloudsBitMask = (1 << 3); // Get bit 3: cloud mask
    var cloudShadowBitMask = (1 << 4); // Get bit 4: cloud shadow mask
    var snowBitMask = (1 << 5); // Get bit 5: snow mask
    var mask = qa.bitwiseAnd(cloudsBitMask).eq(0).and
          (qa.bitwiseAnd(cloudShadowBitMask).eq(0)).and
          (qa.bitwiseAnd(snowBitMask).eq(0));
return image.updateMask(mask);
}


// Function to adding a calculated Normalized Difference Vegetation Index NDVI band
function addNDVI(image) {
  var NDVI = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI')
  return image.addBands([NDVI])
}

// Function to adding a calculated Normalized Difference Moisture Index (NDMI) band
function addNDMI(image) {
  var NDMI = image.expression(
        '(NIR - SWIR) / (NIR + SWIR)', {
            'NIR': image.select('SR_B4'),
            'SWIR': image.select('SR_B5'),
        }).rename('NDMI')
  return image.addBands([NDMI])
}

// Function to adding a calculated  Enhanced Vegetation Index (EVI) 
function addEVI(image) {
  var EVI =image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
            'NIR': image.select('SR_B4'),
            'RED': image.select('SR_B3'),
            'BLUE': image.select('SR_B1')
        }).rename('EVI')
  return image.addBands([EVI])
}


// Function to adding a calculated  Leaf Area Index (LAI) band
function addLAI(image) {
  var LAI = image.expression(
        '3.618 *(2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1)))-0.118', {
            'NIR': image.select('SR_B4'),
            'RED': image.select('SR_B3'),
            'BLUE': image.select('SR_B1')
        }).rename('LAI')
  return image.addBands([LAI])
}  
  

// Function to adding a calculated Soil Adjusted Vegetation Index (SAVI) band
function addSAVI(image) {
  var SAVI =image.expression(
        '((NIR - R) / (NIR + R + 0.428)) * (1.428)', {
          'NIR': image.select('SR_B4'),
          'R': image.select('SR_B3')
        }).rename('SAVI')
    return image.addBands([SAVI])
}

// Function to adding a calculated Bare Soil Index (BSI) band
function addBSI(image) {
  var BSI =image.expression(
        '((Red+SWIR) - (NIR+Blue)) / ((Red+SWIR) + (NIR+Blue))', {
          'NIR': image.select('SR_B4'),
          'Red': image.select('SR_B3'),
          'Blue': image.select('SR_B1'),
          'SWIR': image.select('SR_B5') 
        }).rename('BSI')
    return image.addBands([BSI])
}

// Function to adding a calculated Shadow index (SI)
function addSI(image) {
  var SI =image.expression(
          '(1 - blue) * (1 - green) * (1 - red)', {
          'blue': image.select('SR_B1'),
          'green': image.select('SR_B2'),
          'red': image.select('SR_B3')
        }).rename('SI')
      return image.addBands([SI])
}





//########################################################################################################
//##### Map a list of dates through the above functions to create an image time series ##### 
//########################################################################################################

// Create list of dates for time series. It start at the firest of each month in the date range
var n_months = Date_End.difference(Date_Start,'month').round();
var dates = ee.List.sequence(0, n_months, num_months_in_interval);
var make_datelist = function(n) {
  return Date_Start.advance(n,'month');
};
dates = dates.map(make_datelist);

print(dates, 'list of dates for time series')


// function that can be used to map the dates list through the  above function. 
var leo7_fn = function(d1) {
  var start = ee.Date(d1);
  var end = ee.Date(d1).advance(num_months_in_interval, 'month');
  var date_range = ee.DateRange(start, end);
  var date =ee.Date(d1)
  var leo7=ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(date_range)
    .map(applyScaleFactors)
    .map(mask_cloud_snow) // apply the cloud mask function
    .map(addNDVI)  // apply NDVI function
    .map(addNDMI)  // apply NDMI function
    .map(addEVI)  // apply NDMI function
    .map(addSAVI)
    .map(addBSI)
    .map(addSI)
    .map(addLAI)
    .map(function(img){return img.clip(aoi)})//clip to study area
  return(leo7
        .median()
        .set("date", date,"month", date.get('month'), "year", date.get('year'))
        .select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']))
        ;
};


var leo7_monthly_list = dates.map(leo7_fn);
print("leo7_monthly_list", leo7_monthly_list);
var leo7_monthly = ee.ImageCollection(leo7_monthly_list); // add the list of images to a single image collection
print("leo7_monthly", leo7_monthly);


//########################################################################################################
// // ### Extract a time series of zonal statistics around each ibutton location ###
//########################################################################################################

// use the map function to apply reduceRegions to every ibutton locations. reduceRegions extract each layer of the 
// image collection to the ibutton locations where as reduceRegion would just process a single layer. 
// Here we selected the ndvi band to map over ibutton locations.
var extracted_values = leo7_monthly.select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']).map(function(img) {
  return img.reduceRegions({
    collection: ibuttons_buff,
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    scale: 30,
    // tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties from the stack
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections


print ("extracted_values", extracted_values)


// ### Save/export Senitenl zonal stats ###

// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: extracted_values,
  description:'ibutton_landsat_indices',
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

var hist=ui.Chart.feature.histogram(extracted_values, 'NDVI')
print("ndvi hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'EVI')
print("evi hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'NDMI')
print("ndmi hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'SAVI')
print("savi hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'BSI')
print("bsi hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'SI')
print("si hist", hist)

var hist=ui.Chart.feature.histogram(extracted_values, 'LAI')
print("lai hist", hist)


//########################################################################################################
// // // ### Focal statistics via reduceNeighborhood ###
// //########################################################################################################


var neighborhood= leo7_monthly.select(['NDVI', 'NDMI', 'EVI', 'SAVI', 'BSI', 'SI', 'LAI']).map(function(img) {
return img.reduceNeighborhood({
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    kernel: ee.Kernel.square(30, "meters"),
    }).copyProperties(img)

}); 
print(neighborhood, "neighborhood")


// var neighborhood_ndvi= neighborhood.select('NDVI_mean')
//     .filterMetadata('year', 'equals', 2020)
//     .filterMetadata('month', 'equals', 1)
// print(neighborhood_ndvi, "leo7_NDVI")



// var batch = require('users/fitoprincipe/geetools:batch')


// batch.Download.ImageCollection.toDrive(neighborhood, 'leo7_neighborhood_rasters', 
//                 {name:'leo7_neighborhood_{year}_{month}',
//                 scale: 30, 
//                 region:aoi1
// });


var neighborhood_extracted_values = neighborhood .select(['NDVI_mean', 'EVI_mean', 'NDMI_mean',  'SAVI_mean', 'BSI_mean', 'SI_mean', 'LAI_mean']).map(function(img) {
  return img.reduceRegions({
    collection: ibuttons,
    reducer: ee.Reducer.first(), // set the names of output properties to the corresponding band names
    scale: 30,
    // tileScale: 2
  }).map(function (featureWithReduction) {
    return featureWithReduction.copyProperties(img); //to get year and month properties
  });
}).flatten(); //  Flattens collections of collections into a feature collection of those collections

print (neighborhood_extracted_values, "neighborhood_extracted_values")


/////////////////
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: neighborhood_extracted_values,
  description:'ibutton_landsat_neighborhood_indices',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'year',
                  'month',
                  'date',
                  'Project', 
                  'St_SttK',
                  'NDVI_mean', 'EVI_mean', 'NDMI_mean',  'SAVI_mean', 'BSI_mean', 'SI_mean', 'LAI_mean'] 
});

