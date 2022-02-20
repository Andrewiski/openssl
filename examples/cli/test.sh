#!/bin/sh

outFolder=$PWD/certs/

mkdir -p $outFolder

echo Creating CA Private Key
openssl genpkey -quiet -algorithm RSA -out $outFolderca.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
echo Creating CA Public Cert
openssl req -verbose -x509 -subj "/CN=ca.localhost" -key $outFolderca.localhost.pem.key -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:ca.localhost" -out $outFolderca.localhost.pem.crt

echo Creating Certificate Signing Request Private Key
openssl genpkey -quiet -algorithm RSA -out $outFolderdev.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
echo Creating Certificate Signing Request
openssl req -verbose -new -subj "/CN=dev.localhost" -key $outFolderdev.localhost.pem.key -addext "basicConstraints= critical,CA:FALSE" -addext "keyUsage= digitalSignature, nonRepudiation, keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost,DNS:www.dev.localhost,IP:127.0.0.1" -out $outFolderdev.localhost.csr

# I don't understand why this line doesn't work reading ManPages it should https://www.openssl.org/docs/man3.0/man1/openssl-req.html
echo "Signing Certificate Request - This Fails"
openssl req -x509 -in $outFolderdev.localhost.csr -days 999 -subj "/CN=dev.localhost" -CA $outFolderca.localhost.pem.crt -CAkey $outFolderca.localhost.pem.key -copy_extensions copy -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost" -out $outFolderdev.localhost.pem.crt
echo "Signing Certificate Request - This Works but I can't control Extentions"
openssl x509 -req -in $outFolderdev.localhost.csr -days 999 -CA $outFolderca.localhost.pem.crt -CAkey $outFolderca.localhost.pem.key -copy_extensions copy -set_serial 01 -out $outFolderdev.localhost.pem.crt
