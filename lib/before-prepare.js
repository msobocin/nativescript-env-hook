var path = require("path"); 
var fs = require('fs'); 
var mkdirp = require('mkdirp'); 
 
module.exports = function (logger, projectData, usbLiveSyncService) { 
 
    var readStream = null; 
    var writeStream = null; 
    var hasError = false; 
 
    function rejectCleanup(err, reject) { 
        hasError = true; 
 
        readStream.destroy(); 
        writeStream.end(); 
        logger.error(err); 
        reject(err); 
    } 
 
    function createReadStream(buildProfile) { 
        var fileToRead = path.join(projectData.projectDir, 'config', 'config.' + buildProfile + '.json'); 
 
        readStream = fs.createReadStream(fileToRead); 
        readStream.on('error', rejectCleanup); 
    } 
 
    function createWriteStream(directoryToWriteTo, resolve) { 
        var fileToWriteTo = path.join(directoryToWriteTo, 'config.json'); 
 
        writeStream = fs.createWriteStream(fileToWriteTo); 
        writeStream.on('error', rejectCleanup); 
        writeStream.on('finish', function () { 
            if (!hasError) { 
                resolve(); 
            } 
        }); 
    }

    function checkIfConfigFileExist(directoryToWriteTo) {
        var fileToRead = path.join(directoryToWriteTo, 'config.json');

        return fs.existsSync(fileToRead);
    }

    return new Promise(function (resolve, reject) {
        var buildProfile = projectData.$options.argv.release ? 'prod' : 'dev';
        var directoryToWriteTo = path.join(projectData.projectDir, 'app', 'config');

        // do not copy on live sync if config file exists
        if (!!usbLiveSyncService.isInitialized && checkIfConfigFileExist(directoryToWriteTo)) {
            resolve(); 
            return; 
        }
 
        mkdirp(directoryToWriteTo, function (err) { 
            if (!err) { 
                createReadStream(buildProfile); 
                createWriteStream(directoryToWriteTo, resolve); 
                readStream.pipe(writeStream); 
            } else { 
                rejectCleanup(err, reject); 
            } 
        }); 
    }); 
};
