var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

module.exports = AppGenerator;

var separator = '\n=====================================\n';

function AppGenerator() {
  yeoman.generators.Base.apply(this, arguments);

  this.argument('appname', { type: String, required: false });
  this.option('silent', { type: Boolean, required: false });
  this.appname = this.appname || path.basename(process.cwd());

//  this.sourceRoot(path.join(path.dirname(__dirname), 'templates'));
}

util.inherits(AppGenerator, yeoman.generators.Base);

AppGenerator.prototype.welcome = function welcome() {
  if(this.options.silent){
    return;
  }
  var header = separator.yellow + '\nCityJS\n'.red.bold + separator.yellow;
  console.log(header);
  console.info('Generating your awesome app. Stay tuned ;)');
};


AppGenerator.prototype.boilerplate = function boilerplate(cb) {
  var cb = this.async();

  this.remote('openconf', 'cityjs-boilerplate','master', function (err, remote) {
    if (err) {
      return cb(err);
    }
    remote.directory('./', '.');
    cb();
  });
};

AppGenerator.prototype.hint = function hint() {
  if(this.options.silent){
    return;
  }
  console.info(separator);
  console.info('\nReady.'.bold);
  console.info('\nJust run ' + 'npm install'.bold.yellow + ' to install the required dependencies.');
};
