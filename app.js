var Models = require('./models');
var http = require('http');
var express = require('express');
var app = express();
var parseString = require('xml2js').parseString;
var settings = require('./settings.json');

app.get('/games', function(req, res) {
  function loadGames() {
    Models.Game
      .find({ $or : [{ categories: 'Co-op' }, { categories: 'Local Co-op' }, { categories: 'Multi-player' }] })
      .lean()
      .exec(function (err, games) {
        if (err) {
          res.send(500);
        } else {
          parseGames(games);
	}
      });
  }

  function parseGames(games) {
    var platforms = [];
    var categories = [];
    var genres = [];

    for (var i = 0; i < games.length; i++) {
      delete games[i]._id;
      delete games[i].__v;

      games[i].players = [];

      for (var j = 0; j < games[i].platforms.length; j++) {
        if (platforms.indexOf(games[i].platforms[j]) === -1) {
          platforms.push(games[i].platforms[j]);
        }
      }

      if (games[i].categories) {
        for (var j = 0; j < games[i].categories.length; j++) {
          if (games[i].categories[j] !== 'Co-op' && games[i].categories[j] !== 'Local Co-op' && games[i].categories[j] !== 'Multi-player') {
            games[i].categories.splice(j, 1);
            j--;
          } else {
            if (categories.indexOf(games[i].categories[j]) === -1) {
              categories.push(games[i].categories[j]);
            }
          }
        }
      }

      if (games[i].genres) {
        for (var j = 0; j < games[i].genres.length; j++) {
          if (genres.indexOf(games[i].genres[j]) === -1) {
            genres.push(games[i].genres[j]);
          }
        }
      }
    }

    var json = {
      games: games,
      platforms: platforms,
      categories: categories,
      genres: genres
    }

    res.json(json);
  }

  loadGames();
});

app.get('/players/:steamid', function(req, res) {
  function getProfile(steamid) {
    var result = '';
    http.get('http://steamcommunity.com/id/' + steamid + '?xml=1', function(httpres) {
      httpres.on('data', function(chunk) {
        result += chunk.toString();
      });

      httpres.on('end', function() {
        parseString(result, function(err, result) {
          if (err) {
            res.send(500);
          } else if (result.response && result.response.error) {
            getProfileOld(steamid);
          } else {
            getGames(result);
          }
        });
      });

      httpres.on('error', function(err) {
        res.send(500);
      });
    });
  }

  function getProfileOld(steamid) {
    var result = '';
    http.get('http://steamcommunity.com/profiles/' + steamid + '?xml=1', function(httpres) {
      httpres.on('data', function(chunk) {
        result += chunk.toString();
      });

      httpres.on('end', function() {
        if (httpres.headers.location) {
          getProfileUrl(httpres.headers.location);
	} else {
          parseString(result, function(err, result) {
            if (err) {
              res.send(500);
            } else if (result.response && result.response.error) {
              res.send(404);
            } else {
              getGames(result);
            }
          });
	}
      });

      httpres.on('error', function(err) {
        res.send(500);
      });
    });
  }

  function getProfileUrl(url) {
    var result = '';
    http.get(url, function(httpres) {
      httpres.on('data', function(chunk) {
        result += chunk.toString();
      });

      httpres.on('end', function() {
        parseString(result, function(err, result) {
          if (err) {
            res.send(500);
          } else if (result.response && result.response.error) {
            res.send(404);
          } else {
            getGames(result);
          }
        });
      });

      httpres.on('error', function(err) {
        res.send(500);
      });
    });
  }

  function getGames(profile) {
    var player = {};
    player.steamID = profile.profile.steamID[0];
    player.steamID64 = profile.profile.steamID64[0];
    player.games = [];

    var games = '';

    http.get('http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + settings.apikey + '&steamid=' + player.steamID64 + '&format=json&include_played_free_games=1', function(httpres) {
      httpres.on('data', function(chunk) {
        games += chunk.toString();
      });

      httpres.on('end', function() {
        games = JSON.parse(games);

        for (var i = 0; i < games.response.games.length; i++) {
          player.games.push(games.response.games[i].appid);
        }

        res.json(player);
      });
    });
  }

  getProfile(req.params.steamid);
});

app.listen(3000);
