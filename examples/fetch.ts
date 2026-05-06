import { retry } from "../dist/index.js";

// Basic
const data = await retry(() =>
  fetch("https://jsonplaceholder.typicode.com/todos/1").then((r) => r.json()),
);

console.log(data);
