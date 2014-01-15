var mongoose = require('mongoose');

var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } }
  mongoose.connect('mongodb://localhost/steamcoop', options);
}
connect();

mongoose.connection.on('disconnected', function () {
  connect();
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// Schemas

var AppSchema = mongoose.Schema({
  appid: { type: Number, unique: true },
  status: String
});

var GameSchema = mongoose.Schema({
  appid: { type: Number, unique: true },
  name: String,
  image: String,
  coming_soon: Boolean,
  platforms: [],
  categories: [],
  genres: []
});

// Export

module.exports = {
  App: mongoose.model('App', AppSchema),
  Game: mongoose.model('Game', GameSchema)
}
