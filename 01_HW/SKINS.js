// all the skin CSS files inside SKINS folder
const skins = ["basic.css", "dark.css", "modern.css"];
let currentIndex = 0;

function switchSkin() {
    const link = document.getElementById("skinLink");
    if (!link) return;

    // go to next skin
    currentIndex = (currentIndex + 1) % skins.length;

    // update the CSS href
    link.href = "SKINS/" + skins[currentIndex];
}
