import util from 'util';
import crypto from 'crypto';
import childProcess from 'child_process';

import gulp from 'gulp';
import replace from 'gulp-replace';
import * as rollup from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonJs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import json from 'rollup-plugin-json';

import packageJson from './package';

const exec = util.promisify(childProcess.exec);

const config = {};
config.BUNDLE_VERSION = Date.now();
config.babel = {
    babelrc: false,
    presets: [
        ['env', {
            targets: {
                browsers: packageJson.browserslist
            },
            modules: false
        }],
        'stage-0'
    ],
    plugins: [
        'external-helpers'
    ]
};

gulp.task('config', async () => {
    config.DEPENDENCIES_VERSION = await (async () => {
        const npmList = JSON.parse((await exec('npm ls --depth=0 --json')).stdout);
        const hash = crypto.createHash('md4');
        let version;

        hash.on('readable', () => {
            let data = hash.read();
            if (data) {
                version = data.toString('hex');
            }
        });

        const installedDependencies = {};
        Object.keys(packageJson.dependencies).forEach((key) => {
            installedDependencies[key] = npmList.dependencies[key].version;
        });
        console.info('Installed dependencies:\n', installedDependencies);
        hash.write(JSON.stringify(installedDependencies));
        hash.end();

        return version;
    })();
});

gulp.task('script.vendor', async () => {
    const vendor = await rollup.rollup({
        input: './src/scripts/vendor.js',
        plugins: [
            nodeResolve({
                jsnext: true,
                browser: true,
                preferBuiltins: false
            }),
            // builtins(),
            // json(),
            commonJs(),
            babel(Object.assign({}, config.babel, {
                presets: [
                    ['env', {
                        targets: {
                            browsers: packageJson.browserslist
                        },
                        modules: false,
                        useBuiltIns: true
                    }],
                    'stage-0'
                ]
            })),
            globals()
        ]
    });

    return await vendor.write({
        file: './dist/scripts/vendor.js',
        format: 'iife',
        name: 'vendor'
    });
});

gulp.task('script.main', async () => {
    const main = await rollup.rollup({
        input: './src/scripts/main.js',
        plugins: [
            babel(config.babel),
            nodeResolve(),
            commonJs()
        ],
        external: [
            'jquery',
            'axios'
        ]
    });

    return await main.write({
        file: './dist/scripts/main.js',
        format: 'iife',
        name: 'main',
        sourcemap: true,
        globals: {
            jquery: '$',
            axios: 'axios'
        }
    });
});

gulp.task('script', ['script.vendor', 'script.main']);

gulp.task('html', ['config'], () => {
    return gulp.src('./src/**/*.html')
        .pipe(replace('DEPENDENCIES_VERSION', config.DEPENDENCIES_VERSION))
        .pipe(replace('BUNDLE_VERSION', config.BUNDLE_VERSION))
        .pipe(gulp.dest('./dist'));
});