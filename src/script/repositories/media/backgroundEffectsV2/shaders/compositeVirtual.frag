#version 300 es
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
  vec4 videoColor = texture(uVideo, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;
  float matte = smoothstep(uMatteLow, uMatteHigh, mask);
  vec2 bgUv = (vTexCoord - 0.5) * uBgScale + 0.5;
  vec4 bgColor = texture(uBg, bgUv);
  outColor = mix(bgColor, videoColor, matte);
}
