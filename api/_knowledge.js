/* ============================================================
   PORTFOLIO KNOWLEDGE BASE
   The single source of truth the AI copilot is allowed to
   answer from. Keep this in sync with index.html — anything
   not written here, the bot must refuse to answer.
   ============================================================ */

const KNOWLEDGE = `
## IDENTITY
- Name: Hassan Khalid
- Who: Final-year Computer Engineering student at GIKI (Ghulam Ishaq Khan Institute of Engineering Sciences & Technology, Topi), Class of 2027.
- Based in: Karachi, Pakistan.
- Roles: Full-stack developer, filmmaker & video editor, AI/ML enthusiast, computer engineer, UI/UX designer.
- Vice President of the GIKI Media Club.
- Status: Open to remote jobs, collaborations, and interesting AI / software / creative-tech projects.
- 3+ years coding, 15+ projects built.
- Currently focused on: deploying machine learning models to production, refining his full-stack workflow, and final-year engineering milestones.

## CONTACT
- Email: hassank8125@gmail.com (usually replies within 24 hours)
- GitHub: https://github.com/HassanKhalid8
- LinkedIn: https://www.linkedin.com/in/hassankhalid8/

## SKILLS
- Languages: C, C++, C#, Python, MATLAB, SQL, Assembly (8051), Assembly (RISC-V), Verilog (HDL)
- Web & Mobile: HTML5, CSS3, JavaScript, React.js, React Native, Flask, REST APIs, WordPress, Framer Motion
- Embedded & Hardware: ESP32, Arduino IDE, Blynk, 8051 Microcontroller, Proteus, Keil uVision, MATLAB/Simulink
- Infrastructure & Tools: MySQL, PostgreSQL, Supabase, Git, GitHub Actions, VS Code, Figma
- Creative Suite: DaVinci Resolve, Premiere Pro, Canva, Photoshop

## WEB PROJECTS
1. NOVA-16 Enhanced ISA Emulator — A browser-based emulator for a custom 16-bit RISC architecture featuring a pipeline visualizer, cache simulator, hazard detection, and an AI-powered assembly code generator. Tech: Python, Flask, JavaScript, HTML/CSS, Gemini API. Live: https://nova-16-enhanced-isa-emulator.vercel.app
2. JobConnect — A modern, serverless full-stack recruitment platform built with React and Firebase that streamlines hiring by connecting job seekers and employers through real-time data management and automated communication workflows. Tech: React.js, CSS, Firebase, Vercel, EmailJS. Live: https://job-connect-delta-woad.vercel.app

## ENGINEERING LAB (hardware, signals & core CS projects)
1. Virtual Pet Adoption System (C++, OOP) — Text-based console simulator featuring an integrated multi-tier pet management system, dynamic state tracking, and mini-game economies. Code: https://github.com/HassanKhalid8/Virtual-Pet-Adoption-System
2. Online Store Management System (C++, Data Structures) — Console-based store management system leveraging custom-built data structures, including a Binary Search Tree (BST) for high-efficiency product inventory indexing and a linear Queue for sequential order processing. Code: https://github.com/HassanKhalid8/Online-Store-Management-System
3. IC-Based Smart Door Lock (Digital Logic Design, Logic ICs) — Hardware-based electronic security system using five 4017 decade counters and a multi-input AND gate to validate precise sequential pulse inputs for a code-lock mechanism. A project report PDF is available on the site.
4. Metal Detector (Analog Electronics) — Inductive proximity metal detector using a TDA0161 IC and a custom-wound AWG wire search coil to sound a buzzer via transistor amplification upon detecting localized electromagnetic changes. A project report PDF is available on the site.
5. Smart IoT Kitchen (ESP32, IoT, Blynk, Arduino IDE) — An ESP32-powered kitchen that watches itself: gas, flame and temperature sensors stream to a dashboard with remote alerts and appliance control.
6. Exoplanet Signal Detection (MATLAB, Signal Processing) — MATLAB-based Exoplanet Transit Detection System featuring an interactive GUI, Box Least Squares (BLS) signal filtering algorithms, and interactive 3D orbital modeling to process raw light-curve data. Code: https://github.com/HassanKhalid8/Exoplanet-Transit-Detection-System
7. Adaptive Radar Signal Processing (MATLAB, DSP) — Radar detection pipeline featuring LFM pulse compression with matched filtering, MTI clutter suppression, 2D range-Doppler FFT analysis, and adaptive CFAR thresholding across simulated X-band scenarios. Code: https://github.com/HassanKhalid8/adaptive-radar-signal-processing
8. Principal Component Analysis (Python, Numerical Analysis) — Co-authored a scratch-built PCA engine in Python to process and denoise a 167-country socioeconomic dataset, evaluating custom matrix decomposition and four-metric Mean Squared Error (MSE) analysis against scikit-learn benchmarks. Code: https://github.com/HassanKhalid8/Prncipal-Component-Analysis-CMT
9. Instant Messaging (Python, Computer Networks) — Client-server instant messaging application in Python utilizing multi-threaded TCP sockets, custom binary framing, and synchronized queue state processing to handle concurrent broadcast and unicast message routing through a Tkinter GUI. Code: https://github.com/HassanKhalid8/instant-messaging

## EXPERIENCE
- Full-Stack Intern @ ENUMS (Jul 2026 – Present, on-site) — Bridging client-side aesthetics with robust server-side logic to develop clean, efficient, user-centric digital solutions.
- Machine Learning Intern @ FlyRank AI (Jul 2026 – Present, remote) — Building scalable ML pipelines and implementing efficient algorithms to bridge data science and production environments.
- AI Intern @ NCL (Jun 2024 – Aug 2024, on-site) — Integrated cutting-edge AI models into functional, user-centric applications.
- Vice President @ Media Club, GIKI (Sep 2023 – Present) — Joined out of a passion for video editing; now leads the teams and productions that shaped him.

## CERTIFICATIONS
- IC Design Summer School — DreamBig (Aug 2025): intensive program on modern semiconductor design workflows and EDA tools.
- Vice President — Media Club, GIKI (May 2026).
- AI Fluency: Framework & Foundations — Anthropic (May 2026): Anthropic's 4D framework (delegation, description, discernment, diligence).
- Claude 101 — Anthropic (Jun 2026): model capabilities, prompting techniques, practical workflows.
- Claude Code 101 — Anthropic (Jul 2026): hands-on agentic development with Claude Code.

## EDUCATION
- BS Computer Engineering, GIKI, Topi (2023–2027).
- FSc Pre-Engineering, Punjab Group of Colleges, Kot Addu (2021–2023).
- Matriculation (Computer Science focus), The City School, Kot Addu (2012–2021).
- Early schooling: Sultan Muhammad Shah Agha Khan School, Karachi (2009–2012).

## SHORT FILMS (produced with the GIKI Media Club)
- AKS (Thriller, 33 min) — Role: Co-Director. A desperate student saved from suicide by a mysterious caller who begins controlling his future.
- INIKAAS (Psychological, 31 min) — Role: Post-Production Head. A girl battles terrifying hallucinations and guilt in a clinical setting, untangling reality from illusion.
- BARZAKH (Drama, 47 min) — Role: Cinematographer. A university student's life spirals after a family loss — addiction, betrayal, murder and revenge.
- All three are watchable on YouTube via the portfolio's Short Films section.

## INTERESTS
Cricket (watching & playing since age ten), gaming, video editing (self-taught at fifteen), collecting Lego, swimming, Rubik's cube (solves 3x3 in under a minute), badminton (former school team captain), padel.

## FUN FACTS
- Runs on coffee (450+ cups logged on the site).
- His build method: Scope -> Prototype -> Refine -> Ship.
- The portfolio itself is a 3D space-flight themed site built with Three.js and GSAP.
`;

module.exports = { KNOWLEDGE };
