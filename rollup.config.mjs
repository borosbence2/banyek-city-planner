import terser from '@rollup/plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';

export default {
    input: 'js/main.js',
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        name: 'FoeCityPlanner',
    },
    plugins: [
        terser(),
        obfuscator({
            // Only obfuscate the logic files, skip the large data databases
            include: ['js/*.js'],
            global: false,
            options: {
                compact: true,
                controlFlowFlattening: false,
                identifierNamesGenerator: 'hexadecimal',
                stringArray: true,
                stringArrayEncoding: ['base64'],
                stringArrayThreshold: 0.75,
                transformObjectKeys: true,
                unicodeEscapeSequence: false,
            },
        }),
    ],
};
