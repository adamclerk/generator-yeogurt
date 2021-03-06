'use strict';
var util = require('util');
var yeoman = require('yeoman-generator');
var getRootDir = require('../helpers/get-root-dir');
var path = require('path');

var FactoryGenerator = module.exports = function FactoryGenerator() {
  // By calling `NamedBase` here, we get the argument to the subgenerator call
  // as `this.name`.
  yeoman.generators.NamedBase.apply(this, arguments);

  var fileJSON = this.config.get('config');

  // options
  this.projectName = fileJSON.projectName;
  this.jsFramework = fileJSON.jsFramework;
  this.testFramework = fileJSON.testFramework;
  this.useTesting = fileJSON.useTesting;

};

util.inherits(FactoryGenerator, yeoman.generators.NamedBase);

// Prompts
FactoryGenerator.prototype.ask = function ask() {
  if (this.jsFramework !== 'angular') {
    this.log('This subgenerator is only used for Angular Applications. It seems as though you are not using Angular');
    this.log('Operation aborted');
    this.abort = true;
    return;
  }

  var done = this.async();
  var prompts = [{
    name: 'factoryFile',
    message: 'Where would you like to create this factory?',
    default: 'client/app'
  }];

  this.prompt(prompts, function(answers) {
    // Get root directory
    this.rootDir = getRootDir(answers.factoryFile);
    this.factoryFile = path.join(
      answers.factoryFile,
        this._.slugify(this.name.toLowerCase()),
        this._.slugify(this.name.toLowerCase()
        ));
    this.testFile = path.join(answers.factoryFile,
        this._.slugify(this.name.toLowerCase()),
        this._.slugify(this.name.toLowerCase())
      );

    done();
  }.bind(this));
};

FactoryGenerator.prototype.files = function files() {
  if (this.abort) {
    return;
  }

  this.template('factory.js', this.factoryFile + '.factory.js');

  if (this.useTesting) {
    this.template('factory.spec.js', this.testFile + '.factory.spec.js');
  }

};
