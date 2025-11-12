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
  // for discovery id dynamic

const album = document.getElementById('album')
const alb = songs[setMusicIndex].image
const imgg = document.createElement('img')
console.log(alb)
imgg.src = alb
imgg.style.width = "100%"
album.innerHTML = ""
album.appendChild(imgg)


// leave it its for seekbar  ---start--- 
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

  next.addEventListener('click', () => {
    console.log('next is pressed');
    myMusic.pause();
    setMusicIndex = (setMusicIndex + 1) % songs.length;
    myMusic.src = songs[setMusicIndex].file;
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';

    imgg.src = songs[setMusicIndex].image
  });

  Before.addEventListener('click', () => {
    console.log("previous is pressed");
    myMusic.pause();
    setMusicIndex = (setMusicIndex - 1 + songs.length) % songs.length;
    myMusic.src = songs[setMusicIndex].file;
    console.log(setMusicIndex);

    myMusic.load();
    myMusic.play();
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';

    imgg.src = songs[setMusicIndex].image
  });
  updateSeekBg(); 
}
setupMusic();




