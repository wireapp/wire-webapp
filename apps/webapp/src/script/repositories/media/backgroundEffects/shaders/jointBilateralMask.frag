#version 300 es

/**
 * Joint bilateral filter for edge-preserving mask smoothing.
 *
 * Applies edge-preserving smoothing to the segmentation mask using the video
 * frame as a guide image. This preserves sharp edges in the mask that correspond
 * to edges in the video, while smoothing away noise and artifacts.
 *
 * Algorithm:
 * - For each pixel, samples neighboring pixels within radius
 * - Computes two weights:
 *   - Spatial weight: Gaussian based on distance (smooths spatially)
 *   - Range weight: Gaussian based on color difference from center (preserves edges)
 * - Final weight = spatial × range (joint bilateral)
 * - Normalizes weighted mask values
 *
 * The range weight uses video color differences, so mask edges are preserved
 * where video has edges, and smoothed where video is uniform.
 *
 * Uniforms:
 *   uMask: Input mask texture to filter
 *   uVideo: Guide video texture (used for edge preservation)
 *   uTexelSize: Texture texel size (1/width, 1/height) for pixel offsets
 *   uSpatialSigma: Spatial smoothing parameter (higher = more smoothing)
 *   uRangeSigma: Range (color) smoothing parameter (higher = less edge preservation)
 *   uRadius: Filter radius in pixels (clamped to MAX_RADIUS = 8)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uMask;
uniform sampler2D uVideo;
uniform vec2 uTexelSize;
uniform float uSpatialSigma;
uniform float uRangeSigma;
uniform float uRadius;

/**
 * Gaussian function for computing filter weights.
 *
 * @param x - Distance or difference value
 * @param sigma - Standard deviation (controls smoothing amount)
 * @returns Gaussian weight value
 */
float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  // Sample center pixel color from video (used as reference for range weight)
  vec3 centerColor = texture(uVideo, vTexCoord).rgb;
  float sum = 0.0;
  float weightSum = 0.0;

  const int MAX_RADIUS = 8; // Maximum filter radius (performance limit)
  // Sample neighboring pixels in a square kernel
  for (int y = -MAX_RADIUS; y <= MAX_RADIUS; y++) {
    for (int x = -MAX_RADIUS; x <= MAX_RADIUS; x++) {
      float fx = float(x);
      float fy = float(y);
      // Skip samples outside filter radius
      if (abs(fx) > uRadius || abs(fy) > uRadius) {
        continue;
      }
      // Compute sample UV coordinate
      vec2 offset = vec2(fx, fy) * uTexelSize;
      vec2 sampleUv = vTexCoord + offset;
      
      // Sample mask and video at this location
      float maskValue = texture(uMask, sampleUv).r;
      vec3 sampleColor = texture(uVideo, sampleUv).rgb;
      
      // Compute spatial weight (based on distance from center)
      float spatialWeight = gaussian(length(vec2(fx, fy)), max(0.001, uSpatialSigma));
      // Compute range weight (based on color difference from center)
      float rangeWeight = gaussian(length(sampleColor - centerColor), max(0.001, uRangeSigma));
      
      // Joint bilateral weight: spatial × range
      float weight = spatialWeight * rangeWeight;
      
      // Accumulate weighted mask value
      sum += maskValue * weight;
      weightSum += weight;
    }
  }

  // Normalize by sum of weights (fallback to original if no samples)
  float filtered = weightSum > 0.0 ? sum / weightSum : texture(uMask, vTexCoord).r;
  outColor = vec4(filtered, filtered, filtered, 1.0);
}

