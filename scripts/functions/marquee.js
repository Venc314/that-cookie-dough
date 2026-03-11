document.addEventListener("DOMContentLoaded", () => {

    const track = document.getElementById("marqueeTrack");
    if (!track) return;

    const content = track.querySelector(".marquee-content");

    // Duplicate content for seamless scroll illusion
    track.appendChild(content.cloneNode(true));

    const speedFactor = 0.5;

    function updateMarquee(){

        const scrollY = window.scrollY;
        const trackWidth = track.scrollWidth / 2;

        const translateX = -(scrollY * speedFactor % trackWidth);

        track.style.transform =
            `translate3d(${translateX}px,0,0)`;

        requestAnimationFrame(updateMarquee);
    }

    updateMarquee();
});