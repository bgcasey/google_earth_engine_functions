////##########################  
//// The following functions were adapted from https://github.com/zachlevitt/earth-engine
////##########################  
  //Reduces resolution of image 
exports.processElevationData = function(image,crs,scale,mask) {
    var output = image
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 1024
    })
    // Request the data at the scale and projection of the MODIS image.
    .reproject({
      crs: crs,
      scale: scale
    });
    
    if (mask !== null){
      output = output.updateMask(mask);
    }
    
    return output;
};
  //  Import DEM from assets
    exports.loadDEM = function() {
      return ee.Image('users/zlevitt/chis_assets/sci_dem_1p5m')
    };
  
  //  Import DSM from assets
    exports.loadDSM = function() {
      return ee.Image('users/zlevitt/chis_assets/dsm_clean_reclass_01')
    };
  
  //  Load NAIP from GEE library and filter to study area  
    exports.loadNAIP = function(extent) {
      return ee.ImageCollection("USDA/NAIP/DOQQ").filterBounds(extent)
    };
    
  //Load Sentinel from GEE library and filter to study area, time period, and cloudy percentage
    exports.loadSentinel = function(geometry,startDate,endDate,cloudPercentage){
      return ee.ImageCollection('COPERNICUS/S2_SR').filterBounds(geometry).filterDate(startDate, endDate).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',cloudPercentage));
    };
  
  //Import mask from assets
    exports.loadMask = function() {
      return ee.Image('users/zlevitt/chis_assets/04_land_mask')
    };
    
    
  //Import extent from assets
    exports.loadExtent = function(){
      return ee.Feature('users/zlevitt/chis_assets/sci_shift_extent')
    };
    
  //Mask cloudy pixels using quality assurance pixel from Sentinel
    exports.filterClouds = function(image){

      var qa = image.select('QA60');
    
      // Bits 10 and 11 are clouds and cirrus, respectively.
      var cloudBitMask = 1 << 10;
      var cirrusBitMask = 1 << 11;
    
      // Both flags should be set to zero, indicating clear conditions.
      var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
          .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    
      return image.updateMask(mask).divide(10000);
    };
    
    
//  Mask image using binary mask
    exports.maskDEM = function(image, mask/*outProjection, outScale*/) {
      return image
        .mask(mask)
        //.clip(extent)
        //.resample()
        //.reproject(outProjection,null,outScale)
    };
    
    //Reproject DEM to desired CRS and scale, resample with bilinear method
    exports.resampleDEM = function(dem,outCRS,outScale){
      return dem.reproject(outCRS,null,outScale).resample('bilinear')
    };
    
//  Compute terrain variables

    //Compute Canopy Height Model
    exports.elevationDifference = function(dem,dsm){
      return dsm.subtract(dem).rename('diff')
    }
  
    
    //Calculate slope in degrees from elevation data
    exports.calculateSlopeDegrees = function(dem,mask){
      return ee.Terrain.slope(dem).mask(mask)
    }
    
    exports.calculateTheobaldHLI = function(dem,mask) {
      var aspectRadians = ee.Terrain.aspect(dem).mask(mask).multiply(ee.Number(0.01745329252))
      var slopeRadians = ee.Terrain.slope(dem).mask(mask).multiply(ee.Number(0.01745329252))
      var foldedAspect = aspectRadians.subtract(ee.Number(4.3196899)).abs().multiply(ee.Number(-1)).add(ee.Number(3.141593)).abs()
      var theobaldHLI = (slopeRadians.cos().multiply(ee.Number(1.582)).multiply(ee.Number(0.82886954044))).subtract(foldedAspect.cos().multiply(ee.Number(1.5)).multiply(slopeRadians.sin().multiply(ee.Number(0.55944194062)))).subtract(slopeRadians.sin().multiply(ee.Number(0.262)).multiply(ee.Number(0.55944194062))).add(foldedAspect.sin().multiply(ee.Number(0.607)).multiply(slopeRadians.sin())).add(ee.Number(-1.467));
      return theobaldHLI.exp().rename('hli')
    };

//  Process DEM for Blender

    exports.calculateNeighborhoodMean = function(image, kernelRadius) {
      
      return image.reduceNeighborhood({
        reducer: ee.Reducer.mean(),
        kernel: ee.Kernel.square(kernelRadius,'pixels',false),
        optimization: 'boxcar',
      });
    }
    
    exports.calculateNeighborhoodStdDev = function(image, kernelRadius) {
      
      return image.reduceNeighborhood({
        reducer: ee.Reducer.stdDev(),
        kernel: ee.Kernel.square(kernelRadius,'pixels',false),
        optimization: 'window',
      });
    }

    exports.calculateStandardizedTPI = function(image, meanImage, stdDevImage) {
      return (image.subtract(meanImage)).divide(stdDevImage)
    }
    
    exports.calculateMeanTPI = function(image1,image2,image3){
      return (image1.add(image2).add(image3)).divide(ee.Number(3)).rename('meanTPI')
    
    }
    
    exports.calculateTPI = function(image, meanImage) {
      return image.subtract(meanImage).rename('tpi')
    }
    
    // exports.addYear = function(image) {
    //   var imageYear = image.date().get('year')
    //   var bandNames = image.bandNames().length()
    //   return image.set({year:imageYear, bands:bandNames})
    // };
    
    exports.addYears = function(naipImages){
      return naipImages.map(function(image){
        var imageYear = image.date().get('year')
        var bandNames = image.bandNames().length()
        return image.set({year:imageYear, bands:bandNames})
      })
    }
    
    exports.filterFourBands = function(naipImagesWithYears){
      return naipImagesWithYears.filter(ee.Filter.gt('bands', 3));
    }
    
    // Create a function to calculate NDVI for images
    // exports.addNDVI = function(image) {
    //   var ndvi = image.normalizedDifference(['N', 'R']).rename('NDVI');
    //   return image.addBands(ndvi);
    // };
    
    // Map addNDVI function over the collection
    exports.addNDVI = function(images){
      return images.map(function(image){
        var ndvi = image.normalizedDifference(['N', 'R']).rename('NDVI');
      return image.addBands(ndvi);
      });
    }
    
    exports.addNDVISentinel = function(images){
      return images.map(function(image){
        var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
      return image.addBands(ndvi);
      });
    }
    
    //tm3-tm2 from http://web.pdx.edu/~nauna/resources/10_BandCombinations.htm
    exports.addForestCroplandSentinel = function(images){
      return images.map(function(image){
        var forest = image.select('B4').divide(image.select('B3')).rename('forest');
      return image.addBands(forest);
      });
    }
    
    exports.addForestCroplandSentinel2 = function(images){
      return images.map(function(image){
        var forest2 = image.select('B12').divide(image.select('B3')).rename('forest2');
      return image.addBands(forest2);
      });
    }
    
    exports.addForestCroplandSentinel3 = function(images){
      return images.map(function(image){
        var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI45');
      return image.addBands(forest2);
      });
    }
    
    exports.mosaicNAIP = function(images,year,mask,outCRS,outScale){
      return images.filter(ee.Filter.calendarRange(year, year, 'year'))
        .mosaic()
        .set({year:year})
        .mask(mask)
        .reproject(outCRS,null,outScale)
        .resample('bilinear')
        .mask(mask)
    }
    
    exports.mosaicSentinel = function(images,mask,outCRS,outScale){
      return images
        .qualityMosaic('QA10')
        .mask(mask)
        .reproject(outCRS,null,outScale)
        .resample('bilinear')
        .mask(mask)
    }
    
    exports.toBandedImage = function(imageCollection){
      return imageCollection.toBands()
    }
    
    exports.ncVis = {
      bands: ['R', 'G', 'B'],
      min: 0,
      max: 255
    };
    
    exports.palette = ['597C2B','D2E459','EBEB00','FFEBCD'];
    
    exports.paintImageWithFeatures = function(features){
      return ee.Image().byte().paint({
        featureCollection: features,
        color: 'Class',
      }).rename('class')
    }
    
    exports.stratify = function(image,numPointsPerClass,outCRS,outScale,geometry){
      return image.addBands(ee.Image.pixelLonLat())
        .stratifiedSample({
          numPoints: numPointsPerClass,
          classBand: 'class',
          projection:outCRS,
          scale: outScale,
          region: geometry,
        }).map(function(f) {
          return f.setGeometry(ee.Geometry.Point([f.get('longitude'), f.get('latitude')]))
      })
    }
    
    
    exports.ndviJoin = function(image,points){
      return image.reduceRegions(points,ee.Reducer.first())
    }
    exports.differenceJoin = function(image,points){
      return image.reduceRegions(points,ee.Reducer.first())
    }

    exports.filterPointsFour = function(features,forestNDVI,forestDiff,bareNDVI,bareDiff,herbDiff,herbNDVI){
      var filter1 = features.filter(ee.Filter.and(ee.Filter.eq('class', 4),ee.Filter.gt('ndvi_value', bareNDVI),ee.Filter.gt('norm_diff',bareDiff)).not());
      var filter2 = filter1.filter(ee.Filter.and(ee.Filter.eq('class', 2),ee.Filter.gt('ndvi_value', herbNDVI)).not());
      var filter3 = filter2.filter(ee.Filter.and(ee.Filter.eq('class', 1),ee.Filter.lt('ndvi_value', forestNDVI),ee.Filter.lt('norm_diff',forestDiff)).not());
      var filter4 = filter3.filter(ee.Filter.and(ee.Filter.eq('class', 3),ee.Filter.gt('norm_diff',herbDiff),ee.Filter.lt('ndvi_value', herbNDVI)).not())
      return filter4;
    }
    
    exports.filterPointsThree = function(features,forestNDVI,forestDiff,bareNDVI,bareDiff,herbDiff,herbNDVI){
      var filter1 = features.filter(ee.Filter.and(ee.Filter.eq('class', 2),ee.Filter.gt('ndvi_value', bareNDVI),ee.Filter.gt('norm_diff',bareDiff)).not());
      var filter2 = filter1.filter(ee.Filter.and(ee.Filter.eq('class', 0),ee.Filter.lt('ndvi_value', forestNDVI),ee.Filter.lt('norm_diff',forestDiff)).not());
      var filter3 = filter2.filter(ee.Filter.and(ee.Filter.eq('class', 1),ee.Filter.lt('norm_diff',herbDiff),ee.Filter.lt('ndvi_value', herbNDVI)).not())
      return filter3;
    }
    
    exports.filterPointsTwo = function(features,forestNDVI,forestDiff,notForestDiff){
      var filter1 = features.filter(ee.Filter.and(ee.Filter.eq('class', 1),ee.Filter.gt('norm_diff',notForestDiff)).not());
      var filter2 = filter1.filter(ee.Filter.and(ee.Filter.eq('class', 0),ee.Filter.lt('ndvi_value', forestNDVI),ee.Filter.lt('norm_diff',forestDiff)).not());
      return filter2;
    }
    
    exports.filterPointsTwo_Sentinel = function(features,forestNDVIMin_Winter,forestDiff,notForestDiff,notForest_NDVIMax_Winter){
      var filter1 = features.filter(ee.Filter.and(ee.Filter.eq('class', 1),ee.Filter.gt('norm_diff',notForestDiff),ee.Filter.gt('ndvi_value',notForest_NDVIMax_Winter)).not());
      var filter2 = filter1.filter(ee.Filter.and(ee.Filter.eq('class', 0),ee.Filter.lt('ndvi_value', forestNDVIMin_Winter),ee.Filter.lt('norm_diff',forestDiff)).not());
      return filter2;
    }


exports.calculateLandforms = function(dem,slopeDegrees,theobaldHLI,meanTPI,tpi_270m){
  var slopeReclass = ee.Image(1)
      .where(slopeDegrees.gt(50), 5000)
      .where(slopeDegrees.gt(2).and(slopeDegrees.lte(50)), 1000)
      .where(slopeDegrees.lte(2), 2000)
      .selfMask();
      
  var theobaldHLIReclass = ee.Image(1)
        .where(theobaldHLI.lte(0.448), 100)
        .where(theobaldHLI.gt(0.448).and(theobaldHLI.lte(0.767)), 200)
        .where(theobaldHLI.gt(0.767), 300)
        .selfMask();
        
  var meanTPIReclass = ee.Image(1)
        .where(meanTPI.lte(-1.2), 10)
        .where(meanTPI.gt(-1.2).and(meanTPI.lte(-0.75)), 20)
        .where(meanTPI.gt(-0.75).and(meanTPI.lte(0)), 30)
        .where(meanTPI.gt(0),40)
        .selfMask();
  
  var tpi_270mReclass = ee.Image(1)
        .where(tpi_270m.lte(-5), 1)
        .where(tpi_270m.gt(-5).and(tpi_270m.lte(0)), 2)
        .where(tpi_270m.gt(0).and(tpi_270m.lte(30)), 3)
        .where(tpi_270m.gt(30).and(tpi_270m.lte(300)), 4)
        .where(tpi_270m.gt(300),5)
        .selfMask();



var reclassCombined = slopeReclass.add(theobaldHLIReclass).add(meanTPIReclass).add(tpi_270mReclass).updateMask(dem);

return reclassCombined
      .where(reclassCombined.eq(2344)
        .or(reclassCombined.eq(1344)),11)
      .where(reclassCombined.eq(1244),12)
      .where(reclassCombined.eq(1144),13)
      .where(reclassCombined.eq(1145)
        .or(reclassCombined.eq(1245))
        .or(reclassCombined.eq(1345))
        .or(reclassCombined.eq(2345)),14)
      .where(reclassCombined.gte(5000).and(reclassCombined.lte(6000)),15)
      .where(reclassCombined.eq(1341)
        .or(reclassCombined.eq(1342))
        .or(reclassCombined.eq(1343)),21)
      .where(reclassCombined.eq(1241)
        .or(reclassCombined.eq(1242))
        .or(reclassCombined.eq(1243)),22)
      .where(reclassCombined.eq(1141)
        .or(reclassCombined.eq(1142))
        .or(reclassCombined.eq(1143)),23)
      .where(reclassCombined.eq(2341)
        .or(reclassCombined.eq(2342))
        .or(reclassCombined.eq(2343)),24)
      .where(reclassCombined.eq(1331)
        .or(reclassCombined.eq(1332))
        .or(reclassCombined.eq(1333))
        .or(reclassCombined.eq(1334))
        .or(reclassCombined.eq(1335)),31)
      .where(reclassCombined.eq(1231)
        .or(reclassCombined.eq(1232))
        .or(reclassCombined.eq(1233))
        .or(reclassCombined.eq(1234))
        .or(reclassCombined.eq(1235)),32)
      .where(reclassCombined.eq(1131)
        .or(reclassCombined.eq(1132))
        .or(reclassCombined.eq(1133))
        .or(reclassCombined.eq(1134))
        .or(reclassCombined.eq(1135)),33)
      .where(reclassCombined.eq(2332)
        .or(reclassCombined.eq(2333))
        .or(reclassCombined.eq(2334))
        .or(reclassCombined.eq(2335))
        .or(reclassCombined.eq(2331)),34)
      .where(reclassCombined.eq(1112)
        .or(reclassCombined.eq(1113))
        .or(reclassCombined.eq(1121))
        .or(reclassCombined.eq(1122))
        .or(reclassCombined.eq(1123))
        .or(reclassCombined.eq(1124))
        .or(reclassCombined.eq(1212))
        .or(reclassCombined.eq(1213))
        .or(reclassCombined.eq(1221))
        .or(reclassCombined.eq(1222))
        .or(reclassCombined.eq(1223))
        .or(reclassCombined.eq(1224))
        .or(reclassCombined.eq(1312))
        .or(reclassCombined.eq(1313))
        .or(reclassCombined.eq(1321))
        .or(reclassCombined.eq(1322))
        .or(reclassCombined.eq(1323))
        .or(reclassCombined.eq(1324))
        .or(reclassCombined.eq(2312))
        .or(reclassCombined.eq(2313))
        .or(reclassCombined.eq(2321))
        .or(reclassCombined.eq(2322))
        .or(reclassCombined.eq(2323))
        .or(reclassCombined.eq(2324)),41)
      .where(reclassCombined.eq(1211)
          .or(reclassCombined.eq(1311))
          .or(reclassCombined.eq(2311))
          .or(reclassCombined.eq(1111)),42)
      .updateMask(reclassCombined.select('constant').gt(999))
}

//Reclassify landforms layer to fit with visualization parameters.
exports.remapLandforms = function(landforms){
  return landforms.remap([11,12,13,14,15,21,22,23,24,31,32,33,34,41,42],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14])
};


exports.outputChart = function(landforms,geometry,scale,dictionary){
      //Calculate areal stats for landforms (full classes)
      var stats = ee.Image.pixelArea().addBands(landforms).reduceRegion({
        reducer: ee.Reducer.sum().group({
          groupField: 1
        }),
        geometry: geometry,
        scale: scale,
      });
      
      //reformat stats
      var statsFormatted = ee.List(stats.get('groups'))
        .map(function(el) {
          var d = ee.Dictionary(el);
          return [dictionary.get(d.get('group')), ee.Number(d.get('sum')).multiply(0.00000038610215855)];
      });
      
      //flatten dictionary
      var statsDictionary = ee.Dictionary(statsFormatted.flatten());
      
      return ui.Chart.array.values({
        array: statsDictionary.values(),
        axis: 0,
        xLabels: statsDictionary.keys()
      }).setChartType('PieChart')
        

    }





