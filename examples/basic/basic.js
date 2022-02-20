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

//Create a CA
openSSL.createCA({overwriteExistingCAKeyFile:false, overwriteExistingCACertFile:false}).then(
    function(result){
        console.log("Successfully Created CA Key and Certificate");

        //Create a Client Auth Certificate
        openSSL.createCertificate(
            {
                overwriteExistingKeyFile:false,
                certificateId: "johndoe",
                subject: "/DC=localhost/DC=clients/CN=johndoe/C=US/ST=MI/L=AnyTown/O=Any Company/OU=Any Department/emailAddress=johndoe@example.com",
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
                throw err;
            }
        );
        //Create a web Server Certificate
        openSSL.createCertificate(
            {
                overwriteExistingKeyFile:false,
                certificateId: "www",
                subject: "/CN=www.localhost",
                subjectAltName : "DNS:localhost,DNS:wwww.localhost,IP:127.0.0.1",
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
                throw err;
            }
        );


        
        //Create a web Server Certificate Request to send to the CA for Signing Use same library on Client
        // Create the Key and CSR on Client only send CSR to Server for it to sign and send back that way the Private Key never leaves the box

        openSSL.createCertificateSigningRequest(
            {
                overwriteExistingKeyFile:false,
                certificateId: "dev",
                subject: "/CN=dev.localhost",
                subjectAltName : "DNS:dev.localhost,DNS:www.dev.localhost,IP:127.0.0.1",
                x509Extensions : {
                    basicConstraints: "critical,CA:FALSE",
                    keyUsage : "digitalSignature, nonRepudiation, keyEncipherment",
                    subjectKeyIdentifier: "hash",
                    //authorityKeyIdentifier: "keyid",
                    extendedKeyUsage: "serverAuth"  
                }
            }
        ).then(
            function(result){
                console.log("Successfully Created Certificate Signing Request");
                //This typicaly would done on the server that is CA as if its on the same server no reason to make to calls

                //This is not working not sure why but kee[ getting a need a a -key error but the csr should not need a key
                openSSL.signCertificateSigningRequest({
                    certificateId: "dev"
                }).then(
                    function(result){
                        console.log("Successfully Created Certificate Using Certificate Signing Request");
                    },
                    function(err){
                        console.error(err);
                        throw err;
                    }
                )
                
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








