#version 300 es

/**
 * Background blur compositing shader.
 *
 * Composites the original video with a blurred background using a segmentation mask.
 * Applies soft edge blending for smooth transitions between foreground and background.
 *
 * Algorithm:
 * 1. Extract mask value (0 = background, 1 = foreground)
 * 2. Compute soft edge using smoothstep for smooth transitions
 * 3. Blend video and blur based on blur strength
 * 4. Final composite: use soft edge to blend between blurred and original video
 *
 * Uniforms:
 *   uVideo: Original video frame texture
 *   uBlur: Blurred background texture (downsampled and Gaussian blurred)
 *   uMask: Segmentation mask texture (grayscale, 0-1)
 *   uTexelSize: Texture texel size (1/width, 1/height) - unused but kept for consistency
 *   uSoftLow: Lower threshold for soft edge (0-1)
 *   uSoftHigh: Upper threshold for soft edge (0-1)
 *   uBlurStrength: Blur intensity (0-1, 0 = no blur, 1 = full blur)
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uBlur;
uniform sampler2D uMask;
uniform vec2 uTexelSize;
uniform float uSoftLow;
uniform float uSoftHigh;
uniform float uBlurStrength;

void main() {
  // Sample input textures
  vec4 videoColor = texture(uVideo, vTexCoord);
  vec4 blurColor = texture(uBlur, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;
  
  // Compute soft edge transition (smoothstep for smooth blending)
  float edge = smoothstep(uSoftLow, uSoftHigh, mask);
  
  // Blend video and blur based on blur strength
  vec4 blendedBlur = mix(videoColor, blurColor, uBlurStrength);
  
  // Final composite: use soft edge to blend between blurred and original
  // Higher edge value = more original video (foreground), lower = more blur (background)
  outColor = mix(blendedBlur, videoColor, edge);
}

