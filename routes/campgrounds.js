var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");


// ====================================
// MULTER AND CLOUDINARY CONFIGURATION
// ====================================
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'andriiielagin', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// ======================
// CAMPGROUND ROUTES
// ======================

// INDEX - display a list of all campgrounds
router.get("/", function(req, res){
    var noMatch = null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}, function(err, campgrounds){
            if(err){
                console.log(err);
            } else {
                if(campgrounds.length < 1){
                    noMatch = "Campground not found, please try again";
                }
                res.render("campgrounds/index", {campgrounds: campgrounds, noMatch: noMatch}); 
            }
        });
    } else {
        Campground.find({}, function(err, campgrounds){
            if(err){
                console.log(err);
            } else {
                res.render("campgrounds/index", {campgrounds: campgrounds, noMatch: noMatch}); 
            }
        });
    }
});

// NEW - display form to make a new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new"); 
});

// CREATE - add new campground to database
router.post("/", upload.single('image'), middleware.isLoggedIn, function(req, res){
    cloudinary.uploader.upload(req.file.path, function(result) {
        // get data from the form and push new campground to campgrounds array
        var name = req.body.name;
        var price = req.body.price;
        var image = result.secure_url;
        var imageId = result.public_id;
        var desc =  req.body.description;
        var author = {
            id: req.user._id,
            username: req.user.username
        };
        var newCampground = {name: name, price: price, image: image, imageId: imageId, description: desc, author: author};
        Campground.create(newCampground, function(err, campground){
            if(err){
                req.flash("error", "Campground not found");
                res.redirect("back");
            } else {
                // redirect back to campgrounds page
                res.redirect("/campgrounds/" + campground.id);
            }
        });
    });
});

// SHOW - show info about one campground
router.get("/:id", function(req, res) {
    // find campground by id
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            console.log(err);
        } else {
            // render this campground at the show page
            res.render("campgrounds/show", {campground: foundCampground}); 
        }
    });
});

// EDIT CAMPGROUND ROUTE - show edit form
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND ROUTE - find and update particular campground, then redirect to it's show page
router.put("/:id", upload.single('image'), middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            campground.name = req.body.name;
            campground.price = req.body.price;
            campground.description = req.body.description;
            campground.save();
            req.flash("success", "Updated successfully");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            return res.redirect("/campgrounds/" + req.params.id);
        }
        try{
            await cloudinary.v2.uploader.destroy(campground.imageId);
            campground.remove();
            req.flash("success", "Campground deleted successfully");
            res.redirect("/campgrounds");
        } catch(err){
            if(err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
        }
    });
});



module.exports = router;