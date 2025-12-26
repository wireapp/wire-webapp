#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;

void main() {
  float maskValue = texture(uSrc, vTexCoord).r;
  outColor = vec4(maskValue, maskValue, maskValue, 1.0);
}
