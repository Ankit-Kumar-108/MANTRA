async function getSongs() {
  const getM = await fetch("./assets/songs.json")
  let text = await getM.json()
  console.log(text);


  // const div = document.createElement('div')
  // div.innerHTML = text.songs
  const as = text.songs
  // console.log(as)

  let songs = []
  for (let index = 0; index < as.length; index++) {
    const element = as[index];
    if (element.endsWith(".mp3"))
      songs.push(`./assets/Music/${element}`)

  }
   console.log(songs)
  return songs

}

async function setupMusic() {

  let setMusicIndex = 0;
  const songs = await getSongs();
  const myMusic = new Audio(songs[setMusicIndex]);
  console.log(songs[setMusicIndex]);

  const start = document.getElementById('play-pause');
  const next = document.getElementById('next');
  const Before = document.getElementById('previous');
  const seeker = document.getElementById('SeekBar');

  // 1. --- ADD THIS HELPER FUNCTION ---
  // This function will update the gradient background for Chrome/Edge
  function updateSeekBg() {
    if (!seeker) return;
    const min = parseFloat(seeker.min) || 0;
    // Use seeker.max, which we set in 'loadedmetadata'
    const max = parseFloat(seeker.max) || 1; 
    const val = parseFloat(seeker.value) || 0;
    
    const pct = Math.max(0, Math.min(100, (val - min) / (max - min) * 100));
    
    seeker.style.background = `linear-gradient(90deg, #fff ${pct}%, rgba(255,255,255,0.18) ${pct}%)`;
  }
  // --- END OF HELPER FUNCTION ---


  myMusic.addEventListener('loadedmetadata', () => {
    seeker.max = myMusic.duration;
    updateSeekBg(); // 2. Call on load to set initial state
  });

  myMusic.addEventListener('timeupdate', () => {
    seeker.value = myMusic.currentTime;
    updateSeekBg(); // 3. Call when music updates the time
  });

  seeker.addEventListener('input', () => {
    myMusic.currentTime = seeker.value;
    updateSeekBg(); // 4. Call when user drags the slider
  });


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

  next.addEventListener('click', () => {
    console.log('next is pressed');
    myMusic.pause();
    setMusicIndex = (setMusicIndex + 1) % songs.length;
    myMusic.src = songs[setMusicIndex];
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';
  });

  Before.addEventListener('click', () => {
    console.log("previous is pressed");
    myMusic.pause();
    setMusicIndex = (setMusicIndex - 1 + songs.length) % songs.length;
    myMusic.src = songs[setMusicIndex];
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';
  });

  // 5. Call once when script first runs to set 0% state
  updateSeekBg(); 
}
setupMusic();