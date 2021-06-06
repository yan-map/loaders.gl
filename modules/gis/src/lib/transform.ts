import {Feature} from 'geojson';
import {BinaryFeatures} from '../types';

/**
 * Apply transformation to every coordinate of binary features
 * @param binaryFeatures binary features
 * @param fn Function to call on each coordinate
 * @return Transformed binary features
 */
export function transformBinaryCoords(
  binaryFeatures: BinaryFeatures,
  fn: (coord: number[]) => number[]
): BinaryFeatures {
  // Expect binaryFeatures to have points, lines, and polygons keys
  for (const binaryFeature of Object.values(binaryFeatures)) {
    // @ts-ignore binaryFeature can technically be 'undefined'
    const {positions} = binaryFeature;
    for (let i = 0; i < positions.value.length; i += positions.size) {
      // TODO - this generates lots of small objects, better create one object and update fields...
      const coord = Array.from(positions.value.subarray(i, i + positions.size));
      const transformedCoord = fn(coord as number[]);
      positions.value.set(transformedCoord, i);
    }
  }
  return binaryFeatures;
}

/**
 * Apply transformation to every coordinate of GeoJSON features
 * @param features Array of GeoJSON features
 * @param fn Function to call on each coordinate
 * @returns Transformed GeoJSON features
 */
 export function transformGeoJsonCoords(
  features: Feature[],
  fn: (coord: number[]) => number[]
): Feature[] {
  for (const feature of features) {
    // @ts-ignore - GeometryCollection does not have .coordinates
    feature.geometry.coordinates = coordMap(feature.geometry.coordinates, fn);
  }
  return features;
}

function coordMap(array, fn): void {
  if (isCoord(array)) {
    return fn(array);
  }

  return array.map(item => {
    return coordMap(item, fn);
  });
}

function isCoord(array): boolean {
  return Number.isFinite(array[0]) && Number.isFinite(array[1]);
}
