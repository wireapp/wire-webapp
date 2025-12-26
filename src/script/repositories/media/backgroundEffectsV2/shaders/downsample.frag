#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;

void main() {
  vec4 color = texture(uSrc, vTexCoord);
  outColor = color;
}
