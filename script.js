console.log("--- I AM RUNNING THE NEW FILE, VERSION 4 By ANKIT---");
// --- Pull-to-Refresh Logic ---
(function initPullToRefresh() {
  // This targets your main scrolling content area
  const target = document.querySelector('.section2');
  if (!target) {
    console.log("Could not find .section2 for pull-to-refresh");
    return; // Exit if element not found
  }

  let touchStartY = 0;

  // Listen for the first touch
  target.addEventListener('touchstart', (e) => {
    // Only track if we are at the very top of the scrollable area
    if (target.scrollTop === 0) {
      touchStartY = e.touches[0].clientY;
    } else {
      touchStartY = 0; // Not at the top, so don't track
    }
  }, { passive: true }); // 'passive: true' improves scroll performance

  // Listen for the finger lifting off
  target.addEventListener('touchend', (e) => {
    if (touchStartY === 0) return; // We weren't at the top, so do nothing

    const touchEndY = e.changedTouches[0].clientY;
    const pullDistance = touchEndY - touchStartY;

    // Check if it was a significant pull downwards
    if (pullDistance > 120) { // 120px threshold
      console.log('Pull-to-refresh triggered!');
      location.reload(); // Reload the page
    }

    touchStartY = 0; // Reset
  }, { passive: true });
})();

// above code from gemini for scroll refresh

async function getSongs() {
  const getM = await fetch("./assets/songs.json")
  let text = await getM.json()
  let songs = text.songs
  let artists = text.artists
  // fetch artist also
  console.log(artists[0].name)
  songs.forEach(song => {
    // console.log(song.file)
    const element = song.file
    if (element.endsWith(".mp3")) {
      song.file = `./assets/Music/${element}`
    }

  });
  console.log(songs)
  return { songs, artists }

}
// assets/Albums/Agar-Tum-Saath-Ho.jpg
async function setupMusic() {

  let setMusicIndex = 0;

  // NEW variables for Radio Mode
  let isRadioMode = false;
  let currentRadioGenre = null;
  let radioQueue = []; // This will hold the shuffled genre-specific song list
  let currentRadioQueueIndex = 0;

  const { songs, artists } = await getSongs();
  const myMusic = new Audio(songs[setMusicIndex].file);
  console.log(songs[setMusicIndex].file);

  const start = document.getElementById('play-pause');
  const next = document.getElementById('next');
  const Before = document.getElementById('previous');
  const seeker = document.getElementById('SeekBar');


  // for album img id dynamic
  const album = document.getElementById('player-art')
  const alb = songs[setMusicIndex].image
  const imgg = document.createElement('img')
  console.log(alb)
  imgg.src = alb; // <-- FIX: Removed ./
  imgg.style.width = "100%"
  album.innerHTML = ""
  album.appendChild(imgg)

  // for alubum title
  const tit = document.getElementById('player-title')
  const ti = document.createElement('b')
  ti.textContent = songs[setMusicIndex].title
  console.log("Title of the song", songs.title)
  tit.innerHTML = ""
  tit.appendChild(ti)


  // for greet
  const Greet = document.getElementById('greet')
  const gt = document.createElement('b')
  const tim = new Date
  const tim24 = tim.getHours()
  console.log("Current Time", tim24)
  if (tim24 < 12) {
    gt.textContent = "Good Morning🌄"
  } else if (tim24 < 18) {
    gt.textContent = "Good Afternoon☀️"
  } else {
    gt.textContent = "Good Evening🌛"
  }
  Greet.innerHTML = ""
  Greet.appendChild(gt)


  // --- Reusable Function to display SONG CARDS ---
  function displaySongs(songLists, Container) {
    Container.innerHTML = ""
    songLists.forEach(song => {
      const Card = document.createElement('div');
      Card.className = "card song-card";

      Card.innerHTML = `<div class="card-image">
        <img src="${song.image}" alt="${song.title}"></div>
                                  <div class="card-info">
                                  <h4>${song.title}</h4>
                                  <p>${song.artist}</p>
                                  </div>`;

      Card.addEventListener('click', () => {
        isRadioMode = false; // Turn off radio mode
        console.log(`This titled song ${song.title} is clicked`);

        const originalIndexInFullList = songs.findIndex(s => s.file === song.file);

        if (originalIndexInFullList !== -1) {
          setMusicIndex = originalIndexInFullList;

          myMusic.src = song.file;
          myMusic.load();
          myMusic.play();

          imgg.src = song.image; // <-- FIX: Removed ./
          ti.textContent = song.title;
        } else {
          console.error("Error: Clicked song not found in the original song list. Cannot play.");
        }
      });
      Container.appendChild(Card);
    });
  }

  // --- Hamburger Menu Logic  ---
  const hamburgerBtn = document.querySelector('.on-media .hamburger');
  const sidebar = document.querySelector('.section1');
  const sidebarLinks = document.querySelectorAll('.section1 .nav-item a');

  if (hamburgerBtn && sidebar && sidebarLinks) {

    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });

    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('active');
      });
    });
  }


  // --- Load Trending Songs on Page Load ---
  const cardContainer = document.getElementById('cards');

  const RandomSong = [...songs];
  for (let i = RandomSong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = RandomSong[i];
    RandomSong[i] = RandomSong[j];
    RandomSong[j] = temp;
  }
  const randomSong = RandomSong.slice(0, 6);

  displaySongs(randomSong, cardContainer)


  // --- Page Switching & Artist Page Logic ---
  const viewport = document.querySelector('.viewport');
  const artistPage = document.querySelector('.mainArtistpg');
  const artistBackBtn = document.getElementById('artist-back-btn');
  const artistPic = document.querySelector('.ArtistProfilePic');
  const artistNameEl = document.querySelector('.ArtistName');
  const artistSongGrid = document.getElementById('artist-song-grid');

  // NEW references for the Playlist (Radio) page
  const playlistView = document.getElementById('playlist-view');
  const playlistBackBtn = document.getElementById('playlist-back-btn');
  const plImg = document.getElementById('pl-img');
  const plTitle = document.getElementById('pl-title');
  const plDesc = document.getElementById('pl-desc');
  const plPlayBtn = document.getElementById('pl-play-btn');
  const plSongsContainer = document.getElementById('pl-songs-container');

  // ADDED: Main scroll area for fixing page top
  const mainContentArea = document.querySelector('.section2');

  // Back button for Artist Page
  artistBackBtn.addEventListener('click', () => {
    viewport.style.display = "flex"
    artistPage.style.display = "none"
    mainContentArea.scrollTop = 0; // <-- ADDED
  })

  // Back button for Playlist Page
  playlistBackBtn.addEventListener('click', () => {
    viewport.style.display = 'flex';
    playlistView.style.display = 'none';
    isRadioMode = false;
    mainContentArea.scrollTop = 0; // <-- ADDED
  });


  // --- Popular Artists Logic ---
  const RandUser = Math.floor(Math.random() * 10000000)
  console.log(RandUser, "Users")

  const popA = document.getElementById('POP-artists')
  popA.innerHTML = ""

  const RandomArtist = [...artists]
  for (let index = RandomArtist.length - 1; index > 0; index--) {
    const j = Math.floor(Math.random() * (index + 1))
    const temp = RandomArtist[index]
    RandomArtist[index] = RandomArtist[j]
    RandomArtist[j] = temp
  }
  const randomArtist = RandomArtist.slice(0, 6)

  randomArtist.forEach(artist => {
    const CardforArtist = document.createElement('div')
    CardforArtist.className = "card artist-card"

    CardforArtist.innerHTML = `<div class="card-image rounded">
      <img src="${artist.image}" alt=""></div>
                              <div class="card-info">
                              <h4>${artist.name}</h4>
                              </div>`

    CardforArtist.addEventListener('click', () => {
      viewport.style.display = "none"
      artistPage.style.display = "flex"
      mainContentArea.scrollTop = 0; // <-- ADDED

      const imgeforpro = document.createElement('img')
      imgeforpro.src = artist.image
      artistPic.innerHTML = ""
      imgeforpro.style.width = "100%";
      imgeforpro.style.height = "100%";
      imgeforpro.style.objectFit = "cover";
      artistPic.appendChild(imgeforpro)

      const naam = document.createElement('h4')
      naam.textContent = artist.name
      artistNameEl.innerHTML = ""
      artistNameEl.appendChild(naam)

      const ArtistsSong = songs.filter(song => (song.artist).includes(artist.name))
      displaySongs(ArtistsSong, artistSongGrid)
    })

    popA.appendChild(CardforArtist)
  });

  // --- Artist Page Play Button Logic ---
  const artistPlayBtn = document.getElementById('pl-play-btn1');

  artistPlayBtn.addEventListener('click', () => {
    const artistName = artistNameEl.querySelector('h4').textContent;

    if (artistName) {

      const artistSongs = songs.filter(song => song.artist.includes(artistName));

      if (artistSongs.length > 0) {
        isRadioMode = false;

        const firstSong = artistSongs[0];
        const originalIndex = songs.findIndex(s => s.file === firstSong.file);

        if (originalIndex !== -1) {

          setMusicIndex = originalIndex;
          myMusic.src = firstSong.file;
          myMusic.load();
          myMusic.play();
          imgg.src = firstSong.image; // <-- FIX: Removed ./
          ti.textContent = firstSong.title;
        }
      }
    }
  });
  // section1 home button action

  const homebtn = document.getElementById('Home-btn')
  homebtn.addEventListener('click', (e) => { // Added 'e'
    e.preventDefault(); // Stop page from jumping

    if (playlistView.style.display === 'flex') {
      playlistView.style.display = 'none'
      viewport.style.display = 'flex'
      mainContentArea.scrollTop = 0; // <-- ADDED
    } else if (artistPage.style.display === "flex") {
      viewport.style.display = "flex"
      artistPage.style.display = "none"
      mainContentArea.scrollTop = 0; // <-- ADDED
    }

  })

  // --- Discover Class Logic ---
  const disbtn = document.getElementById('discovery-btn');
  const discoverImg = document.querySelector('#album img');
  
  disbtn.addEventListener('click', () => {
    isShuffle = true
    shuffle.innerHTML = ' <span class="material-symbols-outlined" style="background-color: greenyellow;;">shuffle</span>';

    const randomIndex = Math.floor(Math.random() * songs.length)
    setMusicIndex = randomIndex
    const newSong = songs[setMusicIndex]; 

    myMusic.src = newSong.file
    myMusic.load()
    myMusic.play()

    imgg.src = newSong.image; 
    ti.textContent = newSong.title;

    if (discoverImg) {
      discoverImg.src = newSong.image; 
    }
  });

  // --- Radio Card Logic ---
  const radioCards = document.querySelectorAll('.radio-card');

  radioCards.forEach(card => {
    card.addEventListener('click', () => {
      // Get genre from the card's ID
      const genre = card.id;
      currentRadioGenre = genre; // Store this for the play button

      // Get image source
      const genreImage = card.querySelector('img').src;

      // Filter songs by this genre
      const genreSongs = songs.filter(song => song.genre === genre);

      // 1. Populate the playlist header
      plImg.innerHTML = `<img src="${genreImage}" alt="${genre}">`;
      plTitle.textContent = `${genre} Radio`;
      plDesc.textContent = `Your personal station for ${genre} music.`;

      // 2. Populate the song list
      displaySongs(genreSongs, plSongsContainer);

      // 3. Switch views
      viewport.style.display = 'none';
      playlistView.style.display = 'flex';
      mainContentArea.scrollTop = 0; // <-- ADDED
    });
  });

  // Playlist "Play" button logic
  plPlayBtn.addEventListener('click', () => {
    isRadioMode = true; // Turn on Radio Mode!

    // Get all songs for the current genre
    let genreSongs = songs.filter(song => song.genre === currentRadioGenre);

    // Shuffle them to create a radio queue
    for (let i = genreSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [genreSongs[i], genreSongs[j]] = [genreSongs[j], genreSongs[i]];
    }

    radioQueue = genreSongs; // Store the shuffled queue
    currentRadioQueueIndex = 0; // Reset the queue index

    // 3. Start playing the first song from the queue
    if (radioQueue.length > 0) {
      const firstSong = radioQueue[currentRadioQueueIndex];
      setMusicIndex = songs.findIndex(s => s.file === firstSong.file);

      if (setMusicIndex !== -1) {
        myMusic.src = firstSong.file;
        myMusic.load();
        myMusic.play();
        imgg.src = firstSong.image;
        ti.textContent = firstSong.title;
      }
    } else {
      console.log(`No songs found for genre: ${currentRadioGenre}`);
    }
  });


  // --- Shuffle Button Logic ---
  const shuffle = document.getElementById('Shuffle')
  let isShuffle = false

  shuffle.addEventListener('click', () => {
    isShuffle = !isShuffle

    if (isShuffle) {
      shuffle.innerHTML = ' <span class="material-symbols-outlined" style = "background-color: greenyellow;;">shuffle</span>'
    } else {
      shuffle.innerHTML = '<span class="material-symbols-outlined">shuffle</span>'

    }
    console.log(isShuffle ? "on" : "off")
  })


  // --- Seekbar Logic ---
  function updateSeekBg() {
    if (!seeker) return;
    const min = parseFloat(seeker.min) || 0;
    const max = parseFloat(seeker.max) || 1;
    const val = parseFloat(seeker.value) || 0;

    const pct = Math.max(0, Math.min(100, (val - min) / (max - min) * 100));

    seeker.style.background = `linear-gradient(90deg, #fff ${pct}%, rgba(255,255,255,0.18) ${pct}%)`;
  }

  myMusic.addEventListener('loadedmetadata', () => {
    seeker.max = myMusic.duration;
    updateSeekBg();
  });

  myMusic.addEventListener('timeupdate', () => {
    seeker.value = myMusic.currentTime;
    updateSeekBg();
  });

  seeker.addEventListener('input', () => {
    myMusic.currentTime = seeker.value;
    updateSeekBg();
  });


  // --- Play/Pause Button Logic ---
  start.addEventListener('click', () => {
    if (myMusic.paused) {
      myMusic.play();
      console.log("....playing");
      start.innerHTML = '<span class="material-symbols-outlined">pause</span>';
    } else {
      myMusic.pause();
      console.log("Music is paused");
      start.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
    }
  });

  myMusic.addEventListener('play', () => {
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';
  })

  myMusic.addEventListener('pause', () => {
    start.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
  })


  // --- UPDATED Next/Previous Button Logic ---
  next.addEventListener('click', () => {
    console.log('next is pressed');
    myMusic.pause();
    let newIndex; // This will be the index from the MAIN songs array

    if (isRadioMode) {
      console.log("Playing next song in radio queue...");
      // Increment radio index and loop around
      currentRadioQueueIndex = (currentRadioQueueIndex + 1) % radioQueue.length;
      const nextRadioSong = radioQueue[currentRadioQueueIndex];
      // Find the song's real index in the main 'songs' array
      newIndex = songs.findIndex(s => s.file === nextRadioSong.file);

    } else if (isShuffle) {
      console.log("playing in random order");
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === setMusicIndex);

    } else {
      console.log("playing in next order");
      newIndex = (setMusicIndex + 1) % songs.length;
    }

    // Set the main index and play the song
    if (newIndex !== -1) {
      setMusicIndex = newIndex;
      myMusic.src = songs[setMusicIndex].file;
      myMusic.load();
      myMusic.play();
      imgg.src = songs[setMusicIndex].image;
      ti.textContent = songs[setMusicIndex].title;
    }
  });

  Before.addEventListener('click', () => {
    console.log("previous is pressed");
    myMusic.pause();
    let newIndex; // This will be the index from the MAIN songs array

    if (isRadioMode) {
      console.log("Playing previous song in radio queue...");
      // Decrement radio index and loop around
      currentRadioQueueIndex = (currentRadioQueueIndex - 1 + radioQueue.length) % radioQueue.length;
      const prevRadioSong = radioQueue[currentRadioQueueIndex];
      // Find the song's real index in the main 'songs' array
      newIndex = songs.findIndex(s => s.file === prevRadioSong.file);

    } else if (isShuffle) {
      console.log("playing in random order");
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === setMusicIndex);

    } else {
      console.log("playing in previous order");
      newIndex = (setMusicIndex - 1 + songs.length) % songs.length;
    }

    // Set the main index and play the song
    if (newIndex !== -1) {
      setMusicIndex = newIndex;
      myMusic.src = songs[setMusicIndex].file;
      myMusic.load();
      myMusic.play();
      imgg.src = songs[setMusicIndex].image;
      ti.textContent = songs[setMusicIndex].title;
    }
  });

  // auto next clicker
  myMusic.addEventListener('ended', () => {
    console.log("auto next is triggred")
    next.click();
  })

  updateSeekBg();
}

setupMusic();