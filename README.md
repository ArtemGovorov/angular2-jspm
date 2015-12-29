# Angular2 JSPM

## 1. Initialize application

Install jspm globally
```
npm install -g jspm
```

```bash
# Validate project configuration file
jspm init

# Locally install latest packages
npm install && jspm install

# Launch app in browser
npm start
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
