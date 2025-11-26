// ==========================================================================
// 1. FIREBASE IMPORTS & CONFIGURATION
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Global Variables
let ALL_SONGS = []; 
const myMusic = new Audio();
let setMusicIndex = 0;
let isShuffleMode = false;
let shuffledQueue = [];
let shuffleIndex = 0;

// ==========================================================================
// 2. AUTHENTICATION & UI HELPERS
// ==========================================================================

function showLoginPopup(mode = 'login') {
    const modal = document.getElementById("login-popup");
    const errorMsg = document.getElementById("auth-error-msg");
    const loginView = document.getElementById("login-view-container");
    const signupView = document.getElementById("signup-view-container");

    document.querySelectorAll('.auth-input').forEach(i => i.value = "");
    if(errorMsg) errorMsg.style.display = "none";

    if(modal) {
        modal.style.display = "flex";
        if(mode === 'register') {
            loginView.style.display = 'none';
            signupView.style.display = 'block';
        } else {
            loginView.style.display = 'block';
            signupView.style.display = 'none';
        }
    }
}

function showAuthError(message) {
    const errorMsg = document.getElementById("auth-error-msg");
    if(errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
    }
}

function toggleAuthMode(targetMode) {
    const loginView = document.getElementById("login-view-container");
    const signupView = document.getElementById("signup-view-container");
    const errorMsg = document.getElementById("auth-error-msg");
    if(errorMsg) errorMsg.style.display = 'none';

    if(targetMode === 'register') {
        loginView.style.display = 'none';
        signupView.style.display = 'block';
    } else {
        loginView.style.display = 'block';
        signupView.style.display = 'none';
    }
}

// 1. SIGN UP
window.handleSignUp = function() {
    const email = document.getElementById("signup-email").value;
    const pass = document.getElementById("signup-password").value;

    if(!email || !pass) {
        showAuthError("Please fill in all fields.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => {
            document.getElementById("login-popup").style.display = "none";
        })
        .catch((error) => {
            let msg = error.message;
            if(error.code === 'auth/email-already-in-use') msg = "Email already in use. Please Log In.";
            if(error.code === 'auth/weak-password') msg = "Password too weak.";
            showAuthError(msg);
        });
}

// 2. LOGIN
window.handleLogin = function() {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;

    if(!email || !pass) {
        showAuthError("Please enter email and password.");
        return;
    }

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            document.getElementById("login-popup").style.display = "none";
        })
        .catch(() => {
            showAuthError("Invalid Email or Password.");
        });
}

// 3. GOOGLE LOGIN
window.handleGoogleLogin = function() {
    signInWithPopup(auth, googleProvider)
        .then(() => {
            document.getElementById("login-popup").style.display = "none";
        })
        .catch((error) => {
            console.error(error);
            showAuthError("Google Login Failed.");
        });
}

window.logoutUser = function() {
    signOut(auth).then(() => window.location.reload());
}

function canPlay() {
    if (auth.currentUser) return true;
    showLoginPopup('login');
    return false;
}

// ==========================================================================
// 3. DATABASE: LIKES & PLAYLISTS
// ==========================================================================

window.toggleLike = async function(song) {
    const user = auth.currentUser;
    const likeBtn = document.getElementById('like-btn');
    const likeSvg = likeBtn ? likeBtn.querySelector('svg') : null;

    if (!user) { showLoginPopup(); return; }

    const songRef = doc(db, "users", user.uid, "likedSongs", song.title);
    try {
        const docSnap = await getDoc(songRef);
        if (docSnap.exists()) {
            await deleteDoc(songRef);
            if (likeSvg) likeSvg.setAttribute('fill', '#b3b3b3'); 
        } else {
            await setDoc(songRef, {
                title: song.title, image: song.image, file: song.file, artist: song.artist, addedAt: new Date()
            });
            if (likeSvg) likeSvg.setAttribute('fill', '#ff0000'); 
        }
    } catch (e) { console.error("DB Error:", e); }
}

window.createPlaylist = async function() {
    const user = auth.currentUser;
    const nameInput = document.getElementById('new-playlist-name');
    const modal = document.getElementById('create-playlist-modal');

    if(!user || !nameInput.value.trim()) return;

    const plName = nameInput.value.trim();
    try {
        await setDoc(doc(db, "users", user.uid, "playlists", plName), {
            name: plName,
            createdBy: user.uid,
            createdAt: new Date(),
            songs: []
        });
        modal.style.display = "none";
        nameInput.value = "";
        alert("Playlist created! Check 'Your Library'.");
    } catch(e) {
        console.error("Error creating playlist:", e);
    }
}

async function loadLibrary() {
    const user = auth.currentUser;
    if(!user) { showLoginPopup(); return; }

    hideAllViews();
    document.getElementById('library-view').style.display = 'flex';
    const container = document.getElementById('library-container');
    container.innerHTML = '<p>Loading...</p>';

    let html = `
        <div class="card" id="lib-liked-songs">
            <div class="card-image" style="background: linear-gradient(135deg, #450af5, #c4efd9); display:flex; align-items:center; justify-content:center;">
                <span class="material-symbols-outlined" style="font-size: 50px; color: white;">favorite</span>
            </div>
            <div class="card-info">
                <h4>Liked Songs</h4>
                <p>Auto Playlist</p>
            </div>
        </div>
    `;

    try {
        const querySnapshot = await getDocs(collection(db, "users", user.uid, "playlists"));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            html += `
            <div class="card custom-playlist-card" data-name="${data.name}">
                <div class="card-image" style="background: #333; display:flex; align-items:center; justify-content:center;">
                    <span class="material-symbols-outlined" style="font-size: 50px; color: white;">music_note</span>
                </div>
                <div class="card-info">
                    <h4>${data.name}</h4>
                    <p>Playlist</p>
                </div>
            </div>`;
        });
    } catch(e) { console.log(e); }

    container.innerHTML = html;

    document.getElementById('lib-liked-songs').onclick = () => loadLikedSongs();
    
    document.querySelectorAll('.custom-playlist-card').forEach(card => {
        card.onclick = async () => {
            const plName = card.getAttribute('data-name');
            try {
                const plDoc = await getDoc(doc(db, "users", user.uid, "playlists", plName));
                const plData = plDoc.data();
                openPlaylistView(plData.name, plData.songs || [], true);
            } catch(e) {
                console.error(e);
            }
        };
    });
}

async function loadLikedSongs() {
    const user = auth.currentUser;
    if (!user) { showLoginPopup(); return; }

    hideAllViews();
    const likedView = document.getElementById('playlist-view');
    likedView.style.display = 'flex';
    
    document.getElementById('pl-img').innerHTML = `<span class="material-symbols-outlined" style="font-size:80px; color:#fff;">favorite</span>`;
    document.getElementById('pl-img').style.background = "linear-gradient(135deg, #501d78, #180638)";
    document.getElementById('pl-img').style.display = "flex";
    document.getElementById('pl-img').style.alignItems = "center";
    document.getElementById('pl-img').style.justifyContent = "center";
    document.getElementById('pl-title').textContent = "Liked Songs";
    document.getElementById('pl-desc').textContent = "Your favorite tracks";
    document.getElementById('pl-delete-btn').style.display = "none";

    const container = document.getElementById('pl-songs-container');
    container.innerHTML = '<p class="initial-message">Loading...</p>';

    try {
        const snapshot = await getDocs(collection(db, "users", user.uid, "likedSongs"));
        const songs = [];
        snapshot.forEach(doc => songs.push(doc.data()));

        if (songs.length === 0) container.innerHTML = '<p class="initial-message">No liked songs yet.</p>';
        else displaySongs(songs, container);
    } catch (e) { console.error(e); }
}

function openPlaylistView(title, songs = [], isCustom = false) {
    hideAllViews();
    document.getElementById('playlist-view').style.display = 'flex';
    
    const imgDiv = document.getElementById('pl-img');
    imgDiv.innerHTML = `<span class="material-symbols-outlined" style="font-size:80px; color:#fff;">music_note</span>`;
    imgDiv.style.background = "#333";
    imgDiv.style.display = "flex"; imgDiv.style.alignItems = "center"; imgDiv.style.justifyContent = "center";
    
    document.getElementById('pl-title').textContent = title;
    document.getElementById('pl-desc').textContent = isCustom ? "Custom Playlist" : "";
    
    const delBtn = document.getElementById('pl-delete-btn');
    delBtn.style.display = isCustom ? "block" : "none";
    
    delBtn.onclick = async () => {
        if(confirm(`Delete playlist "${title}"?`)) {
            const user = auth.currentUser;
            await deleteDoc(doc(db, "users", user.uid, "playlists", title));
            loadLibrary();
        }
    };

    const container = document.getElementById('pl-songs-container');
    if(songs.length === 0) container.innerHTML = "<p class='initial-message'>This playlist is empty.</p>";
    else displaySongs(songs, container);
}

// ==========================================================================
// 4. UI & PLAYER LOGIC
// ==========================================================================

// Helper to update Range Slider backgrounds (Seekbar & Volume)
function updateRangeBackground(inputElement, value, max) {
    const percentage = (value / max) * 100;
    inputElement.style.background = `linear-gradient(90deg, #fff ${percentage}%, rgba(255,255,255,0.2) ${percentage}%)`;
}

async function updatePlayerUI(song) {
    const albumArt = document.getElementById('player-art');
    const songTitle = document.getElementById('player-title');
    const likeBtn = document.getElementById('like-btn');

    // IMAGE FIX: Trust the path from JSON directly
    albumArt.innerHTML = "";
    if(song.image) {
        const img = document.createElement('img');
        img.src = song.image; 
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.onerror = function() {
            this.style.display = 'none'; // Hide broken image
            albumArt.innerHTML = '<span class="material-symbols-outlined" style="color:white; font-size:30px;">music_note</span>';
        };
        albumArt.appendChild(img);
    } else {
        albumArt.innerHTML = '<span class="material-symbols-outlined" style="color:white; font-size:30px;">music_note</span>';
    }

    songTitle.innerHTML = `<b>${song.title}</b>`;
    
    const likeSvg = likeBtn ? likeBtn.querySelector('svg') : null;
    if(likeSvg) {
        likeSvg.setAttribute('fill', '#b3b3b3'); 
        const user = auth.currentUser;
        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid, "likedSongs", song.title));
            if (docSnap.exists()) likeSvg.setAttribute('fill', '#ff0000'); 
        }
    }
}

function displaySongs(songLists, Container) {
    Container.innerHTML = "";
    songLists.forEach(song => {
      const Card = document.createElement('div');
      Card.className = "card song-card";
      
      // Handle Grid Images
      let imgHTML = `<span class="material-symbols-outlined" style="font-size:40px; color:#fff;">music_note</span>`;
      if(song.image) {
          imgHTML = `<img src="${song.image}" alt="${song.title}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=\'material-symbols-outlined\' style=\'font-size:40px; color:#fff;\'>music_note</span>'">`;
      }

      Card.innerHTML = `
        <div class="card-image" style="display:flex; align-items:center; justify-content:center; background:#333;">
            ${imgHTML}
        </div>
        <div class="card-info"><h4>${song.title}</h4><p>${song.artist}</p></div>`;

      Card.addEventListener('click', async () => { 
        if(!canPlay()) return; 
        let originalIndex = ALL_SONGS.findIndex(s => s.file === song.file); 
        
        if (originalIndex === -1) {
             myMusic.src = song.file; myMusic.load(); myMusic.play();
             await updatePlayerUI(song); return;
        }
        setMusicIndex = originalIndex;
        if (isShuffleMode) createShuffleQueue(setMusicIndex);

        myMusic.src = song.file; myMusic.load(); myMusic.play();
        await updatePlayerUI(song); 
      });
      Container.appendChild(Card);
    });
}

function hideAllViews() {
    document.querySelector('.viewport').style.display = 'none';
    document.querySelector('.mainArtistpg').style.display = 'none';
    document.getElementById('playlist-view').style.display = 'none';
    document.getElementById('search-view').style.display = 'none';
    document.getElementById('library-view').style.display = 'none';
}

function createShuffleQueue(startIndex = 0) {
    let indices = Array.from({length: ALL_SONGS.length}, (_, i) => i);
    indices.splice(startIndex, 1);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    shuffledQueue = [startIndex, ...indices];
    shuffleIndex = 0;
}

// MAIN SETUP
async function getSongs() {
  try {
      const response = await fetch("./assets/songs.json");
      const data = await response.json();
      
      data.songs.forEach(song => {
        // FIX: Only fix SONG paths, trust IMAGE paths from JSON
        if (song.file && !song.file.includes("/")) {
            song.file = `./assets/Music/${song.file}`;
        }
      });
      
      ALL_SONGS = data.songs;
      return { songs: data.songs, artists: data.artists };
  } catch (error) { console.error("Error loading songs.json", error); return { songs: [], artists: [] }; }
}

async function setupMusic() {
  const { songs, artists } = await getSongs();
  if (songs.length === 0) return;

  // Initialize Player
  myMusic.src = songs[setMusicIndex].file;
  await updatePlayerUI(songs[setMusicIndex]);

  // DOM Elements
  const start = document.getElementById('play-pause');
  const next = document.getElementById('next');
  const previous = document.getElementById('previous');
  const seeker = document.getElementById('SeekBar');
  const likeBtn = document.getElementById('like-btn');
  const likedSongsBtn = document.getElementById('liked-songs-btn');
  const libraryBtn = document.getElementById('library-btn');
  const createPlBtn = document.getElementById('create-playlist-btn');
  const createPlConfirm = document.getElementById('confirm-create-playlist');
  const artistPic = document.querySelector('.ArtistProfilePic');
  const artistNameEl = document.querySelector('.ArtistName');
  const artistSongGrid = document.getElementById('artist-song-grid');

  // LISTENERS
  if (likeBtn) likeBtn.addEventListener('click', () => toggleLike(songs[setMusicIndex]));
  if (likedSongsBtn) likedSongsBtn.addEventListener('click', (e) => { e.preventDefault(); loadLikedSongs(); });
  if (libraryBtn) libraryBtn.addEventListener('click', (e) => { e.preventDefault(); loadLibrary(); });
  if (createPlBtn) createPlBtn.addEventListener('click', (e) => { e.preventDefault(); if(canPlay()) document.getElementById('create-playlist-modal').style.display = 'flex'; });
  if (createPlConfirm) createPlConfirm.addEventListener('click', window.createPlaylist);
  document.getElementById('close-cp-modal').onclick = () => document.getElementById('create-playlist-modal').style.display = 'none';

  // FIX: WEEKLY DISCOVERY BUTTON
  const discoveryBtn = document.getElementById('discovery-btn');
  if(discoveryBtn) {
      discoveryBtn.addEventListener('click', () => {
          if(!canPlay()) return;
          // Strategy: Shuffle mode and play random song
          isShuffleMode = true;
          document.getElementById('Shuffle').innerHTML = ' <span class="material-symbols-outlined" style="color: rgb(0, 255, 0);">shuffle</span>';
          
          // Random start index
          const randIndex = Math.floor(Math.random() * ALL_SONGS.length);
          setMusicIndex = randIndex;
          createShuffleQueue(setMusicIndex);
          
          myMusic.src = ALL_SONGS[setMusicIndex].file; 
          myMusic.load(); 
          myMusic.play();
          updatePlayerUI(ALL_SONGS[setMusicIndex]);
      });
  }

  // SIDEBAR HAMBURGER
  const hamburgerBtn = document.querySelector('.on-media .hamburger');
  const sidebar = document.querySelector('.section1');
  const sidebarLinks = document.querySelectorAll('.section1 .nav-item a');

  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('active'); });
    document.addEventListener('click', (e) => { if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) sidebar.classList.remove('active'); });
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    });
  }

  // ARTIST CARDS
  const popA = document.getElementById('POP-artists');
  popA.innerHTML = "";
  const randomArtists = [...artists].sort(() => 0.5 - Math.random()).slice(0, 6);
  randomArtists.forEach(artist => {
    const Card = document.createElement('div');
    Card.className = "card artist-card";
    Card.innerHTML = `<div class="card-image rounded"><img src="${artist.image}" alt="${artist.name}"></div><div class="card-info"><h4>${artist.name}</h4></div>`;
    Card.addEventListener('click', () => {
      hideAllViews();
      document.querySelector('.mainArtistpg').style.display = "flex";
      artistPic.innerHTML = `<img src="${artist.image}" style="width:100%;height:100%;object-fit:cover;">`;
      artistNameEl.innerHTML = `<h4>${artist.name}</h4>`;
      const ArtistsSong = songs.filter(song => song.artist.includes(artist.name));
      displaySongs(ArtistsSong, artistSongGrid);
    });
    popA.appendChild(Card);
  });

  // RADIO CARDS
  const plImg = document.getElementById('pl-img');
  const plTitle = document.getElementById('pl-title');
  const plDesc = document.getElementById('pl-desc');
  const plSongsContainer = document.getElementById('pl-songs-container');
  const radioCards = document.querySelectorAll('.radio-card');
  radioCards.forEach(card => {
    card.addEventListener('click', () => {
      const genre = card.id;
      const genreImage = card.querySelector('img').src;
      const genreSongs = ALL_SONGS.filter(song => song.genre === genre);
      hideAllViews();
      document.getElementById('playlist-view').style.display = 'flex';
      plImg.innerHTML = `<img src="${genreImage}" alt="${genre}">`;
      plTitle.textContent = `${genre} Radio`;
      plDesc.textContent = `Non-stop ${genre} hits.`;
      displaySongs(genreSongs, plSongsContainer);
    });
  });

  // ARTIST PLAY BUTTON
  document.getElementById('pl-play-btn1').addEventListener('click', async () => {
    if(!canPlay()) return;
    const artistName = artistNameEl.innerText; 
    const artistSongs = ALL_SONGS.filter(song => artistName.includes(song.artist));
    if (artistSongs.length > 0) {
        const firstSong = artistSongs[0];
        setMusicIndex = ALL_SONGS.findIndex(s => s.file === firstSong.file);
        myMusic.src = firstSong.file; myMusic.load(); myMusic.play();
        await updatePlayerUI(firstSong);
    }
  });
  
  // Auth Toggles
  document.getElementById('switch-to-signup').onclick = () => toggleAuthMode('register');
  document.getElementById('switch-to-login').onclick = () => toggleAuthMode('login');
  document.getElementById('close-auth-modal').onclick = () => document.getElementById('login-popup').style.display = 'none';
  document.getElementById('perform-login-btn').onclick = window.handleLogin;
  document.getElementById('perform-signup-btn').onclick = window.handleSignUp;
  document.getElementById('google-login-btn').onclick = window.handleGoogleLogin;

  // Search
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
          e.preventDefault(); hideAllViews(); document.getElementById('search-view').style.display = 'flex'; searchInput.focus();
      });
  }
  let searchTimeout;
  searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
          const query = searchInput.value.toLowerCase().trim();
          const results = document.getElementById('search-results-songs');
          if (query.length < 2) { results.innerHTML = '<p class="initial-message">Type to search...</p>'; return; }
          const filtered = ALL_SONGS.filter(s => s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query));
          if(filtered.length > 0) displaySongs(filtered, results);
          else results.innerHTML = '<p class="initial-message">No results.</p>';
      }, 300);
  });

  // VOLUME CONTROL (FIXED VISUALS)
  const volSeek = document.getElementById('vol-seek');
  const volIcon = document.getElementById('vol-icon');
  if (volSeek && volIcon) {
      // Set initial background
      updateRangeBackground(volSeek, volSeek.value, 100);

      volSeek.addEventListener('input', () => {
          myMusic.volume = volSeek.value / 100;
          volIcon.innerHTML = volSeek.value == 0 ? "volume_off" : (volSeek.value < 50 ? "volume_down" : "volume_up");
          updateRangeBackground(volSeek, volSeek.value, 100);
      });
      
      volIcon.addEventListener('click', () => {
          if(myMusic.volume > 0) {
              myMusic.volume = 0; volSeek.value = 0; volIcon.innerHTML = "volume_off";
          } else {
              myMusic.volume = 1; volSeek.value = 100; volIcon.innerHTML = "volume_up";
          }
          updateRangeBackground(volSeek, volSeek.value, 100);
      });
  }

  // KEYBOARD SHORTCUTS
  document.body.onkeyup = function(e) {
      if (e.target.tagName === 'INPUT') return; 
      if (e.code === 'Space') { e.preventDefault(); start.click(); }
  }

  // PLAYER CONTROLS
  start.addEventListener('click', () => {
    if(!canPlay()) return;
    myMusic.paused ? myMusic.play() : myMusic.pause();
    start.innerHTML = myMusic.paused ? '<span class="material-symbols-outlined">play_arrow</span>' : '<span class="material-symbols-outlined">pause</span>';
  });

  next.addEventListener('click', async () => { 
    if(!canPlay()) return;
    let newIndex = isShuffleMode ? shuffledQueue[(shuffleIndex + 1) % shuffledQueue.length] : (setMusicIndex + 1) % ALL_SONGS.length;
    if(isShuffleMode) shuffleIndex = (shuffleIndex + 1) % shuffledQueue.length;
    setMusicIndex = newIndex;
    myMusic.src = ALL_SONGS[setMusicIndex].file; myMusic.load(); myMusic.play();
    await updatePlayerUI(ALL_SONGS[setMusicIndex]);
  });

  previous.addEventListener('click', async () => { 
    if(!canPlay()) return;
    let newIndex = isShuffleMode ? shuffledQueue[(shuffleIndex - 1 + shuffledQueue.length) % shuffledQueue.length] : (setMusicIndex - 1 + ALL_SONGS.length) % ALL_SONGS.length;
    if(isShuffleMode) shuffleIndex = (shuffleIndex - 1 + shuffledQueue.length) % shuffledQueue.length;
    setMusicIndex = newIndex;
    myMusic.src = ALL_SONGS[setMusicIndex].file; myMusic.load(); myMusic.play();
    await updatePlayerUI(ALL_SONGS[setMusicIndex]);
  });

  // SEEKBAR (FIXED VISUALS)
  myMusic.addEventListener('timeupdate', () => { 
      // Only update if not currently being dragged (optional check, but simplest is just update)
      const currentTime = myMusic.currentTime;
      const duration = myMusic.duration || 1; // avoid divide by zero
      
      seeker.value = currentTime; 
      seeker.max = duration; 
      
      // FIX: Update the visual gradient
      updateRangeBackground(seeker, currentTime, duration);
  });

  seeker.addEventListener('input', () => { 
      myMusic.currentTime = seeker.value; 
      updateRangeBackground(seeker, seeker.value, seeker.max);
  });
  
  myMusic.addEventListener('ended', () => next.click());

  document.querySelectorAll('.back-btn').forEach(btn => {
      btn.onclick = () => { hideAllViews(); document.querySelector('.viewport').style.display = 'flex'; }
  });
  
  document.getElementById('Home-btn').onclick = (e) => {
      e.preventDefault(); hideAllViews(); document.querySelector('.viewport').style.display = 'flex';
  };
  
  const randomSongs = [...songs].sort(() => 0.5 - Math.random()).slice(0, 6);
  displaySongs(randomSongs, document.getElementById('cards')); 

  const shuffleBtn = document.getElementById('Shuffle');
  shuffleBtn.addEventListener('click', () => {
      isShuffleMode = !isShuffleMode;
      shuffleBtn.innerHTML = isShuffleMode ? ' <span class="material-symbols-outlined" style="color: rgb(0, 255, 0);">shuffle</span>' : '<span class="material-symbols-outlined">shuffle</span>';
      if(isShuffleMode) createShuffleQueue(setMusicIndex);
  });
}

onAuthStateChanged(auth, (user) => {
    const loginBtn = document.querySelector('.subscribe-profile .subscribe');
    const greet = document.getElementById('greet');
    const profilepict = document.getElementById('profilePic'); 
    
    if (user) {
        loginBtn.textContent = "Log Out";
        loginBtn.onclick = window.logoutUser;
        const name = user.displayName ? user.displayName.split(" ")[0] : (user.email ? user.email.split("@")[0] : "User");
        greet.innerHTML = `<b>Hi, ${name}</b>`;
        if (user.photoURL) {
            profilepict.innerHTML = `<img src="${user.photoURL}" style="width:100%; height:100%; object-fit:cover;">`;
        }
    } else {
        loginBtn.textContent = "Login";
        loginBtn.onclick = () => showLoginPopup('login');
        profilepict.innerHTML = '<span class="material-symbols-outlined">person</span>';
        greet.innerHTML = `<b>Welcome</b>`;
    }
});

setupMusic();