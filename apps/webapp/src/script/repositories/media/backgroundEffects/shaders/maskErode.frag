#version 300 es

/**
 * Morphological erosion pass for mask cleanup.
 *
 * Shrinks foreground regions by taking the min over a square window.
 *
 * Uniforms:
 *   uSrc: Source mask texture
 *   uTexelSize: Texture texel size (1/width, 1/height)
 *   uRadius: Radius in pixels (0-4)
 */

precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;
uniform float uRadius;

void main() {
  const int MAX_RADIUS = 4;
  int radius = int(clamp(uRadius, 0.0, float(MAX_RADIUS)));
  float minVal = 1.0;

  for (int y = -MAX_RADIUS; y <= MAX_RADIUS; y += 1) {
    for (int x = -MAX_RADIUS; x <= MAX_RADIUS; x += 1) {
      if (abs(x) > radius || abs(y) > radius) {
        continue;
      }
      vec2 offset = vec2(float(x), float(y)) * uTexelSize;
      float value = texture(uSrc, vTexCoord + offset).r;
      minVal = min(minVal, value);
    }
  }

  outColor = vec4(minVal, minVal, minVal, 1.0);
}
