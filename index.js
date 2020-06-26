import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import steam from 'steam-login';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import gridfs from 'gridfs-stream';

dotenv.config();

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}

mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useFindAndModify: false,
    useUnifiedTopology: true 
});
mongoose.Promise = global.Promise;
gridfs.mongo = mongoose.mongo;
var connection = mongoose.connection;
connection.once('open', function callback () {
    readFromDB('PUBG');
    setInterval(() => {
        readFromDB('PUBG');
        console.log('Cache refreshed.')
    }, 6 * 60 * 60 * 1000); // refresh our mapCache every 6 hrs
});

var cacheMap = new Map();

const readFromDB = (name) => {
    var buffer = "";
    var gfs = gridfs(connection.db);
    var readStream = gfs.createReadStream({ 
        _id: name,
        root: 'steamData',
    });
    readStream.on("data", function (chunk) {
        buffer += chunk;
    });
    // dump contents to console when complete
    readStream.on("end", function () {
        console.log("Successfully read GridFS file");
        //addToCache(name, JSON.parse(buffer));
        var temp = new Map();
        buffer = JSON.parse(buffer);
        for (var key of Object.keys(buffer)) {
            temp.set(key, buffer[key]);
        }
        cacheMap.set(name, temp);
        console.log(cacheMap);
    });
}

const __dirname = path.resolve();
const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }))
app.set('view engine', 'pug');
app.set('views', './views');
app.use(cookieParser());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));
app.use(steam.middleware({
    realm: process.env.REALM,
    verify: process.env.REALM + 'verify',
    apiKey: process.env.STEAM_API_KEY,
}));

app.listen(port, function () {
    console.log("Server has started successfully at port 8080");
});

app.get('/', (req, res) => {
    if(req.user==null){
        res.render("home");
    }
    else{
        res.render("home", {username: req.user.username});
    }
});


app.get('/authenticate', steam.authenticate(), (req, res) => {
    res.redirect('/');
});

app.get('/verify', steam.verify(), (req, res) => {
    // res.send(req.user).end(); <<-- This has the full User object we get as response from steam. Use wisely
    res.redirect('search');
    // console.log(req.user);
});

app.get('/logout', steam.enforceLogin('/'), (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/data', (req, res) => {
    var game = req.query.game;
    var name = req.query.name;
    name = decodeURI(name);
    console.log(name);
    res.render('itemDetails', { name: name, game: game });
});

app.post('/fetchData', (req, res) => {
    console.log(req.body);
    var name = req.body.name;
    var game = req.body.game;
    var data = cacheMap.get(game).get(name);
    var plt = {};
    for (var i = 0; i < data.length; i++) {
        plt[i] = data[i][1];
    }
    var result = { 
        xAxis: Object.keys(plt), 
        yAxis: Object.values(plt), 
        name: name
    }
    console.log(result);
    res.json(result);
});

// Robin additions:

app.get("/faq", function (req, res) {
    if(req.user==null){
        res.render("faq");
    }
    else{
        res.render("faq", { username: req.user.username});
    }
})

app.get("/tc", function (req, res) {
    if(req.user==null){
        res.render("tc");
    }
    else{
        res.render("tc", { username: req.user.username});
    }
})

app.get("/search", function (req, res) {
    if(req.user==null){
        res.send("Login First");
    }
    else{
    res.render("search", { username: req.user.username,profile:req.user.avatar.large});
    }
})

app.get("/loading", function (req, res) {
        res.render("loading");
})

app.get('*', function(req, res){
    if(req.user==null){
        res.render("404");
    }
    else{
        res.render("404", { username: req.user.username});
    }
  });