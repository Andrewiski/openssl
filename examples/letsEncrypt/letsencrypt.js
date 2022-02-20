

var acmeNotify = function (ev, msg) {
    let data = null;
    let message = '';
    if (isObject(msg)) {
        data = msg;
        message = ev;
    } else {
        message = msg;
    }
    if (ev === 'error' || ev === 'warning') {
        logUtilHelper.log(appLogName, "app", ev, 'Acme', msg || '');
        if (io) {
            
            io.emit('createLetsEncrypt', { status: 'progress', success: false, error: ev, msg: message || '', data: data });
        }
    } else {
        logUtilHelper.log(appLogName, "app", 'info', 'Acme', ev || '', msg || '');
        if (io) {
            io.emit('createLetsEncrypt', { status: 'progress', success: false, error: null, msg: message || '', data: data });
        }
    }

};

var acmehttp01 = ACMEHttp01.create();
var acmeCertificateManagerOptions = extend({}, objOptions.acmeCertificateManagerOptions);
acmeCertificateManagerOptions.http01 = acmehttp01;
acmeCertificateManagerOptions.notify = acmeNotify;
acmeCertificateManagerOptions.retryInterval = 15000;
acmeCertificateManagerOptions.deauthWait = 30000;
acmeCertificateManagerOptions.retryPoll = 10;
acmeCertificateManagerOptions.retryPending = 10;
acmeCertificateManagerOptions.debug = true;
var acmeCert = ACMECert.create(acmeCertificateManagerOptions);


routes.get('/.well-known/acme-challenge/*', function (req, res) {
    
    let token = req.path.substring('/.well-known/acme-challenge/'.length);
    acmehttp01.get({ token:token }).then(
        function (challenge) {
            if (challenge && challenge.keyAuthorization) {  //Add Expiration Check
                res.setHeader('content-type', 'application/octet-stream');
                res.send(challenge.keyAuthorization);
                acmehttp01.get({ token: token })
                //finalizeOrder();
            } else {
                res.status(404).send('Challenge Not Found');
            }
        },
        function (ex) {
            res.status(404).send(ex);
        }

    );
    
    //args.challenge.keyAuthorization
    //res.end();
});

//This starts up the http and https servers along with the io server we delay this until we get mongo setup so we have time to fetch data from the database before we start getting connections
var startupServer = function () {

    try {
        //createServerCertificate();
        logUtilHelper.log(appLogName, "app", "info", "Loading AudioStreamerData File");
        var strAudioStreamerData = fs.readFileSync(path.join(__dirname, audioStreamerDataFileName));
        extend(privateData.audioStreamers, JSON.parse(strAudioStreamerData));
        Object.keys(privateData.audioStreamers).forEach(function (audioStreamerId) {
            updateAudioStreamer(privateData.audioStreamers[audioStreamerId]);
        });
        logUtilHelper.log(appLogName, "app", "info", "Load Complete AudioStreamerData File");
    } catch (ex) {
        logUtilHelper.log(appLogName, "app", "error", "Error Reading AudioStreamer Data File", ex);
    }

    //add the saved streamers to the commondatastreamers
    extend(commonData.audioStreamers, JSON.parse(JSON.stringify(privateData.audioStreamers)));





    try {
        if (fs.existsSync(path.join(__dirname, certificatesFolder, 'CertificatesDatabase.json')) === false) {
            rebuildCertificatesDatabase();
        }
        logUtilHelper.log(appLogName, "app", "info", "Loading Certificates Data File");
        var strCertificatesData = fs.readFileSync(path.join(__dirname, certificatesFolder, 'CertificatesDatabase.json'));
        privateData.certificates = JSON.parse(strCertificatesData);

        logUtilHelper.log(appLogName, "app", "info", "Load Complete Certificates Database Json File");
    } catch (ex) {
        //This needs to stay Console.log as writetolog will not function as no config
        logUtilHelper.log(appLogName, "app", "error", "Error Reading Certificates Data File", path.join(__dirname, certificatesFolder, 'CertificatesDatabase.json'), ex);
    }


    try {
        loadCertificates();
    } catch (ex) {
        logUtilHelper.log(appLogName, "app", 'error', 'Error Loading https certificate', ex);
    }
   
    //We share the https cert with both Client https and Management https
    var httpsOptions = getHttpsServerOptions();
    https_srv = https.createServer(httpsOptions, app).listen(objOptions.httpsport, function () {
        //console.log('Express server listening on port ' + port);
        logUtilHelper.log(appLogName, "app", "info",'Express server listening on https port ' + objOptions.httpsport);
    });
    ioStreamer.attach(https_srv);

    
   
    http_srv = http.createServer(app).listen(objOptions.httpport, function () {
        //console.log('Express server listening on port ' + port);
        logUtilHelper.log(appLogName, "app", "info",'Express server listening on http port ' + objOptions.httpport);
    });
    
    ioStreamer.attach(http_srv);
   
    //We share the https cert with both Client https and Management https
    var httpsOptionsManagement = getHttpsManagementServerOptions();
    httpsManagement_srv = https.createServer(httpsOptionsManagement, app).listen(objOptions.httpsportManagement, function () {
            //console.log('Express server listening on port ' + port);
        logUtilHelper.log(appLogName, "app", "info", 'Express server listening on https port for Management ' + objOptions.httpsportManagement);
        logUtilHelper.log(appLogName, "app", "info", 'https://localhost:' + objOptions.httpsportManagement + "/" + managementToolUrl);
        if(objOptions.useHttpsClientCertAuth){
            logUtilHelper.log(appLogName, "app", "info", 'Management Url requires a client certificate!');
            if (process.env.localDebug === 'true') {
                logUtilHelper.log(appLogName, "app", "info", 'try creating local host entry and this url https://server.audio.digitalexample.com:' + objOptions.httpsportManagement  + managementToolUrl);
            }
        }
    });
    io.attach(httpsManagement_srv);
   


};

//This function is called on an https certificate change
var updateHttpsServers = function () {
    https_srv.setSecureContext(getHttpsServerOptions());
    httpsManagement_srv.setSecureContext(getHttpsManagementServerOptions());
};


var rimraf = function (dir_path) {
    if (fs.existsSync(dir_path)) {
        fs.readdirSync(dir_path).forEach(function (entry) {
            var entry_path = path.join(dir_path, entry);
            if (fs.lstatSync(entry_path).isDirectory()) {
                rimraf(entry_path);
            } else {
                fs.unlinkSync(entry_path);
            }
        });
        fs.rmdirSync(dir_path);
    }
};




