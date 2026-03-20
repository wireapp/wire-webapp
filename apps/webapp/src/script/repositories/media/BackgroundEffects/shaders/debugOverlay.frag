#version 300 es

/**
 * Debug overlay visualization shader.
 *
 * Provides visualization modes for inspecting segmentation masks:
 * - Mode 0: Normal rendering (passthrough)
 * - Mode 1: Mask overlay (green tint on mask areas)
 * - Mode 2: Mask only (grayscale mask visualization)
 * - Mode 3: Edge only (highlights mask edges using smoothstep difference)
 * - Mode 4: Class overlay (colorized multiclass segmentation on top of video)
 * - Mode 5: Class only (colorized multiclass segmentation)
 *
 * Used for debugging segmentation quality, tuning matte thresholds, and
 * verifying mask stability.
 *
 * Uniforms:
 *   uVideo: Original video frame texture
 *   uMask: Segmentation mask texture (grayscale, 0-1)
 *   uMode: Debug mode (0 = off, 1 = overlay, 2 = mask only, 3 = edge only, 4 = class overlay, 5 = class only)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform int uMode;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

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

  // Mode 4: Class overlay (colorized multiclass segmentation on top of video)
  if (uMode == 4) {
    int classId = int(floor(mask * 255.0 + 0.5));
    vec3 classColor = classId == 0 ? vec3(0.0) : hsv2rgb(vec3(fract(float(classId) * 0.13), 0.75, 0.95));
    float alpha = classId == 0 ? 0.0 : 0.6;
    outColor = mix(videoColor, vec4(classColor, 1.0), alpha);
    return;
  }

  // Mode 5: Class only (colorized multiclass segmentation)
  if (uMode == 5) {
    int classId = int(floor(mask * 255.0 + 0.5));
    vec3 classColor = classId == 0 ? vec3(0.0) : hsv2rgb(vec3(fract(float(classId) * 0.13), 0.75, 0.95));
    outColor = vec4(classColor, 1.0);
    return;
  }
  
  // Mode 0: Normal rendering (passthrough)
  outColor = videoColor;
}
