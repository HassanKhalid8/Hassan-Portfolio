# 3D Portfolio — "Journey Through Space"

A single-page 3D portfolio. Scrolling flies a camera through a star tunnel;
each section is a color-themed "zone" with its own floating wireframe sculpture.
Built with **Three.js** + **GSAP ScrollTrigger** — no build step, pure static files.

## Run it

Open `index.html` with any static server, e.g.:

```
npx http-server . -p 4173
```

(Opening the file directly also works since everything loads from CDNs.)

## Features

- Scroll-driven 3D camera journey with star field + zone sculptures
- Theme color morphs per section (3D fog + CSS accent stay in sync)
- Loader, scroll progress bar, side nav dots, custom cursor
- Reveal/parallax transitions, typewriter hero, animated stat counters,
  skill bars, 3D-tilt project cards

## Info needed to personalize (everything in `[brackets]`)

1. **Name + titles/roles** (hero typewriter cycles through 2–3 roles)
2. **About** — short bio (2 paragraphs) + real stats for the 4 counters
3. **Education** — entries: dates, degree, institution, one-line description
4. **Experience** — internship role, company, city/remote, dates, 3 bullet points, tech tags
5. **Skills** — languages / frameworks / tools with rough % levels, plus extra tags
6. **Projects** — name, 1–2 line description, tech tags, code/live links + screenshots
7. **Certifications** — name, issuer, date, one-line note + certificate image
   (drop as `assets/cert1.jpg` etc., replace the `.cert-img-ph` div with an `<img>`)
8. **Short films** — title, genre, runtime, your role, description, YouTube link
   + poster image (`assets/film1-poster.jpg`) and trailer embed
   (replace `.trailer-ph` with a YouTube `<iframe src="https://www.youtube.com/embed/VIDEO_ID">`)
9. **Interests** — up to 4 with an emoji each
10. **Contact** — email, GitHub/LinkedIn/other links, availability line

Files: `index.html` (content), `css/style.css` (design), `js/main.js`
(3D scene + animations — roles list is near the bottom under "Typewriter").
