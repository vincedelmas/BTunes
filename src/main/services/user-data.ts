import {join} from "node:path";
import {backup, DatabaseSync} from "node:sqlite";
import {cp, lstat, mkdir, mkdtemp, rename, rm} from "node:fs/promises";


const exists = async (path: string) => {
    try {
        await lstat(path);
        return true;
    }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return false;
        }

        throw error;
    }
};


export async function migrateLegacyUserData(legacyDirectory: string, targetDirectory: string) {
    const sourceDatabase = join(legacyDirectory, "library.sqlite");
    const targetDatabase = join(targetDirectory, "library.sqlite");

    if (await exists(targetDatabase) || !await exists(sourceDatabase)) {
        return false;
    }

    await mkdir(targetDirectory, { recursive: true });

    const copiedDirectories: string[] = [];
    const staging = await mkdtemp(join(targetDirectory, ".library-migration-"));

    try {
        // SQLite backup includes committed WAL data, unlike plain db file copy
        const source = new DatabaseSync(sourceDatabase, { readOnly: true });

        try {
            await backup(source, join(staging, "library.sqlite"));
        }
        finally {
            source.close();
        }

        for (const name of ["covers", "tag-backups"]) {
            const sourcePath = join(legacyDirectory, name);
            const targetPath = join(targetDirectory, name);

            if (!await exists(sourcePath)) {
                continue;
            }

            if (await exists(targetPath)) {
                throw new Error("Cannot migrate the library: " + targetPath + " already exists.");
            }

            await cp(sourcePath, join(staging, name), { recursive: true });
            await rename(join(staging, name), targetPath);
            copiedDirectories.push(targetPath);
        }

        // Publish database last so failed copy can be retried on next launch
        await rename(join(staging, "library.sqlite"), targetDatabase);
        
        return true;
    }
    catch (error) {
        await Promise.all(copiedDirectories.map((path) => rm(path, { recursive: true, force: true })));
        throw error;
    }
    finally {
        await rm(staging, { recursive: true, force: true });
    }
}
