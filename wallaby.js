module.exports = function (wallaby) {

    return {
        files: [
            { pattern: 'jspm_packages/system.js', instrument: false },
            { pattern: 'config.js', instrument: false },
            { pattern: 'app/**/*.ts', load: false },
            { pattern: 'app/**/*.spec.ts', ignore: true }
        ],

        tests: [
            { pattern: 'app/**/*.spec.ts', load: true }
        ],

        compilers: {
            '**/*.ts': wallaby.compilers.typeScript({
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                module: 4
            })
        },

        middleware: (app, express) => {
            app.use('/jspm_packages',
                express.static(
                    require('path').join(__dirname, 'jspm_packages')));
        },

        bootstrap: function (wallaby) {
            wallaby.delayStart();

            var promises = [];
            for (var i = 0, len = wallaby.tests.length; i < len; i++) {
                promises.push(System['import'](wallaby.tests[i].replace(/\.js$/, '')));
            }

            Promise.all(promises).then(function () {
                wallaby.start();
            });
        }
    };
};