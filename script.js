// ==========================================================================
// 1. FIREBASE CONFIGURATION
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTtg2eOY0O0c6gPazy8QJ89gjTB94utd4",
    authDomain: "mantra-music-6356c.firebaseapp.com",
    projectId: "mantra-music-6356c",
    storageBucket: "mantra-music-6356c.firebasestorage.app",
    messagingSenderId: "59461041168",
    appId: "1:59461041168:web:f0bc7c332ba878257bde95",
    measurementId: "G-FB1MH8FXTH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================================================
// 2. APP GLOBALS & CONFIGURATION
// ==========================================================================
const DEBUG = true;
function debugLog(...args) { if (DEBUG) console.debug(...args); }

// 🟢 API KEYS
const DRIVE_API_KEY = "AIzaSyDTtg2eOY0O0c6gPazy8QJ89gjTB94utd4";
const SONGS_FOLDER_ID = "1NYVDBsZCi6izGRIyhlr_4M7CBFKsS8t1";
const ARTIST_FOLDER_ID = "1sk-CVu_0D9fWpkZZ-5BmMQXpwPwjDxJk";

// Default assets
const DEFAULT_COVER = 'https://placehold.co/400x400/222/fff?text=Music';
const DEFAULT_ARTIST = 'https://placehold.co/400x400/222/fff?text=Artist';

// Global state
const myMusic = new Audio(); 
myMusic.preload = 'metadata';

let ALL_SONGS = [];
let setMusicIndex = 0;
let isShuffleMode = false;
let shuffledQueue = [];
let shuffleIndex = 0;

// Variables for Debouncing
let playTimeout = null;

// ==========================================================================
// 3. UI SETUP
// ==========================================================================
function setupUI() {
    const viewIDs = ['#playlist-view', '#search-view', '#library-view', '.mainArtistpg'];

    const hideAllViews = () => {
        viewIDs.forEach(s => { const el = document.querySelector(s); if (el) el.style.display = 'none'; });
        document.querySelector('.viewport').style.display = 'none';
    };

    document.getElementById('Home-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllViews();
        document.querySelector('.viewport').style.display = 'block';
    });

    document.getElementById('search-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllViews();
        document.getElementById('search-view').style.display = 'flex';
        const input = document.getElementById('search-input');
        if (input) input.focus();
    });

    document.getElementById('library-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadLibrary(); });
    document.getElementById('liked-songs-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadLikedSongs(); });
    document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById('Home-btn').click()));

    // Authentication Modals
    const closeAuthModal = document.getElementById('close-auth-modal');
    if (closeAuthModal) closeAuthModal.onclick = () => document.getElementById('login-popup').style.display = 'none';

    document.getElementById('google-login-btn').onclick = async () => {
        try { await signInWithPopup(auth, googleProvider); document.getElementById('login-popup').style.display = 'none'; }
        catch (e) { console.error(e); }
    };

    document.getElementById('perform-login-btn').onclick = async () => {
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
            document.getElementById('login-popup').style.display = 'none';
        } catch (e) { alert(e.message); }
    };

    document.getElementById('perform-signup-btn').onclick = async () => {
        try {
            await createUserWithEmailAndPassword(auth, document.getElementById('signup-email').value, document.getElementById('signup-password').value);
            document.getElementById('login-popup').style.display = 'none';
        } catch (e) { alert(e.message); }
    };

    // Playlist Creation
    document.getElementById('create-playlist-btn')?.addEventListener('click', (e) => { e.preventDefault(); if (checkAuth()) document.getElementById('create-playlist-modal').style.display = 'flex'; });
    document.getElementById('close-cp-modal')?.addEventListener('click', () => document.getElementById('create-playlist-modal').style.display = 'none');
    document.getElementById('confirm-create-playlist')?.addEventListener('click', () => window.createPlaylist());

    // Volume
    const volSeek = document.getElementById('vol-seek');
    if (volSeek) {
        // 1. Initialize the color immediately on load
        updateRangeBackground(volSeek, volSeek.value, 100);

        // 2. Add the listener for when it changes
        volSeek.oninput = () => {
            myMusic.volume = volSeek.value / 100;
            updateRangeBackground(volSeek, volSeek.value, 100);
        };
    }

    // Search Logic
    let searchTimeout;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.toLowerCase().trim();
                const results = document.getElementById('search-results-songs');
                if (query.length < 2) { results.innerHTML = '<p class="initial-message">Type to search...</p>'; return; }
                const filtered = ALL_SONGS.filter(s => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
                displaySongs(filtered, results);
            }, 300);
        });
    }

    // Mobile Menu
    const hamburgerBtn = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.section1');
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) sidebar.classList.remove('active'); });
    }
}

// ==========================================================================
// 4. DATA FETCHING (Google Drive)
// ==========================================================================
async function fetchFolderFiles(folderID) {
    const query = `'${folderID}' in parents and (mimeType contains 'audio/' or mimeType contains 'image/') and trashed = false`;
    const fields = "files(id, name, mimeType, thumbnailLink)";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000&key=${DRIVE_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) { console.error("Drive API Error:", data.error); return []; }
        return data.files || [];
    } catch (e) { console.error("Fetch Error:", e); return []; }
}

async function getSongsAndArtists() {
    try {
        debugLog("Fetching data from Drive...");
        const [songFiles, artistProfileFiles] = await Promise.all([
            fetchFolderFiles(SONGS_FOLDER_ID),
            fetchFolderFiles(ARTIST_FOLDER_ID)
        ]);

        const artistList = [];
        const artistImgMap = {};
        artistProfileFiles.forEach(img => {
            if (img.mimeType && img.mimeType.startsWith('image/')) {
                const name = img.name.substring(0, img.name.lastIndexOf('.')).trim();
                const link = img.thumbnailLink ? img.thumbnailLink.replace('=s220', '=s1000') : DEFAULT_ARTIST;
                artistList.push({ name: name, image: link });
                artistImgMap[name.toLowerCase()] = link;
            }
        });

        const audioFiles = (songFiles || []).filter(f => f.mimeType && f.mimeType.startsWith('audio/'));
        const coverFiles = (songFiles || []).filter(f => f.mimeType && f.mimeType.startsWith('image/'));
        const albumArtMap = {};
        coverFiles.forEach(img => {
            const name = img.name.substring(0, img.name.lastIndexOf('.')).toLowerCase().trim();
            albumArtMap[name] = img.thumbnailLink ? img.thumbnailLink.replace('=s220', '=s1000') : DEFAULT_COVER;
        });

        const driveSongs = audioFiles.map(file => {
            const fileNameNoExt = file.name.substring(0, file.name.lastIndexOf('.'));
            let genre = "Pop", artist = "Unknown", title = fileNameNoExt;
            const parts = fileNameNoExt.split("-");
            if (parts.length >= 3) { genre = parts[0].trim(); artist = parts[1].trim(); title = parts.slice(2).join("-").trim(); }
            else if (parts.length === 2) { artist = parts[0].trim(); title = parts[1].trim(); }

            const matchedImage = albumArtMap[fileNameNoExt.toLowerCase().trim()];
            return {
                id: file.id,
                title: title,
                artist: artist,
                genre: genre,
                // We will construct the link dynamically in the player
                file: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${DRIVE_API_KEY}`,

                image: matchedImage || DEFAULT_COVER
            };
        });
        ALL_SONGS = driveSongs;
        return { songs: driveSongs, artists: artistList };
    } catch (e) { console.error(e); return { songs: [], artists: [] }; }
}

// ==========================================================================
// 5. AUDIO LOADING LOGIC (SIMPLE FIX)
// ==========================================================================

// 🟢 FIX: No complex fetching. Just set the Source.
// This avoids the 403 Forbidden and ORB errors completely.
function setAudioSourceSimple(url) {
    try {
        myMusic.pause();
        myMusic.src = url;
        myMusic.load(); // Explicitly tell browser to load the new source
    } catch (e) {
        console.error("Source setting error:", e);
    }
}

async function playSongAtIndex(index) {
    setMusicIndex = index;
    const song = ALL_SONGS[setMusicIndex];
    if (!song || !song.file) { console.error('Invalid song'); return; }

    // 1. Update UI Immediately
    updatePlayerUI(song);

    // 2. Pause immediately
    try { myMusic.pause(); } catch (e) { }

    // 3. Clear existing timer (Debounce)
    if (playTimeout) clearTimeout(playTimeout);

    // 4. Set Timer: Wait 400ms before hitting Drive
    playTimeout = setTimeout(() => {
        // Set the source to the Public Link
        setAudioSourceSimple(song.file);

        // Attempt to play
        const playPromise = myMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                document.getElementById('play-pause').innerHTML = '<span class="material-symbols-outlined">pause</span>';
            }).catch(error => {
                // Ignore "AbortError" (happens when skipping fast)
                if (error.name !== 'AbortError') {
                    console.warn("Playback interrupted (likely buffering):", error);
                }
            });
        }
    }, 400);
}

// ==========================================================================
// 6. SETUP MUSIC
// ==========================================================================
async function setupMusic() {
    const { songs, artists } = await getSongsAndArtists();

    if (!songs.length) {
        document.querySelector('.viewport').innerHTML += "<h3 style='padding:20px; color:red;'>No songs found. Check Folder IDs or API Key.</h3>";
        return;
    }

    if (ALL_SONGS[setMusicIndex]) {
        setAudioSourceSimple(ALL_SONGS[setMusicIndex].file);
        updatePlayerUI(ALL_SONGS[setMusicIndex]);
    }

    // POPULAR RADIO / GENRE CARD LOGIC
    const normalize = str => (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');

    document.querySelectorAll('.radio-card, .card[id]').forEach(card => {
        if (card.id === 'cards' || !card.id) return;

        card.addEventListener('click', () => {
            const genre = card.id.trim();
            if (!genre) return;

            const genreNorm = normalize(genre);
            const genreSongs = ALL_SONGS.filter(s => {
                const g = normalize(s.genre);
                const a = normalize(s.artist);
                const t = normalize(s.title);
                return g.includes(genreNorm) || a.includes(genreNorm) || t.includes(genreNorm);
            });

            if (genreSongs.length === 0) { console.warn("No songs for:", genre); return; }

            ['#search-view', '#library-view', '.mainArtistpg', '.viewport'].forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.style.display = 'none';
            });

            const playlistView = document.getElementById('playlist-view');
            if (playlistView) playlistView.style.display = 'flex';

            document.getElementById('pl-title').innerText = `${genre} Station`;
            document.getElementById('pl-desc').innerText = `Best of ${genre} Music`;

            const cardImg = card.querySelector('img')?.src;
            const plImg = document.getElementById('pl-img');
            if (plImg && cardImg) {
                plImg.innerHTML = `<img src="${cardImg}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
            } else if (plImg) {
                plImg.innerHTML = `<span class="material-symbols-outlined" style="font-size:80px; color:#fff">radio</span>`;
            }

            displaySongs(genreSongs, document.getElementById('pl-songs-container'));
        });
    });

    const playBtn = document.getElementById('play-pause');
    const nextBtn = document.getElementById('next');
    const prevBtn = document.getElementById('previous');
    const shuffleBtn = document.getElementById('Shuffle');

    playBtn.onclick = () => {
        if (!checkAuth()) return;
        
        if (myMusic.paused) {
            // We just call play. The 'play' event listener will update the icon.
            myMusic.play().catch(e => console.error("Play failed:", e));
        } else {
            // We just call pause. The 'pause' event listener will update the icon.
            myMusic.pause();
        }
    };


    myMusic.addEventListener('play', ()=>{
        playBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>'
    })
    
    myMusic.addEventListener('pause',()=>{
        playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>'
    })



    nextBtn.onclick = () => playNext();
    prevBtn.onclick = () => playPrev();

    shuffleBtn.onclick = () => {
        isShuffleMode = !isShuffleMode;
        shuffleBtn.innerHTML = isShuffleMode ? ' <span class="material-symbols-outlined" style="color: rgb(0, 255, 0);">shuffle</span>' : '<span class="material-symbols-outlined">shuffle</span>';
        if (isShuffleMode) createShuffleQueue(setMusicIndex);
    };

    document.getElementById('discovery-btn').onclick = () => {
        if (!checkAuth()) return;
        isShuffleMode = true;
        shuffleBtn.innerHTML = ' <span class="material-symbols-outlined" style="color: rgb(0, 255, 0);">shuffle</span>';
        const randIndex = Math.floor(Math.random() * ALL_SONGS.length);
        setMusicIndex = randIndex;
        createShuffleQueue(setMusicIndex);
        playSongAtIndex(setMusicIndex);
    };

    document.getElementById('like-btn').onclick = () => { if (ALL_SONGS[setMusicIndex]) toggleLike(ALL_SONGS[setMusicIndex]); };

    const seek = document.getElementById('SeekBar');
    myMusic.ontimeupdate = () => { seek.value = myMusic.currentTime; seek.max = myMusic.duration || 100; updateRangeBackground(seek, seek.value, seek.max); };
    seek.oninput = () => { myMusic.currentTime = seek.value; updateRangeBackground(seek, seek.value, seek.max); };
    myMusic.onended = () => playNext();
    myMusic.onerror = (e) => {
        // Suppress initial loading errors which are normal with Drive links
        if (myMusic.error && myMusic.error.code === 4) return;
        console.error('HTMLAudioElement error:', e, myMusic.error);
    };

    renderArtists(artists);
    displaySongs([...songs].sort(() => 0.5 - Math.random()).slice(0, 6), document.getElementById('cards'));
}

// ==========================================================================
// 7. HELPER FUNCTIONS
// ==========================================================================
function checkAuth() {
    if (auth.currentUser) return true;
    document.getElementById('login-popup').style.display = 'flex';
    return false;
}

function playNext() {
    if (!checkAuth()) return;
    let nextIdx = isShuffleMode ? shuffledQueue[(shuffleIndex + 1) % shuffledQueue.length] : (setMusicIndex + 1) % ALL_SONGS.length;
    if (isShuffleMode) shuffleIndex = (shuffleIndex + 1) % shuffledQueue.length;
    playSongAtIndex(nextIdx);
}

function playPrev() {
    if (!checkAuth()) return;
    let prevIdx = isShuffleMode ? shuffledQueue[(shuffleIndex - 1 + shuffledQueue.length) % shuffledQueue.length] : (setMusicIndex - 1 + ALL_SONGS.length) % ALL_SONGS.length;
    if (isShuffleMode) shuffleIndex = (shuffleIndex - 1 + shuffledQueue.length) % shuffledQueue.length;
    playSongAtIndex(prevIdx);
}

function createShuffleQueue(startIdx) {
    let arr = ALL_SONGS.map((_, i) => i).filter(i => i !== startIdx);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffledQueue = [startIdx, ...arr];
    shuffleIndex = 0;
}

function renderArtists(artists) {
    const popA = document.getElementById('POP-artists');
    popA.innerHTML = "";
    const artistsToShow = [...artists].sort(() => 0.5 - Math.random()).slice(0, 6);
    artistsToShow.forEach(artist => {
        const div = document.createElement('div');
        div.className = "card artist-card";
        div.innerHTML = `<div class="card-image rounded"><img src="${artist.image}" onerror="this.onerror=null;this.src='${DEFAULT_ARTIST}'"></div><div class="card-info"><h4>${artist.name}</h4></div>`;
        div.onclick = () => {
            ['#playlist-view', '#search-view', '#library-view', '.viewport'].forEach(id => {
                const el = document.querySelector(id);
                if (el) el.style.display = 'none';
            });
            document.querySelector('.mainArtistpg').style.display = 'flex';
            document.querySelector('.ArtistProfilePic').innerHTML = `<img src="${artist.image}" onerror="this.onerror=null;this.src='${DEFAULT_ARTIST}'">`;
            document.querySelector('.ArtistName h4').innerText = artist.name;
            const matchedSongs = ALL_SONGS.filter(s => s.artist.toLowerCase().includes(artist.name.toLowerCase()));
            displaySongs(matchedSongs, document.getElementById('artist-song-grid'));
        }
        popA.appendChild(div);
    });
}

function displaySongs(list, container) {
    container.innerHTML = "";
    if (!list.length) { container.innerHTML = "<p>No songs found.</p>"; return; }
    list.forEach(song => {
        const div = document.createElement('div');
        div.className = "card song-card";
        div.innerHTML = `<div class="card-image"><img src="${song.image}" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'"></div><div class="card-info"><h4>${song.title}</h4><p>${song.artist}</p></div>`;
        div.onclick = () => {
            if (!checkAuth()) return;
            let idx = ALL_SONGS.findIndex(s => s.id === song.id);
            if (idx === -1) { ALL_SONGS.push(song); idx = ALL_SONGS.length - 1; }
            if (isShuffleMode) createShuffleQueue(idx);
            playSongAtIndex(idx);
        };
        container.appendChild(div);
    });
}

async function updatePlayerUI(song) {
    if (!song || !song.id) return;
    const art = document.getElementById('player-art');
    const title = document.getElementById('player-title');
    const likeBtn = document.getElementById('like-btn');

    art.innerHTML = `<img src="${song.image}" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'" style="width:100%;height:100%;object-fit:cover;">`;
    title.innerHTML = `<b>${song.title}</b><span style="font-size:12px;color:#b3b3b3;display:block;">${song.artist}</span>`;

    if (likeBtn) {
        const svg = likeBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', '#b3b3b3');
        const user = auth.currentUser;
        if (user) {
            try {
                const snap = await getDoc(doc(db, "users", user.uid, "likedSongs", song.id));
                if (snap.exists() && svg) svg.setAttribute('fill', '#ff0000');
            } catch (err) { }
        }
    }
}

function updateRangeBackground(el, val, max) {
    const p = (val / max) * 100;
    el.style.background = `linear-gradient(90deg, #fff ${p}%, rgba(255,255,255,0.2) ${p}%)`;
}

// ==========================================================================
// 8. DB FUNCTIONS
// ==========================================================================
window.toggleLike = async function (song) {
    const user = auth.currentUser;
    if (!user) return checkAuth();
    if (!song.id) { alert("Invalid Song ID"); return; }
    const ref = doc(db, "users", user.uid, "likedSongs", song.id);
    const svg = document.getElementById('like-btn')?.querySelector('svg');
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) { await deleteDoc(ref); if (svg) svg.setAttribute('fill', '#b3b3b3'); }
        else { await setDoc(ref, { id: song.id, title: song.title, image: song.image, file: song.file, artist: song.artist, genre: song.genre, addedAt: new Date() }); if (svg) svg.setAttribute('fill', '#ff0000'); }
    } catch (e) { console.error("Like Error", e); }
}

window.createPlaylist = async function () {
    const user = auth.currentUser;
    const input = document.getElementById('new-playlist-name');
    if (!user || !input.value.trim()) return;
    const name = input.value.trim();
    await setDoc(doc(db, "users", user.uid, "playlists", name), { name: name, createdBy: user.uid, createdAt: new Date(), songs: [] });
    document.getElementById('create-playlist-modal').style.display = 'none';
    input.value = "";
    alert("Playlist Created");
}

async function loadLibrary() {
    if (!checkAuth()) return;
    ['#playlist-view', '#search-view', '.mainArtistpg', '.viewport'].forEach(id => { const el = document.querySelector(id); if (el) el.style.display = 'none'; });
    document.getElementById('library-view').style.display = 'flex';
    const container = document.getElementById('library-container');
    container.innerHTML = '<p>Loading...</p>';
    let html = `<div class="card" id="lib-liked-songs" style="background:#222"><div class="card-image"><span class="material-symbols-outlined" style="font-size:50px">favorite</span></div><div class="card-info"><h4>Liked Songs</h4></div></div>`;
    try {
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "playlists"));
        snap.forEach(d => {
            html += `<div class="card pl-card" data-name="${d.data().name}"><div class="card-image"><span class="material-symbols-outlined" style="font-size:50px">music_note</span></div><div class="card-info"><h4>${d.data().name}</h4></div></div>`;
        });
        container.innerHTML = html;
        document.getElementById('lib-liked-songs').onclick = loadLikedSongs;
        document.querySelectorAll('.pl-card').forEach(c => c.onclick = async () => { alert("Open playlist: " + c.getAttribute('data-name')); });
    } catch (e) { console.error(e); }
}

async function loadLikedSongs() {
    if (!checkAuth()) return;
    ['#search-view', '#library-view', '.mainArtistpg', '.viewport'].forEach(id => { const el = document.querySelector(id); if (el) el.style.display = 'none'; });
    document.getElementById('playlist-view').style.display = 'flex';
    document.getElementById('pl-title').innerText = "Liked Songs";
    document.getElementById('pl-img').innerHTML = '<span class="material-symbols-outlined" style="font-size:80px; color:#fff">favorite</span>';
    const container = document.getElementById('pl-songs-container');
    container.innerHTML = "Loading...";
    try {
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "likedSongs"));
        const songs = [];
        snap.forEach(d => { const data = d.data(); if (!data.id) data.id = d.id; songs.push(data); });
        displaySongs(songs, container);
    } catch (e) { console.error(e); }
}

onAuthStateChanged(auth, u => {
    const btn = document.querySelector('.subscribe');
    if (u) {
        btn.innerText = "Log Out"; btn.onclick = () => signOut(auth).then(() => location.reload());
        document.getElementById('greet').innerHTML = `<b>Hi, ${u.displayName ? u.displayName.split(' ')[0] : 'User'}</b>`;
        if (u.photoURL) document.getElementById('profilePic').innerHTML = `<img src="${u.photoURL}" style="width:100%">`;
    } else {
        btn.innerText = "Login"; btn.onclick = () => document.getElementById('login-popup').style.display = 'flex';
    }
});

setupUI();
setupMusic();