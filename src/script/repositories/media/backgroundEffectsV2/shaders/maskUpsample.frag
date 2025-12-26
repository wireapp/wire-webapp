#version 300 es

/**
 * Mask upsampling shader.
 *
 * Upsamples a low-resolution mask to a higher resolution. When rendering to
 * a larger framebuffer, the GPU's linear filtering automatically interpolates
 * between mask values, providing smooth upsampling.
 *
 * This shader is used to refine the segmentation mask from low-resolution
 * (e.g., 256x144) to a higher resolution for better edge quality.
 *
 * The GPU's linear texture filtering handles the upsampling interpolation,
 * so this shader simply passes through the sampled mask value.
 *
 * Uniforms:
 *   uSrc: Low-resolution mask texture to upsample
 *   uTexelSize: Texture texel size (1/width, 1/height) - unused but kept for consistency
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;

void main() {
  // Sample mask value - GPU linear filtering handles upsampling interpolation
  float maskValue = texture(uSrc, vTexCoord).r;
  outColor = vec4(maskValue, maskValue, maskValue, 1.0);
}

