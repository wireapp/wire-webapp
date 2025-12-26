#version 300 es

/**
 * Temporal mask stabilization shader.
 *
 * Applies temporal smoothing to the segmentation mask using exponential moving
 * average (EMA) with the previous frame's mask. This reduces flickering and
 * jitter by blending current and previous masks.
 *
 * Algorithm:
 * - Samples current mask and previous frame's mask
 * - Blends using alpha parameter: stabilized = mix(previous, current, alpha)
 * - Higher alpha = more responsive (follows current mask more)
 * - Lower alpha = more stable (follows previous mask more)
 *
 * This provides temporal consistency across frames, reducing artifacts from
 * segmentation noise and improving visual quality.
 *
 * Uniforms:
 *   uMask: Current frame's mask texture
 *   uPrevMask: Previous frame's stabilized mask texture
 *   uTexelSize: Texture texel size (1/width, 1/height) - unused but kept for consistency
 *   uAlpha: Temporal smoothing alpha (0-1, higher = more responsive, lower = more stable)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uMask;
uniform sampler2D uPrevMask;
uniform vec2 uTexelSize;
uniform float uAlpha;

void main() {
  // Sample current and previous frame masks
  float current = texture(uMask, vTexCoord).r;
  float previous = texture(uPrevMask, vTexCoord).r;
  
  // Exponential moving average: blend previous and current
  // uAlpha controls responsiveness (1.0 = fully current, 0.0 = fully previous)
  float stabilized = mix(previous, current, uAlpha);
  
  outColor = vec4(stabilized, stabilized, stabilized, 1.0);
}

