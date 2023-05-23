# Blog

My Blog Static Site

## Local Development

Local development is best done using VS Code and [Dev Containers](https://code.visualstudio.com/docs/remote/containers).
This will ensure that you have the correct version of Node, NPM, Hugo, and development extensions installed.

After the Dev Container has started, you can start the development server by running the following command:

```bash
npm run start
```

## Deployment

Deployment is done via GitHub Actions to Azure Static Web Apps.
This allows the runtime to use seamless API integration, user authentication & authorization, routing, custom domains, and more.
