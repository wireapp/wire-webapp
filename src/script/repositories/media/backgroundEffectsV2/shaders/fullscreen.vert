#version 300 es

/**
 * Fullscreen quad vertex shader.
 *
 * Renders a fullscreen quad covering the entire viewport (-1 to 1 in NDC space).
 * Used for all fullscreen rendering passes (blur, compositing, etc.).
 *
 * Handles Y-flip for coordinate system correction:
 * - When rendering to canvas (fbo === null): flips Y to match WebGL coordinate system
 * - When rendering to framebuffer: no flip needed
 *
 * Vertex attributes:
 *   aPosition: Vertex position in NDC space (location 0)
 *   aTexCoord: Texture coordinates 0-1 (location 1)
 *
 * Uniforms:
 *   uFlipY: If > 0.5, flips Y texture coordinate (1.0 - y)
 */


layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

uniform float uFlipY;

out vec2 vTexCoord;

void main() {
  // Flip Y coordinate if needed (for canvas rendering)
  vTexCoord = vec2(aTexCoord.x, uFlipY > 0.5 ? 1.0 - aTexCoord.y : aTexCoord.y);
  // Pass position through (fullscreen quad in NDC space)
  gl_Position = vec4(aPosition, 0.0, 1.0);
}

