const {mkdirSync, copyFileSync, writeFileSync} = require("node:fs");
const {join, resolve} = require("node:path");
const {homedir} = require("node:os");
const {execFileSync} = require("node:child_process");

const project = resolve(__dirname, "..");
const data = process.env.XDG_DATA_HOME || join(homedir(), ".local/share");
const applications = join(data, "applications");
const icons = join(data, "icons/hicolor/512x512/apps");
const bun = execFileSync("which", ["bun"], {encoding: "utf8"}).trim();
const quotedBun = '"' + bun.replace(/[\\"`$]/g, "\\$&") + '"';

mkdirSync(applications, {recursive: true});
mkdirSync(icons, {recursive: true});
copyFileSync(join(project, "resources/icon.png"), join(icons, "btunes.png"));
writeFileSync(join(applications, "btunes.desktop"), [
    "[Desktop Entry]",
    "Type=Application",
    "Name=BTunes",
    "Comment=Your local music library",
    "Exec=" + quotedBun + " run dev",
    "Path=" + project,
    "Icon=btunes",
    "Terminal=false",
    "Categories=AudioVideo;Audio;Player;",
    "StartupWMClass=btunes",
    "StartupNotify=true",
    "",
].join("\n"));
console.log("Installed BTunes development launcher and taskbar icon.");
