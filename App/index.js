import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import mongoose from 'mongoose';

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

app.get("/", (req, res) => {
    res.write("<h1>Hello world</h1>");
});

app.listen(8080, () => {
    console.log("Server running at port 8080.")
});