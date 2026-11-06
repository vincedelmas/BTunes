import { readdir, stat, writeFile, mkdir } from 'node:fs/promises'
import { extname, join, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { parseFile } from 'music-metadata'
import { watch, type FSWatcher } from 'chokidar'
import { LibraryRepository } from '../repositories/library'
const extensions = new Set(['.mp3','.flac','.ogg','.opus','.m4a','.aac','.wav','.aiff'])
export class LibraryService {
 private watcher?: FSWatcher
 private jobs = new Map<string, Promise<void>>()
 constructor(readonly repo: LibraryRepository, readonly covers: string) {}
 async index(path: string) {
  if (!extensions.has(extname(path).toLowerCase())) return
  const previous = this.jobs.get(path) ?? Promise.resolve()
  const job = previous.catch(()=>{}).then(async () => {
   const metadata = await parseFile(path); const s = await stat(path); const c = metadata.common
   let cover: string | null = null
   if (c.picture?.[0]) {
    const pic=c.picture[0]; cover=createHash('sha256').update(pic.data).digest('hex')
    await mkdir(this.covers,{recursive:true}); await writeFile(join(this.covers,cover),pic.data)
   }
   this.repo.upsert({path,title:c.title || basename(path,extname(path)),artist:c.artist || 'Artiste inconnu',album:c.album || 'Sans album',genre:c.genre?.[0] || 'Non classé',year:c.year || 0,duration:metadata.format.duration || 0,cover,size:s.size})
  })
  this.jobs.set(path,job)
  try { await job } finally { if(this.jobs.get(path)===job) this.jobs.delete(path) }
 }
 async scan(folder: string) {
  const errors: string[]=[]; let imported=0
  const visit = async (dir: string) => {
   for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name)
    if(entry.isDirectory()) { try { await visit(path) } catch { errors.push(path) } }
    else if(entry.isFile() && extensions.has(extname(path).toLowerCase())) {
     try { await this.index(path); imported++ } catch { errors.push(path) }
    }
   }
  }
  await visit(folder)
  // Prune stale entries only after the directory was read successfully.
  for(const track of this.repo.snapshot().tracks) {
   if(track.path.startsWith(folder+'/')) {
    try { await stat(track.path) } catch (e) { if((e as NodeJS.ErrnoException).code==='ENOENT') this.repo.remove(track.path) }
   }
  }
  this.repo.folder(folder); await this.startWatching()
  return {imported,errors}
 }
 async startWatching() {
  await this.watcher?.close()
  this.watcher=watch(this.repo.snapshot().folders,{ignoreInitial:true,awaitWriteFinish:{stabilityThreshold:1500,pollInterval:200}})
  this.watcher.on('add',p=>{void this.index(p).catch(console.error)}).on('change',p=>{void this.index(p).catch(console.error)}).on('unlink',p=>this.repo.remove(p)).on('error',console.error)
 }
 async close() { await this.watcher?.close(); await Promise.allSettled(this.jobs.values()); this.repo.db.close() }
}
