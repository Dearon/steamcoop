var _ = require('lodash');
var http = require('http');
var Models = require('../models');

var totalGames = 0;

function buildUrl() {
  Models.App
    .find({ status: 'new' })
    .limit(150)
    .exec(function (err, apps) {
      if (err) throw err;

      var url = '';

      for (var i = 0; i < apps.length; i++) {
        url += apps[i].appid + ',';
      }

      loadUrl('http://store.steampowered.com/api/appdetails/?appids=' + url.slice(0, -1) + '&cc=EE&l=english&v=1', apps);
    });
}

function loadUrl(url, apps) {
  var data = '';
  http.get(url, function(res) {
    res.on('data', function(chunk) {
      data += chunk.toString();
    });

    res.on('end', function() {
      data = JSON.parse(data);
      parseAppDetails(data, apps);
    });
  });
}

function parseAppDetails(data, apps) {
  var games = [];

  Object.keys(data).forEach(function(key) {
    if (data[key].success && data[key].data.type === 'game') {
      games.push(data[key].data);
    }
  });

  insertGames(games, apps, 0);
}

function insertGames(games, apps, index) {
  if (games.length > 0 && games[index]) {
    Models.Game.count({ appid: games[index].steam_appid }, function (err, count) {
      if (err) throw err;

      if (count === 0) {
        var game = new Models.Game({
          appid: games[index].steam_appid,
          name: games[index].name,
          image: games[index].header_image,
          coming_soon: games[index].release_date.coming_soon
        });

        if (games[index].platforms.windows) {
          game.platforms.push('Windows');
        }
        if (games[index].platforms.mac) {
          game.platforms.push('Mac');
        }
        if (games[index].platforms.linux) {
          game.platforms.push('Linux');
        }

        if (games[index].categories) {
          for (var i = 0; i < games[index].categories.length; i++) {
            game.categories.push(games[index].categories[i].description);
          }
        }

        if (games[index].genres) {
          for (var i = 0; i < games[index].genres.length; i++) {
            game.genres.push(games[index].genres[i].description);
          }
        }

        game.save(function (err, game) {
          if (err) throw err;

          index += 1;
          insertGames(games, apps, index);
        });
      } else {
        index += 1;
        insertGames(games, apps, index);
      }
    });
  } else {
    updateApps(apps, 0, index);
  }
}

function updateApps(apps, index, newGames) {
  if (apps.length > 0 && apps[index]) {
    apps[index].status = 'done';
    apps[index].save(function (err) {
      if (err) throw err;

      index += 1;
      updateApps(apps, index, newGames);
    });
  } else {
    totalGames += newGames;

    Models.App.count({ status: 'new' }, function (err, count) {
     if (count > 0) {
       console.log(newGames + ' new games added');
       console.log(totalGames + ' total games added');
       console.log(count + ' apps left');

       _.delay(buildUrl, 30000);
     } else {
       console.log(totalGames + ' total games added');
       process.exit(0);
     }
    });
  }
}

buildUrl();
