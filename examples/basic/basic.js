'use strict';

const path = require('path');

//const openssl = require('openssl');
var OpenSSL = null;
if (process.env.USELOCALLIB === "true"){
    OpenSSL = require("../../openssl.js");
}else{
    OpenSSL = require("@andrewiski/openssl");
    
}


let openSSLExePath = 'openssl';   //if just the exe name assumes its on the exectue path
// if runing on Windows ie Proboly testing in Visual studio code use the included openssl 
if (process.platform === 'win32') {
    
    if (process.env.OPENSSL_PATH === undefined || process.env.OPENSSL_PATH === '') {
        openSSLExePath = path.join(__dirname, '../../openssl', 'openssl.exe');
    }
}


var opensslOptions = {
    opensslPath: openSSLExePath,
    certificatesFolder:  path.join(__dirname,'certs'),
    caFolder: path.join(__dirname,'certs' , 'ca'),
    keySize: 4096, //2048
    caDomainName: "localhost",
    caPassword: null //"mycapassword"
}

var openSSL = new OpenSSL(opensslOptions);

// //Create a CA
openSSL.createCA({overwriteExistingConfigFile:true, overwriteExistingKeyFile:true}).then(
    function(result){
        console.log("Successfully Created CA Key and Certificate");

        //Create a Client Auth Certificate
        openSSL.createCertificate(
            {
                overwriteExistingKeyFile:false,
                certificateId: "johndoe",
                subject: "/DN=localhost/DN=clients/CN=johndoe/C=US/ST=MI/L=AnyTown/O=Any Company/OU=Any Department/emailAddress=johndoe@example.com",
                subjectAltName : "email:copy",
                x509Extensions : openSSL.defaultClientAuthX509Extensions,
                createPfxFile:true,
                pfxPassword: "simplepassword"
            }
        ).then(
            function(result){
                console.log("Successfully Created Client Auth Certificate");
            },
            function(err){
                console.error(err);
                throw err
            }
        );
        //Create a web Server Certificate
        openSSL.createCertificate(
            {
                overwriteExistingKeyFile:false,
                certificateId: "www",
                subject: "/CN=server.localhost",
                subjectAltName : "DNS:localhost,DNS:server.localhost,IP:127.0.0.1",
                x509Extensions : openSSL.defaultServerAuthX509Extensions,
                createPfxFile:true,
                pfxPassword: "simplepassword"
            }
        ).then(
            function(result){
                console.log("Successfully Created Web Server Certificate");
            },
            function(err){
                console.error(err);
                throw err
            }
        );

    },
    function(err){
        console.error(err);
        throw err
    }
);









