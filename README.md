# Food loveers Database (FLDB)

## About

TODO

## Project Setup

### Set environment variables

Create a `.env` file at the root of the project folder and populate appropriate values for below keys.
REACT_APP_FLDB_API_BASE_URL is the URL of [backend API server](https://github.com/Mr-SKR/fldb-apis)

```
REACT_APP_FLDB_API_BASE_URL=<YOUR FLDB_API_BASE_URL>
```

### Install project dependencies

Install [Node.js](https://nodejs.org/en/) if you haven't already.
From the root of the project folder, execute below command(s)

```
npm install -g yarn
yarn
```

### Run locally

From the root of the project folder, execute below command(s)

```
yarn start
```

### Use Netlify to host and auto deploy (optional)

This project is auto deployed using netlify. Create a project at [netlify](https://www.netlify.com/) and [link your repo](https://docs.netlify.com/configure-builds/repo-permissions-linking/) if you wish to do the same. Or you can choose any other CI/CD method to build and deploy application

```
npm install netlify-cli -g
netlify login
netlify init
```

### Deploy (optional)

From the root of the project folder, execute below command(s)

```
git add .
git commit -m "<commit-message>"
git push origin <branch-name>
```
