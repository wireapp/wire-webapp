#define BLUR_QUALITY 14 //The higher the value, the more blur. Must be an even number.

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
    // This is the blurred version of the pixel we are currently rendering
    vec4 blurredPixel = vec4((colorSum / (pow(float(BLUR_QUALITY), 2.0) * 4.0)).rgb, 1);

    // This is the clear version of the pixel we are currently rendering
    vec4 clearPixel = texture2D(u_image, v_texCoord);

    float blend = texture2D(u_mask, v_texCoord).r;

    // The gl_FragColor is a mix between the blurred and the clear pixel depending on the segmentation mask given
    gl_FragColor = mix(blurredPixel, clearPixel, blend);
}
