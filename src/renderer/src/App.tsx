import { useEffect, useMemo, useRef, useState } from 'react'
import { Disc3, Library, Heart, History, Smartphone, FolderPlus, Play, Pause, Square, SkipBack, SkipForward, Shuffle, Repeat, Volume2, ListMusic, Plus, ArrowDownUp, Music2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Snapshot, Track } from '../../shared/contracts'
import { cn } from '@/lib/utils'
const rpc = window.sillage.rpc
const clock=(s:number)=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')
function Cover({track,large=false}:{track?:Track;large?:boolean}) {
 return <div className={cn('cover',large && 'cover-large')}>{track?.cover ? <img src={'sillage://cover/'+track.cover} alt="Pochette"/> : <Disc3/>}</div>
}
export function App() {
 const [data,setData]=useState<Snapshot>({tracks:[],playlists:[],folders:[]})
 const [view,setView]=useState('albums'),[search,setSearch]=useState(''),[genre,setGenre]=useState(''),[artist,setArtist]=useState(''),[sort,setSort]=useState('artist')
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const [current,setCurrent]=useState<Track>(),[queue,setQueue]=useState<Track[]>([]),[playing,setPlaying]=useState(false)
 const [shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false),[position,setPosition]=useState(0),[volume,setVolume]=useState(.7)
 const [playlistIds,setPlaylistIds]=useState<number[]>([]),[playlistName,setPlaylistName]=useState(''),[rule,setRule]=useState(''),[creating,setCreating]=useState(false)
 const [showQueue,setShowQueue]=useState(false)
 const audio=useRef<HTMLAudioElement>(null),counted=useRef(false)
 const refresh=()=>rpc('library.get',undefined).then(setData).catch(e=>setError(String(e)))
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer)},[])
 useEffect(()=>{if(view.startsWith('playlist:')) void rpc('playlist.tracks',{id:Number(view.split(':')[1])}).then(setPlaylistIds).catch(e=>setError(String(e)))},[view,data])
 useEffect(()=>{if(audio.current) audio.current.volume=volume},[volume])
 const genres=[...new Set(data.tracks.map(t=>t.genre))].sort()
 const artists=[...new Set(data.tracks.map(t=>t.artist))].sort()
 const tracks=useMemo(()=>{
  const duplicateKeys=new Map<string,number>()
  data.tracks.forEach(t=>{const key=(t.title+'|'+t.artist+'|'+Math.round(t.duration)).toLowerCase();duplicateKeys.set(key,(duplicateKeys.get(key)||0)+1)})
  return data.tracks.filter(t=>
   (!search || (t.title+' '+t.artist+' '+t.album).toLocaleLowerCase().includes(search.toLocaleLowerCase())) &&
   (!genre || t.genre===genre) && (!artist || t.artist===artist) &&
   (view!=='favorites' || !!t.favorite) && (view!=='history' || t.lastPlayed>0) &&
   (!view.startsWith('playlist:') || playlistIds.includes(t.id)) &&
   (view!=='duplicates' || (duplicateKeys.get((t.title+'|'+t.artist+'|'+Math.round(t.duration)).toLowerCase())||0)>1)
  ).sort((a,b)=>view==='history'?b.lastPlayed-a.lastPlayed:sort==='year'?b.year-a.year:sort==='plays'?b.plays-a.plays:String(a[sort as 'artist'|'album'|'title']).localeCompare(String(b[sort as 'artist'|'album'|'title'])))
 },[data,search,genre,artist,view,playlistIds,sort])
 const albums=useMemo(()=>Object.values(tracks.reduce<Record<string,Track[]>>((a,t)=>{const key=t.artist+'\0'+t.album;(a[key]??=[]).push(t);return a},{})),[tracks])
 const start=(track:Track,list:Track[]=tracks)=>{setQueue(list);setCurrent(track);setPosition(0);counted.current=false}
 useEffect(()=>{if(current && audio.current) void audio.current.play().catch(e=>{setPlaying(false);setError('Lecture impossible : '+e.message)})},[current])
 const next=(direction=1)=>{
  if(!current || !queue.length) return
  const i=queue.findIndex(t=>t.id===current.id)
  let index=shuffle?Math.floor(Math.random()*queue.length):i+direction
  if(index>=queue.length || index<0) {if(!repeat){setPlaying(false);return} index=(index+queue.length)%queue.length}
  if(queue[index].id===current.id && audio.current){audio.current.currentTime=0;counted.current=false;void audio.current.play().catch(e=>setError(String(e)))}
  else start(queue[index],queue)
 }
 const importFolder=async()=>{setBusy(true);setError('');try{const result=await rpc('library.import',undefined);if(result){setNotice(result.imported+' morceaux indexés'+(result.errors.length?' · '+result.errors.length+' fichiers ignorés':''));await refresh()}}catch(e){setError(String(e))}finally{setBusy(false)}}
 const favorite=async(t:Track)=>{try{await rpc('track.favorite',{id:t.id});await refresh()}catch(e){setError(String(e))}}
 const createPlaylist=async()=>{try{const id=await rpc('playlist.create',{name:playlistName,rule:rule||undefined});setCreating(false);setPlaylistName('');setRule('');await refresh();setView('playlist:'+id)}catch(e){setError(String(e))}}
 const titles:Record<string,string>={albums:'Vos albums',tracks:'Tous les morceaux',artists:'Les artistes',favorites:'Les favoris',history:'Dernières écoutes',duplicates:'Doublons possibles',android:'Votre musique, en voyage'}
 const title=titles[view]||data.playlists.find(p=>'playlist:'+p.id===view)?.name||'Playlist'
 const nav=[{id:'albums',label:'Albums',icon:Disc3},{id:'tracks',label:'Morceaux',icon:Music2},{id:'artists',label:'Artistes',icon:Library},{id:'favorites',label:'Favoris',icon:Heart},{id:'history',label:'Historique',icon:History},{id:'duplicates',label:'Doublons possibles',icon:ListMusic},{id:'android',label:'Android',icon:Smartphone}]
 return <div className="app-shell">
  <aside className="sidebar"><div className="brand"><Disc3/><span>sillage<span className="brand-dot">.</span></span></div><p className="eyebrow">VOTRE COLLECTION</p>
  <nav>{nav.map(n=><Button key={n.id} variant={view===n.id?'secondary':'ghost'} className="nav-item" onClick={()=>setView(n.id)}><n.icon data-icon="inline-start"/>{n.label}{n.id==='favorites' && <span className="nav-count">{data.tracks.filter(t=>t.favorite).length}</span>}</Button>)}</nav>
  <div className="playlist-heading"><p className="eyebrow">PLAYLISTS</p><Button variant="ghost" size="icon" aria-label="Créer une playlist" onClick={()=>setCreating(!creating)}><Plus/></Button></div>
  {creating && <div className="playlist-form"><Input aria-label="Nom de la playlist" placeholder="Nom de la playlist" value={playlistName} onChange={e=>setPlaylistName(e.target.value)}/><select aria-label="Règle automatique par genre" value={rule} onChange={e=>setRule(e.target.value)}><option value="">Playlist classique</option>{genres.map(g=><option key={g}>{g}</option>)}</select><Button size="sm" disabled={!playlistName.trim()} onClick={()=>void createPlaylist()}>Créer</Button></div>}
  <div className="playlists">{data.playlists.map(p=><Button key={p.id} variant={view==='playlist:'+p.id?'secondary':'ghost'} className="nav-item" onClick={()=>setView('playlist:'+p.id)}><ListMusic/>{p.name}{p.rule && <span title="Automatique">✦</span>}</Button>)}</div>
  <div className="sidebar-bottom"><div className="local-status"><span/> Bibliothèque locale</div><small>{data.folders.length} dossier(s) surveillé(s)</small><Button variant="outline" disabled={busy} onClick={()=>void importFolder()}><FolderPlus/>{busy?'Indexation…':'Ajouter un dossier'}</Button></div></aside>
  <main><header><span className="breadcrumb">Ma musique <span>/ {title}</span></span><div className="search"><Input aria-label="Rechercher dans la bibliothèque" placeholder="Rechercher un titre, un artiste, un album…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button variant="ghost" size="icon" aria-label="Actualiser" onClick={()=>void refresh()}><RefreshCw/></Button></header>
  <div className="content"><section className="intro"><div><p className="eyebrow">CHEZ VOUS. À VOUS.</p><h1>{title}<span className="brand-dot">.</span></h1><p className="muted">{tracks.length} morceaux · {albums.length} albums · {clock(tracks.reduce((a,t)=>a+t.duration,0))} de musique</p></div><Badge variant="outline">LOCAL & INDÉPENDANT</Badge></section>
  {error && <div role="alert" className="error">{error}<Button variant="ghost" size="sm" onClick={()=>setError('')}>Fermer</Button></div>}
  {notice && <p role="status" className="notice">{notice}</p>}
  {view==='android'?<section className="empty"><Smartphone/><h2>Emportez votre collection.</h2><p>La synchronisation Android arrive dans la prochaine étape.</p><p className="muted">Comparaison PC / téléphone, aperçu des fichiers manquants,<br/>puis transfert USB et KDE Connect.</p><Badge variant="secondary">Module à développer</Badge></section>:<>
  <div className="filters"><div className="flex gap-3"><select aria-label="Filtrer par genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">Tous les genres</option>{genres.map(g=><option key={g}>{g}</option>)}</select><select aria-label="Filtrer par artiste" value={artist} onChange={e=>setArtist(e.target.value)}><option value="">Tous les artistes</option>{artists.map(a=><option key={a}>{a}</option>)}</select></div><div className="flex items-center gap-2"><ArrowDownUp size={14}/><select aria-label="Trier les morceaux" value={sort} onChange={e=>setSort(e.target.value)}><option value="artist">Artiste</option><option value="album">Album</option><option value="title">Titre</option><option value="year">Année</option><option value="plays">Écoutes</option></select></div></div>
  {!tracks.length?<section className="empty"><Disc3/><h2>{data.tracks.length?'Aucun morceau ici.':'Une place pour toute votre musique.'}</h2><p>{data.tracks.length?'Ajustez vos filtres ou ajoutez des morceaux à cette playlist.':'Ajoutez votre dossier de musique. Vos albums, vos pochettes et vos tags trouveront leur place ici.'}</p><Button disabled={busy} onClick={()=>void importFolder()}><FolderPlus/>Ajouter un dossier</Button></section>:view==='albums'?<div className="album-grid">{albums.map(list=><button className="album" key={list[0].artist+'|'+list[0].album} onClick={()=>start(list[0],list)}><div className="artwork"><Cover track={list[0]} large/><span className="album-play"><Play size={20} fill="currentColor"/></span></div><strong>{list[0].album}</strong><span>{list[0].artist}</span><small>{list[0].year||'Année inconnue'} · {list.length} titres</small></button>)}</div>:view==='artists'?<div className="artist-grid">{artists.filter(a=>tracks.some(t=>t.artist===a)).map(a=><button key={a} className="artist" onClick={()=>{setArtist(a);setView('tracks')}}><Cover track={tracks.find(t=>t.artist===a)} large/><h2>{a}</h2><p>{tracks.filter(t=>t.artist===a).length} morceaux</p></button>)}</div>:<table><thead><tr><th>#</th><th>Titre</th><th>Album</th><th>Genre</th><th>Durée</th><th>Actions</th></tr></thead><tbody>{tracks.map((t,i)=><tr key={t.id} className={cn(current?.id===t.id && 'is-current')} onDoubleClick={()=>start(t)}><td><Button variant="ghost" size="icon" aria-label={'Lire '+t.title} onClick={()=>start(t)}>{current?.id===t.id && playing?<Volume2/>:<Play/>}</Button></td><td><div className="track-cell"><Cover track={t}/><div><strong>{t.title}</strong><small>{t.artist}</small></div></div></td><td>{t.album}</td><td>{t.genre}</td><td>{clock(t.duration)}</td><td><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label={t.favorite?'Retirer des favoris':'Ajouter aux favoris'} onClick={()=>void favorite(t)}><Heart fill={t.favorite?'currentColor':'none'}/></Button><select aria-label={'Ajouter '+t.title+' à une playlist'} value="" onChange={e=>{void rpc('playlist.add',{playlistId:Number(e.target.value),trackId:t.id}).then(()=>setNotice('Morceau ajouté à la playlist')).then(refresh).catch(e=>setError(String(e)))}}><option value="">＋ Playlist</option>{data.playlists.filter(p=>!p.rule).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div></td></tr>)}</tbody></table>}
  {view==='duplicates' && <p className="muted">Comparaison indicative par titre, artiste et durée arrondie. Aucun fichier supprimé.</p>}
  </>}</div></main>
  {showQueue && <aside className="queue"><div className="flex items-center justify-between"><h2>File d’attente</h2><Button variant="ghost" size="sm" onClick={()=>setShowQueue(false)}>Fermer</Button></div>{queue.length?queue.map((t,i)=><button key={t.id+':'+i} className={cn('queue-track',current?.id===t.id && 'is-current')} onClick={()=>start(t,queue)}><Cover track={t}/><span>{t.title}<small>{t.artist}</small></span></button>):<p className="muted">Lancez un album ou un morceau.</p>}</aside>}
  <footer><div className="now-playing"><Cover track={current}/><div><strong>{current?.title||'Le prochain coup de cœur'}</strong><small>{current?.artist||'Votre collection vous attend'}</small></div>{current && <Button variant="ghost" size="icon" aria-label="Favori" onClick={()=>void favorite(current)}><Heart fill={data.tracks.find(t=>t.id===current.id)?.favorite?'currentColor':'none'}/></Button>}</div>
  <div className="transport"><div className="transport-buttons"><Button variant="ghost" size="icon" aria-label="Aléatoire" aria-pressed={shuffle} onClick={()=>setShuffle(!shuffle)} className={cn(shuffle && 'enabled')}><Shuffle/></Button><Button variant="ghost" size="icon" aria-label="Précédent" disabled={!current} onClick={()=>next(-1)}><SkipBack/></Button><Button size="icon" aria-label={playing?'Pause':'Lecture'} disabled={!current} onClick={()=>{if(playing) audio.current?.pause();else void audio.current?.play().catch(e=>setError(String(e)))}}>{playing?<Pause/>:<Play/>}</Button><Button variant="ghost" size="icon" aria-label="Suivant" disabled={!current} onClick={()=>next()}><SkipForward/></Button><Button variant="ghost" size="icon" aria-label="Répéter la file" aria-pressed={repeat} onClick={()=>setRepeat(!repeat)} className={cn(repeat && 'enabled')}><Repeat/></Button><Button variant="ghost" size="icon" aria-label="Arrêter" disabled={!current} onClick={()=>{audio.current?.pause();if(audio.current) audio.current.currentTime=0;setPosition(0)}}><Square/></Button></div><div className="timeline"><span>{clock(position)}</span><input aria-label="Position de lecture" type="range" min="0" max={current?.duration||1} step=".1" value={position} onChange={e=>{if(audio.current) audio.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value))}}/><span>{clock(current?.duration||0)}</span></div></div>
  <div className="volume"><Button variant="ghost" size="icon" aria-label="File d’attente" onClick={()=>setShowQueue(!showQueue)}><ListMusic/></Button><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></footer>
  <audio ref={audio} src={current?'sillage://audio/'+current.id:undefined} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={()=>{const time=audio.current?.currentTime||0;setPosition(time);if(current&&!counted.current&&time>=Math.min(30,current.duration*.5)){counted.current=true;void rpc('track.played',{id:current.id}).catch(e=>setError(String(e)))}}} onEnded={()=>next()} onError={()=>{if(current)setError('Ce fichier ne peut pas être lu. Il est peut-être absent ou son codec n’est pas pris en charge.')}}/>
 </div>
}
