/**
 * title: Get annual forest landcover classes
 * author: Brendan Casey
 * date: 2023-04-01
 * 
 * description: Function to get annual landcover data from 
 * High-resolution Annual Forest Land Cover Maps for
 * Canada's Forested Ecosystems (1984-2019)
 * 
 * data citation: Hermosilla, T., Wulder, M.A., White, J.C.,
 * Coops, N.C., 2022. Land cover classification in an era
 * of big and open data: Optimizing localized implementation
 * and training data selection to improve mapping outcomes.
 * Remote Sensing of Environment. No. 112780.
 * DOI: https://doi.org/10.1016/j.rse.2022.112780 [Open Access]
 */

/**
 * Function to process Sentinel-2 images within a date range and area
 * of interest.
 * 
 * @param {string} startDate - Start date string for the image collection.
 * @param {string} endDate - End date string for the image collection.
 * @param {Object} aoi - Area of interest as an ee.Geometry object.
 * @returns {ee.ImageCollection} - Processed images clipped to AOI.
 */
exports.lc_fn = function(startDate, endDate, aoi) {
  // Get Sentinel-2 collection for the date range
  var lcCollection = ee.ImageCollection(
    'projects/sat-io/open-datasets/CA_FOREST_LC_VLCE2'
  ).filterDate(startDate, endDate);

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

// // Define a dictionary for legend and visualization
// var dict = {
//   "names": [
//     "Unclassified",
//     "Water",
//     "Snow/Ice",
//     "Rock/Rubble",
//     "Exposed/Barren land",
//     "Bryoids",
//     "Shrubs",
//     "Wetland",
//     "Wetland-treed",
//     "Herbs",
//     "Coniferous",
//     "Broadleaf",
//     "Mixedwood"
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
//   ]
// };

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

// // Add the legend to the map
// addCategoricalLegend(legend, dict, 'CA Annual forest LC map');

// Map.centerObject(aoi, 10)

// // Add image to the map
// Map.addLayer(ca_lc_last.mask(ca_lc_last.neq(0)), {
//   min:0, max:12, palette:dict['colors']
// }, 'CA Annual forest LC map 2019');









