#version 300 es

/**
 * Virtual background compositing shader.
 *
 * Composites the original video with a background image/video using a segmentation mask.
 * Uses matte thresholds for hard cutoffs and smoothstep for edge blending.
 *
 * Algorithm:
 * 1. Extract mask value (0 = background, 1 = foreground)
 * 2. Compute matte using smoothstep for smooth edge transitions
 * 3. Scale background UV coordinates for "cover" sizing (maintains aspect ratio)
 * 4. Composite: mix background and video based on matte value
 *
 * Background scaling:
 *   uBgScale is computed to ensure background covers entire frame while maintaining
 *   aspect ratio. UV coordinates are centered and scaled for proper coverage.
 *
 * Uniforms:
 *   uVideo: Original video frame texture
 *   uMask: Segmentation mask texture (grayscale, 0-1)
 *   uBg: Background image/video texture
 *   uTexelSize: Texture texel size (1/width, 1/height) - unused but kept for consistency
 *   uMatteLow: Lower threshold for matte cutoff (0-1)
 *   uMatteHigh: Upper threshold for matte cutoff (0-1)
 *   uBgScale: Background UV scale factors [x, y] for cover sizing
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform sampler2D uBg;
uniform vec2 uTexelSize;
uniform float uMatteLow;
uniform float uMatteHigh;
uniform vec2 uBgScale;

void main() {
  // Sample input textures
  vec4 videoColor = texture(uVideo, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;
  
  // Compute matte using smoothstep for smooth edge transitions
  float matte = smoothstep(uMatteLow, uMatteHigh, mask);
  
  // Scale background UV coordinates for "cover" sizing (centered, maintains aspect ratio)
  vec2 bgUv = (vTexCoord - 0.5) * uBgScale + 0.5;
  vec4 bgColor = texture(uBg, bgUv);
  
  // Composite: matte value determines blend (1 = foreground/video, 0 = background)
  outColor = mix(bgColor, videoColor, matte);
}

