// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### INPUTS ##### 
//########################################################################################################
 
// import ibutton xy locations and  and the study area.
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy");
    // aoi = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");

print(ibuttons, "ibuttons")


var buf=30

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
// // ### TWI ###
//########################################################################################################

// # Calculate Topographic wetness index and extract points
var upslopeArea = (ee.Image("MERIT/Hydro/v1_0_1")
    .clip(aoi)
    .select('upa')) //flow accumulation area
var elv = (ee.Image("MERIT/Hydro/v1_0_1")
    .clip(aoi)
    .select('elv'))
var hnd = (ee.Image("MERIT/Hydro/v1_0_1")
    .clip(aoi)
    .select('hnd'))

// TPI equation is ln(α/tanβ)) where α=cumulative upslope drainage area and β is slope 
var slope = ee.Terrain.slope(elv)
var upslopeArea = upslopeArea.multiply(1000000).rename('UpslopeArea') //multiply to conver km^2 to m^2
var slopeRad = slope.divide(180).multiply(Math.PI).rename('slopeRad') //convert degrees to radians
var TWI = (upslopeArea.divide(slopeRad.tan())).log().rename('TWI')
//var logTWI = TWI.log().rename('logTWI')
 


print(TWI, "TWI")
// create a multiband image with all of the terrain metrics
var terrainTWI = elv.addBands([upslopeArea, slope, slopeRad, TWI, hnd])
print(terrainTWI, "terrainTWI")


//########################################################################################################
// // ### Map ###
//########################################################################################################

Map.addLayer(TWI, {}, "TWI")
// Map.addLayer(logTWI, {min: 0, max: 20}, "logTWI")
Map.centerObject(aoi, 6) // center the map on the study area

// add ibutton locations
Map.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")


// //########################################################################################################
// // // ### Extract the terrain metrics to each ibutton location ###
// //########################################################################################################

var pts_terrainTWI = terrainTWI.reduceRegions({
  collection: ibuttons,
  reducer: ee.Reducer.first()
})
print(pts_terrainTWI.limit(10), 'pts_terrainTWI')


// //########################################################################################################
// // // ### Save/export elevation data ###
// //########################################################################################################

// Export elevation data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: pts_terrainTWI,
  description:'ibutton_TWI',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'Project', 
                  'St_SttK',
                  'TWI',
                  'hnd'
                  ] 
});
