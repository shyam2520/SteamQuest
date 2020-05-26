import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import steam from 'steam-login';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}))
app.set('view engine', 'pug');
app.set('views', './views');
app.use(cookieParser());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));
app.use(steam.middleware({
    realm: 'http://localhost:8080/', 
    verify: 'http://localhost:8080/verify',
    apiKey: process.env.STEAM_API_KEY,
}));

app.get('/', function(req, res) {
    res.send(req.user == null ? 'not logged in' : 'hello ' + req.user.username).end();
});
 
app.get('/authenticate', steam.authenticate(), function(req, res) {
    res.redirect('/');
});
 
app.get('/verify', steam.verify(), function(req, res) {
    res.send(req.user).end();
});
 
app.get('/logout', steam.enforceLogin('/'), function(req, res) {
    req.logout();
    res.redirect('/');
});

app.listen(8080, () => {
    console.log("Server running at port 8080.")
});