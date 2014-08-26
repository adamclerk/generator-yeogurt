/*global describe, beforeEach, it*/
'use strict';

var path    = require('path');
var helpers = require('yeoman-generator').test;


describe('yeogurt generator server defaults', function () {
    beforeEach(function (done) {
        helpers.testDirectory(path.join(__dirname, 'temp'), function (err) {
            if (err) {
                return done(err);
            }

            this.app = helpers.createGenerator('yeogurt:app', [
                '../../app',
            ]);
            done();
        }.bind(this));
    });

    it('creates expected files', function (done) {
        var expected = [
            // add files and folders you expect to exist here.
            'server/modules/jadeRender.js'
        ];

        helpers.mockPrompt(this.app, {
            projectName: 'testing',
            versionControl: 'git',
            singlePageApplication: true,
            htmlOption: 'jade',
            cssOption: 'sass',
            jsOption: 'requirejs',
            jsTemplate: 'jade',
            useServer: true,
            ieSupport: false,
            responsive: false,
            useGA: false,
            useFTP: false,
            jshint: false,
            extras: []
        });
        this.app.options['skip-install'] = true;
        this.app.run({}, function () {
            helpers.assertFile(expected);
            done();
        });
    });
});