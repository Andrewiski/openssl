"use strict";

const { spawn } = require('child_process');
const debug = require('debug')('openssl');
const path = require('path');
const extend = require('extend');
const Deferred = require('deferred');
const fs = require('fs');

var OpenSSL = function (options) {
    var self = this;
    var defaultOptions = {
        opensslPath: 'openssl',
        certificatesFolder: './certs',
        caFolder: './certs/ca',
        keySize: 4096,
        caDomainName: "localhost", 
        caPassword : null,
    };

    
    self.options = extend({}, defaultOptions, options);

    if (self.options.opensslPath.startsWith('./') === true) {
        self.options.opensslPath = path.join(__dirname, self.options.opensslPath.substring(1));
    }

    if (self.options.certificatesFolder.startsWith('./') === true) {
        self.options.certificatesFolder = path.join(__dirname, self.options.certificatesFolder.substring(1));
    }

    if (self.options.caFolder.startsWith('./') === true) {
        self.options.caFolder = path.join(__dirname, self.options.caFolder.substring(1));
    }

    if (!fs.existsSync(self.options.certificatesFolder)){
        fs.mkdirSync(self.options.certificatesFolder, { recursive: true, mode: "744" });
    }

    if (!fs.existsSync(self.options.caFolder)){
        fs.mkdirSync(self.options.caFolder, { recursive: true, mode: "744" });
    }

    var createPfx = function (options) {
        // options.certFile
        // options.keyFile
        // options.pfxPassword
        // options.pfxFile
        // options.caCertFile
        let deferred = Deferred();
        try {

            if (options.certificateId === null || options.certificateId === undefined){
                options.certificateId = "Notset";
                if (options.keyFile === null || options.keyFile === undefined){
                    throw new Error("CertificateId or Keyfile must be set");
                }
                if (options.certFile === null || options.certFile === undefined){
                    throw new Error("CertificateId or Keyfile must be set");
                }
            }
            
            if (options.pfxFile === null || options.pfxFile === undefined){
                throw new Error("pfxFile must be set");
            }

            if (options.pfxPassword === null || options.pfxPassword === undefined){
                throw new Error("pfxPassword must be set");
            }

            let defaultOptions = {
                keyFile : path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.cert.key'),
                certFile : options.signedCrtFile || path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.cert.pem'),
                pfxFile : path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.pfx'),
                pfxPassword : null,
                caFriendlyName: "ca." + self.options.caDomainName,
                friendlyName: options.certificateId + "." + self.options.caDomainName
            }
            //let cnfFile = path.join(options.configFolder, options.cnfFileName || 'client.cnf');
            
            let myOptions = extend({}, defaultOptions, options);

            let cliOptions = ['pkcs12', '-inkey', myOptions.keyFile, '-in', myOptions.certFile, '-export', '-out', myOptions.pfxFile, '-passout', 'pass:' + myOptions.pfxPassword];
            if(myOptions.friendlyName){
                cliOptions.push('-name');
                    cliOptions.push(myOptions.friendlyName);
            }
            
            if (myOptions.caCertFile) {
                cliOptions.push('-CAfile');
                cliOptions.push(myOptions.caCertFile);
                if(myOptions.caFriendlyName){
                    cliOptions.push('-caname');
                    cliOptions.push(myOptions.caFriendlyName);
                }
                
                cliOptions.push('-chain');
                cliOptions.push('-no-CAfile')
                cliOptions.push('-no-CApath')
                cliOptions.push('-no-CAstore');
            }
            let tempCmd = self.options.opensslPath;
            cliOptions.forEach(
                function(item) {
                    tempCmd += " " + item;
                }
            )
            debug(tempCmd);
            const opensslCmd = spawn(self.options.opensslPath, cliOptions, { cwd: self.options.caFolder });
            let stderr = '';
            let stdout = '';
            opensslCmd.stdout.on('data', (data) => {
                debug(`createPfx stdout:`, data.toString('utf8'));
                stdout = stdout + data.toString('utf8');
            });

            opensslCmd.stderr.on('data', (data) => {
                stderr = stderr + data.toString('utf8');
                debug(`createPfx stderr:`, data.toString('utf8'));
            });

            opensslCmd.on('close', (code) => {
                debug(`createPfx child process exited with code ${code}`);
                if (code === 0) {
                    deferred.resolve({ code: code, stdout: stdout, stderr: stderr });
                } else {
                    deferred.reject({ code: code, stdout: stdout, stderr: stderr });
                }

            });
        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };


    var signCSR = function (options) {
        // options.caCertFile
        // options.caKeyFile
        // options.caPassword
        // options.csrFile
        // options.signedCrtFile
        // options.days
        // options.cnfFile
        let deferred = Deferred();
        try {

            
            
            let myOptions = extend({}, defaultOptions, options);
            //-addext ext -reqexts
            let cliOptions = ['x509', '-req', '-days', myOptions.days, '-CA', myOptions.caCertFile, '-CAkey', myOptions.caKeyFile, '-in', myOptions.csrFile, '-copy_extensions', 'copy',   '-CAcreateserial', '-out', myOptions.signedCrtFile];
            //Used if the CA Key is Password Protected
            if (options.caPassword) {
                cliOptions.push('-passin');
                cliOptions.push('pass:' + options.caPassword);
            }

            if(options.subject){
                cliOptions.push('-subj');
                cliOptions.push(myOptions.subject);
            }

            const opensslCmd = spawn(self.options.opensslPath, cliOptions, { cwd: self.options.caFolder });
            let stderr = '';
            let stdout = '';
            opensslCmd.stdout.on('data', (data) => {
                debug(`signCSR stdout:`, data.toString('utf8'));
                stdout = stdout + data.toString('utf8');
            });

            opensslCmd.stderr.on('data', (data) => {
                stderr = stderr + data.toString('utf8');
                debug(`signCSR stderr:`, data.toString('utf8'));
            });

            opensslCmd.on('close', (code) => {
                debug(`signCSR child process exited with code ${code}`);
                if (code === 0) {
                    deferred.resolve({ code: code, stdout: stdout, stderr: stderr });
                } else {
                    deferred.reject({ code: code, stdout: stdout, stderr: stderr });
                }

            });
        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };


    var processRequest = function (options) {
        
        let deferred = Deferred();
        try {
           
            let myOptions = extend({}, options);

            let cliOptions = ['req', '-verbose']

            
            if(myOptions.csrFile){
                if (myOptions.keyFile){
                    cliOptions.push('-new');
                }else{
                    cliOptions.push('-in', myOptions.csrFile);
                }
            }

            if(myOptions.signedCrtFile){ // && (myOptions.keyFile)
                cliOptions.push('-x509');
            }

            if(myOptions.days){
                cliOptions.push('-days', myOptions.days);
            }
            if((myOptions.csrFile === null || myOptions.csrFile === undefined ) &&  (myOptions.subject === null || myOptions.subject === undefined || myOptions.subject === "")){
                throw new Error('subject must be set to a valid Cert Distingused name "/CN=server.example.com/email=johndoe@example.com"');
            }

            if(myOptions.subject){
                cliOptions.push('-subj', myOptions.subject);
            }
            if(myOptions.keyFile){
                cliOptions.push('-key', myOptions.keyFile);
            }
            
            if(myOptions.caCertFile){
                cliOptions.push('-CA', myOptions.caCertFile);
            }
            if(myOptions.caKeyFile){
                cliOptions.push('-CAkey', myOptions.caKeyFile);
            }
            
            if (options.caPassword) {
                cliOptions.push('-passin', 'pass:' + options.caPassword);
            }

            if(myOptions.x509Extensions == null && myOptions.useDefaultServerAuthX509Extensions){
                myOptions.x509Extensions = cloneX509Extensions(self.defaultServerAuthX509Extensions);
            }
            if(myOptions.subjectAltName && myOptions.x509Extensions ){
                myOptions.x509Extensions.subjectAltName = myOptions.subjectAltName;
            }

            if(myOptions.copy_extensions){
                cliOptions.push('-copy_extensions', myOptions.copy_extensions);
                
            }
            if(myOptions.x509Extensions){
                for (const [key, value] of Object.entries(myOptions.x509Extensions)) {
                    //console.log(`${key}: ${value}`);
                    cliOptions.push('-addext', `${key}= ${value}`);
                }
            }

            if(myOptions.signedCrtFile){
                cliOptions.push('-out', myOptions.signedCrtFile);
            }

            if(myOptions.csrFile && myOptions.keyFile){
                cliOptions.push('-out', myOptions.csrFile);
            }

            let tempCmd = self.options.opensslPath;
            cliOptions.forEach(
                function(item) {
                    tempCmd += " " + item;
                }
            )
            debug(tempCmd);

            const opensslCmd = spawn(self.options.opensslPath, cliOptions, { cwd: self.options.caFolder });
            let stderr = '';
            let stdout = '';
            opensslCmd.stdout.on('data', (data) => {
                debug(`processRequest stdout:`, data.toString('utf8'));
                stdout = stdout + data.toString('utf8');
            });

            opensslCmd.stderr.on('data', (data) => {
                stderr = stderr + data.toString('utf8');
                debug(`processRequest stderr:`, data.toString('utf8'));
            });

            opensslCmd.on('close', (code) => {
                debug(`processRequest child process exited with code ${code}`);
                if (code === 0) {
                    deferred.resolve({ code: code, stdout: stdout, stderr: stderr });
                } else {
                    deferred.reject({ code: code, stdout: stdout, stderr: stderr });
                }

            });
        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };


    var createKey = function (options) {
        //options.keyFile
        let deferred = Deferred();

        try {
            let defaultOptions = {
                keySize: self.options.keySize,
                overwriteExistingKeyFile: false,
                keyPassword: null
            }
            let myOptions = extend({}, defaultOptions, options);

            let keyFileExists = fs.existsSync(myOptions.keyFile);
            if (keyFileExists === false || (keyFileExists === true && myOptions.overwriteExistingKeyFile === true))
            {

                let cliOptions = ['genpkey', '-algorithm', 'RSA', '-out', myOptions.keyFile, '-pkeyopt',  'rsa_keygen_bits:' + myOptions.keySize];
                if (myOptions.keyPassword){
                    //cliOptions.push("-aes256");
                    cliOptions.push('-cipher');
                    cliOptions.push('aes256');
                    cliOptions.push("-passout");
                    cliOptions.push("pass:" + myOptions.keyPassword );
                }
                let tempCmd = self.options.opensslPath;
                cliOptions.forEach(
                    function(item) {
                        tempCmd += " " + item;
                    }
                )
                debug(tempCmd);
                const opensslCmd = spawn(self.options.opensslPath, cliOptions, { cwd: self.options.caFolder });
                let stderr = '';
                let stdout = '';
                opensslCmd.stdout.on('data', (data) => {
                    var strData = data.toString('utf8');
                    //Filter Out the '.', '..' , '+'  keygen outputs
                    if (strData.length > 2) {
                        debug(`createKey stdout:`, strData);
                        stdout = stdout + strData;
                    }
                });

                opensslCmd.stderr.on('data', (data) => {
                    var strData = data.toString('utf8');
                    //Filter Out the '.', '..' , '+'  keygen outputs
                    if (strData.length > 2) {
                        stderr = stderr + strData;
                        debug(`createKey stderr:`, strData);
                    }
                });

                opensslCmd.on('close', (code) => {
                    debug(`createKey child process exited with code ${code}`);
                    if (code === 0) {
                        deferred.resolve({ code: code, stdout: stdout, stderr: stderr });
                    } else {
                        deferred.reject({ code: code, stdout: stdout, stderr: stderr });
                    }

                });
            } else {
                deferred.resolve({ code: 1, stdout: "Keyfile Exists", stderr: "" });
            }
        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };

    var signCertificateSigningRequest = function (options) {
        
        let deferred = Deferred();
        try {

            let defaultOptions = {
                //certificateId: null,        
                caKeyFile: path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.key'),
                caCertFile : path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.crt'),                
                caPassword : self.options.caPassword,
                signedCrtFile : path.join(self.options.certificatesFolder, options.certificateId + '.' + self.options.caDomainName + '.pem.crt'),
                days :  999,
                //subject : "/CN=" + options.certificateId + '.' + self.options.caDomainName,
                //subjectAltName: "DNS:" + options.certificateId + "." + self.options.caDomainName,
                //createPfxFile : false,
                //pfxFile : null,
                //pfxPassword : null,
                csrFile : path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.csr'),
                //x509Extensions: null,
                //useDefaultServerAuthX509Extensions: true,
                copy_extensions: "copy",
                appendCACert: true
            }
            
            let myOptions = extend({}, defaultOptions, options);
            //openssl genrsa -out ca.dev.key.pem 4096
            
            //processRequest(myOptions).then(   This should work but keeps giving a must provide Key
            signCSR(myOptions).then(
                function(){
                    deferred.resolve({success:true})
                },
                function(ex){
                    deferred.reject({ code: 999, stdout: ex.message, stderr: ex }); 
                }

            )
        


        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };


    var createCertificateSigningRequest = function (options) {
        
        let deferred = Deferred();
        try {

            let defaultOptions = {
                certificateId: null,
                overwriteExistingKeyFile: false,
                keyFile : path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.pem.key'),
                keySize: self.options.keySize,
                keyPassword : null,
                csrFile : path.join(self.options.certificatesFolder, options.certificateId + "." + self.options.caDomainName + '.csr'),
                subject : "/CN=" + options.certificateId + "." + self.options.caDomainName,
                subjectAltName: "DNS:" + options.certificateId + "." + self.options.caDomainName,
                x509Extensions: null,
                useDefaultServerAuthX509Extensions: false
            }
            
            let myOptions = extend({}, defaultOptions, options);
            //openssl genrsa -out ca.dev.key.pem 4096
            createKey({ keyFile: myOptions.keyFile, overwriteExistingKeyFile: myOptions.overwriteExistingKeyFile, keyPassword:myOptions.keyPassword, keySize: myOptions.keySize })
                .then(
                    function(){
                        try {
                            // if(fs.existsSync(myOptions.caConfigFile) === false ||  myOptions.overwriteExistingCAConfigFile === true){
                            //     fs.writeFileSync(myOptions.caConfigFile, getConfigFileText(myOptions));
                            // }
                            if(fs.existsSync(myOptions.caCertFile) === false ||  myOptions.overwriteExistingCACertFile === true){
                                processRequest({
                                    caKeyFile: null,
                                    caCertFile : null,
                                    caPassword : null,
                                    keyFile : myOptions.keyFile,
                                    signedCrtFile : null,
                                    keyPassword: myOptions.keyPassword,
                                    x509Extensions: myOptions.x509Extensions,
                                    subject: myOptions.subject,
                                    subjectAltName: myOptions.subjectAltName, 
                                    csrFile : myOptions.csrFile,
                                    copy_extensions: null
                                }).then(
                                    function(){
                                        deferred.resolve({success:true})
                                    },
                                    function(ex){
                                        deferred.reject({ code: 999, stdout: ex.message, stderr: ex }); 
                                    }
                                )
                            }else{
                                deferred.resolve({success:true});
                            }
                        }catch(ex){
                            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });  
                        }
                    },
                    function(err){
                        debug("error", "createCA", "createKey", err);
                        //deffered.reject(err);
                        deferred.reject({ code: 999, stdout: err.message, stderr: err });
                    }
                );



        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };

    

   
    const checkCertificateEnum = {
        certificateNameMismatch: -4,
        certificateCheckError: -3,
        certificateNotSent: -2,
        certificateRevoked: -1,
        certificateNotFound: 0,
        defaultStreamerCert: 1,
        validClientCert: 2,
        validStreamerCert: 4
    };


    var checkCertificate = function (cert, authorized) {
        try {
            if (cert && cert.subject) {
                // We have received a client cert 
                // the authorized (req.client.authorized) being passed in means that node.js should have checked it against the CA and even checked experations etc to ensure its valitity
                // Becasue any valid Certificate can pass this check we must now make sure it passes our checks of client verus streamer and determine if the certificate
                // should just be partial trusted IE our default certificate or fully trusted is a valid client cert even if its expired
    
                //if (privateData.certificates[cert.thumbprint]) {
    
                //}
    
                //var sha256 = calcSha256(cert.pubkey);
                //var sha256Raw = calcSha256(cert.raw);
                var fingerprint256 = cert.fingerprint256.replace(/:/g, '').toLowerCase();
    
                //check to see if we have this cert in our database
    
                var localCert = privateData.certificates[fingerprint256];
    
                if (localCert === undefined) {
                    if (cert.subject) {
                        logUtilHelper.log(appLogName, "app", 'warning', `Invalid Audio Streamer Certificate ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                    } else {
                        logUtilHelper.log(appLogName, "app", 'warning', `Invalid Audio Streamer Certificate with No Subject, certificate serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                    }
    
                    return checkCertificateEnum.certificateNotFound;
                }
                if (localCert.isRevoked === true) {
                    logUtilHelper.log(appLogName, "app", 'warning', `Audio Streamer Certificate is Revoked, ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                    return checkCertificateEnum.certificateRevoked;
                }
    
                switch (localCert.certificateType) {
                    case 'streamer':
                        if (cert.subject.CN.toLowerCase().startsWith("defaultappliance") === true) {
                            logUtilHelper.log(appLogName, "app", 'info', `Audio Streamer Default Certificate Accepted ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                            return checkCertificateEnum.defaultStreamerCert;
                        } else {
                            logUtilHelper.log(appLogName, "app", 'info', `Audio Streamer Certificate Accepted ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                            return checkCertificateEnum.validStreamerCert;
                        }
                        
                        //break;
                    case 'client':
                        logUtilHelper.log(appLogName, "app", 'info', `Audio Client Certificate Accepted ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                        return checkCertificateEnum.validClientCert;
                        //break;
                    default:
                        logUtilHelper.log(appLogName, "app", 'info', `Certificate type is not streamer or client, it was  ${localCert.certificateType}, ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}, serial ${cert.serialNumber}, fingerprint ${fingerprint256} !`);
                        //we do not accept the StreamerWebserver Certs for client Auth
                        return checkCertificateEnum.certificateNotFound;
                }
    
            } else {
                logUtilHelper.log(appLogName, "app", 'warning', 'Cert Auth Enabled but no Certificate was sent');
                return checkCertificateEnum.certificateNotSent;
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'checkCertificate', ex);
            return checkCertificateEnum.certificateCheckError;
        }
    };


    var createCA = function( options){
        let deferred = Deferred();

        try {
            let defaultOptions = {
                keySize: self.options.keySize,
                overwriteExistingCAKeyFile:false,
                overwriteExistingCACertFile: false,
                caDomainName: self.options.caDomainName,
                caKeyFile: path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.key'),
                caCertFile : path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.crt'),
                caPassword : self.options.caPassword,
                x509Extensions: cloneX509Extensions(self.defaultCaX509Extensions),
                subject: "/CN=ca." + self.options.caDomainName,
                subjectAltName: "DNS:ca." + self.options.caDomainName
                
            }
            let myOptions = extend({}, defaultOptions, options);
            //openssl genrsa -out ca.dev.key.pem 4096
            createKey({ keyFile: myOptions.caKeyFile, overwriteExistingKeyFile: myOptions.overwriteExistingCAKeyFile, keyPassword:myOptions.caPassword, keySize: myOptions.keySize })
                .then(
                    function(){
                        try {
                            // if(fs.existsSync(myOptions.caConfigFile) === false ||  myOptions.overwriteExistingCAConfigFile === true){
                            //     fs.writeFileSync(myOptions.caConfigFile, getConfigFileText(myOptions));
                            // }
                            if(fs.existsSync(myOptions.caCertFile) === false ||  myOptions.overwriteExistingCACertFile === true){

                                processRequest({
                                    caKeyFile: null,
                                    caCertFile : null,
                                    caPassword : null,
                                    keyFile : myOptions.caKeyFile,
                                    signedCrtFile : myOptions.caCertFile,
                                    keyPassword: myOptions.caPassword,
                                    x509Extensions: myOptions.x509Extensions,
                                    subject: myOptions.subject,
                                    subjectAltName: myOptions.subjectAltName,  
                                    copy_extensions: null
                                }).then(
                                    function(){
                                        deferred.resolve({success:true})
                                    },
                                    function(ex){
                                        deferred.reject({ code: 999, stdout: ex.message, stderr: ex }); 
                                    }

                                )
                            }else{
                                deferred.resolve({success:true});
                            }
                        }catch(ex){
                            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });  
                        }
                    },
                    function(err){
                        debug("error", "createCA", "createKey", err);
                        //deffered.reject(err);
                        deferred.reject({ code: 999, stdout: err.message, stderr: err });
                    }
                );
        }catch(ex){
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });  
        }
        return deferred.promise;
    }

    

    var createCertificate = function (options) {

        
        let deferred = Deferred();

        try {
            let defaultOptions = {
                certificateId: null,
                keySize: self.options.keySize,
                overwriteExistingKeyFile: false,
                caKeyFile: path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.key'),
                caCertFile : path.join(self.options.caFolder, 'ca.' + self.options.caDomainName + '.pem.crt'),                
                caPassword : self.options.caPassword,
                keyFile : path.join(self.options.certificatesFolder, options.certificateId + '.' + self.options.caDomainName + '.pem.key'),
                keyPassword : null,
                signedCrtFile : path.join(self.options.certificatesFolder, options.certificateId + '.' + self.options.caDomainName + '.pem.crt'),
                days :  999,
                subject : "/CN=" + options.certificateId + '.' + self.options.caDomainName,
                subjectAltName: "DNS:" + options.certificateId + "." + self.options.caDomainName,
                X509Extentions: [],
                createPfxFile : false,
                pfxFile : path.join(self.options.certificatesFolder, options.certificateId + '.' + self.options.caDomainName + '.pfx'),
                pfxPassword : null,
                copy_extensions: null
            }
            //let cnfFile = path.join(options.configFolder, options.cnfFileName || 'client.cnf');
            
            let myOptions = extend({}, defaultOptions, options);


            debug('info', 'openssl', 'createCertificate', { opensslPath: self.options.opensslPath, keyFile: myOptions.keyFile, csrFile: myOptions.csrFile, signedCrtFile: myOptions.signedCrtFile, pfxFile: myOptions.pfxFile, caKeyFile: myOptions.caKeyFile, caCertFile: myOptions.caCertFile, caPassword: "*********", cnfFile: myOptions.cnfFile, days: myOptions.days, subject: myOptions.subject, createPfxFile: myOptions.createPfxFile, pfxPassword: "***********", overwriteExistingKeyFile: myOptions.overwriteExistingKeyFile });
            
            

            createKey(myOptions).then(
                function () {
                    try {
                        processRequest(myOptions).then(
                            function () {
                                
                                try {
                                   
                                    //we need to inject the CA Cert into the client cert so it chains correctly
                                    fs.appendFileSync(myOptions.signedCrtFile, '\n');
                                    fs.appendFileSync(myOptions.signedCrtFile, fs.readFileSync(myOptions.caCertFile));
                                    if (myOptions.createPfxFile === true) {
                                        createPfx(myOptions).then(
                                            function (result) {
                                                try {
                                                    deferred.resolve({ pfxFile: myOptions.pfxFile, keyFile: myOptions.keyFile, certFile: myOptions.signedCrtFile });
                                                } catch (ex) {
                                                    deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
                                                }
                                            }
                                            ,
                                            function (result) {
                                                deferred.reject(result);
                                            }
                                        );
                                    } else {
                                        deferred.resolve({ pfxFile: null, keyFile: myOptions.keyFile, certFile: myOptions.signedCrtFile });
                                    }
                                } catch (ex) {
                                    deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
                                }        
                            },
                            function (result) {
                                deferred.reject(result);
                            }

                        );
                    } catch (ex) {
                        deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
                    }
                },
                function (result) {

                    deferred.reject(result);
                }

            );
        } catch (ex) {
            deferred.reject({ code: 999, stdout: ex.message, stderr: ex });
        }
        return deferred.promise;
    };


    

    

    var saveCertificateDataFile = function () {
        fs.writeFileSync(path.join(__dirname, certificatesFolder, 'CertificatesDatabase.json'), JSON.stringify(privateData.certificates, null, 2));
    };

    var rebuildCertificatesDatabase = function () {


        // load streamer certs backups, active, revoked in that order for presidence
        let folderPath = path.join(audioStreamerCertsFolder, 'backups');
        let files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert' || path.extname(fileInfo.name) === '.crt') ) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'streamer', certFile: fileInfo.name, isRevoked:false, isBackupFile:true});
    
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
        folderPath = path.join(audioStreamerCertsFolder);
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert' || path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'streamer', certFile: fileInfo.name, isRevoked: false, isBackupFile: false });
    
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
        folderPath = path.join(audioStreamerCertsFolder, 'revoked');
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert' || path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'streamer', certFile: fileInfo.name, isRevoked: true, isBackupFile: false });
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
    
        // load client certs backups, active, revoked in that order for presidence
        folderPath = path.join(clientsCertsFolder, 'backups');
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert'|| path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'client', certFile: fileInfo.name, isRevoked: false, isBackupFile: true });
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
        folderPath = path.join( clientsCertsFolder);
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert'|| path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'client', certFile: fileInfo.name, isRevoked: false, isBackupFile: false });
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
        folderPath = path.join(clientsCertsFolder, 'revoked');
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert'|| path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'client', certFile: fileInfo.name, isRevoked: true, isBackupFile: false });
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
    
    
        folderPath = path.join(audioStreamerCertsFolder, 'letsEncrypt');
        files = fs.readdirSync(path.join(__dirname, folderPath), { withFileTypes: true });
        files.forEach(function (fileInfo) {
            try {
                if (fileInfo.isFile() === true && (path.extname(fileInfo.name) === '.cert'|| path.extname(fileInfo.name) === '.crt')) {
                    updatePersistedCertificates({ folderPath: folderPath, certificateType: 'streamerLetsEncrypt', certFile: fileInfo.name, isRevoked: false, isBackupFile: false });
    
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", 'error', 'Error rebuilding Certificate Database', folderPath, fileInfo.name, ex);
            }
    
        });
    
    
        saveCertificateDataFile();
    
    };

    var configFileEscapePath = function(value){
        return value.replace(/\\/g, "\\\\");
    }

    

    const _defaultCaX509Extensions = {
        basicConstraints: "critical,CA:TRUE,pathlen:1",
        keyUsage : "critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment",
        subjectKeyIdentifier: "hash",
        authorityKeyIdentifier: "keyid,issuer",
        extendedKeyUsage: "serverAuth"
        //authorityInfoAccess = "caIssuers;URI:http://localhost/certs/ca.cert/,OCSP;URI.0=http://localhost/certs/ocsp",
    };

    const _defaultClientX509Extensions = {
        basicConstraints: "critical,CA:FALSE",
        keyUsage : "digitalSignature, nonRepudiation, keyEncipherment",
        subjectKeyIdentifier: "hash",
        authorityKeyIdentifier: "keyid,issuer",
        extendedKeyUsage: "clientAuth,emailProtection",
        //authorityInfoAccess = "caIssuers;URI:http://localhost/certs/ca.cert/",
        issuerAltName: "issuer:copy"
    };

    const _defaultServerX509Extensions = {
        basicConstraints: "critical,CA:FALSE",
        keyUsage : "digitalSignature, nonRepudiation, keyEncipherment",
        subjectKeyIdentifier: "hash",
        authorityKeyIdentifier: "keyid,issuer",
        extendedKeyUsage: "serverAuth",
        //authorityInfoAccess = "caIssuers;URI:http://localhost/certs/ca.cert/",
        issuerAltName: "issuer:copy"
    };

    var cloneX509Extensions = function(defaultX509Extensions){
        return extend({}, _defaultCaX509Extensions);
    }

    

    // assign the functions we want to export
    self.checkCertificate = checkCertificate;
    self.checkCertificateEnum = checkCertificateEnum;
    self.createPfx = createPfx;
    self.createCertificate = createCertificate;
    self.createCertificateSigningRequest = createCertificateSigningRequest;
    self.createKey = createKey;
    self.createCA = createCA;
    self.signCertificateSigningRequest = signCertificateSigningRequest;
    self.defaultCaX509Extensions = cloneX509Extensions(_defaultCaX509Extensions);
    self.defaultClientAuthX509Extensions = cloneX509Extensions(_defaultClientX509Extensions);
    self.defaultServerAuthX509Extensions = cloneX509Extensions(_defaultServerX509Extensions);

};

module.exports = OpenSSL;


