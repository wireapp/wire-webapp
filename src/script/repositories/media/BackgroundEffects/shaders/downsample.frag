#version 300 es

/**
 * Downsample shader (passthrough).
 *
 * Simple passthrough shader used for downsampling textures. When rendering to
 * a smaller framebuffer, the texture is automatically downsampled by the GPU's
 * linear filtering. This shader just passes through the sampled color.
 *
 * Also used as the passthrough compositing shader when bypass mode is enabled
 * or when no mask is available.
 *
 * Uniforms:
 *   uSrc: Source texture to downsample/passthrough
 *   uTexelSize: Texture texel size (1/width, 1/height) - unused but kept for consistency
 */


precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;

void main() {
  // Simple passthrough - GPU linear filtering handles downsampling automatically
  vec4 color = texture(uSrc, vTexCoord);
  outColor = color;
}

