const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), "node_modules", "@swc", "helpers", "esm", "index.js");
const needle = 'export { _ as applyDecoratedDescriptor } from "./_apply_decorated_descriptor.js";';
const anchor = 'export { _ as _apply_decorated_descriptor } from "./_apply_decorated_descriptor.js";';

try {
    const content = fs.readFileSync(target, "utf8");
    if (content.includes(needle)) {
        process.exit(0);
    }
    if (!content.includes(anchor)) {
        console.error("SWC helpers file does not contain expected anchor export; skipping alias injection.");
        process.exit(0);
    }
    const updated = content.replace(anchor, `${anchor}\n${needle}`);
    fs.writeFileSync(target, updated);
    console.log("Injected applyDecoratedDescriptor alias into @swc/helpers/esm/index.js");
} catch (error) {
    console.error("Failed to patch @swc/helpers alias:", error?.message || error);
    process.exit(0);
}
