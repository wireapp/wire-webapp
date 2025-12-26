#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uTexelSize;
uniform float uRadius;

float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  const int MAX_RADIUS = 8;
  float sigma = max(1.0, uRadius);
  vec4 sum = vec4(0.0);
  float weightSum = 0.0;

  for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
    float fi = float(i);
    if (abs(fi) > uRadius) {
      continue;
    }
    float weight = gaussian(fi, sigma);
    sum += texture(uSrc, vTexCoord + vec2(fi, 0.0) * uTexelSize) * weight;
    weightSum += weight;
  }

  outColor = sum / max(0.0001, weightSum);
}
