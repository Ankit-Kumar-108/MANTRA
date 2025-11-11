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

  let setMusicIndex = 0


  const songs = await getSongs()

  const myMusic = new Audio(songs[setMusicIndex])
  console.log(songs[setMusicIndex])

  const start = document.getElementById('play-pause')
  const next = document.getElementById('next')
  const Before = document.getElementById('previous')
  const seeker = document.getElementById('SeekBar')

  myMusic.addEventListener('loadedmetadata',()=>{
       seeker.max = myMusic.duration
  })

  myMusic.addEventListener('timeupdate',()=>{
       seeker.value = myMusic.currentTime
  })

  seeker.addEventListener('input',()=>{
       myMusic.currentTime = seeker.value
  })


  start.addEventListener('click', () => {
    if (myMusic.paused) {
      myMusic.play()
      console.log("....playing")
      start.innerHTML = '<span class="material-symbols-outlined">pause</span>'
    } else {
      myMusic.pause()
      console.log("Music is paused")
      start.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>'
    }

  })

  next.addEventListener('click', () => {
    console.log('next is pressed')

    myMusic.pause()
    setMusicIndex = (setMusicIndex + 1 ) % songs.length
    myMusic.src = songs[setMusicIndex]
    console.log(setMusicIndex)

    myMusic.load()
    
    myMusic.play()
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>'

  })


  Before.addEventListener('click', () => {
    console.log("previous is pressed")

    myMusic.pause()
    setMusicIndex = (setMusicIndex -1 + songs.length) % songs.length
    myMusic.src = songs[setMusicIndex]
    console.log(setMusicIndex)

    myMusic.load()

    myMusic.play()
    start.innerHTML = '<span class="material-symbols-outlined">pause</span>';

  })
}
setupMusic()