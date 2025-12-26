#version 300 es
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
  vec4 videoColor = texture(uVideo, vTexCoord);
  vec4 blurColor = texture(uBlur, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;
  float edge = smoothstep(uSoftLow, uSoftHigh, mask);
  vec4 blendedBlur = mix(videoColor, blurColor, uBlurStrength);
  outColor = mix(blendedBlur, videoColor, edge);
}
