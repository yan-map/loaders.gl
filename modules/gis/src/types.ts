import {GeoJsonProperties} from 'geojson';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

export type BinaryAttribute = {value: TypedArray; size: number};
export type BinaryGeometryType = 'Point' | 'LineString' | 'Polygon';

type NumericProps = {[key: string]: BinaryAttribute};

/**
 * GIS category loader format
 */
export type DataFormatGIS = {
  category: 'gis';
  schema: object; /** `Schema` - Apache Arrow style schema  */
  data: object /** Data is formatted according to `options.gis.format` */
  format: string; /** The encoding of `data` layers, corresponds to `options.gis.format`. */
  loaderMetadata: object; /** Loader specific metadata, see documentation for each loader */
}

/**
 * Represent a single Geometry, similar to a GeoJSON Geometry
 */
export type BinaryGeometryData = {
  positions: BinaryAttribute;
  pathIndices?: BinaryAttribute;
  polygonIndices?: BinaryAttribute;
  primitivePolygonIndices?: BinaryAttribute;
  // Can be passed separately
  type?: BinaryGeometryType;
};

/** GeoJSON point features in binary format */
export type BinaryPointFeatures = {
  positions: BinaryAttribute;
  featureIds: BinaryAttribute;
  globalFeatureIds: BinaryAttribute;
  numericProps: NumericProps;
  properties: GeoJsonProperties;
}

/** GeoJSON line features in binary format */
export type BinaryLineFeatures = {
  positions: BinaryAttribute;
  pathIndices: BinaryAttribute;
  featureIds: BinaryAttribute;
  globalFeatureIds: BinaryAttribute;
  numericProps: NumericProps;
  properties: GeoJsonProperties;
}

/** GeoJSON line features in binary format */
export type BinaryPolygonFeatures = {
  positions: BinaryAttribute;
  polygonIndices: BinaryAttribute;
  primitivePolygonIndices: BinaryAttribute;
  featureIds: BinaryAttribute;
  globalFeatureIds: BinaryAttribute;
  numericProps: NumericProps;
  properties: GeoJsonProperties;
}

  /**
 * Represent a collection of Features, similar to a GeoJSON FeatureCollection
 */
export type BinaryFeatures = {
  points?: BinaryPointFeatures;
  lines?: BinaryLineFeatures;
  polygons?: BinaryPolygonFeatures;
};
