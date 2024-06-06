precision mediump float;

// our texture
uniform sampler2D u_image;
// The segmenter bitmask
uniform sampler2D u_mask;

uniform vec2 u_textureSize;
uniform float u_kernel[9];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    if (texture2D(u_mask, v_texCoord).r == 1.0) {
        gl_FragColor = texture2D(u_image, v_texCoord);
    } else {
        vec4 colorSum =
                texture2D(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
                texture2D(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
                texture2D(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
                texture2D(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;
        gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, 1);
    }
}