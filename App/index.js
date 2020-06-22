import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import steam from 'steam-login';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';

dotenv.config();
mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useFindAndModify: false,
    useUnifiedTopology: true 
});
const schema = mongoose.Schema({
    gameName: String,
    data: Object
}, { strict: false });
const priceHistory = mongoose.model('Data', schema);

const cache = new NodeCache({ stdTTL: 6 * 60 * 60, checkperiod: 10, deleteOnExpire: false });
cache.on( "expired", function( key, value ){ // once cache gets outdated, we must update it
    console.log(key + ' has expired in cache, fetching values again...');
    const query = priceHistory.find({gameName: key});
    query.exec(function (err, docs) {
        if (err) console.log(err);
        else {
            addToCache(docs[0].gameName, docs[0].data);
        }
    });
});
const addToCache = (key, value) => {
    return new Promise(resolve => {
        console.log('Loading ' + key + ' data to cache...');
        cache.set(key, value);
        console.log('Done: ' + key);
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

// app.get('/', (req, res) => {
//     res.send(req.user == null ? 'not logged in' : 'hello ' + req.user.username).end();
// });

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
    const opts = {
        headers: {
            // Log into steam on browser and get the cookie value of steamLoginSecure and store in below env var
            // Choppy method, but have to use until workaround is found :/
            cookie: 'steamLoginSecure=' + process.env.STEAM_LOGIN_SECURE + ';steamMachineAuth76561198153616203=' + process.env.STEAM_MACHINE_AUTH,
        }
    };
    axios.get('https://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=StatTrak%E2%84%A2%20M4A1-S%20|%20Hyper%20Beast%20(Minimal%20Wear)', opts)
        .then(response => {
            console.log(response.data);
            var json = response.data;
            var plt = {};
            for (var i = 0; i < json.prices.length; i++) {
                plt[i] = json.prices[i][1];
            }
            console.log(plt);
            res.render("itemDetails", { xAxis: Object.keys(plt), yAxis: Object.values(plt),username: req.user.username });
        })
        .catch(err => console.log(err));
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

app.get('*', function(req, res){
    if(req.user==null){
        res.render("404");
    }
    else{
        res.render("404", { username: req.user.username});
    }
  });

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}

app.listen(port, function () {
    console.log("Server has started successfully at port 8080");
    const query = priceHistory.find();
    query.exec(function (err, docs) {
        if (err) console.log(err);
        else {
            for (var doc of docs) {
                if (doc.gameName !== null){
                    addToCache(doc.gameName, doc.data);
                } 
            }
        }
    });
});