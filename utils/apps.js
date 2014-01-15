var http = require('http');
var Models = require('../models');

function getApps() {
  var applist = '';

  http.get('http://api.steampowered.com/ISteamApps/GetAppList/v0001/', function(res) {
    res.on('data', function(chunk) {
      applist += chunk.toString();
    });

    res.on('end', function() {
      applist = JSON.parse(applist);
      applist = applist.applist.apps.app;

      var apps = []

      for (var i = 0; i < applist.length; i++) {
        if (apps.indexOf(applist[i].appid) === -1) {
          apps.push(applist[i].appid);
        }
      }

      removeApps(apps);
    });
  });
}

function removeApps(apps) {
  Models.App.find(function (err, ModelApps) {
    if (err) throw err;

    for (var i = 0; i < ModelApps.length; i++) {
      if (apps.indexOf(ModelApps[i].appid) !== -1) {
        apps.splice(apps.indexOf(ModelApps[i].appid), 1);
      }
    }
    insertApps(apps, 0);
  });
};

function insertApps(apps, index) {
  if (apps.length > 0 && apps[index]) {
    var app = new Models.App({ appid: apps[index], status: "new" });
    app.save(function (err, app) {
      if (err) throw err;
      
      index += 1;
      insertApps(apps, index);
    });
  } else {
    console.log(index + ' new apps inserted');
    process.exit(0);
  }
};

getApps();
