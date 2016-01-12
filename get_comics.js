var http = require('http');
var jsdom = require('jsdom');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');

// Reading from config.json file for configuration values
var config = require('./config/config');

var comicBookLinks = [];
var dir = path.join(config.fileConfig.folderPath, config.fileConfig.comicName);

var saveComicStrip = function(src, chapterNo){
    var req = http.get(src, function (res) {
        var image = fs.createWriteStream(dir+"/Chapter "+chapterNo+"/temp.jpg");
        res.on('data', function (chunk) {
            image.write(chunk);
        });

        res.on('end', function(){
           image.end();
        });
    }).end();
}


var getImage = function(comicPage, chapterNo){
    jsdom.env(comicPage, config.fileConfig.scripts, function(err, window){
        if (err != null) {
            console.err('Error parsing the response !');
        } else {
            var $ = window.$;
            var src = ''
            $('img.chapter-img').each(function(){
                src =  $(this).attr('src');
                console.log(src);
                console.log('folderNo ' + chapterNo);
                saveComicStrip(src, chapterNo);
            });
        }
    });
}

var crawlPages = function(chapterLink, chapterNo){
    config.httpOptions.path = "/" + chapterLink;
    var comicPage = '';
    var req = http.request(config.httpOptions, function (res) {
        res.on('data', function (chunk) {
            comicPage += chunk;
        });
        res.on('end', function(){
            getImage(comicPage, chapterNo)
        });
    });
    req.end();
}

var crawlChapters = function(){
    var comicPage = '';
    var chapterNo = 1;
    comicBookLinks.forEach(function(item){
        console.log(item + chapterNo);
        crawlPages(item, chapterNo);
        chapterNo++;
    });
}

// Find the chapters of the comic book
var getChapters = function(){
    jsdom.env(pageData, config.fileConfig.scripts, function(err, window){
        if (err != null) {
            console.err('Error parsing the response !');
        } else {
            var $ = window.$;
            $('a:contains("'+ config.fileConfig.comicName +'")').each(function(){
                comicBookLinks.push($(this).attr('href'));
            });
        }

        // Create directories to save the comic strips 
        for(var i = 1, len = comicBookLinks.length; i <= len; i++){
            mkdirp(path.join(dir, "Chapter " + i), function(err){
                if (err) {
                    console.error(err);
                }
            });
        }

        crawlChapters();
    });

};

var pageData = '';
var getComics = function(){
    console.log(config.httpOptions);
    var req = http.request(config.httpOptions, function (res) {
        res.on('data', function (chunk) {
            pageData += chunk;
        });

        res.on('end', getChapters);
    });
    req.end();
}();