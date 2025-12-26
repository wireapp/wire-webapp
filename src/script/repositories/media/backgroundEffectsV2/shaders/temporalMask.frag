#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uMask;
uniform sampler2D uPrevMask;
uniform vec2 uTexelSize;
uniform float uAlpha;

void main() {
  float current = texture(uMask, vTexCoord).r;
  float previous = texture(uPrevMask, vTexCoord).r;
  float stabilized = mix(previous, current, uAlpha);
  outColor = vec4(stabilized, stabilized, stabilized, 1.0);
}
