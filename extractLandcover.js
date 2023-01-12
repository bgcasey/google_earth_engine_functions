// Run this script using the Earth Engine code editor at code.earthengine.google.com


//########################################################################################################
//##### INPUTS ##### 
//########################################################################################################
 
// import ibutton xy locations and  and the study area.
var ibuttons = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/ss_xy"),
    aoi = ee.FeatureCollection("projects/ee-bgcasey-climate/assets/study_area");

print(ibuttons, "ibuttons")

var CRS = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR")
        .filterBounds(aoi).first().projection()

// import Copernicus landcover classification data
var LC = ee.Image("COPERNICUS/Landcover/100m/Proba-V-C3/Global/2019")
  .clip(aoi)
  .setDefaultProjection(CRS);

print(LC, "dataset")

//########################################################################################################
// // ### Map ###
//########################################################################################################

Map.centerObject(aoi, 6) // center the map on the study area

Map.addLayer(LC.select("discrete_classification"), {}, "Land Cover");
Map.addLayer(LC.select("tree-coverfraction"), {min:0, max:90}, "tree-coverfraction");

// add ibutton locations
Map.addLayer(ibuttons,{color: 'bf1b29'}, "iButtons")

//########################################################################################################
// // ### Extract landcover classes to each ibutton location ###
//########################################################################################################

var pts_LC = LC.reduceRegions({
  collection: ibuttons,
  reducer: ee.Reducer.first(),
  scale: 30
})
print(pts_LC.limit(10), 'pts_LC')

//########################################################################################################
// // ### Save/export landcover data ###
//########################################################################################################

// Export elevation data to a csv
Export.table.toDrive({
  folder: 'google_earth_engine_tables',
  collection: pts_LC,
  description:'ibutton_landCover',
  fileFormat: 'csv',
    selectors: [ // choose properties to include in export table
                  'Project', 
                  'St_SttK',
                  'discrete_classification',
                  'forest_type',
                  'tree-coverfraction'
                  ] 
});

