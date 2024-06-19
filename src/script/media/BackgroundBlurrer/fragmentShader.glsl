#define BLUR_QUALITY 14 //The higher the value, the more blur. Must be an even number.
#define SMOOTH 3 // This will create a smooth transition between the blurred and the clear part (the higher the value, the smoother)

precision mediump float;

// our texture
uniform sampler2D u_image;
// The segmenter bitmask
uniform sampler2D u_mask;

uniform vec2 u_textureSize;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    vec4 colorSum;
    for (int i = -BLUR_QUALITY; i < BLUR_QUALITY; i++) {
        for (int j = -BLUR_QUALITY; j < BLUR_QUALITY; j++) {
            colorSum += texture2D(u_image, v_texCoord + onePixel * vec2(i, j));
        }
    }
    vec4 blurredPixel = vec4((colorSum / (pow(float(BLUR_QUALITY), 2.0) * 4.0)).rgb, 1);

    float blend;
    for (int i = -SMOOTH; i < SMOOTH; i++) {
        for (int j = -SMOOTH; j < SMOOTH; j++) {
            blend += texture2D(u_mask, v_texCoord + onePixel * vec2(i, j)).r == 1.0 ? 1.0 : 0.0;
        }
    }
    blend = blend / pow(float((SMOOTH) * 2), 2.0);
    //blend = texture2D(u_mask, v_texCoord).r;
    vec4 clearPixel = texture2D(u_image, v_texCoord);
    gl_FragColor = mix(blurredPixel, clearPixel, blend);
}
