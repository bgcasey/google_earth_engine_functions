// High-resolution annual forest land cover maps for Canada's forested ecosystems (1984-2019)
// Citation: Hermosilla, T., Wulder, M.A., White, J.C., Coops, N.C., 2022. Land cover classification in an era of big and open data: Optimizing localized
// implementation and training data selection to improve mapping outcomes. Remote Sensing of Environment. No. 112780.
// DOI: https://doi.org/10.1016/j.rse.2022.112780 [Open Access]

/**
 * Function to process Sentinel-2 images within a date range and area of interest.
 * 
 * @param {string} startDate - Start date string for the image collection.
 * @param {string} endDate - End date string for the image collection.
 * @param {Object} aoi - Area of interest as an ee.Geometry object.
 * @returns {ee.ImageCollection} - Processed images clipped to AOI.
 */
exports.lc_fn = function(startDate, endDate, aoi) {

  // Get Sentinel-2 collection for the date range
  var lcCollection = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2')
                        .filterDate(startDate, endDate);

  // Apply area of interest (AOI) filter if provided
  if (aoi) {
    lcCollection = lcCollection.filterBounds(aoi);
  }

  // Select and rename the band, clip to AOI if provided
  lcCollection = lcCollection.map(function(image) {
    var img = image.select('b1').rename('forest_lc_class');
    if (aoi) {
      img = img.clip(aoi);
    }
    return img.set({
      "start_date": ee.Date(startDate).format('YYYY-MM-dd'), 
      "end_date": ee.Date(endDate).format('YYYY-MM-dd'), 
      "year": ee.Date(image.get('system:time_start')).get('year')
    });
  });

  return lcCollection;
};

// Usage example

// // Load function
// var forest_lc = require(
//     "users/bgcasey/functions:annual_forest_land_cover"
// );

// // Define the AOI as an ee.Geometry object
// var aoi = ee.Geometry.Polygon([
//   [
//     [-113.60000044487279, 55.15000133914695],
//     [-113.60000044487279, 55.35000089418191],
//     [-113.15000137891523, 55.35000086039801],
//     [-113.15000138015347, 55.15000133548429],
//     [-113.60000044487279, 55.15000133914695]
//   ]
// ]);

// // Define the start and end dates for the analysis
// var startDate = '2014-01-01';
// var endDate = '2018-12-31';

// // Call lc_fn with specified parameters
// var forest_lc_collection = exports.lc_fn(startDate, endDate, aoi);

// // Print the result to the console (Google Earth Engine Code Editor)
// print('Forest Land Cover Image Collection:', forest_lc_collection);

// var ca_lc_last = ee.Image(forest_lc_collection.first());

// var from = [0, 20, 31, 32, 33, 40, 50, 80, 81, 100, 210, 220, 230];
// var to =   [0, 1,  2,  3,  4,  5,  6,  7,  8,  9,   10,  11,  12 ];
// ca_lc_last = ca_lc_last.remap(from, to);

// print("Reclassed values:");
// print({"from": from, "to": to});

// // Define a dictionary which will be used to make legend and visualize image on map
// var dict = {
//   "names": [
//   "Unclassified",
//   "Water",
//   "Snow/Ice",
//   "Rock/Rubble",
//   "Exposed/Barren land",
//   "Bryoids",
//   "Shrubs",
//   "Wetland",
//   "Wetland-treed",
//   "Herbs",
//   "Coniferous",
//   "Broadleaf",
//   "Mixedwood"
//   ],
//   "colors": [
//     "#686868",
//     "#3333ff",
//     "#ccffff",
//     "#cccccc",
//     "#996633",
//     "#ffccff",
//     "#ffff00",
//     "#993399",
//     "#9933cc",
//     "#ccff33",
//     "#006600",
//     "#00cc00",
//     "#cc9900"
//   ]};

// // Create a panel to hold the legend widget
// var legend = ui.Panel({
//   style: {
//     position: 'bottom-left',
//     padding: '8px 15px'
//   }
// });

// // Function to generate the legend
// function addCategoricalLegend(panel, dict, title) {

//   // Create and add the legend title.
//   var legendTitle = ui.Label({
//     value: title,
//     style: {
//       fontWeight: 'bold',
//       fontSize: '18px',
//       margin: '0 0 4px 0',
//       padding: '0'
//     }
//   });
//   panel.add(legendTitle);

//   var loading = ui.Label('Loading legend...', {margin: '2px 0 4px 0'});
//   panel.add(loading);

//   // Creates and styles 1 row of the legend.
//   var makeRow = function(color, name) {
//     // Create the label that is actually the colored box.
//     var colorBox = ui.Label({
//       style: {
//         backgroundColor: color,
//         // Use padding to give the box height and width.
//         padding: '8px',
//         margin: '0 0 4px 0'
//       }
//     });

//     // Create the label filled with the description text.
//     var description = ui.Label({
//       value: name,
//       style: {margin: '0 0 4px 6px'}
//     });

//     return ui.Panel({
//       widgets: [colorBox, description],
//       layout: ui.Panel.Layout.Flow('horizontal')
//     });
//   };

//   // Get the list of palette colors and class names from the image.
//   var palette = dict['colors'];
//   var names = dict['names'];
//   loading.style().set('shown', false);

//   for (var i = 0; i < names.length; i++) {
//     panel.add(makeRow(palette[i], names[i]));
//   }

//   Map.add(panel);

// }


// /*
//   // Display map and legend ///////////////////////////////////////////////////////////////////////////////
// */

// // Add the legend to the map
// addCategoricalLegend(legend, dict, 'CA Annual forest LC map');

// Map.centerObject(aoi, 10)

// // Add image to the map
// Map.addLayer(ca_lc_last.mask(ca_lc_last.neq(0)), {min:0, max:12, palette:dict['colors']}, 'CA Annual forest LC map 2019')













// // Center the map on the AOI
// Map.centerObject(aoi, 10);

// // Define visualization parameters for the NDVI band
// var ndviVis = {
//   min: -1,
//   max: 1,
//   palette: ['red', 'yellow', 'green']
// };

// // Add the NDVI layers for each year to the map
// ee.List.sequence(2022, 2024).getInfo().forEach(function(year) {
//   var image = sentinel2Collection.filter(ee.Filter.calendarRange(year, year, 'year')).first().select('NDVI');
//   Map.addLayer(image, ndviVis, 'NDVI ' + year);
// });










// // feature_collection are the features you are extracting landcover data to 
// exports.Landcover_ts = function(feature_collection, Date_Start, Date_End) {
//       var LC = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2').
//       filterDate(Date_Start, Date_End);
      
//       // choose reducers
//       var reducers = ee.Reducer.count().combine({
//         reducer2: ee.Reducer.frequencyHistogram(),
//         sharedInputs: true
//       });
      
//       var LC_1 = LC.map(function(img) {
//         return img.reduceRegions({
//           collection: feature_collection,
//           reducer: reducers, // set the names of output properties to the corresponding band names
//           scale: 30,
//           tileScale: 2
//         }).map(function (feature) {
//                   var histogramResults = ee.Dictionary(feature.get('histogram'));
//                   var pixel_count= ee.Number(feature.get('count'))
//             return feature.copyProperties(img, ['system:time_start']) //to get year properties from the stack
//                   .set(// get proportion of landcover from histogram 
//                       // by dividing histogram pixel values by the total pixel_count.
//                       'Unclassified', ee.Number(histogramResults.get('0', 0)).divide(pixel_count),
//                       'Water', ee.Number(histogramResults.get('20', 0)).divide(pixel_count),
//                       'Snow_Ice', ee.Number(histogramResults.get('31', 0)).divide(pixel_count),
//                       'Rock_Rubble', ee.Number(histogramResults.get('32', 0)).divide(pixel_count),
//                       'Exposed_Barren_land', ee.Number(histogramResults.get('33', 0)).divide(pixel_count),
//                       'Bryoids', ee.Number(histogramResults.get('40', 0)).divide(pixel_count),
//                       'Shrubs', ee.Number(histogramResults.get('50', 0)).divide(pixel_count),
//                       'Wetland', ee.Number(histogramResults.get('80', 0)).divide(pixel_count),
//                       'Wetland-treed', ee.Number(histogramResults.get('81', 0)).divide(pixel_count),
//                       'Herbs', ee.Number(histogramResults.get('100', 0)).divide(pixel_count),
//                       'Coniferous', ee.Number(histogramResults.get('210', 0)).divide(pixel_count),
//                       'Broadleaf', ee.Number(histogramResults.get('220', 0)).divide(pixel_count),
//                       'Mixedwood', ee.Number(histogramResults.get('230', 0)).divide(pixel_count),
//                       'landcover_yr', img.date().format('YYYY'));
//         })
//       }).flatten(); //  Flattens collections of collections into a feature collection of those collections
//       return LC_1;
// }


// /////////////////////////////////////////////////
// // Landcover variables
// /// From 'projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2'
// /////////////////////////////////////////////////////////////////////////

// // feature_collection are the features you are extracting landcover data to 
// exports.Landcover_focal_ts = function(feature_collection, Date_Start, Date_End, aoi, kernal_size) {
//       var LC = ee.ImageCollection('projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2').
//       filterDate(Date_Start, Date_End).clip(aoi);
      
//       // Define the desired kernel radius in meters
//       var radiusInMeters = kernal_size; // Adjust the size as needed
      
//       // Get the projection of the image
//       var projection = LC.projection();


//       // Calculate the equivalent radius in pixels based on the specified radius in meters
//       var radiusInPixels = ee.Number(radiusInMeters).divide(projection.nominalScale()).round();

//       // Create a circular kernel with an approximate radius
//       var kernel = ee.Kernel.circle(radiusInPixels, 'pixels');

//       // Set the fill value for pixels that do not equal the landcover class being assessed
//       var fillValue = 0;

//       var classValues = [0,20,31,32,33,40,50,80,81,100,210,220,230]; // Replace with your actual landcover class numbers
//       var newClassNames = [
//         "Unclassified",
//         "Water",
//         "Snow/Ice",
//         "Rock/Rubble",
//         "Exposed/Barren land",
//         "Bryoids",
//         "Shrubs",
//         "Wetland",
//         "Wetland-treed",
//         "Herbs",
//         "Coniferous",
//         "Broadleaf",
//         "Mixedwood"
//         ];
//       // Define the suffix you want to add to all band names
        
//       // Function to calculate class proportions within the kernel
//       var calculateClassProportions = function(image) {
//         var proportions = classValues.map(function(classValue) {
//           var classCount = image.updateMask(image.eq(classValue)).reduce(ee.Reducer.count());
//           var totalCount = image.reduce(ee.Reducer.count());
//           var proportion = classCount.divide(totalCount).rename('Proportion_' + classValue);
//           return proportion;
//         });
//         return ee.Image(proportions);
//       };
//       // Apply the function the landcover data
//       var LC_proportions0 = calculateClassProportions(LC.neighborhoodToBands(kernel)).unmask(fillValue).clip(aoi);
      
//       var image=LC_proportions
      
//       var renameBands = function(image) {
//         return ee.Image(classValues.map(function(value, index) {
//           return image.select([index]).rename(newClassNames[index]);
//         }));
//       };
      
//       // Rename the bands using the renameBands function
//       var LC_proportions_2 = renameBands(image);
//       //print(LC_proportions_150)
      
//       // Add suffix to bandnames
//       // Get the band names of the reduced image
//       var bandNames = LC_proportions_2.bandNames();
      
//       // Define a function to add the kernel size to band names
//       var addKernelSize = function(bandName) {
//         return ee.String(bandName).cat("_").cat(ee.Number(radiusInMeters).format());
//       };
      
//       // Rename the bands with the kernel size appended
//       var LC_proportions_3 = LC_proportions_2.rename(bandNames.map(addKernelSize));

//       return LC_proportions_3;
// }
