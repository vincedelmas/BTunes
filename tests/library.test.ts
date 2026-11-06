import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LibraryRepository } from '../src/main/repositories/library.ts'
const track={path:'/music/a.flac',title:'Voyage',artist:'Test',album:'Album',genre:'Ambient',year:2024,duration:120,cover:null,size:100}
test('indexing preserves favorites and play history on rescan',()=>{
 const repo=new LibraryRepository(':memory:')
 try {
  repo.upsert(track);const id=repo.snapshot().tracks[0].id
  repo.favorite(id);repo.played(id);repo.upsert({...track,title:'New title'})
  const rows=repo.snapshot().tracks
  assert.equal(rows.length,1);assert.equal(rows[0].title,'New title');assert.equal(rows[0].favorite,1);assert.equal(rows[0].plays,1)
 } finally { repo.db.close() }
})
test('classic and automatic playlists, parameterized input, deletion cleanup',()=>{
 const repo=new LibraryRepository(':memory:')
 try {
  repo.upsert(track);repo.upsert({...track,path:'/music/b.mp3',genre:'Rock'})
  const [a,b]=repo.snapshot().tracks
  const classic=repo.create("L'été'); DROP TABLE tracks;--")
  repo.add(classic,b.id);repo.add(classic,b.id)
  assert.deepEqual(repo.playlist(classic),[b.id])
  const smart=repo.create('Calme','ambient')
  assert.deepEqual(repo.playlist(smart),[a.id])
  repo.remove(b.path);assert.deepEqual(repo.playlist(classic),[])
  assert.equal(repo.snapshot().tracks.length,1)
  assert.throws(()=>repo.playlist(999))
 } finally {repo.db.close()}
})
