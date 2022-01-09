# Food loveers Database (FLDB)

## About

TODO

## Project Setup

### Set environment variables

Create a `.env` file at the root of the project folder and populate appropriate values for below keys

```
REACT_APP_FLDB_API_BASE_URL=<YOUR FLDB_API_BASE_URL>
```

### Install project dependencies

From the root of the project folder, execute below commands

```
yarn add
```

### Use Netlify to host and auto deploy (optional)

This project is auto deployed using netlify. Create a project at [netlify](https://www.netlify.com/) and [link your repo](https://docs.netlify.com/configure-builds/repo-permissions-linking/) if you wish to do the same

```
npm install netlify-cli -g
netlify login
netlify init
```

### Deploy

```
git add .
git commit -m "<commit-message>"
git push origin <branch-name>
```
