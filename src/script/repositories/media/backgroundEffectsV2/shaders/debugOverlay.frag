#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform int uMode;

void main() {
  vec4 videoColor = texture(uVideo, vTexCoord);
  float mask = texture(uMask, vTexCoord).r;

  if (uMode == 1) {
    vec4 overlay = vec4(0.0, 1.0, 0.0, 0.5);
    outColor = mix(videoColor, overlay, mask);
    return;
  }
  if (uMode == 2) {
    outColor = vec4(vec3(mask), 1.0);
    return;
  }
  if (uMode == 3) {
    float edge = smoothstep(0.4, 0.6, mask) - smoothstep(0.6, 0.8, mask);
    outColor = vec4(vec3(edge), 1.0);
    return;
  }
  outColor = videoColor;
}
