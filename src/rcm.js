var fs = require('fs');
var commander = require('commander');
var generator = require('yeoman-generator');
var exists = fs.existsSync;
var component = require('component');
var _ = require('underscore');
var log = console.log;
var filed = require('filed');
var async = require('async');

var commands = {
  init: function(args, callback){
    var env = generator();
    env.register(__dirname + '/../generator', 'base');
    env.create('base', {arguments:args}).run({}, function(){})
  },
  install: function(args, callback){
    if(!exists('package.json')) return console.log('need package.json file');
    var comps = require(process.cwd() + '/package.json').components;
    if(!comps) return console.log('no components to install');
    
    async.eachSeries(_(comps).keys(), function(compname, cb){
      console.log("#######START " + compname);
      var pk = component.install( compname, comps[compname], {remotes: ['https://raw.github.com']});
      report(pk);
      prepare(pk);
      pk.on('end',function(){
        console.log("!!!!!END " + pk.name);
        cb();
      })
      pk.install();
    });
    
    //TODO: without args install everything from package.json
    //TODO: with args install componetns and modify to work properly
  }
}



commander
  .version('0.0.5')
  .usage('<command> [options]')
  .parse(process.argv);


//commands.init("someapp");
commands.install();


function prepare(pkg){
  pkg.on("end", function(){
    var dirName = pkg.name.replace("/","-");
    var compconf = require(process.cwd() + '/components/' + dirName + '/component.json');
    var depsArr = compconf.dependencies && _(compconf.dependencies).chain().keys().map(function(el){
      return el.replace("/","-");
    }).value();
    
    _(compconf.scripts).each(boost);
    var index = fs.createWriteStream(process.cwd() + '/components/' + dirName + '/rcm_index.js');
    var scripts = _(compconf.scripts).map(function(script){
      return "./components/" + dirName + "/" + script;
    });
    index.write("define(['"+ scripts.join("','")+"'], function(ret){return ret});\n");
    index.end();

    function boost(script){
      fs.readFile(process.cwd() + '/components/' + dirName +"/"+ script, gotIt);
      function gotIt(err, data){
        var reqDeps = _(depsArr).map(function(dep){return dep.split("-")[1]});
        var deps = (reqDeps && reqDeps.length > 0) ? (",'" + reqDeps.join("','") + "'"):"";
        var newData = "define(['require','module','exports'"+deps+"], function(require, module){\n";
        newData+= data;
        newData+= "\n});";
        fs.writeFile(process.cwd() + '/components/' + dirName +"/"+ script, newData, done);
      }
      function done(){
        console.log("DONE: "+dirName);
      }
    }
  })
}

function report(pkg, options) {
  options = options || {};
  if (pkg.inFlight) return;
  log('install', pkg.name + '@' + pkg.version);

  pkg.on('error', function(err){
    if (err.fatal) {
      log(err.message);
      process.exit(1);
    }
  });

  pkg.on('dep', function(dep){
    log('dep', dep.name + '@' + dep.version);
    report(dep, options);
    prepare(dep);
  });

  pkg.on('exists', function(dep){
    log('exists', dep.name + '@' + dep.version);
  });

  pkg.on('file', function(file){
    log('fetch', pkg.name + ':' + file);
  });

  pkg.on('end', function(){
    log('complete', pkg.name);
  });
}


