@echo off
set openSSLPath=..\..\openssl\
set outFolder=%cd%\certs\

if not exist %outFolder% mkdir %outFolder%

@echo Creating CA Private Key
rem %openSSLPath%openssl genpkey -quiet -algorithm RSA -out %outFolder%ca.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
@echo Creating CA Public Cert
rem %openSSLPath%openssl req -verbose -x509 -subj "/CN=ca.localhost" -key %outFolder%ca.localhost.pem.key -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:ca.localhost" -out %outFolder%ca.localhost.pem.crt

@echo Creating Certificate Signing Request Private Key
rem %openSSLPath%openssl genpkey -quiet -algorithm RSA -out %outFolder%dev.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
@echo Creating Certificate Signing Request
rem %openSSLPath%openssl req -verbose -new -subj "/CN=dev.localhost" -key %outFolder%dev.localhost.pem.key -addext "basicConstraints= critical,CA:FALSE" -addext "keyUsage= digitalSignature, nonRepudiation, keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost,DNS:www.dev.localhost,IP:127.0.0.1" -out %outFolder%dev.localhost.csr

rem I don't understand why this line doesn't work reading ManPages it should https://www.openssl.org/docs/man3.0/man1/openssl-req.html
@Echo Signing Certificate Request - This Fails 
%openSSLPath%openssl req -x509 -in %outFolder%dev.localhost.csr -days 999 -subj "/CN=dev.localhost" -CA %outFolder%ca.localhost.pem.crt -CAkey %outFolder%ca.localhost.pem.key -copy_extensions copy -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost" -out %outFolder%dev.localhost.pem.crt
@Echo Signing Certificate Request - This Works but I can't control Extentions
rem %openSSLPath%openssl x509 -req -in %outFolder%dev.localhost.csr -days 999 -CA %outFolder%ca.localhost.pem.crt -CAkey %outFolder%ca.localhost.pem.key -copy_extensions copy -set_serial 01 -out %outFolder%dev.localhost.pem.crt
