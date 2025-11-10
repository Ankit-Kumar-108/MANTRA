async function getSongs() {
 const getM = await fetch("http://127.0.0.1:3000/assets/Music/")
 let text = await getM.text()
  console.log(text);


 const div = document.createElement('div')
 div.innerHTML = text
 const as = div.getElementsByTagName('a')
  console.log(as)

  let songs = []
 for(let index = 0; index < as.length; index++){
    const element = as[index];
    if (element.href.endsWith(".mp3"))
      songs.push(element.href)

 }
       console.log(songs)
       return songs
 
}

async function callMusic() {
  const songs = await getSongs()
  
  console.log(songs)
}

callMusic()
