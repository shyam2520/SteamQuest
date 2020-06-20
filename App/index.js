import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import steam from 'steam-login';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';

dotenv.config();

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
        res.render("search", { username: req.user.username});
    }
});


app.get('/authenticate', steam.authenticate(), (req, res) => {
    res.redirect('/');
});

app.get('/verify', steam.verify(), (req, res) => {
    // res.send(req.user).end(); <<-- This has the full User object we get as response from steam. Use wisely
    res.redirect('/');
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
            res.render("itemDetails", { xAxis: Object.keys(plt), yAxis: Object.values(plt) });
        })
        .catch(err => console.log(err));
});

// Robin additions:

app.get("/faq", function (req, res) {
    res.render("faq");
})

app.get("/tc", function (req, res) {
    res.render("tc");
})

app.get('*', function(req, res){
    res.render("404");
  });

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}

app.listen(port, function () {
    console.log("Server has started successfully at port 8080");
});