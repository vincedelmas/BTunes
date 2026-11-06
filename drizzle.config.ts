import {defineConfig} from "drizzle-kit";


export default defineConfig({
    out: "./drizzle",
    dialect: "sqlite",
    schema: "./src/main/database/schema.ts",
});
