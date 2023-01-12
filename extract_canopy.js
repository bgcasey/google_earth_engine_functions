// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### User defined inputs ##### 
//############################################################################


// import ibutton xy locations
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
print("ibuttons", ibuttons)

var canopy_height = ee.Image('users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1').rename("canopy_height");
print('canopy_height metadata:', canopy_height);
var b1scale = canopy_height.select('canopy_height').projection().nominalScale();
print('canopy_height 1 scale:', b1scale);  // ee.Number

var canopy_standard_deviation = ee.Image('users/nlang/ETH_GlobalCanopyHeightSD_2020_10m_v1').rename('canopy_standard_deviation');
print('standard_deviation metadata:', canopy_standard_deviation);
var b1scale = canopy_standard_deviation.select('canopy_standard_deviation').projection().nominalScale();
print('standard_deviation scale:', b1scale);  // ee.Number


//combine bands into single image
var canopy = canopy_height.addBands([canopy_standard_deviation])
print("canopy", canopy)

// define a buffer size around point locations (for zonal stats)
var buf=30

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
print("aoi", aoi)

// convert the geometry to a feature to get the batch.Download.ImageCollection.toDrive function to work
var aoi1=ee.FeatureCollection(aoi)
print("aoi1", aoi1)


//########################################################################################################
// // ### Extract the terrain metrics to each ibutton location ###
//########################################################################################################

var pts_canopy = canopy.reduceRegions({
  collection: ibuttons_buff,
  scale: 30,
  reducer: ee.Reducer.mean()
})
print('pts_canopy', pts_canopy.limit(10))

// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: pts_canopy,
  description:'ibutton_canopy',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'Project', 
                  'St_SttK',
                  'canopy_height',
                  'canopy_standard_deviation'
                  ] 
});


// // ########################################################################################################
// // // ### Focal statistics via reduceNeighborhood ###
// //########################################################################################################


var neighborhood= canopy.reduceNeighborhood({
    reducer: ee.Reducer.mean(), // set the names of output properties to the corresponding band names
    kernel: ee.Kernel.circle(30, "meters")
})
print("canopy neighborhood", neighborhood)

Export.image.toDrive({ 
  image: neighborhood,
  description: 'canopy_neighborhood',
  folder: 'neighborhood_rasters',
  scale: 30,
  region: aoi,
  maxPixels: 116856502500,
});

var pts_canopy_neighborhood = neighborhood.reduceRegions({
  collection: ibuttons,
  reducer: ee.Reducer.first()
})
print('pts_canopy_neighborhood', pts_canopy.limit(10))


// Export data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: pts_canopy_neighborhood,
  description:'ibutton_canopy_neighborhood',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'Project', 
                  'St_SttK',
                  'canopy_height_mean',
                  'canopy_standard_deviation_mean'
                  ] 
});

