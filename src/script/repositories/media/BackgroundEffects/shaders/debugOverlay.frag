#version 300 es

/**
 * Debug overlay visualization shader.
 *
 * Provides visualization modes for inspecting segmentation masks:
 * - Mode 0: Normal rendering (passthrough)
 * - Mode 1: Mask overlay (green tint on mask areas)
 * - Mode 2: Mask only (grayscale mask visualization)
 * - Mode 3: Edge only (highlights mask edges using smoothstep difference)
 *
 * Used for debugging segmentation quality, tuning matte thresholds, and
 * verifying mask stability.
 *
 * Uniforms:
 *   uVideo: Original video frame texture
 *   uMask: Segmentation mask texture (grayscale, 0-1)
 *   uMode: Debug mode (0 = off, 1 = overlay, 2 = mask only, 3 = edge only)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform int uMode;

void main() {
  vec4 videoColor = texture(uVideo, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;

  // Mode 1: Mask overlay (green tint on mask areas)
  if (uMode == 1) {
    vec4 overlay = vec4(0.0, 1.0, 0.0, 0.5); // Semi-transparent green
    outColor = mix(videoColor, overlay, mask);
    return;
  }
  
  // Mode 2: Mask only (grayscale mask visualization)
  if (uMode == 2) {
    outColor = vec4(vec3(mask), 1.0);
    return;
  }
  
  // Mode 3: Edge only (highlights edges using smoothstep difference)
  if (uMode == 3) {
    // Edge detection: difference of two smoothsteps creates a band highlighting edges
    float edge = smoothstep(0.4, 0.6, mask) - smoothstep(0.6, 0.8, mask);
    outColor = vec4(vec3(edge), 1.0);
    return;
  }
  
  // Mode 0: Normal rendering (passthrough)
  outColor = videoColor;
}

