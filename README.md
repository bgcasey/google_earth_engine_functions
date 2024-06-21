# Earth Engine Functions Repository

![In Development](https://img.shields.io/badge/Status-In%20Development-yellow)

This repository contains a collection of reusable functions for processing and analyzing satellite imagery and remote sensing products using the Google Earth Engine (GEE) JavaScript code editor. The goal is to ease model covariate extraction by sharing efficient and tested code snippets.

## File Index

#### [geomorpho90m.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/geomorpho90m.js)
This script loads multiple geomorphometric variables from the 
Geomorpho90m dataset, mosaics them, clips them to a specified area 
of interest (aoi), and combines them into a single multiband image.

#### [landsat_indices_and_masks.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/landsat_indices_and_masks.js)
Calculates various spectral indices from Landsat imagery, such as NDVI, EVI, and NDWI.

#### [landsat_time_series.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/landsat_time_series.js)
Function to process a time series of Landsat 5 and Landsat 7 images, calculate indices, and merge them into a single collection.

#### [sentinel_indices_and_masks.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/sentinel_indices_and_masks.js)
Calculates spectral indices from Sentinel-2 imagery. 

#### [sentinel_time_series.js](https://github.com/bgcasey/google_earth_engine_functions/blob/main/sentinel_time_series.js)
Function to process a time series of Sentinel-2 images, calculate indices, and merge them into a single collection.
