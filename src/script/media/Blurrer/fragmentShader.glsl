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
    if (texture2D(u_mask, v_texCoord).r == 1.0) {
        gl_FragColor = texture2D(u_image, v_texCoord);
    } else {
        vec4 colorSum;
        for (int i = -8; i < 8; i++) {
            for (int j = -8; j < 8; j++) {
                colorSum += texture2D(u_image, v_texCoord + onePixel * vec2(i, j));
            }
        }
        gl_FragColor = vec4((colorSum / 256.0).rgb, 1);
    }
}