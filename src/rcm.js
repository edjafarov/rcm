var fs = require('fs');
var commander = require('commander');
var generator = require('yeoman-generator');
var exists = fs.existsSync;
var component = require('component');
var _ = require('underscore');
var log = console.log;
var filed = require('filed');
var async = require('async');
var log = require('winston');

var depTree = {};
var paths = {};

var commands = {
  init: function(args, callback){
    var env = generator();
    env.register(__dirname + '/../generator', 'base');
    env.create('base', {arguments:args}).run({}, function(){})
  },
  install: function(args, callback){
    if(args.lenght > 0){
      var compname = args[0];
      var ver = 'master';
      if(!!~args[0].indexOf("@")){
        compname = args[0].split("@")[0];
        ver = args[0].split("@")[1];
      }
      installPkg(compname, ver, installed);
      function installed(){
        var packageJson = require(process.cwd() + '/package.json');
        var requireCfg = require(process.cwd() + '/require.cfg.json') || {};
        if(!packageJson.components) packageJson.components = {};
        packageJson.components[compname] = ver;
      }
    }
    
    if(!exists('package.json')) return console.log('need package.json file');
    var comps = require(process.cwd() + '/package.json').components;
    if(!comps) return console.log('no components to install');
    
    async.eachSeries(_(comps).keys(), function(compname, cb){
      installPkg(compname, comps[compname],cb);
    }, function(err){
      fs.writeFile(process.cwd() + '/require.cfg.json', JSON.stringify({paths:paths, shim:depTree}, null, 4), done);
      function done(){
        log.info("require.cfg.json done!");
      }
    });
    //TODO: without args install everything from package.json
    //TODO: with args install componetns and modify to work properly
  }
}

commander
  .version('0.0.5')
  .usage('<command> [options]')
  .parse(process.argv);

if(commander.args.length == 0) {
  return commander.outputHelp()
}
commands[commander.args[0]](commander.args.slice(1));



function installPkg(pkgName, ver, cb){
  if(component.exists(pkgName)) return cb();
  var pk = component.install( pkgName, ver, {remotes: ['https://raw.github.com']});
  report(pk);
  buildDepTree(pk);
  buildPaths(pk);
  pk.on('end',cb);
  pk.install();
}

function buildDepTree(pkg){
  pkg.on('dep', function(dep){
    buildDepTree(dep);
  });
  pkg.on('end', function(){
    var dirName = pkg.name.replace("/","-");
    var pkgName = dirName.split("-")[1];
    var compconf = require(process.cwd() + '/components/' + dirName + '/component.json');
    var depsArr = compconf.dependencies && _(compconf.dependencies).chain().keys().map(function(el){
      return el.split("/")[1];
    }).value();
    if(!_(depsArr).isEmpty()) return depTree[pkgName] = {deps:depsArr,exports:'module.exports'};
    depTree[pkgName] = {exports:'module.exports'};
  });
}

function buildPaths(pkg){
  pkg.on('dep', function(dep){
    buildPaths(dep);
  });
  pkg.on('end', function(){
    var dirName = pkg.name.replace("/","-");
    var pkgName = dirName.split("-")[1];
    var compconf = require(process.cwd() + '/components/' + dirName + '/component.json');
    paths[pkgName] = '/components/' + dirName + "/" + compconf.scripts[0].replace(".js","");
    paths[pkg.name] = '/components/' + dirName + "/" + compconf.scripts[0].replace(".js","");
  });
}

function report(pkg, options) {
  options = options || {};
  if (pkg.inFlight) return;
  log.info('install ' + pkg.name + '@' + pkg.version);

  pkg.on('error', function(err){
    if (err.fatal) {
      log.error(err.message);
      process.exit(1);
    }
  });

  pkg.on('dep', function(dep){
    log.info('dep ' + dep.name + '@' + dep.version);
    report(dep, options);
  });

  pkg.on('exists ', function(dep){
    log.info('exists' + dep.name + '@' + dep.version);
  });

  pkg.on('file', function(file){
    log.info('fetch ' + pkg.name + ':' + file);
  });

  pkg.on('end', function(){
    log.info('complete ' + pkg.name);
  });
}

module.exports = commands;
