# Google Earth Engine Functions Repository

![In Development](https://img.shields.io/badge/Status-In%20Development-yellow)

This repository contains a collection of reusable functions for processing and analyzing satellite imagery and remote sensing products using the Google Earth Engine (GEE) JavaScript code editor. The goal is to ease model covariate extraction and reproducability by sharing working functions.

## File Index

#### [annual_forest_land_cover.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/annual_forest_land_cover.js)
Function to get annual landcover data from [High-resolution Annual Forest Land Cover Maps for Canada's Forested Ecosystems (1984-2019)](https://gee-community-catalog.org/projects/ca_lc/)

#### [calculate_TWI.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/calculate_TWI.js)
Calculate the Topographic Wetness Index (TWI) for a given area of interest. 

![TWI Equation](https://latex.codecogs.com/png.latex?\text{TWI}=\ln\left(\frac{\alpha}{\tan(\beta)}\right))

where:
- α is the upslope drainage area
- β is the slope


#### [canopy_height.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/canopy_height.js)
Load and combine global [canopy height](https://gee-community-catalog.org/projects/canopy/) and its standard deviation into a single image for a given area of interest. 

#### [geomorpho90m.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/geomorpho90m.js)
This script loads multiple geomorphometric variables from the 
Geomorpho90m dataset, mosaics them, clips them to a specified area 
of interest (aoi), and combines them into a single multiband image.

#### [landsat_indices_and_masks.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/landsat_indices_and_masks.js)
Functions to calculate various spectral indices from Landsat imagery, such as NDVI, EVI, and NDWI.

#### [landsat_time_series.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/landsat_time_series.js)
Function to process a time series of Landsat 5, 7, 8, and 9 images, calculate indices, and merge composite indices into a single collection.

#### [sentinel_indices_and_masks.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/sentinel_indices_and_masks.js)
Functions to calculate  spectral indices from Sentinel-2 imagery. 

#### [sentinel_time_series.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/sentinel_time_series.js)
Function to process a time series of Sentinel-2 images, calculate indices, and merge them into a single collection.

#### [utils.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/utils.js)
Assorted utility functions e.g.:
- convert degrees to radians
- combine lists of images into a single multi-band image
- create time intervals
- normalize images
- summarize image collections to points
- summarize images to points
