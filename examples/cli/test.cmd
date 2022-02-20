openssl genpkey -algorithm RSA -out ca.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
openssl req -verbose -x509 -subj "/CN=ca.localhost" -key ca.localhost.pem.key -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:ca.localhost" -out ca.localhost.pem.crt
openssl genpkey -algorithm RSA -out dev.localhost.pem.key -pkeyopt rsa_keygen_bits:4096
openssl req -verbose -new -subj "/CN=dev.localhost" -key dev.localhost.pem.key -addext "basicConstraints= critical,CA:FALSE" -addext "keyUsage= digitalSignature, nonRepudiation, keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost,DNS:www.dev.localhost,IP:127.0.0.1" -out dev.localhost.csr

rem I don't understand why this line doesn't work reading ManPages it should https://www.openssl.org/docs/man3.0/man1/openssl-req.html
openssl req -x509 -verbose -in dev.localhost.csr -days 999 -subj "/CN=dev.localhost" -CA ca.localhost.pem.crt -CAkey ca.localhost.pem.key -copy_extensions copy -addext "basicConstraints= critical,CA:TRUE,pathlen:1" -addext "keyUsage= critical,keyCertSign,cRLSign,digitalSignature,nonRepudiation,keyEncipherment" -addext "subjectKeyIdentifier= hash" -addext "authorityKeyIdentifier= keyid,issuer" -addext "extendedKeyUsage= serverAuth" -addext "subjectAltName= DNS:dev.localhost" -out dev.localhost.pem.crt

openssl x509 -req -in dev.localhost.csr -days 999 -CA ca.localhost.pem.crt -CAkey ca.localhost.pem.key -copy_extensions copy -set_serial 01 -dev.localhost.pem.crt
