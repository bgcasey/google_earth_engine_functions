// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### INPUTS ##### 
//########################################################################################################
 
// import ibutton xy locations and  and the study area.
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy")
    //aoi = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");

print(ibuttons, "ibuttons")



var buf=30

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

// import the Canadian Digital Elevation Model

// keep in mind that extracting slope and aspect requires a fixed projection,
// so we will need to reproject the dem. 
// First, define new projection:
var CRS = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR")
        .filterBounds(aoi).first().projection()


var dem = ee.ImageCollection('NRCan/CDEM')
  .mosaic()//combine the tiled image collection into a single image
  .clip(aoi)// clip to the study area
  .setDefaultProjection(CRS) // set the projection to the fixed projection defined above

var elevationScale = dem.projection().nominalScale();

//########################################################################################################
// // ### Calculate terrain metrics ###
//########################################################################################################

// Slope. Units are degrees, range is [0,90).
var slope = ee.Terrain.slope(dem);

// Aspect. Units are degrees where 0=N, 90=E, 180=S, 270=W.
var aspect = ee.Terrain.aspect(dem);

// var northness = aspect.cos().rename("northness"); 

// calcuate northness variable. Convert aspect degrees to radians and take the cosine. 
var northness = aspect.multiply(Math.PI).divide(180).cos().rename('northness')



//////////
//// TPI
//////////


// function to calculate neighborhood metrics for elevation
var calculateNeighborhoodMean = function(image, kernelRadius) {
      return image.reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square(kernelRadius,'pixels',false),
        optimization: 'boxcar',
      });
    }

// function to calculate TPI
var calculateTPI = function(image, meanImage) {
      return image.subtract(meanImage).rename('TPI')
    }

// define a kernal radius for the neighborhood function
var kernelRadius = 180 // define kernal radius

// create an elevation neighborhood raster
var demMean = calculateNeighborhoodMean(dem, kernelRadius);

// calculate TPI usimng the dem and neighborhood dem.
var TPI = calculateTPI(dem, demMean);

//////////
// Heat load index
////////////
var hli_f = require('users/bgcasey/climate_downscaling:HLI');
var HLI = hli_f.hli(dem);


// create a multiband image with all of the terrain metrics
var terrain = dem.addBands([slope, aspect, TPI, HLI, northness])
print(terrain, "terrain")


//########################################################################################################
// // ### Map ###
//########################################################################################################

Map.addLayer(slope, {min: 0, max: 89.99}, 'Slope');
Map.addLayer(aspect, {min: 0, max: 359.99}, 'Aspect');
Map.addLayer(dem, {min:-300, max:3500}, "dem")
Map.addLayer(TPI, {min:-2000, max:3500}, "tpi_270")
Map.addLayer(HLI, {}, "HLI")
Map.centerObject(aoi, 6) // center the map on the study area

// add ibutton locations
Map.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")


//########################################################################################################
// // ### Extract the terrain metrics to each ibutton location ###
//########################################################################################################

var pts_terrain = terrain.reduceRegions({
  collection: ibuttons,
  reducer: ee.Reducer.first()
})
print(pts_terrain.limit(10), 'pts_terrain')


//########################################################################################################
// // ### Save/export elevation data ###
//########################################################################################################

// Export elevation data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: pts_terrain,
  description:'ibutton_terrain',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'Project', 
                  'St_SttK',
                  'elevation',
                  'slope',
                  'aspect',
                  'HLI',
                  'TPI',
                  'northness'
                  ] 
});
