import {GeoJSON, Feature, Geometry, Position, GeoJsonProperties} from 'geojson';
import {Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon} from 'geojson';

import {BinaryGeometryData, BinaryFeatures, BinaryGeometryType} from '../types';

// We do not handle GeometryCollection, define a limited Geometry type that always has coordinates.
type FeatureGeometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon;

/**
 * Convert binary geometry representation to GeoJSON
 * @param data   geometry data in binary representation
 * @param type   Input data type: Point, LineString, or Polygon
 * @param format Output format, either geometry or feature
 * @return GeoJSON objects
 */
export function binaryToGeoJson(
  data: BinaryGeometryData | BinaryFeatures,
  type?: BinaryGeometryType,
  format?: 'geometry' | 'feature'
): GeoJSON | Feature[] | null {
  if (format === 'geometry') {
    return parseGeometry(data);
  }

  const dataArray = normalizeInput(data, type);

  switch (deduceReturnType(dataArray)) {
    case 'Geometry':
      return parseGeometry(dataArray[0]);
    case 'FeatureCollection':
      return parseFeatureCollection(dataArray);
    default:
      break;
  }

  return null;
}

// Normalize features
// Return an array of data objects, each of which have a type key
function normalizeInput(data: BinaryGeometryData | BinaryFeatures, type?: BinaryGeometryType) {
  const isHeterogeneousType = Boolean(data.points || data.lines || data.polygons);

  if (!isHeterogeneousType) {
    data.type = type || parseType(data);
    return [data];
  }

  const features: Feature[] = [];
  if (data.points) {
    data.points.type = 'Point';
    features.push(data.points);
  }
  if (data.lines) {
    data.lines.type = 'LineString';
    features.push(data.lines);
  }
  if (data.polygons) {
    data.polygons.type = 'Polygon';
    features.push(data.polygons);
  }
  return features;
}

/**
 * Determine whether a geometry or feature collection should be returned
 * If the input data doesn't have property identifiers, returns a single geometry
 */
function deduceReturnType(dataArray): 'FeatureCollection' | 'Geometry' {
  // If more than one item in dataArray, multiple geometry types, must be a featurecollection
  if (dataArray.length > 1) {
    return 'FeatureCollection';
  }

  const data = dataArray[0];
  if (!(data.featureIds || data.globalFeatureIds || data.numericProps || data.properties)) {
    return 'Geometry';
  }

  return 'FeatureCollection';
}

/** Parse input binary data and return an array of GeoJSON Features */
function parseFeatureCollection(dataArray): Feature[] {
  const features: Feature[] = [];
  for (const data of dataArray) {
    if (data.featureIds.value.length === 0) {
      // eslint-disable-next-line no-continue
      continue;
    }
    let lastIndex = 0;
    let lastValue = data.featureIds.value[0];

    // Need to deduce start, end indices of each feature
    for (let i = 0; i < data.featureIds.value.length; i++) {
      const currValue = data.featureIds.value[i];
      if (currValue === lastValue) {
        // eslint-disable-next-line no-continue
        continue;
      }

      features.push(parseFeature(data, lastIndex, i));
      lastIndex = i;
      lastValue = currValue;
    }

    // Last feature
    features.push(parseFeature(data, lastIndex, data.featureIds.value.length));
  }
  return features;
}

/** Parse input binary data and return a single GeoJSON Feature */
function parseFeature(data, startIndex?: number, endIndex?: number): Feature {
  const geometry = parseGeometry(data, startIndex, endIndex);
  const properties = parseProperties(data, startIndex, endIndex);
  return {type: 'Feature', geometry, properties};
}

/** Parse input binary data and return an object of properties */
function parseProperties(data, startIndex: number = 0, endIndex?: number): GeoJsonProperties {
  const properties = Object.assign(data.properties[data.featureIds.value[startIndex]]);
  for (const key in data.numericProps) {
    properties[key] = data.numericProps[key].value[startIndex];
  }
  return properties;
}

/** Parse input binary data and return a valid GeoJSON geometry object */
function parseGeometry(data, startIndex?: number, endIndex?: number): Geometry {
  switch (data.type) {
    case 'Point':
      return pointToGeoJson(data, startIndex, endIndex);
    case 'LineString':
      return lineStringToGeoJson(data, startIndex, endIndex);
    case 'Polygon':
      return polygonToGeoJson(data, startIndex, endIndex);
    default:
      throw new Error(`Unsupported geometry type: ${data.type}`);
  }
}

/** Parse binary data of type Polygon */
function polygonToGeoJson(data, startIndex: number = -Infinity, endIndex: number = Infinity): Polygon | MultiPolygon {
  const {positions} = data;
  const polygonIndices = data.polygonIndices.value.filter((x) => x >= startIndex && x <= endIndex);
  const primitivePolygonIndices = data.primitivePolygonIndices.value.filter(
    (x) => x >= startIndex && x <= endIndex
  );
  const multi = polygonIndices.length > 2;

  // Polygon
  if (!multi) {
    const coordinates: Position[][] = [];
    for (let i = 0; i < primitivePolygonIndices.length - 1; i++) {
      const startRingIndex = primitivePolygonIndices[i];
      const endRingIndex = primitivePolygonIndices[i + 1];
      const ringCoordinates = ringToGeoJson(positions, startRingIndex, endRingIndex);
      coordinates.push(ringCoordinates);
    }

    return {type: 'Polygon', coordinates};
  }

  // MultiPolygon
  const coordinates: Position[][][] = [];
  for (let i = 0; i < polygonIndices.length - 1; i++) {
    const startPolygonIndex = polygonIndices[i];
    const endPolygonIndex = polygonIndices[i + 1];
    const polygonCoordinates = polygonToGeoJson(data, startPolygonIndex, endPolygonIndex)
      .coordinates;
    coordinates.push(polygonCoordinates as Position[][]);
  }

  return {type: 'MultiPolygon', coordinates};
}

/** Parse binary data of type LineString */
function lineStringToGeoJson(data, startIndex: number = -Infinity, endIndex: number = Infinity): LineString | MultiLineString {
  const {positions} = data;
  const pathIndices = data.pathIndices.value.filter((x) => x >= startIndex && x <= endIndex);
  const multi = pathIndices.length > 2;

  if (!multi) {
    const coordinates = ringToGeoJson(positions, pathIndices[0], pathIndices[1]);
    return {type: 'LineString', coordinates};
  }

  const coordinates: Position[][] = [];
  for (let i = 0; i < pathIndices.length - 1; i++) {
    const ringCoordinates = ringToGeoJson(positions, pathIndices[i], pathIndices[i + 1]);
    coordinates.push(ringCoordinates);
  }

  return {type: 'MultiLineString', coordinates};
}

/** Parse binary data of type Point */
function pointToGeoJson(data, startIndex, endIndex): Point | MultiPoint {
  const {positions} = data;
  const coordinates = ringToGeoJson(positions, startIndex, endIndex);
  const multi = coordinates.length > 1;

  if (multi) {
    return {type: 'MultiPoint', coordinates};
  }

  return {type: 'Point', coordinates: coordinates[0]};
}

/**
 * Parse a linear ring of positions to a GeoJSON linear ring
 *
 * @param positions Positions TypedArray
 * @param startIndex Start index to include in ring
 * @param endIndex End index to include in ring
 * @returns GeoJSON ring
 */
function ringToGeoJson(positions, startIndex?: number, endIndex?: number): Position[] {
  startIndex = startIndex || 0;
  endIndex = endIndex || positions.value.length / positions.size;

  const ringCoordinates: Position[] = [];
  for (let j = startIndex; j < endIndex; j++) {
    ringCoordinates.push(
      Array.from(positions.value.subarray(j * positions.size, (j + 1) * positions.size))
    );
  }
  return ringCoordinates;
}

// Deduce geometry type of data object
function parseType(data): 'LineString' | 'Polygon' | 'Point' {
  if (data.pathIndices) {
    return 'LineString';
  }

  if (data.polygonIndices) {
    return 'Polygon';
  }

  return 'Point';
}
