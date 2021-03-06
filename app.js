var express        = require("express"),
    app            = express(),
    bodyParser     = require("body-parser"),
    mongoose       = require("mongoose"),
    flash          = require("connect-flash"),
    passport       = require("passport"),
    LocalStrategy  = require("passport-local"),
    User           = require("./models/user"),
    Campground     = require("./models/campground"),
    Comment        = require("./models/comment"),
    seedDB         = require("./seeds"),
    methodOverride = require("method-override");
    
    // configure dotenv
    require('dotenv').load();
    
    // require('dotenv').config();
    
// Requiring routes
var commentRoutes     = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes        = require("./routes/index");

var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp";
mongoose.connect(url);
// mongoose.connect("mongodb://localhost/yelp_camp");
// mongoose.connect("mongodb://andrii:canada5@ds161411.mlab.com:61411/yelp_camp");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");
// seedDB();

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Brisbane, Perth, Vancover, Montreal are one of the best cities in the world",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use("/campgrounds/:id/comments",commentRoutes);
app.use("/campgrounds",campgroundRoutes);
app.use("/",indexRoutes);


// =======================
// SERVER
// =======================

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The YelpCamp server has started"); 
});