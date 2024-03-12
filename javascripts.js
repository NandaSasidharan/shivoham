// to toggle the menu bar
function showMenu(){
  navLinks.style.right = "0";
}
function hideMenu(){
  navLinks.style.right = "-200px";
}


function slideRight(){
  var i, x, y;
  for (i = 0; i < count; i++){
    x = document.getElementById("share"+i);
    y = window.getComputedStyle(x).getPropertyValue('display');
    if (y=="block") {
      x.style.display="none"
      x = document.getElementById("share"+((i+1)%count));
      x.style.display="block";
      break;
    }
  }
}

function slideLeft(){
  var i, x, y;
  for (i = 2*count-1; i >= count; i--){
    x = document.getElementById("share"+(i%count));
    y = window.getComputedStyle(x).getPropertyValue('display');
    if (y=="block") {
      x.style.display="none"
      x = document.getElementById("share"+((i-1)%count));
      x.style.display="block";
      break;
    }
  }
}



// to include html snippets
function includeHTML() {
  var z, i, elmnt, file, xhttp;
  /* Loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    /*search for elements with a certain atrribute:*/
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      /* Make an HTTP request using the attribute value as the file name: */
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {elmnt.innerHTML = this.responseText;}
          if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
          /* Remove the attribute, and call this function once more: */
          elmnt.removeAttribute("w3-include-html");
          includeHTML();
        }
      }
      xhttp.open("GET", file, true);
      xhttp.send();
      /* Exit the function: */
      return;
    }
  }
}

/*
  * Light YouTube Embeds by @labnol
  * Credit: https://www.labnol.org/
  */

 function labnolIframe(div) {
   var iframe = document.createElement('iframe');
   iframe.setAttribute('src', 'https://www.youtube.com/embed/' + div.dataset.id + '?autoplay=1');
   iframe.setAttribute('frameborder', '0');
   iframe.setAttribute('allowfullscreen', '1');
   iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
   div.parentNode.replaceChild(iframe, div);
 }

 function initYouTubeVideos() {
   var playerElements = document.querySelectorAll('.youtube-player');
   for (var n = 0; n < playerElements.length; n++) {
     var videoId = playerElements[n].dataset.id;
     var div = document.createElement('div');
     div.setAttribute('data-id', videoId);
     var thumbNode = document.createElement('img');
     thumbNode.src = '//i.ytimg.com/vi/ID/hqdefault.jpg'.replace('ID', videoId);
     div.appendChild(thumbNode);
     var playButton = document.createElement('div');
     playButton.setAttribute('class', 'play');
     div.appendChild(playButton);
     div.onclick = function () {
       labnolIframe(this);
     };
     playerElements[n].appendChild(div);
   }
 }

 document.addEventListener('DOMContentLoaded', initYouTubeVideos);

// Interpreter observer code || ref: https://github.com/kevin-powell/navbar-change-on-scroll
