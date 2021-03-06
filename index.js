var path = require('path');
var merge = require('merge');
var compileCompass = require('broccoli-compass-compiler');
var checker = require('ember-cli-version-checker');
var mergeTrees = require('broccoli-merge-trees');
var Funnel = require('broccoli-funnel');

function CompassCompilerPlugin(optionsFn) {
  this.name = 'ember-cli-compass-compiler';
  this.ext = ['scss', 'sass'];
  this.optionsFn = optionsFn;
}

CompassCompilerPlugin.prototype.toTree = function(tree, inputPath, outputPath, inputOptions) {

  var removeLeadingSlash = function(string) {
    return (string.length > 0 && string[0] === '/') ? string.slice(1) : string;
  };

  // Normalize paths
  inputPath = removeLeadingSlash(inputPath);
  outputPath = removeLeadingSlash(outputPath);

  // Merge default options with supplied options
  var defaultOptions = {
    outputStyle: 'compressed',
    compassCommand: 'compass',
    importPath: [],
    getCssDir: function(outputDir) {
      return '"' + path.join(outputDir, outputPath) + '"';
    }
  };
  var compassOptions = merge({}, defaultOptions, this.optionsFn(), inputOptions);


  var outputPaths = compassOptions.outputPaths;
  var trees = Object.keys(outputPaths).reduce(function(trees, file) {

    // Watch inputTrees and compassOptions.importPath directories
    var inputTrees = [inputPath];

    // Compile
    var compassTree = compileCompass(inputTrees, compassOptions);

    // Rename and move files
    var extension = path.extname(outputPaths[file]); // compiled asset extension
    var defaultPath = path.join(outputPath, file + extension); // current path of the asset
    var outputFileName = path.basename(outputPaths[file], extension) + extension; // new name for asset
    var outputDir = removeLeadingSlash(path.dirname(outputPaths[file])); // new directory for asset
    var node = new Funnel(compassTree, {
      destDir: outputDir,
      files: [defaultPath],
      getDestinationPath: function(relativePath) {
        if (relativePath === defaultPath) { return outputFileName; }
        return relativePath;
      }
    });
    trees.push(node);
    return trees;
  }, []);

  return mergeTrees(trees);
};

module.exports = {
  name: 'Ember CLI Compass Compiler',

  shouldSetupRegistryInIncluded: function() {
    return !checker.isAbove(this, '0.2.0');
  },

  setupPreprocessorRegistry: function(type, registry) {
    registry.add('css', new CompassCompilerPlugin(this.compassOptions.bind(this)));

    // prevent conflict with broccoli-sass if it's installed
    if (registry.remove) registry.remove('css', 'broccoli-sass');
  },

  included: function(app) {
    this.app = app;
    this._super.included.apply(this, arguments);

    if (this.shouldSetupRegistryInIncluded()) {
      this.setupPreprocessorRegistry('parent', app.registry);
    }
  },

  compassOptions: function () {
    return (this.app && this.app.options.compassOptions) || {};
  }
};
