#define BLUR_QUALITY 8 //The higher the value, the more blur. Must be an even number.

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
    // FIXME currently we choose either the pixel of the original image or we blur it.
    // This creates a rather rough transition. We need to find a way to smooth the edges and avoid pixelated transitions.
    if (texture2D(u_mask, v_texCoord).r == 1.0) {
        gl_FragColor = texture2D(u_image, v_texCoord);
    } else {
        vec4 colorSum;
        for (int i = -BLUR_QUALITY; i < BLUR_QUALITY; i++) {
            for (int j = -BLUR_QUALITY; j < BLUR_QUALITY; j++) {
                colorSum += texture2D(u_image, v_texCoord + onePixel * vec2(i, j));
            }
        }
        gl_FragColor = vec4((colorSum / (float(BLUR_QUALITY) * float(BLUR_QUALITY) * 4.0)).rgb, 1);
    }
}
