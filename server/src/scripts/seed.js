import { store } from "../repositories/store.js";

await store.seed();
console.log(JSON.stringify(await store.adminStats(), null, 2));
