
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
  songs.forEach(song => {
    console.log(song.file)
    const element = song.file
    if (element.endsWith(".mp3")){
      song.file =`./assets/Music/${element}`
    }
    
  });
  // console.log(songs)
return songs

}
// assets/Albums/Agar-Tum-Saath-Ho.jpg
async function setupMusic() {

  let setMusicIndex = 0;
  const songs = await getSongs();
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
imgg.src =`./${alb}`
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
console.log("Current Time",tim24)
if (tim24<12) {
  gt.textContent = "Good Morning🌄"
}else if (tim24<18) {
  gt.textContent = "Good Afternoon☀️"
} else {
  gt.textContent = "Good Evening🌛"
}
Greet.innerHTML = ""
Greet.appendChild(gt)


// shuffle

const shuffle = document.getElementById('Shuffle')
let isShuffle = false

shuffle.addEventListener('click', ()=>{
  isShuffle = !isShuffle
  
  if (isShuffle){
    shuffle.innerHTML = ' <span class="material-symbols-outlined" style = "color:white;">shuffle</span>'
  }else{
    shuffle.innerHTML = '<span class="material-symbols-outlined">shuffle</span>'
    
  }
  console.log( isShuffle ? "on":"off")
})




// leave it, its for seekbar  ---start--- 
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

// ----end----
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


  myMusic.addEventListener('play',()=>{
        start.innerHTML = '<span class="material-symbols-outlined">pause</span>';
  })

  myMusic.addEventListener('pause',()=>{
     start.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
  })


  next.addEventListener('click', () => {
    console.log('next is pressed');
    myMusic.pause();
    let newIndex
      // shuffle of next
    if(isShuffle){
      console.log("playing in random order")
    do {
      newIndex = Math.floor(Math.random()*songs.length)
    } while (newIndex === setMusicIndex);
      setMusicIndex = newIndex
    }else{
      console.log("playing in next order")
    setMusicIndex = (setMusicIndex + 1) % songs.length;
    }
            // end shuffle

    myMusic.src = songs[setMusicIndex].file;
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    

    imgg.src = songs[setMusicIndex].image
    ti.textContent = songs[setMusicIndex].title
  });

  Before.addEventListener('click', () => {
    console.log("previous is pressed");
    myMusic.pause();

    let newIndex;
      // shuffle of previous
    if(isShuffle){
      console.log("playing in random order")
    do {
      newIndex = Math.floor(Math.random()*songs.length)
    } while (newIndex === setMusicIndex);
      setMusicIndex = newIndex
    }else{
      console.log("playing in previous order")
    
      setMusicIndex = (setMusicIndex - 1 + songs.length) % songs.length;
    }
          //  end shuffle
    myMusic.src = songs[setMusicIndex].file;
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    

    
    imgg.src = songs[setMusicIndex].image
     ti.textContent = songs[setMusicIndex].title
  });
      // auto next clicker
   myMusic.addEventListener('ended', ()=>{
      console.log("auto next is triggred")
      next.click();
   })
  updateSeekBg(); 
}
setupMusic();




