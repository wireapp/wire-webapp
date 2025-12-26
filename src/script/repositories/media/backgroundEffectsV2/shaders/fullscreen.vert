#version 300 es
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

uniform float uFlipY;

out vec2 vTexCoord;

void main() {
  vTexCoord = vec2(aTexCoord.x, uFlipY > 0.5 ? 1.0 - aTexCoord.y : aTexCoord.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
