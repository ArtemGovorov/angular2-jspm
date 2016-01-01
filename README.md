# Angular2 JSPM

## 1. Initialize application

Install jspm globally
```bash
npm install -g jspm
```

Locally install latest packages
```bash
npm install
```

Launch app in browser
```bash
npm start
``` 

## 2. jspm bundling
Go to http://127.0.0.1:8080/index-build.html
```bash
jspm bundle app build/build.js --minify
```

Go to http://127.0.0.1:8080/index-sfx.html
```bash
jspm bundle-sfx app build/build-sfx.js --minify
```

## 3. Show module relationships
Execute in browser dev tools console
```bash
showModuleRelationships()
```
