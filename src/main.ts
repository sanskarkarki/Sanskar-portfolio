import kaboom from "kaboom";
import type { EventController, GameObj, KaboomCtx, Key } from "kaboom";
import { MAP_OBJECTS, PLAYER_SPAWN, NPC_POSITIONS, TERRAIN_GRID, T_WATER, MAP_TILE_SIZE } from "./game/world/mapData";
import { portfolioById } from "./content/glossary";

declare global {
    interface Window {
        _injectDialogButtons?: () => void;
    }
}

const languages = ["en", "ne", "hi", "es", "de"] as const;
type Language = typeof languages[number];

let currentLang: Language = "en";

const WORLD_STATE_KEY = "sanskar-world-state-v3";
const WORLD_RETURN_KEY = "sanskar-world-return-v3";

type SavedWorldState = {
    version: 3;
    started: boolean;
    playerX: number;
    playerY: number;
    currentDir: "south" | "north" | "east" | "west";
    zoom: number;
    language: Language;
    showBanners: boolean;
};

function readSavedWorldState(): SavedWorldState | null {
    try {
        const raw =
            localStorage.getItem(WORLD_STATE_KEY) ??
            sessionStorage.getItem(WORLD_STATE_KEY);

        if (!raw) return null;

        const state = JSON.parse(raw) as Partial<SavedWorldState>;

        if (
            state.version !== 3 ||
            state.started !== true ||
            typeof state.playerX !== "number" ||
            typeof state.playerY !== "number" ||
            !Number.isFinite(state.playerX) ||
            !Number.isFinite(state.playerY)
        ) {
            return null;
        }

        return {
            version: 3,
            started: true,
            playerX: state.playerX,
            playerY: state.playerY,
            currentDir:
                state.currentDir === "north" ||
                state.currentDir === "east" ||
                state.currentDir === "west"
                    ? state.currentDir
                    : "south",
            zoom: typeof state.zoom === "number" && Number.isFinite(state.zoom)
                ? state.zoom
                : 3.5,
            language: languages.includes(state.language as Language)
                ? (state.language as Language)
                : "en",
            showBanners: state.showBanners !== false,
        };
    } catch {
        return null;
    }
}

function saveWorldState(state: SavedWorldState): void {
    const serialized = JSON.stringify(state);

    // localStorage survives the full-page navigation to/from the four
    // portfolio pages. sessionStorage is kept as a fallback.
    try {
        localStorage.setItem(WORLD_STATE_KEY, serialized);
    } catch {
        // Ignore localStorage failures.
    }

    try {
        sessionStorage.setItem(WORLD_STATE_KEY, serialized);
    } catch {
        // Ignore sessionStorage failures.
    }
}

function markPortfolioReturn(): void {
    try {
        localStorage.setItem(WORLD_RETURN_KEY, "1");
    } catch {
        // Ignore storage failures.
    }

    try {
        sessionStorage.setItem(WORLD_RETURN_KEY, "1");
    } catch {
        // Ignore storage failures.
    }
}

function consumePortfolioReturn(): boolean {
    let returning = false;

    try {
        returning = localStorage.getItem(WORLD_RETURN_KEY) === "1";
        localStorage.removeItem(WORLD_RETURN_KEY);
    } catch {
        // Ignore storage failures.
    }

    try {
        if (sessionStorage.getItem(WORLD_RETURN_KEY) === "1") {
            returning = true;
        }
        sessionStorage.removeItem(WORLD_RETURN_KEY);
    } catch {
        // Ignore storage failures.
    }

    return returning;
}

function isReturningFromPortfolio(): boolean {
    try {
        return (
            new URLSearchParams(window.location.search).get("return") === "1" ||
            consumePortfolioReturn()
        );
    } catch {
        return consumePortfolioReturn();
    }
}

const DEFAULT_DIALOG_AVATAR = "/assets/pictures/sanskar-icon.png";

const DIALOG_AVATAR_BY_NPC_ID: Record<string, string> = {
    guide_fountain: "/assets/game/pixellab/characters/npc/guide/south.png",
    recruiter: "/assets/game/pixellab/characters/npc/recruiter/south.png",
    villager_ruins: "/assets/game/pixellab/characters/npc/south.png",
    fisher: "/assets/game/pixellab/characters/npc/east.png",
    cute_girl: "/assets/game/pixellab/characters/npc/cute_girl.png",
};

const DIALOG_AVATAR_BY_POI_ID: Record<string, string> = {
    "company-hq": "/assets/pictures/about-me.png",
};

const t = {
    en: {
        onboardingTitle: "Welcome to Sanskar's World",
        onboardingBody: "Use WASD or tap the screen / joystick to move.<br>Press SPACE or E at the buildings for info.",
        startGame: "Start Game",
        profileDesc: "AI / ML Engineer & Full-Stack Developer",
        cancel: "Cancel",

        npcGuideTitle: "Guide",
        npcGuideText: "Hey there! Welcome to Sanskar's World. Explore the town, interact with the buildings, and discover different parts of the portfolio.",

        npcRecruiterTitle: "Recruiter",
        npcRecruiterText: "Welcome! Explore Sanskar's projects, research, publications, and professional profiles throughout the world.",

        npcRecruiterEasterEgg: "You're persistent, I like that! Keep exploring!",

        npcVillagerTitle: "Local Dev",
        npcVillagerText: "I heard Sanskar works with Python, JavaScript, React, Node.js, MongoDB, Computer Vision, and Machine Learning.",

        npcProjectsTitle: "Architect",
        npcProjectsText: "Sanskar enjoys building practical technology and working across AI, Computer Vision, Machine Learning, and Full-Stack Development.",

        npcCuteGirlTitle: "Tourist",
        npcCuteGirlText: "I'm just visiting! This place has some interesting projects and research to discover.",

        npcFisherTitle: "Fisherman",
        npcFisherText: "The sea is quiet today... Take your time and explore every corner of Sanskar's World.",

        npcSocialsTitle: "Socials",
        npcSocialsText: "Hey there! Check out Sanskar's socials here. Follow along and stay connected.",

        pois: {
            "company-hq": {
                title: "ABOUT ME",
                body: "Welcome to Sanskar's personal space. Explore this world to learn more about his background, interests, skills, and work.",
                actions: {
                    "company-website": "Explore About Me"
                }
            },

            "construction-ruins": {
                title: "Production Zone",
                body: "This area will be expanded with new content later.",
                actions: {
                    "ruins-soon": "Currently Closed"
                }
            },

            "github-house": {
                title: "GitHub Workshop",
                body: "Explore Sanskar's code, repositories, projects, and development work.",
                actions: {
                    "github-open": "Open GitHub"
                }
            },

            "linkedin-house": {
                title: "LinkedIn House",
                body: "Visit Sanskar's professional profile and career information.",
                actions: {
                    "linkedin-open": "Open LinkedIn"
                }
            },

            "projects-lab": {
                title: "Fun Projects Lab",
                body: "Explore projects, experiments, technical work, and interactive demos.",
                actions: {
                    "projects-list": "Open Projects"
                }
            },

            "sign-about": {
                title: "About Sanskar",
                body: "This world is an interactive portfolio. Explore the different locations to discover more.",
                actions: {
                    "action-sign-about-coming-soon": "Coming Soon"
                }
            },

            "sign-controls": {
                title: "Controls",
                body: "Desktop: WASD or Arrow Keys. Interact: E, Enter, Space or Click. Mobile: D-Pad + Interact.",
                actions: {
                    "action-sign-controls-coming-soon": "Got It"
                }
            },

            "twitter-house": {
                title: "Publication",
                body: "Explore Sanskar's research and published work.",
                actions: {
                    "twitter-soon": "Open Publications"
                }
            },

            "youtube-house": {
                title: "Contact Me",
                body: "Get in touch with Sanskar through the contact page and find the available ways to connect.",
                actions: {
                    "youtube-soon": "Open Contact Page"
                }
            }
        }
    },

    ne: {
        onboardingTitle: "Sanskar's World मा स्वागत छ",
        onboardingBody: "चल्न WASD वा स्क्रिन / joystick प्रयोग गर्नुहोस्।<br>जानकारीका लागि भवनमा SPACE वा E थिच्नुहोस्।",
        startGame: "खेल सुरु गर्नुहोस्",
        profileDesc: "AI / ML Engineer & Full-Stack Developer",
        cancel: "रद्द गर्नुहोस्",

        npcGuideTitle: "Guide",
        npcGuideText: "नमस्ते! Sanskar's World मा स्वागत छ। शहर घुम्नुहोस्, भवनहरूसँग interact गर्नुहोस् र portfolio का विभिन्न भागहरू पत्ता लगाउनुहोस्।",

        npcRecruiterTitle: "Recruiter",
        npcRecruiterText: "स्वागत छ! Sanskar का projects, research, publications र professional profiles यस संसारभरि हेर्नुहोस्।",

        npcRecruiterEasterEgg: "तपाईं निकै persistent हुनुहुन्छ! मलाई मन पर्यो। अझै explore गर्नुहोस्!",

        npcVillagerTitle: "Local Dev",
        npcVillagerText: "मैले सुनेको छु Sanskar Python, JavaScript, React, Node.js, MongoDB, Computer Vision र Machine Learning मा काम गर्छन्।",

        npcProjectsTitle: "Architect",
        npcProjectsText: "Sanskar लाई practical technology बनाउन र AI, Computer Vision, Machine Learning तथा Full-Stack Development मा काम गर्न मन पर्छ।",

        npcCuteGirlTitle: "Tourist",
        npcCuteGirlText: "म यहाँ घुम्न आएको हुँ! यहाँ धेरै रोचक projects र research हेर्न पाइन्छ।",

        npcFisherTitle: "Fisherman",
        npcFisherText: "आज समुद्र शान्त छ... समय लिएर Sanskar's World को हरेक कुनामा घुम्नुहोस्।",
        
        npcSocialsTitle: "Socials",
        npcSocialsText: "नमस्ते! यहाँ Sanskar का सामाजिक सञ्जालहरू हेर्नुहोस् र जोडिइरहनुहोस्!",

        pois: {
            "company-hq": {
                title: "ABOUT ME",
                body: "Sanskar को व्यक्तिगत space मा स्वागत छ। उहाँको background, interests, skills र work बारे जान्न यो संसार explore गर्नुहोस्।",
                actions: {
                    "company-website": "About Me हेर्नुहोस्"
                }
            },

            "construction-ruins": {
                title: "Production Zone",
                body: "यो ठाउँमा पछि नयाँ content थपिनेछ।",
                actions: {
                    "ruins-soon": "अहिले बन्द"
                }
            },

            "github-house": {
                title: "GitHub Workshop",
                body: "Sanskar का code, repositories, projects र development work हेर्नुहोस्।",
                actions: {
                    "github-open": "GitHub खोल्नुहोस्"
                }
            },

            "linkedin-house": {
                title: "LinkedIn House",
                body: "Sanskar को professional profile र career information हेर्नुहोस्।",
                actions: {
                    "linkedin-open": "LinkedIn खोल्नुहोस्"
                }
            },

            "projects-lab": {
                title: "Fun Projects Lab",
                body: "Projects, experiments, technical work र interactive demos explore गर्नुहोस्।",
                actions: {
                    "projects-list": "Projects खोल्नुहोस्"
                }
            },

            "sign-about": {
                title: "About Sanskar",
                body: "यो संसार एउटा interactive portfolio हो। विभिन्न locations explore गरेर थप जानकारी पत्ता लगाउनुहोस्।",
                actions: {
                    "action-sign-about-coming-soon": "चाँडै आउँदैछ"
                }
            },

            "sign-controls": {
                title: "Controls",
                body: "Desktop: WASD वा Arrow Keys। Interact: E, Enter, Space वा Click। Mobile: D-Pad + Interact।",
                actions: {
                    "action-sign-controls-coming-soon": "बुझें"
                }
            },

            "twitter-house": {
                title: "Publication",
                body: "Sanskar को research र published work हेर्नुहोस्।",
                actions: {
                    "twitter-soon": "Publications खोल्नुहोस्"
                }
            },

            "youtube-house": {
                title: "Contact Me",
                body: "सम्पर्क पृष्ठमार्फत Sanskar सँग जोडिनुहोस् र उपलब्ध सम्पर्क माध्यमहरू हेर्नुहोस्।",
                actions: {
                    "youtube-soon": "Contact Page खोल्नुहोस्"
                }
            }
        }
    },

    hi: {
        onboardingTitle: "Sanskar's World में आपका स्वागत है",
        onboardingBody: "चलने के लिए WASD या स्क्रीन / joystick का उपयोग करें।<br>जानकारी के लिए buildings पर SPACE या E दबाएँ।",
        startGame: "गेम शुरू करें",
        profileDesc: "AI / ML Engineer & Full-Stack Developer",
        cancel: "रद्द करें",

        npcGuideTitle: "Guide",
        npcGuideText: "नमस्ते! Sanskar's World में आपका स्वागत है। शहर में घूमें, buildings के साथ interact करें और portfolio के अलग-अलग हिस्सों को explore करें।",

        npcRecruiterTitle: "Recruiter",
        npcRecruiterText: "स्वागत है! Sanskar के projects, research, publications और professional profiles को इस world में explore करें।",

        npcRecruiterEasterEgg: "आप काफी persistent हैं! मुझे यह पसंद आया। Explore करते रहें!",

        npcVillagerTitle: "Local Dev",
        npcVillagerText: "मैंने सुना है कि Sanskar Python, JavaScript, React, Node.js, MongoDB, Computer Vision और Machine Learning के साथ काम करते हैं।",

        npcProjectsTitle: "Architect",
        npcProjectsText: "Sanskar practical technology बनाने और AI, Computer Vision, Machine Learning तथा Full-Stack Development पर काम करने में रुचि रखते हैं।",

        npcCuteGirlTitle: "Tourist",
        npcCuteGirlText: "मैं बस घूमने आई हूँ! यहाँ देखने के लिए कई interesting projects और research हैं।",

        npcFisherTitle: "Fisherman",
        npcFisherText: "आज समुद्र शांत है... समय लेकर Sanskar's World के हर हिस्से को explore करें।",

        npcSocialsTitle: "Socials",
        npcSocialsText: "नमस्ते! यहाँ Sanskar के सोशल मीडिया देखें और जुड़े रहें!",    

        pois: {
            "company-hq": {
                title: "ABOUT ME",
                body: "Sanskar की personal space में आपका स्वागत है। उनके background, interests, skills और work के बारे में जानने के लिए explore करें।",
                actions: {
                    "company-website": "About Me देखें"
                }
            },

            "construction-ruins": {
                title: "Production Zone",
                body: "इस जगह को बाद में नए content के साथ expand किया जाएगा।",
                actions: {
                    "ruins-soon": "अभी बंद है"
                }
            },

            "github-house": {
                title: "GitHub Workshop",
                body: "Sanskar के code, repositories, projects और development work को explore करें।",
                actions: {
                    "github-open": "GitHub खोलें"
                }
            },

            "linkedin-house": {
                title: "LinkedIn House",
                body: "Sanskar की professional profile और career information देखें।",
                actions: {
                    "linkedin-open": "LinkedIn खोलें"
                }
            },

            "projects-lab": {
                title: "Fun Projects Lab",
                body: "Projects, experiments, technical work और interactive demos explore करें।",
                actions: {
                    "projects-list": "Projects खोलें"
                }
            },

            "sign-about": {
                title: "About Sanskar",
                body: "यह world एक interactive portfolio है। अलग-अलग locations को explore करके और जानकारी प्राप्त करें।",
                actions: {
                    "action-sign-about-coming-soon": "जल्द आ रहा है"
                }
            },

            "sign-controls": {
                title: "Controls",
                body: "Desktop: WASD या Arrow Keys। Interact: E, Enter, Space या Click। Mobile: D-Pad + Interact।",
                actions: {
                    "action-sign-controls-coming-soon": "समझ गया"
                }
            },

            "twitter-house": {
                title: "Publication",
                body: "Sanskar की research और published work explore करें।",
                actions: {
                    "twitter-soon": "Publications खोलें"
                }
            },

            "youtube-house": {
                title: "Contact Me",
                body: "Contact page के माध्यम से Sanskar से जुड़ें और उपलब्ध संपर्क माध्यम देखें।",
                actions: {
                    "youtube-soon": "Contact Page खोलें"
                }
            }
        }
    },

    es: {
        onboardingTitle: "Bienvenido al mundo de Sanskar",
        onboardingBody: "Usa WASD o toca la pantalla / joystick para moverte.<br>Pulsa SPACE o E en los edificios para obtener información.",
        startGame: "Comenzar",
        profileDesc: "AI / ML Engineer & Full-Stack Developer",
        cancel: "Cancelar",

        npcGuideTitle: "Guía",
        npcGuideText: "¡Hola! Bienvenido al mundo de Sanskar. Explora la ciudad, interactúa con los edificios y descubre las diferentes partes de su portfolio.",

        npcRecruiterTitle: "Recruiter",
        npcRecruiterText: "¡Bienvenido! Explora los proyectos, investigaciones, publicaciones y perfiles profesionales de Sanskar.",

        npcRecruiterEasterEgg: "¡Eres persistente! Me gusta. ¡Sigue explorando!",

        npcVillagerTitle: "Desarrollador Local",
        npcVillagerText: "He oído que Sanskar trabaja con Python, JavaScript, React, Node.js, MongoDB, Computer Vision y Machine Learning.",

        npcProjectsTitle: "Arquitecto",
        npcProjectsText: "A Sanskar le gusta crear tecnología práctica y trabajar en AI, Computer Vision, Machine Learning y Full-Stack Development.",

        npcCuteGirlTitle: "Turista",
        npcCuteGirlText: "¡Solo estoy de visita! Hay muchos proyectos e investigaciones interesantes por descubrir.",

        npcFisherTitle: "Pescador",
        npcFisherText: "El mar está tranquilo hoy... Tómate tu tiempo y explora cada rincón del mundo de Sanskar.",

        npcSocialsTitle: "Redes Sociales",
        npcSocialsText: "¡Hola! Mira las redes sociales de Sanskar aquí y mantente conectado!",

        pois: {
            "company-hq": {
                title: "ABOUT ME",
                body: "Bienvenido al espacio personal de Sanskar. Explora este mundo para conocer más sobre su experiencia, intereses, habilidades y trabajo.",
                actions: {
                    "company-website": "Ver About Me"
                }
            },

            "construction-ruins": {
                title: "Zona de Producción",
                body: "Esta zona se ampliará con nuevo contenido próximamente.",
                actions: {
                    "ruins-soon": "Actualmente Cerrado"
                }
            },

            "github-house": {
                title: "GitHub Workshop",
                body: "Explora el código, repositorios, proyectos y trabajo de desarrollo de Sanskar.",
                actions: {
                    "github-open": "Abrir GitHub"
                }
            },

            "linkedin-house": {
                title: "LinkedIn House",
                body: "Visita el perfil profesional y la información de carrera de Sanskar.",
                actions: {
                    "linkedin-open": "Abrir LinkedIn"
                }
            },

            "projects-lab": {
                title: "Fun Projects Lab",
                body: "Explora proyectos, experimentos, trabajos técnicos y demos interactivas.",
                actions: {
                    "projects-list": "Abrir Proyectos"
                }
            },

            "sign-about": {
                title: "About Sanskar",
                body: "Este mundo es un portfolio interactivo. Explora las diferentes ubicaciones para descubrir más.",
                actions: {
                    "action-sign-about-coming-soon": "Próximamente"
                }
            },

            "sign-controls": {
                title: "Controles",
                body: "Escritorio: WASD o Flechas. Interactuar: E, Enter, Space o Click. Móvil: D-Pad + Interactuar.",
                actions: {
                    "action-sign-controls-coming-soon": "Entendido"
                }
            },

            "twitter-house": {
                title: "Publication",
                body: "Explora las investigaciones y publicaciones de Sanskar.",
                actions: {
                    "twitter-soon": "Abrir Publicaciones"
                }
            },

            "youtube-house": {
                title: "Contact Me",
                body: "Contacta con Sanskar desde la página de contacto y consulta las formas disponibles de conectar.",
                actions: {
                    "youtube-soon": "Abrir Contacto"
                }
            }
        }
    },

    de: {
        onboardingTitle: "Willkommen in Sanskars Welt",
        onboardingBody: "Nutze WASD oder tippe auf den Bildschirm / Joystick, um dich zu bewegen.<br>Drücke SPACE oder E an Gebäuden für Informationen.",
        startGame: "Spiel starten",
        profileDesc: "AI / ML Engineer & Full-Stack Developer",
        cancel: "Abbrechen",

        npcGuideTitle: "Guide",
        npcGuideText: "Hallo! Willkommen in Sanskars Welt. Erkunde die Stadt, interagiere mit den Gebäuden und entdecke die verschiedenen Bereiche des Portfolios.",

        npcRecruiterTitle: "Recruiter",
        npcRecruiterText: "Willkommen! Entdecke Sanskars Projekte, Forschung, Veröffentlichungen und professionellen Profile.",

        npcRecruiterEasterEgg: "Du bist hartnäckig! Das gefällt mir. Erkunde weiter!",

        npcVillagerTitle: "Local Dev",
        npcVillagerText: "Ich habe gehört, dass Sanskar mit Python, JavaScript, React, Node.js, MongoDB, Computer Vision und Machine Learning arbeitet.",

        npcProjectsTitle: "Architekt",
        npcProjectsText: "Sanskar entwickelt gerne praktische Technologien und arbeitet mit AI, Computer Vision, Machine Learning und Full-Stack Development.",

        npcCuteGirlTitle: "Touristin",
        npcCuteGirlText: "Ich bin nur zu Besuch! Hier gibt es viele interessante Projekte und Forschungsarbeiten zu entdecken.",

        npcFisherTitle: "Fischer",
        npcFisherText: "Das Meer ist heute ruhig... Nimm dir Zeit und erkunde jeden Winkel von Sanskars Welt.",

        npcSocialsTitle: "Soziale Medien",
        npcSocialsText: "Hallo! Sieh dir hier Sanskars soziale Medien an und bleibe in Verbindung!",            
    
        pois: {
            "company-hq": {
                title: "ABOUT ME",
                body: "Willkommen in Sanskars persönlichem Bereich. Erkunde diese Welt, um mehr über seinen Hintergrund, seine Interessen, Fähigkeiten und Arbeit zu erfahren.",
                actions: {
                    "company-website": "About Me ansehen"
                }
            },

            "construction-ruins": {
                title: "Produktionszone",
                body: "Dieser Bereich wird später mit neuen Inhalten erweitert.",
                actions: {
                    "ruins-soon": "Derzeit geschlossen"
                }
            },

            "github-house": {
                title: "GitHub Workshop",
                body: "Entdecke Sanskars Code, Repositories, Projekte und Entwicklungsarbeit.",
                actions: {
                    "github-open": "GitHub öffnen"
                }
            },

            "linkedin-house": {
                title: "LinkedIn House",
                body: "Besuche Sanskars professionelles Profil und seine Karriereinformationen.",
                actions: {
                    "linkedin-open": "LinkedIn öffnen"
                }
            },

            "projects-lab": {
                title: "Fun Projects Lab",
                body: "Entdecke Projekte, Experimente, technische Arbeiten und interaktive Demos.",
                actions: {
                    "projects-list": "Projekte öffnen"
                }
            },

            "sign-about": {
                title: "About Sanskar",
                body: "Diese Welt ist ein interaktives Portfolio. Erkunde die verschiedenen Orte, um mehr zu entdecken.",
                actions: {
                    "action-sign-about-coming-soon": "Bald verfügbar"
                }
            },

            "sign-controls": {
                title: "Steuerung",
                body: "Desktop: WASD oder Pfeiltasten. Interaktion: E, Enter, Space oder Klick. Mobile: D-Pad + Interagieren.",
                actions: {
                    "action-sign-controls-coming-soon": "Verstanden"
                }
            },

            "twitter-house": {
                title: "Publication",
                body: "Entdecke Sanskars Forschung und veröffentlichte Arbeiten.",
                actions: {
                    "twitter-soon": "Veröffentlichungen öffnen"
                }
            },

            "youtube-house": {
                title: "Contact Me",
                body: "Nimm über die Kontaktseite Kontakt mit Sanskar auf und entdecke die verfügbaren Kontaktmöglichkeiten.",
                actions: {
                    "youtube-soon": "Kontaktseite öffnen"
                }
            }
        }
    }
};

// Initialize Game
const k: KaboomCtx = kaboom({
    global: false,
    scale: 2, // Keep retro chunky scaling
    background: [37, 99, 235], // Ocean Blue
    canvas: document.getElementById("game-canvas") as HTMLCanvasElement,
    // By omitting width/height and letterbox, Kaboom natively fills the exact available screen 
    // space continuously without cropping or black bars.
});
k.setGravity(0);

// Native Kaboom event for resizing without manual projection matrix hacks
// Moved inside scene to properly handle zoom scaling on resize

function openExternalLinkSafely(link: string): void {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(link, window.location.href);
    } catch {
        return;
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return;
    }

    // These portfolio pages should open in the SAME TAB.
    const sameTabPages = new Set([
        "/about.html",
        "/projects.html",
        "/publication.html",
        "/contact.html",
    ]);

    if (sameTabPages.has(parsedUrl.pathname)) {
        markPortfolioReturn();
        parsedUrl.searchParams.set("return", "1");
        window.location.href = parsedUrl.toString();
        return;
    }

    // Everything else keeps opening in a new tab.
    window.open(
        parsedUrl.toString(),
        "_blank",
        "noopener,noreferrer"
    );
}

function getDialogAvatar(options: { poiId?: string; npcId?: string }): string | null {
    if (options.npcId) {
        return DIALOG_AVATAR_BY_NPC_ID[options.npcId] ?? DEFAULT_DIALOG_AVATAR;
    }

    if (options.poiId) {
        const entry = portfolioById.get(options.poiId);
        if (entry?.world.visual === "sign") {
            return null;
        }

        return DIALOG_AVATAR_BY_POI_ID[options.poiId] ?? DEFAULT_DIALOG_AVATAR;
    }

    return DEFAULT_DIALOG_AVATAR;
}

async function loadAssets() {
    // Player
    k.loadSprite("player", "/assets/game/pixellab/characters/player/south.png");
    k.loadSprite("player-walk-south", "/assets/game/pixellab/characters/player/walk/south.png", { sliceX: 4, anims: { walk: { from: 0, to: 3, loop: true, speed: 8 } } });
    k.loadSprite("player-walk-north", "/assets/game/pixellab/characters/player/walk/north.png", { sliceX: 4, anims: { walk: { from: 0, to: 3, loop: true, speed: 8 } } });
    k.loadSprite("player-walk-east", "/assets/game/pixellab/characters/player/walk/east.png", { sliceX: 4, anims: { walk: { from: 0, to: 3, loop: true, speed: 8 } } });
    k.loadSprite("player-walk-west", "/assets/game/pixellab/characters/player/walk/west.png", { sliceX: 4, anims: { walk: { from: 0, to: 3, loop: true, speed: 8 } } });

    // NPCs
    k.loadSprite("guide", "/assets/game/pixellab/characters/npc/guide/south.png");
    k.loadSprite("recruiter", "/assets/game/pixellab/characters/npc/recruiter/south.png");
    k.loadSprite("villager", "/assets/game/pixellab/characters/npc/south.png");
    k.loadSprite("villager-east", "/assets/game/pixellab/characters/npc/east.png");
    k.loadSprite("cuteGirl", "/assets/game/pixellab/characters/npc/cute_girl.png");

    // Map Overlays
    k.loadSprite("mapOverlay", `/assets/game/map/map-composite.png`);

    // Objects
    for (const obj of MAP_OBJECTS) {
        k.loadSprite(obj.key, `/assets/game/map/objects/${obj.filename}`);
    }
}

k.scene("main", async () => {
    let gameStarted = false;
    const poiById = portfolioById;
    const domCleanup: Array<() => void> = [];
    const kaboomCleanup: EventController[] = [];
    const addDomListener = (
        target: Window | Document | HTMLElement,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ) => {
        target.addEventListener(type, listener, options);
        domCleanup.push(() => target.removeEventListener(type, listener, options));
    };
    const trackKaboom = (controller: EventController | void) => {
        if (controller) {
            kaboomCleanup.push(controller);
        }
    };

    const savedWorldState = readSavedWorldState();
    const returningFromPortfolio = isReturningFromPortfolio();
    const shouldRestoreWorld = returningFromPortfolio && savedWorldState !== null;

    if (shouldRestoreWorld && savedWorldState) {
        currentLang = savedWorldState.language;
    }

    // Map Background
    k.add([
        k.sprite("mapOverlay"),
        k.pos(0, 0),
        k.z(-100),
    ]);

    // Water Collisions (Performance optimized)
    // Instead of creating a body for every single tile, we use Kaboom's tile map parsing
    // or just let the boundaries handle it if water is only on the edges.
    // For now, to reduce thousands of bodies, we only create bodies for water tiles
    // if we really need them, or we group them.
    const OFFSET_X = 0;
    const OFFSET_Y = 0;

    // Prepare bridge areas to exclude water collisions under them
    const bridges = MAP_OBJECTS.filter(obj => obj.filename.includes("bridge"));
    const isUnderBridge = (col: number, row: number) => {
        const x = col * MAP_TILE_SIZE;
        const y = row * MAP_TILE_SIZE;
        const tLeft = x;
        const tRight = x + MAP_TILE_SIZE;
        const tTop = y;
        const tBottom = y + MAP_TILE_SIZE;

        for (const bridge of bridges) {
            const bLeft = bridge.x - bridge.width / 2;
            const bRight = bridge.x + bridge.width / 2;
            // Add a little padding to the bridge's hit area to allow smooth walking
            const bTop = bridge.y - bridge.height / 2 + 8;
            const bBottom = bridge.y + bridge.height / 2 - 8;

            if (tRight > bLeft && tLeft < bRight && tBottom > bTop && tTop < bBottom) {
                return true;
            }
        }
        return false;
    };
    
    // Simple greedy meshing for rows to reduce collider count drastically
    for (let r = 0; r < TERRAIN_GRID.length; r++) {
        let startCol = -1;
        for (let c = 0; c <= TERRAIN_GRID[r].length; c++) {
            const isWater = c < TERRAIN_GRID[r].length && TERRAIN_GRID[r][c] === T_WATER && !isUnderBridge(c, r);
            
            if (isWater) {
                if (startCol === -1) startCol = c;
            } else {
                if (startCol !== -1) {
                    const width = (c - startCol) * MAP_TILE_SIZE;
                    k.add([
                        k.pos(startCol * MAP_TILE_SIZE + OFFSET_X, r * MAP_TILE_SIZE + OFFSET_Y),
                        k.area({ shape: new k.Rect(k.vec2(0), width, MAP_TILE_SIZE) }),
                        k.body({ isStatic: true }),
                        "water"
                    ]);
                    startCol = -1;
                }
            }
        }
    }

    // Map Boundaries
    const mapW = TERRAIN_GRID[0].length * MAP_TILE_SIZE;
    const mapH = TERRAIN_GRID.length * MAP_TILE_SIZE;
    k.add([k.pos(-16, 0), k.area({ shape: new k.Rect(k.vec2(0), 16, mapH) }), k.body({ isStatic: true })]); // Left
    k.add([k.pos(mapW, 0), k.area({ shape: new k.Rect(k.vec2(0), 16, mapH) }), k.body({ isStatic: true })]); // Right
    k.add([k.pos(0, -16), k.area({ shape: new k.Rect(k.vec2(0), mapW, 16) }), k.body({ isStatic: true })]); // Top
    k.add([k.pos(0, mapH), k.area({ shape: new k.Rect(k.vec2(0), mapW, 16) }), k.body({ isStatic: true })]); // Bottom

    // Objects
    for (const obj of MAP_OBJECTS) {
        // Special case: force fountain to have no collision and no interaction
        const isFountain = obj.key === "objFountain";
        const hasCol = isFountain ? false : obj.collision;

        // Ensure only buildings and specific POIs are interactable. Trees, bridges, etc. become props.
        const isInteractable = !!obj.poiId && !isFountain;

        // Create explicit hitboxes if provided (to handle large transparent sprites like the Github house), otherwise fallback to the full sprite size
        // Using offset with a center-anchored Rect shape allows precise control relative to the sprite center.
        const customHitbox = obj.hitbox ? k.area({ shape: new k.Rect(k.vec2(0), obj.hitbox.width, obj.hitbox.height), offset: k.vec2(obj.hitbox.x, obj.hitbox.y) }) : k.area();
        const hitboxBottomY = obj.hitbox ? (obj.hitbox.y + obj.hitbox.height / 2) : (obj.height / 2 - 4);

        k.add([
            k.sprite(obj.key),
            k.pos(obj.x, obj.y),
            k.anchor("center"),
            k.z(obj.filename.includes("bridge") ? -5 : obj.y + hitboxBottomY), // Bridge should always be behind player
            hasCol ? customHitbox : k.area({ shape: new k.Rect(k.vec2(0), 0, 0) }),
            hasCol ? k.body({ isStatic: true }) : null,
            // Tag determines if player can interact with space
            isInteractable ? "mapObject" : "prop",
            { id: obj.key, poiId: obj.poiId }
        ]);

        // Create POI Banners
        if (obj.poiId && isInteractable) {
            k.add([
                k.text((obj.poiId ? poiById.get(obj.poiId)?.name : "") || "", {
                    size: 6,
                    align: "center"
                }),
                k.pos(obj.x, obj.y - obj.height / 2 - 4),
                k.anchor("center"),
                k.color(255, 255, 255),
                k.outline(2, k.rgb(30, 41, 59)),
                k.z(10000), // Always on top
                "poi_banner",
                { poiId: obj.poiId }
            ]);
        }
    }

    // NPCs
    const npcs = [
        { key: "guide", pos: NPC_POSITIONS.guide, id: "guide_fountain", titleKey: "npcGuideTitle" },
        { key: "recruiter", pos: NPC_POSITIONS.recruiter, id: "recruiter", titleKey: "npcRecruiterTitle" },
        { key: "villager", pos: NPC_POSITIONS.villageNpc, id: "villager_ruins", titleKey: "npcVillagerTitle" },
        { key: "villager-east", pos: NPC_POSITIONS.guideNpc2, id: "fisher", titleKey: "npcFisherTitle" },
        { key: "cuteGirl", pos: NPC_POSITIONS.cuteGirl, id: "cute_girl", titleKey: "npcCuteGirlTitle" }
    ] as const;

    for (const npc of npcs) {
        const npcObj = k.add([
            k.sprite(npc.key),
            k.pos(npc.pos.x, npc.pos.y),
            k.anchor("center"),
            k.area({ shape: new k.Rect(k.vec2(0, 10), 12, 12) }),
            k.body({ isStatic: true }),
            k.z(npc.pos.y + 16),
            "npc",
            { npcId: npc.id }
        ]);

        // Floating NPC title
        const npcTitle = k.add([
            k.text(t[currentLang][npc.titleKey], {
                size: 6,
                align: "center",
            }),
            k.pos(npc.pos.x, npc.pos.y - 22),
            k.anchor("center"),
            k.color(255, 255, 255),
            k.outline(2, k.rgb(30, 41, 59)),
            k.z(10001),
            "npc_title",
            { npcId: npc.id }
        ]);

        // Keep the title attached to the NPC.
        npcTitle.onUpdate(() => {
            npcTitle.pos.x = npcObj.pos.x;
            npcTitle.pos.y = npcObj.pos.y - 22;
        });
    }

    // Socials NPC
    // This character is baked into map-composite.png, so we add only an
    // invisible interaction zone and a floating title over the existing character.
    const socialsNpc = k.add([
        k.pos(875, 390),
        k.area({ shape: new k.Rect(k.vec2(-12, -2), 24, 24) }),
        k.z(406),
        "npc",
        { npcId: "socials" }
    ]);

    const socialsTitle = k.add([
        k.text(t[currentLang].npcSocialsTitle, {
            size: 6,
            align: "center",
        }),
        k.pos(875, 368),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.outline(2, k.rgb(30, 41, 59)),
        k.z(10001),
        "npc_title",
        { npcId: "socials" }
    ]);

    socialsTitle.onUpdate(() => {
        socialsTitle.pos.x = socialsNpc.pos.x;
        socialsTitle.pos.y = socialsNpc.pos.y - 22;
    });

    // Player
    // Restore the exact location from before entering About / Projects /
    // Publications / Contact. A fresh visit still uses PLAYER_SPAWN.
    const initialPlayerX =
        shouldRestoreWorld && savedWorldState
            ? savedWorldState.playerX
            : PLAYER_SPAWN.x;
    const initialPlayerY =
        shouldRestoreWorld && savedWorldState
            ? savedWorldState.playerY
            : PLAYER_SPAWN.y;

    const player = k.add([
        k.sprite("player"),
        k.pos(initialPlayerX, initialPlayerY),
        k.anchor("center"),
        k.area({ shape: new k.Rect(k.vec2(0, 10), 12, 12) }),
        k.body(),
        k.z(PLAYER_SPAWN.y + 16),
        "player"
    ]);

    const SPEED = 120;

    // Debugging / Inspection logic
    const debugPanel = document.getElementById("debug-panel");
    const dFps = document.getElementById("debug-fps");
    const dObjs = document.getElementById("debug-objs");
    const dCam = document.getElementById("debug-cam");
    const dPlayer = document.getElementById("debug-player");
    const dState = document.getElementById("debug-state");
    let isDebugVisible = false;

    trackKaboom(k.onKeyPress("f3", () => {
        isDebugVisible = !isDebugVisible;
        if (isDebugVisible) {
            debugPanel?.classList.remove("hidden");
            k.debug.inspect = true; // Shows hitboxes visually
        } else {
            debugPanel?.classList.add("hidden");
            k.debug.inspect = false;
        }
    }));

    trackKaboom(k.loop(1, () => {
        if (isDebugVisible && debugPanel) {
            if (dFps) dFps.innerText = `${k.debug.fps()}`;
            if (dObjs) dObjs.innerText = `${k.get("*").length}`;
            if (dCam) dCam.innerText = `${Math.round(k.camPos().x)}, ${Math.round(k.camPos().y)}`;
            if (dPlayer) dPlayer.innerText = `${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}`;
            
            const stateStr = isDialogActive ? "DIALOG" : (gameStarted ? "PLAYING" : "ONBOARDING");
            if (dState) dState.innerText = stateStr;
        }
    }));

    // State for Map Banners
    let showBanners =
        shouldRestoreWorld && savedWorldState
            ? savedWorldState.showBanners
            : true;
    const bannerBtn = document.getElementById("banner-btn");

    if (bannerBtn) {
        addDomListener(bannerBtn, "click", () => {
            showBanners = !showBanners;
            bannerBtn.style.color = showBanners ? "var(--text-main)" : "var(--text-muted)";
            
            // Toggle all banner objects
            k.get("poi_banner").forEach(b => {
                b.hidden = !showBanners;
            });

            // Re-focus game
            if (gameStarted) {
                k.canvas.focus();
                window.focus();
            }
        });
    }

    // Language logic
    const langBtn = document.getElementById("lang-btn");

    const updateLanguageUI = () => {
        const tr = t[currentLang];

        // Onboarding
        const obTitle = document.querySelector(".onboarding-content h2");
        const obBody = document.querySelector(".onboarding-content p");
        const obStart = document.getElementById("start-btn");

        if (obTitle) obTitle.textContent = tr.onboardingTitle;
        if (obBody) obBody.innerHTML = tr.onboardingBody;
        if (obStart) obStart.textContent = tr.startGame;

        // Profile
        const profDesc = document.querySelector(".hud-info p");
        if (profDesc) profDesc.textContent = tr.profileDesc;

        // Language Button
        if (langBtn) {
            langBtn.textContent = currentLang.toUpperCase();
        }

        // Update Banners
        k.get("poi_banner").forEach(b => {
            const entryId = b.poiId;

            if (entryId && tr.pois[entryId as keyof typeof tr.pois]) {
                const title = tr.pois[entryId as keyof typeof tr.pois].title;
                b.text = title;
            }
        });

        // Update NPC titles when the language changes
        k.get("npc_title").forEach(label => {
            const npcId = label.npcId as string | undefined;
            if (!npcId) return;

            const titleKeyByNpcId: Record<string, keyof typeof tr> = {
                guide_fountain: "npcGuideTitle",
                recruiter: "npcRecruiterTitle",
                villager_ruins: "npcVillagerTitle",
                fisher: "npcFisherTitle",
                cute_girl: "npcCuteGirlTitle",
                socials: "npcSocialsTitle",
            };

            const titleKey = titleKeyByNpcId[npcId];
            if (titleKey) {
                label.text = tr[titleKey] as string;
            }
        });
    };

    if (langBtn) {
        addDomListener(langBtn, "click", () => {
            const currentIndex = languages.indexOf(currentLang);
            const nextIndex = (currentIndex + 1) % languages.length;

            currentLang = languages[nextIndex];

            updateLanguageUI();

            // Re-focus game to prevent WASD unbinding
            if (gameStarted) {
                k.canvas.focus();
                window.focus();
            }
        });
    }

    updateLanguageUI();

    // Start Game logic
    const onboardingUI = document.getElementById("onboarding-ui");
    const startBtn = document.getElementById("start-btn");

    const startWorld = () => {
        onboardingUI?.classList.add("hidden");
        gameStarted = true;

        // Focus canvas immediately to capture WASD input without an extra click.
        k.canvas.setAttribute("tabindex", "0");
        k.canvas.focus();
        window.focus();
    };

    if (startBtn && onboardingUI) {
        addDomListener(startBtn, "click", startWorld);
    }

    // Returning from one of the four portfolio pages must skip onboarding.
    if (shouldRestoreWorld) {
        startWorld();
    }

    // Dialog System State
    let isDialogActive = false;
    let typeWriterRaf: number | null = null;
    let currentDialogText = "";
    const dialogUI = document.getElementById("dialog-ui");
    const dialogTitle = document.getElementById("dialog-title");
    const dialogBody = document.getElementById("dialog-body");
    const dialogActions = document.getElementById("dialog-actions");

    const dialogAvatar = document.querySelector(".dialog-avatar") as HTMLElement;

    function showDialog(title: string, body: string, actions?: { text: string, link: string }[], avatarImage?: string | null) {
        if (!dialogUI || !dialogTitle || !dialogBody) return;
        isDialogActive = true;
        currentDialogText = body;
        dialogTitle.textContent = title;
        dialogBody.textContent = "";

        if (dialogAvatar) {
            if (!avatarImage) {
                dialogAvatar.style.display = "none";
            } else {
                dialogAvatar.style.display = "block";
                dialogAvatar.style.backgroundImage = `url('${avatarImage}')`;
            }
        }
        
        if (dialogActions) {
            dialogActions.innerHTML = "";
            dialogActions.classList.add("hidden");
        }

        dialogUI.classList.remove("hidden");

        if (typeWriterRaf) {
            cancelAnimationFrame(typeWriterRaf);
        }

        const injectButtons = () => {
            if (dialogActions && actions && actions.length > 0 && dialogActions.childElementCount === 0) {
                dialogActions.classList.remove("hidden");
                actions.forEach(action => {
                    const btn = document.createElement("button");
                    btn.className = "retro-btn";
                    btn.textContent = action.text;
                    btn.onclick = () => {
                        // Save before navigating away so the return page can restore
                        // the exact player position.
                        persistCurrentWorldState();

                        openExternalLinkSafely(action.link);

                        // Refocus game to avoid getting stuck if user clicks back to the window.
                        if (gameStarted) k.canvas.focus();
                    };
                    dialogActions.appendChild(btn);
                });
                
                const cancelBtn = document.createElement("button");
                cancelBtn.className = "retro-btn";
                cancelBtn.style.background = "var(--bg-panel)";
                cancelBtn.style.color = "var(--text-main)";
                cancelBtn.textContent = t[currentLang].cancel;
                cancelBtn.onclick = () => {
                    closeDialog();
                };
                dialogActions.appendChild(cancelBtn);
            }
        };

        let index = 0;
        let lastTime = performance.now();
        const speedMs = 15; // smooth speed with rAF

        function typeWriter(time: number) {
            if (time - lastTime >= speedMs) {
                if (index < body.length) {
                    dialogBody!.textContent += body[index];
                    index++;
                    lastTime = time;
                } else {
                    typeWriterRaf = null;
                    injectButtons();
                    return;
                }
            }
            typeWriterRaf = requestAnimationFrame(typeWriter);
        }
        typeWriterRaf = requestAnimationFrame(typeWriter);
        
        // Expose inject method to global state for the fast-forward skip
        window._injectDialogButtons = injectButtons;
    }

    function closeDialog() {
        if (!dialogUI) return;
        isDialogActive = false;
        dialogUI.classList.add("hidden");
        currentDialogText = "";
        if (typeWriterRaf) {
            cancelAnimationFrame(typeWriterRaf);
            typeWriterRaf = null;
        }
        if (dialogBody) {
            dialogBody.textContent = "";
        }
        if (dialogActions) {
            dialogActions.classList.add("hidden");
            dialogActions.innerHTML = "";
        }
        window._injectDialogButtons = undefined;
        
        // Auto-refocus canvas to allow immediate WASD movement
        if (gameStarted) {
            k.canvas.focus();
        }
    }

    // Zero-allocation camera variables
    let baseZoom = window.innerWidth < 768 ? 1.8 : 3.5;
    let currentZoom =
        shouldRestoreWorld && savedWorldState
            ? Math.max(
                window.innerWidth < 768 ? 1.0 : 1.5,
                Math.min(savedWorldState.zoom, 6.0),
            )
            : baseZoom;
    const camScaleCache = k.vec2(currentZoom);
    const camPosCache = k.vec2(0, 0);

    // Initial camera scale
    k.camScale(camScaleCache);

    const syncCameraScale = () => {
        // Only update base zoom, maintain relative scale if user zoomed
        const newBaseZoom = window.innerWidth < 768 ? 1.8 : 3.5;
        if (baseZoom !== newBaseZoom) {
             const ratio = currentZoom / baseZoom;
             baseZoom = newBaseZoom;
             currentZoom = baseZoom * ratio;
             camScaleCache.x = currentZoom;
             camScaleCache.y = currentZoom;
             k.camScale(camScaleCache);
             k.camPos(k.camPos());
        }
    };
    addDomListener(window, "resize", syncCameraScale);

    // Zoom Controls
    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomOut = document.getElementById("btn-zoom-out");
    
    if (btnZoomIn) {
        addDomListener(btnZoomIn, "click", () => {
            currentZoom = Math.min(currentZoom * 1.2, 6.0); // Max zoom
            camScaleCache.x = currentZoom;
            camScaleCache.y = currentZoom;
            k.camScale(camScaleCache);
            k.camPos(k.camPos()); // Re-clamp position
        });
    }
    
    if (btnZoomOut) {
        addDomListener(btnZoomOut, "click", () => {
            currentZoom = Math.max(currentZoom / 1.2, window.innerWidth < 768 ? 1.0 : 1.5); // Min zoom
            camScaleCache.x = currentZoom;
            camScaleCache.y = currentZoom;
            k.camScale(camScaleCache);
            k.camPos(k.camPos()); // Re-clamp position
        });
    }

    const persistCurrentWorldState = () => {
        if (!gameStarted) return;

        saveWorldState({
            version: 3,
            started: true,
            playerX: player.pos.x,
            playerY: player.pos.y,
            currentDir,
            zoom: currentZoom,
            language: currentLang,
            showBanners,
        });
    };

    // Capture the exact last position before the browser unloads the world.
    addDomListener(window, "pagehide", () => {
        persistCurrentWorldState();
    });

    addDomListener(window, "beforeunload", () => {
        persistCurrentWorldState();
    });

    // Camera follow with lerp and clamp to never show black borders
    trackKaboom(player.onUpdate(() => {
        // Dynamic Y-Sorting for player
        player.z = player.pos.y + 16;

        // Clamp boundaries
        const viewW = k.width() / currentZoom / 2;
        const viewH = k.height() / currentZoom / 2;

        let cx = player.pos.x;
        let cy = player.pos.y;

        // Only clamp if the map is bigger than the view, otherwise center the map
        if (mapW > viewW * 2) cx = Math.max(viewW, Math.min(cx, mapW - viewW));
        else cx = mapW / 2;

        if (mapH > viewH * 2) cy = Math.max(viewH, Math.min(cy, mapH - viewH));
        else cy = mapH / 2;

        // Round camera position to prevent subpixel jitter, and ONLY update Kaboom if the pixel actually changed
        const newCamX = Math.round(cx);
        const newCamY = Math.round(cy);
        
        if (camPosCache.x !== newCamX || camPosCache.y !== newCamY) {
            camPosCache.x = newCamX;
            camPosCache.y = newCamY;
            k.camPos(newCamX, newCamY);
        }
        
        player.z = player.pos.y + 10;
    }));

    let currentDir: "south" | "north" | "east" | "west" =
        shouldRestoreWorld && savedWorldState
            ? savedWorldState.currentDir
            : "south";
    let isMoving = false;

    // Mobile Controls State
    const mobileDir = { x: 0, y: 0 };

    const btnUp = document.getElementById("btn-up");
    const btnDown = document.getElementById("btn-down");
    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnA = document.getElementById("btn-a");

    const setupBtn = (btn: HTMLElement | null, dx: number, dy: number) => {
        if (!btn) return;
        btn.style.touchAction = "none";
        addDomListener(btn, "touchstart", (e: Event) => { e.preventDefault(); mobileDir.x = dx; mobileDir.y = dy; }, { passive: false });
        addDomListener(btn, "touchend", (e: Event) => { e.preventDefault(); mobileDir.x = 0; mobileDir.y = 0; }, { passive: false });
        addDomListener(btn, "touchcancel", (e: Event) => { e.preventDefault(); mobileDir.x = 0; mobileDir.y = 0; }, { passive: false });
        addDomListener(btn, "mousedown", (e: Event) => { e.preventDefault(); mobileDir.x = dx; mobileDir.y = dy; });
        addDomListener(btn, "mouseup", (e: Event) => { e.preventDefault(); mobileDir.x = 0; mobileDir.y = 0; });
        addDomListener(btn, "mouseleave", () => { mobileDir.x = 0; mobileDir.y = 0; });
    };

    setupBtn(btnUp, 0, -1);
    setupBtn(btnDown, 0, 1);
    setupBtn(btnLeft, -1, 0);
    setupBtn(btnRight, 1, 0);
    k.canvas.style.touchAction = "none";

    const resetMovement = () => {
        mobileDir.x = 0;
        mobileDir.y = 0;
        if (isMoving) {
            if (currentDir === "south") {
                player.use(k.sprite("player"));
            } else {
                player.use(k.sprite(`player-walk-${currentDir}`));
            }
            player.frame = 0;
            player.stop();
            isMoving = false;
        }
    };

    addDomListener(window, "blur", resetMovement);
    addDomListener(window, "pointerup", () => {
        mobileDir.x = 0;
        mobileDir.y = 0;
    });
    addDomListener(document, "visibilitychange", () => {
        if (document.hidden) {
            resetMovement();
            return;
        }
        if (gameStarted) {
            k.canvas.focus();
        }
    });

    let recruiterTalkCount = 0;

    function triggerInteraction() {
        if (!gameStarted) return;
        if (isDialogActive) {
            if (typeWriterRaf) {
                // Complete text instantly
                cancelAnimationFrame(typeWriterRaf);
                typeWriterRaf = null;
                if (dialogBody) dialogBody.textContent = currentDialogText;
                
                // Show actions instantly if they exist, otherwise the user can close the dialog next click
                if (window._injectDialogButtons) {
                    window._injectDialogButtons();
                }
            } else {
                // Only close the dialog if it's NOT displaying active buttons, to prevent accidentally skipping the choice
                if (!dialogActions || dialogActions.childElementCount === 0 || dialogActions.classList.contains("hidden")) {
                     closeDialog();
                }
            }
            return;
        }

        type InteractabSanskarbj = GameObj & {
            poiId?: string;
            npcId?: string;
            pos: typeof player.pos;
            is: (tag: string) => boolean;
        };

        // Find closest interactable object without allocating new arrays
        let closestObj: InteractabSanskarbj | null = null;
        let closestDist = Infinity;

        for (const obj of k.get("mapObject")) {
            const mapObj = obj as InteractabSanskarbj;
            if (!mapObj.pos) continue;
            const dist = player.pos.dist(mapObj.pos);
            const entry = mapObj.poiId ? poiById.get(mapObj.poiId) : null;
            const interactionRange = entry?.world?.interactRadius || 80;

            if (dist <= interactionRange && dist < closestDist) {
                closestDist = dist;
                closestObj = mapObj;
            }
        }
        
        for (const obj of k.get("npc")) {
            const npcObj = obj as InteractabSanskarbj;
            if (!npcObj.pos) continue;
            const dist = player.pos.dist(npcObj.pos);
            const interactionRange = 60; // NPCs are smaller and easier to reach

            if (dist <= interactionRange && dist < closestDist) {
                closestDist = dist;
                closestObj = npcObj;
            }
        }

        if (closestObj) {
            const target = closestObj;
            const tr = t[currentLang];
            // Determine what to say based on POI or NPC data
            let title = target.is("npc") ? tr.npcVillagerTitle : "Sign";
            let text = "Hello there!";
            const actions: {text: string, link: string}[] = [];

            if (target.poiId) {
                const entry = poiById.get(target.poiId);
                const translatedEntry = tr.pois[target.poiId as keyof typeof tr.pois];
                
                if (entry && translatedEntry) {
                    title = translatedEntry.title;
                    text = translatedEntry.body;
                    
                    if (entry.actions) {
                        for (const action of entry.actions) {
                            if (
                                action.type === 'open_link' &&
                                typeof action.href === "string" &&
                                target.poiId !== "company-hq"
                            ) {
                                // Find translation for action label based on action id, default to translated action mapping
                                const translatedActions =
                                    translatedEntry.actions as Record<string, string>;

                                const label =
                                    translatedActions[action.id] ||
                                    action.label;
                                actions.push({ text: label, link: action.href });
                            }
                        }
                    }

                    // Explicit external social destinations.
                    // These override any stale/missing glossary URLs for the new buildings.
                    const externalPageByPoiId: Record<string, string> = {
                        "github-house": "https://github.com/Sanskar-Karki",
                        "linkedin-house": "https://www.linkedin.com/in/sanskar-karki-860683246/",
                    };

                    const externalPage = externalPageByPoiId[target.poiId];

                    if (externalPage) {
                        // Access the translated labels through their concrete POI types.
                        // translatedEntry is a union of all POI translation shapes, so
                        // dynamically indexing it with github-open/linkedin-open causes
                        // TypeScript error TS7053.
                        const label =
                            target.poiId === "github-house"
                                ? tr.pois["github-house"].actions["github-open"]
                                : tr.pois["linkedin-house"].actions["linkedin-open"];

                        if (typeof label === "string" && !actions.some(action => action.link === externalPage)) {
                            actions.push({
                                text: label,
                                link: externalPage,
                            });
                        }
                    }

                    // Local portfolio pages.
                    // These buttons are created directly here, so they appear even when
                    // the glossary entry does not define an open_link action.
                    const localPageByPoiId: Record<string, { actionId: string; path: string }> = {
                        // Same-tab portfolio pages.
                        "company-hq": {
                            actionId: "company-website",
                            path: "/about.html",
                        },
                        "projects-lab": {
                            actionId: "projects-list",
                            path: "/projects.html",
                        },
                        "twitter-house": {
                            actionId: "twitter-soon",
                            path: "/publication.html",
                        },
                        "youtube-house": {
                            actionId: "youtube-soon",
                            path: "/contact.html",
                        },
                    };

                    const localPage = localPageByPoiId[target.poiId];

                    if (localPage) {
                        const translatedActions =
                            translatedEntry.actions as Record<string, string>;

                        const label =
                            translatedActions[localPage.actionId];

                        if (typeof label === "string") {
                            // Only add the button if it is not already present.
                            if (!actions.some(action => action.link === localPage.path)) {
                                actions.push({
                                    text: label,
                                    link: localPage.path,
                                });
                            }
                        }
                    }
                } else if (entry && entry.dialog) {
                    // Fallback to original
                    title = entry.dialog.title;
                    text = entry.dialog.body;
                    if (entry.actions) {
                        for (const action of entry.actions) {
                            if (action.type === 'open_link' && typeof action.href === "string") {
                                actions.push({ text: action.label, link: action.href });
                            }
                        }
                    }
                }
            } else if (target.is("npc")) {
                if (target.npcId === "guide_fountain") {
                    title = tr.npcGuideTitle;
                    text = tr.npcGuideText;
                } else if (target.npcId === "villager_ruins") {
                    title = tr.npcVillagerTitle;
                    text = tr.npcVillagerText;
                } else if (target.npcId === "fisher") {
                    title = tr.npcFisherTitle;
                    text = tr.npcFisherText;
                } else if (target.npcId === "cute_girl") {
                    title = tr.npcCuteGirlTitle;
                    text = tr.npcCuteGirlText;
                } else if (target.npcId === "socials") {
                    title = tr.npcSocialsTitle;
                    text = tr.npcSocialsText;
                    actions.push(
                        { text: "Instagram", link: "https://www.instagram.com/_sannskar__/" },
                        { text: "Facebook", link: "https://www.facebook.com/SucidalMonk3y/" },
                        { text: "Twitter / X", link: "https://x.com/SanskarKarki10" },
                    );
                } else if (target.npcId === "recruiter") {
                    title = tr.npcRecruiterTitle;
                    recruiterTalkCount++;
                    if (recruiterTalkCount === 3) {
                        text = tr.npcRecruiterEasterEgg;
                        for (let i = 0; i < 50; i++) {
                            k.add([
                                k.rect(4, 4),
                                k.pos(target.pos.x, target.pos.y),
                                k.color(k.rand(0, 255), k.rand(0, 255), k.rand(0, 255)),
                                k.move(k.choose([k.LEFT, k.RIGHT, k.UP, k.DOWN]), k.rand(20, 60)),
                                k.lifespan(1, { fade: 0.5 }),
                            ]);
                        }
                        recruiterTalkCount = 0;
                    } else {
                        text = tr.npcRecruiterText;
                    }
                }
            }

            showDialog(title, text, actions, getDialogAvatar({ poiId: target.poiId, npcId: target.npcId }));
        }
    }

    if (btnA) {
        addDomListener(btnA, "mousedown", (e: Event) => { e.preventDefault(); triggerInteraction(); });
        addDomListener(btnA, "touchstart", (e: Event) => { e.preventDefault(); triggerInteraction(); }, { passive: false });
    }

    // Movement Logic
    trackKaboom(k.onUpdate(() => {
        // Keep the latest position so returning from a portfolio page restores
        // the exact point where the user left the world.
        if (gameStarted && !isDialogActive) {
            persistCurrentWorldState();
        }

        if (!gameStarted || isDialogActive) {
            if (isMoving) {
                if (currentDir === "south") {
                    player.use(k.sprite("player"));
                } else {
                    player.use(k.sprite(`player-walk-${currentDir}`));
                }
                player.frame = 0;
                player.stop();
                isMoving = false;
            }
            return;
        }

        let mx = 0;
        let my = 0;
        if (k.isKeyDown("w") || k.isKeyDown("up") || mobileDir.y < 0) my -= 1;
        if (k.isKeyDown("s") || k.isKeyDown("down") || mobileDir.y > 0) my += 1;
        if (k.isKeyDown("a") || k.isKeyDown("left") || mobileDir.x < 0) mx -= 1;
        if (k.isKeyDown("d") || k.isKeyDown("right") || mobileDir.x > 0) mx += 1;

        if (mx !== 0 || my !== 0) {
            // zero allocation math
            const len = Math.sqrt(mx * mx + my * my);
            const vx = (mx / len) * SPEED;
            const vy = (my / len) * SPEED;
            
            // move uses physics and DT internally
            player.move(vx, vy);

            // Determine animation direction string
            let newDir = currentDir;
            if (mx > 0) newDir = "east";
            else if (mx < 0) newDir = "west";
            else if (my < 0) newDir = "north";
            else if (my > 0) newDir = "south";

            if (!isMoving || newDir !== currentDir) {
                player.use(k.sprite(`player-walk-${newDir}`));
                player.play("walk");
                currentDir = newDir;
                isMoving = true;
            }
        } else {
            if (isMoving) {
                // Stop moving, revert to idle sprite
                if (currentDir === "south") {
                    player.use(k.sprite("player"));
                } else {
                    player.use(k.sprite(`player-walk-${currentDir}`));
                }
                player.frame = 0;
                player.stop();
                isMoving = false;
            }
        }
    }));

    // Interaction Action (Space bar or Enter)
    for (const key of ["space", "enter", "e"]) {
        trackKaboom(k.onKeyPress(key as Key, triggerInteraction));
    }
    trackKaboom(k.onMousePress("left", triggerInteraction));

    k.onSceneLeave(() => {
        for (const controller of kaboomCleanup) {
            controller.cancel();
        }
        kaboomCleanup.length = 0;
        for (const cleanup of domCleanup) cleanup();
        domCleanup.length = 0;
        if (typeWriterRaf) {
            cancelAnimationFrame(typeWriterRaf);
            typeWriterRaf = null;
        }
        currentDialogText = "";
        window._injectDialogButtons = undefined;
    });

});

loadAssets().then(() => {
    k.go("main");
});

// Fix memory leaks and GC crashes caused by Vite HMR stacking multiple game loops
if (import.meta.hot) {
    import.meta.hot.on("vite:beforeUpdate", () => {
        window.location.reload();
    });
}
