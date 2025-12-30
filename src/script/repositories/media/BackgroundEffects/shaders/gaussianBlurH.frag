#version 300 es

/**
 * Horizontal Gaussian blur shader.
 *
 * Implements separable Gaussian blur in the horizontal direction. Used as the
 * first pass of a two-pass separable blur (horizontal + vertical) for efficiency.
 *
 * Algorithm:
 * - Samples neighboring pixels in horizontal direction
 * - Applies Gaussian weights based on distance from center
 * - Normalizes by sum of weights
 *
 * Separable blur: O(n²) → O(2n) complexity by splitting into two 1D passes.
 * This is much more efficient than a full 2D blur kernel.
 *
 * Uniforms:
 *   uSrc: Source texture to blur
 *   uTexelSize: Texture texel size (1/width, 1/height) for pixel offsets
 *   uRadius: Blur radius in pixels (clamped to MAX_RADIUS = 16)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;
uniform float uRadius;

/**
 * Gaussian function for computing blur weights.
 *
 * @param x - Distance from center pixel
 * @param sigma - Standard deviation (controls blur amount)
 * @returns Gaussian weight value
 */
float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  const int MAX_RADIUS = 16; // Maximum blur radius (performance limit)
  float sigma = max(1.0, uRadius); // Sigma derived from radius
  vec4 sum = vec4(0.0);
  float weightSum = 0.0;

  // Sample neighboring pixels in horizontal direction
  for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
    float fi = float(i);
    // Skip samples outside blur radius
    if (abs(fi) > uRadius) {
      continue;
    }
    // Compute Gaussian weight for this sample
    float weight = gaussian(fi, sigma);
    // Sample texture and accumulate weighted color
    sum += texture(uSrc, vTexCoord + vec2(fi, 0.0) * uTexelSize) * weight;
    weightSum += weight;
  }

  // Normalize by sum of weights
  outColor = sum / max(0.0001, weightSum);
}

