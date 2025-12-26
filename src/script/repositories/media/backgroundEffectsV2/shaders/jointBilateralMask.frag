#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uMask;
uniform sampler2D uVideo;
uniform vec2 uTexelSize;
uniform float uSpatialSigma;
uniform float uRangeSigma;
uniform float uRadius;

float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  vec3 centerColor = texture(uVideo, vTexCoord).rgb;
  float sum = 0.0;
  float weightSum = 0.0;

  const int MAX_RADIUS = 8;
  for (int y = -MAX_RADIUS; y <= MAX_RADIUS; y++) {
    for (int x = -MAX_RADIUS; x <= MAX_RADIUS; x++) {
      float fx = float(x);
      float fy = float(y);
      if (abs(fx) > uRadius || abs(fy) > uRadius) {
        continue;
      }
      vec2 offset = vec2(fx, fy) * uTexelSize;
      vec2 sampleUv = vTexCoord + offset;
      float maskValue = texture(uMask, sampleUv).r;
      vec3 sampleColor = texture(uVideo, sampleUv).rgb;
      float spatialWeight = gaussian(length(vec2(fx, fy)), max(0.001, uSpatialSigma));
      float rangeWeight = gaussian(length(sampleColor - centerColor), max(0.001, uRangeSigma));
      float weight = spatialWeight * rangeWeight;
      sum += maskValue * weight;
      weightSum += weight;
    }
  }

  float filtered = weightSum > 0.0 ? sum / weightSum : texture(uMask, vTexCoord).r;
  outColor = vec4(filtered, filtered, filtered, 1.0);
}
