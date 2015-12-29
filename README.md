# JSPM & Angular2 & SystemJS & Typescript Playground 
This repository was initially for me to play with the latest technos I heard about.

Maybe someday it helps someone to start with angular2 !

## 1. Initialize application

Install jspm globally
```
npm install -g jspm
```

```bash
# Locally install latest packages
npm install && jspm install

# Validate project configuration file
jspm init

# Launch app in browser
live-server
``` 

## 2. Play around with jspm bundling

```bash
jspm bundle src build/build.js --minify
```

Go to http://127.0.0.1:8080/index-build.html
```bash
jspm bundle-sfx src build/build-sfx --minify
```

Go to http://127.0.0.1:8080/index-sfx.html
