# Klaak — v2 « Hyperespace » : spécification

La v1 est validée pour son design system (tokens, typos, couleurs, ton glitch chromatique), mais pas pour la mise en scène : trop classique. La v2 remplace toute la page d'accueil par un voyage immersif en zoom infini, validé avec Kevin sur un prototype.

**Référence absolue : `brief/v2/prototype-hyperespace.dc.html`.** C'est un prototype de motion (format Claude Design, logique dans le bloc `<script type="text/x-dc">`). Ne le copie pas tel quel : réimplémente-le proprement dans la stack du projet, mais reproduis fidèlement son comportement, ses courbes et ses valeurs. Quand cette spec et le prototype divergent, le prototype fait foi.

---

## 1. Principe

- Pas de scroll natif. La molette, le trackpad, le glisser tactile et les flèches pilotent une position virtuelle `u` (en « unités de scène »), lissée par un lerp (≈ 0,08 par frame à 60 fps).
- Le voyage est une suite de scènes plein écran. On passe de l'une à l'autre en plongeant dans un **portail circulaire** au centre de l'écran.
- Tout l'affichage est une **fonction pure de `u`** (plus l'horloge musicale) : revenir en arrière rejoue exactement l'animation à l'envers. Aucun état accumulé qui dépendrait du sens de parcours (seules exceptions : rotation décorative et étoiles).
- **Aimantation directionnelle** : quand l'utilisateur lâche (≈ 380 ms sans entrée), `u` se pose sur l'arrêt suivant dans le sens du mouvement, sauf s'il a juste effleuré (< 0,1 unité), auquel cas il revient. Quand `u` est à moins de 1e-3 de sa cible, il s'y pose exactement (indispensable : sinon les portails n'apparaissent pas en avançant).

## 2. Les scènes (dans l'ordre)

| # | Scène | Photo de fond | Texte | Portail au repos |
|---|---|---|---|---|
| 00 | Intro | aucune (espace) | logo géant à gauche, accroche centrée en bas | oui, décalé à droite (74 %, 46 %) |
| 01 | Le festivalier | `fond-ecran-rond` | colonne droite | oui |
| 02 | Collectif | `montee-sourire` | colonne gauche | oui |
| 03 | La révélation | `esoteros-2026-scene` (teinte orangée légère, opacité 0,35) | colonne gauche + « 175 → 200 BPM » | oui |
| 04 | Drop | `breakdown-portrait` | colonne gauche | oui (aperçu des sets, bouton play cliquable) |
| 05 | Les sets | aucune | tracklist à gauche, lecteur à droite, pochette dans la lentille | non (la lentille est la pochette) |
| 06 | Les dates | `breakdown-profil-bleu` + voile sombre | titre en bas à gauche, détail centré en bas | non (la lentille est l'affiche visée) |
| 07 | Booking | `fond-foret` | centré | — |

Longueurs (en unités) : 1 par scène, sauf Sets 1,5 et Dates `1 + 0,32 × (nombre de dates + 1)`. Arrêts d'aimantation : début de chaque scène, fin du « hold » des sets, et chaque date.

Les textes exacts sont dans le prototype ; ils reprennent la bio de `brief/bio.md` (« plus de 10 ans »). Points précis demandés par Kevin : la scène 02 s'appelle **Collectif** et précise qu'il est aujourd'hui aussi l'un des artistes qui représentent l'association ; la scène 03 définit **son** style de hitech (explosive, groovy, happy, survitaminée, 175 à 200 BPM).

## 3. La transition portail (le cœur du site)

Pour chaque scène `i`, `d = u − début(i)` pendant l'entrée (de −1 à 0), 0 pendant le hold, puis de 0 à 1 à la sortie.

**Scène qui sort (d de 0 à 1)** : `scale = 1 + (Z − 1) · d^1.7` autour du centre du portail suivant (Z ≈ 4, réglable), opacité qui tombe entre d = 0,82 et 1, textes qui disparaissent entre d = 0 et 0,28. **Aucune rotation de l'image** (elle découvrait les coins de l'écran).

**Scène qui entre (e = d + 1, de 0 à 1)** : elle est empilée **au-dessus** et révélée par un `clip-path: circle()` :
- rayon à l'écran `R = r0 + (Rmax − r0) · e^2.1`, avec `r0` = 19 vh (ou 0 si la scène précédente occupe son centre : sets, dates, booking) et `Rmax` = distance du centre du portail au coin le plus éloigné + marge ;
- échelle de la scène `max(S0 + (1 − S0) · e^1.25, couverture)`, avec S0 = 0,52 (1 pour les scènes à lentille) ;
- **contrainte de couverture** : à tout instant, l'image doit couvrir toute la zone révélée (cercle ∩ écran). Calcul analytique, pas d'itération par paliers (ça saccade). Jamais de bord d'image visible ;
- le rayon local du clip vaut `R / scale`, centré sur le point local qui correspond au centre du portail.

**Éclosion du portail suivant** : pendant les 0,45 dernières unités de l'arrivée sur une scène, le portail suivant s'ouvre depuis le centre (rayon `r0 · easeOutBack`), et se referme à l'envers.

**Portail d'intro décalé** : l'image entrante est translatée pour que son point focal soit au centre du cercle au repos, puis glisse (smoothstep) vers sa position plein écran pendant l'ouverture.

**Anneaux** : deux anneaux globaux (onde de choc sur l'iris en cours d'ouverture, et anneau du portail au repos), triple trait cyan/magenta/couleur du set décalé selon la vitesse, arc pointillé contra-rotatif, rayons lumineux (`repeating-conic-gradient` masqué) pendant le passage.

## 4. Cadrage des photos (important pour Kevin)

Chaque photo a un **point focal** (son visage) et deux cadrages :
- **dans le cercle** : cadrage portrait, visage et épaules, centre du cercle légèrement sous le visage (`fy = hy + 0,16` par défaut), zoom ≈ 1,12 (2,5 pour la photo Esoteros, plan large) ;
- **plein écran** : visage dans le tiers libre, du côté opposé à la colonne de texte, hors du portail central, zoom ≈ 1,45.

Pendant l'ouverture, l'interpolation se fait **dans l'espace écran** : le zoom apparent (échelle de la scène × zoom de l'image) et la position du visage progressent d'un seul mouvement monotone, et la destination est la position **réellement atteignable** sans bord visible (sinon l'image fait un aller-retour). Les valeurs `hx, hy, fx, fy, tx, ty, kf, kp` de chaque photo sont dans `this.PH` du prototype ; vérifie le résultat visuellement pour chaque scène, au repos et dans le cercle.

## 5. Le son et le player

- Lecture via le **SoundCloud Widget API** (play, pause, seek, position, durée). Le widget n'expose aucune analyse audio : **pré-calcule pour chaque set**, avec un script hors ligne à partir des fichiers audio de Kevin, une waveform (≈ 110 à 200 valeurs) et une grille de beats / enveloppe d'énergie, stockées en JSON et synchronisées sur la position du widget. Dans le prototype, tout cela est simulé (horloge à 190 BPM, waveform générée, durées fictives d'1 h).
- **Kick** : enveloppe douce (attaque rapide, retombée lente), jamais un clignotement sec.
- **Player du bas** (pilule) : bouton lecture avec ondes concentriques sur le kick, flèches précédent/suivant, titre, temps écoulé / durée, **waveform cliquable** (seek au clic, bulle de temps qui suit la souris au survol, barres éclairées jusqu'au curseur, partie écoutée à la couleur du set, rebond discret seulement autour de la tête de lecture, flèches clavier ±30 s), bouton **liste des sets** (popover : set en cours surligné, égaliseur + « En lecture » ou « En pause »). Pas de BPM, pas de « Set 1/3 ». Il s'efface sur la page des sets.
- **Page des sets** : tracklist générée depuis les données, pochette dans la lentille avec gros bouton lecture, panneau de droite avec la même waveform cliquable, en grand. Le bouton play du cercle de la scène 04 **navigue vers la scène 05 et lance la lecture**.
- **Horizon** (canvas) autour du portail actif : membrane nette au repos qui ondule légèrement ; en lecture, elle s'adoucit très subtilement (deux voiles discrets, petit halo, particules à peine plus vives). Kevin a explicitement refusé une version plus chargée : reste subtil. Progression du set en fin anneau extérieur.
- Choisir un set recolore tout le site (`--wc` : acide, magenta, orange).

## 6. Autres éléments

- **Logo** : géant à gauche à l'intro, s'envole en haut à gauche au premier scroll ; ensuite séparation cyan/magenta et inclinaison selon la vitesse, pulsation sur le kick, glitch à chaque changement de chapitre, une couche à la couleur du set. Sous lui : nom du chapitre + jauge de profondeur.
- **Réseaux** (SoundCloud, Instagram, Facebook) en haut à droite, discrets.
- **Crédits photo** sur chaque scène avec photo, à la verticale le long du bord droit, petits et semi-transparents : « Photo · NVP Photographie » (filigrane présent sur toutes les photos du Drive). Photo Esoteros : crédit à compléter.
- **Étoiles** (canvas) : jaillissent du portail actif, s'étirent en warp avec la vitesse, repartent en arrière quand on recule.
- **Dates** : affiches en orbite au-dessus de la lentille (24° d'écart, seules les 5 plus proches visibles), la molette fait défiler date par date, clic sur une affiche pour la viser, lentille qui affiche l'affiche visée, année en filigrane, dernière place « Votre date ? » vers le booking. Doit rester lisible avec beaucoup plus de dates.

## 7. Garde-fous

- **Photosensibilité** : jamais plus de 3 flashs par seconde. Le flash plein écran n'arrive qu'une fois par mesure, à faible intensité, et il est coupé sur la page des sets.
- **`prefers-reduced-motion`** : pas de zoom, pas de warp, pas de flash, transitions en fondu.
- **Accessibilité** : navigation clavier complète, contenu lisible sans JS, contrastes AA, rôles ARIA du player (slider, dialog).
- **Mobile** : portail d'intro sous le logo, colonnes de texte en bas, gestes tactiles.
- **Performance** : au plus deux scènes rendues à la fois, LCP < 2,5 s sur mobile 4G.
- Ne laisse jamais deux classes CSS se télescoper (deux bugs du prototype venaient de là : `.big`, et une variable `--hov` redéfinie localement).

## 8. À compléter avec Kevin

Crédit de la photo Esoteros, titre exact du set Esoteros, vraies durées et URL des sets, lieux des dates marqués « à compléter ».
