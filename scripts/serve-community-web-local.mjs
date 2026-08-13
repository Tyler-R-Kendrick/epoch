#!/usr/bin/env node
import { serveCommunityWebApp } from "../packages/Epoch.Community.Web/scripts/serve.mjs";

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "127.0.0.1";
const app = await serveCommunityWebApp({ host, port });

console.log(`Epoch Community → ${app.url}`);
console.log(`Board → ${app.url}board.html`);
console.log(`Healthz → ${app.url}healthz`);
